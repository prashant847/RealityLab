// A small, deliberate bridge: the page can ask the window to zoom (text size for people who need larger text) and hear about keyboard zoom.
// It exposes nothing else: the web app has no Node access and talks to its local service over HTTP.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rlDesktop", {
  setZoom: (factor) => ipcRenderer.send("rl:zoom", Number(factor)),
  onZoom: (cb) => ipcRenderer.on("rl:zoomed", (_e, factor) => cb(factor)),
});
