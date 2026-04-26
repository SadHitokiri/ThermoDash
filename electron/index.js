const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenu(null);

  mainWindow.loadURL("http://localhost:3000");
}

function startServers() {
  if (isDev) return;

  backendProcess = spawn("node", [
    path.join(process.resourcesPath, "apps/iot/dist/index.js"),
  ]);

  nextProcess = spawn("node", [
    path.join(process.resourcesPath, "apps/dashboard/server.js"),
  ]);
}

app.whenReady().then(() => {
  startServers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (nextProcess) nextProcess.kill();
  app.quit();
});