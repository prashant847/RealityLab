// RealityLab AI desktop shell: starts the local simulation service, waits until it is healthy, shows the app in its own window,
// and stops the service when the app closes. The user never opens a browser or starts anything by hand.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const packaged = app.isPackaged;
const root = path.resolve(__dirname, "..");
let server = null;          // the child process
let win = null;
let quitting = false;

// Developer mode (the "RealityLab AI (dev)" shortcut): show the live dev site instead of starting the packaged service, so changes appear as soon as they are saved.
// It keeps its own settings folder, so it can run next to the installed app.
const DEV_URL = !app.isPackaged && process.env.REALITYLAB_DEV_URL ? process.env.REALITYLAB_DEV_URL.replace(/\/$/, "") : "";
if (DEV_URL) app.setPath("userData", path.join(app.getPath("appData"), "RealityLab AI Dev"));

if (!app.requestSingleInstanceLock()) { app.quit(); }
else app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

const PREFERRED_PORT = 47615;     // a stable origin keeps browser storage (BLACKOUT's resume pointer, UI state) across launches

function listenOn(port) {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(port, "127.0.0.1", () => { const { port: got } = s.address(); s.close(() => resolve(got)); });
  });
}
const freePort = () => listenOn(PREFERRED_PORT).catch(() => listenOn(0));

function health(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/api/health", timeout: 1500 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on("error", () => resolve(false)); req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function waitHealthy(port, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (server && server.exitCode !== null) throw new Error(`The simulation service stopped unexpectedly (exit code ${server.exitCode}).`);
    if (await health(port)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("The simulation service did not start in time.");
}

function startServer(port) {
  const dataDir = app.getPath("userData");                      // %APPDATA%\RealityLab AI
  fs.mkdirSync(dataDir, { recursive: true });
  const env = { ...process.env, REALITYLAB_DB: `sqlite:///${path.join(dataDir, "realitylab.db").replace(/\\/g, "/")}`, PYTHONUTF8: "1" };
  let cmd, args, cwd;
  if (packaged) {
    env.REALITYLAB_FRONTEND = path.join(process.resourcesPath, "frontend");
    env.REALITYLAB_VOICE_DIR = path.join(process.resourcesPath, "voice");
    cmd = path.join(process.resourcesPath, "backend", "realitylab-server.exe"); args = ["--port", String(port)]; cwd = path.dirname(cmd);
  } else {                                                      // development: run from the source tree
    env.REALITYLAB_FRONTEND = process.env.REALITYLAB_FRONTEND || path.join(root, "frontend", "dist");
    env.REALITYLAB_VOICE_DIR = process.env.REALITYLAB_VOICE_DIR || path.join(__dirname, "voice");
    cwd = path.join(root, "backend");
    cmd = path.join(cwd, ".venv", "Scripts", "python.exe"); args = ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(port)];
  }
  const logFile = fs.openSync(path.join(dataDir, "service.log"), "a");
  server = spawn(cmd, args, { cwd, env, windowsHide: true, stdio: ["ignore", logFile, logFile] });
  server.on("error", (e) => { fatal(`Could not start the simulation service: ${e.message}`); });
}

function stopServer() {
  if (!server || server.exitCode !== null) return;
  try { execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { try { server.kill(); } catch { /* already gone */ } }
  server = null;
}

function fatal(message) {
  if (quitting) return;
  quitting = true;
  dialog.showErrorBox("RealityLab AI could not start", `${message}\n\nDetails are in service.log inside ${app.getPath("userData")}.`);
  stopServer(); app.exit(1);
}

/** After an update (not on a first install), say once what is new. The last version shown is remembered in the user data folder. */
function announceUpdate() {
  try {
    const f = path.join(app.getPath("userData"), "last-version.txt");
    const prev = fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim() : "";
    fs.writeFileSync(f, app.getVersion());
    if (!prev || prev === app.getVersion() || DEV_URL) return;
    dialog.showMessageBox(win, { type: "info", title: "RealityLab AI updated", message: `RealityLab AI is now version ${app.getVersion()}`,
      detail: ["What's new:", "",
        "• Technical labs: build a circuit and perform an appendicectomy",
        "• A certificate for each simulation, with comic art",
        "• A professional written report you can print or save as a PDF",
        "• Every worker on your team now gives opinions",
        "• The Archivist can speak English or Hinglish",
        "• A calmer, retro comic look throughout"].join("\n"), buttons: ["Got it"] });
  } catch { /* the notice is optional */ }
}

async function main() {
  Menu.setApplicationMenu(null);
  const icon = path.join(__dirname, "assets", "icon.ico");
  const splash = new BrowserWindow({ width: 420, height: 300, frame: false, resizable: false, show: true, icon, backgroundColor: "#0a0f18", alwaysOnTop: true });
  splash.loadFile(path.join(__dirname, "splash.html"));
  try {
    let port = 0;
    if (!DEV_URL) { port = await freePort(); startServer(port); await waitHealthy(port, 45000); }
    else if (!(await new Promise((ok) => { const q = http.get(DEV_URL, { timeout: 2500 }, (r) => { r.resume(); ok(true); }); q.on("error", () => ok(false)); q.on("timeout", () => { q.destroy(); ok(false); }); }))) throw new Error(`The dev site at ${DEV_URL} is not running. Start it with scripts\serve-web.cmd.`);
    win = new BrowserWindow({
      width: 1360, height: 880, minWidth: 960, minHeight: 640, show: false, title: "RealityLab AI", icon, backgroundColor: "#0a0f18", autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy: "no-user-gesture-required" },
    });
    const origin = DEV_URL || `http://127.0.0.1:${port}`;
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url) && !url.startsWith(origin)) shell.openExternal(url); return { action: "deny" }; });
    win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(origin)) e.preventDefault(); });
    // Text size: the page asks for a zoom factor, and Ctrl and + / - / 0 work too (the application menu is removed, so they are handled here).
    const setZoom = (f, tell) => { const z = Math.min(2, Math.max(1, Number.isFinite(f) ? f : 1)); if (win) { win.webContents.setZoomFactor(z); if (tell) win.webContents.send("rl:zoomed", z); } };
    ipcMain.removeAllListeners("rl:zoom"); ipcMain.on("rl:zoom", (_e, f) => setZoom(f, false));
    win.webContents.on("before-input-event", (e, input) => {
      if (input.type !== "keyDown" || !(input.control || input.meta)) return;
      const z = win.webContents.getZoomFactor();
      if (input.key === "+" || input.key === "=") { e.preventDefault(); setZoom(Math.round((z + 0.25) * 100) / 100, true); }
      else if (input.key === "-") { e.preventDefault(); setZoom(Math.round((z - 0.25) * 100) / 100, true); }
      else if (input.key === "0") { e.preventDefault(); setZoom(1, true); }
    });
    win.once("ready-to-show", () => { splash.destroy(); win.show(); announceUpdate(); });
    win.on("closed", () => { win = null; });
    await win.webContents.session.clearCache();                  // the port is stable, so a cached old page must never win over the version just installed
    await win.loadURL(origin + "/");
  } catch (e) {
    if (!splash.isDestroyed()) splash.destroy();
    fatal(e.message);
  }
}

app.whenReady().then(() => { if (app.hasSingleInstanceLock()) void main(); });
app.on("window-all-closed", () => { app.quit(); });
app.on("before-quit", () => { quitting = true; stopServer(); });
process.on("exit", stopServer);
