// RealityLab AI desktop shell: starts the local simulation service, waits until it is healthy, shows the app in its own window,
// and stops the service when the app closes. The user never opens a browser or starts anything by hand.
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
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

if (!app.requestSingleInstanceLock()) { app.quit(); }
else app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

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
    cmd = path.join(process.resourcesPath, "backend", "realitylab-server.exe"); args = ["--port", String(port)]; cwd = path.dirname(cmd);
  } else {                                                      // development: run from the source tree
    env.REALITYLAB_FRONTEND = process.env.REALITYLAB_FRONTEND || path.join(root, "frontend", "dist");
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

async function main() {
  Menu.setApplicationMenu(null);
  const icon = path.join(__dirname, "assets", "icon.ico");
  const splash = new BrowserWindow({ width: 420, height: 300, frame: false, resizable: false, show: true, icon, backgroundColor: "#0a0f18", alwaysOnTop: true });
  splash.loadFile(path.join(__dirname, "splash.html"));
  try {
    const port = await freePort();
    startServer(port);
    await waitHealthy(port, 45000);
    win = new BrowserWindow({
      width: 1360, height: 880, minWidth: 960, minHeight: 640, show: false, title: "RealityLab AI", icon, backgroundColor: "#0a0f18", autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    const origin = `http://127.0.0.1:${port}`;
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url) && !url.startsWith(origin)) shell.openExternal(url); return { action: "deny" }; });
    win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(origin)) e.preventDefault(); });
    win.once("ready-to-show", () => { splash.destroy(); win.show(); });
    win.on("closed", () => { win = null; });
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
