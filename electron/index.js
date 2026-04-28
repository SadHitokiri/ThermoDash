const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
const frontendPort = process.env.DASHBOARD_PORT || "3000";
const backendPort = process.env.IOT_PORT || "4000";
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const backendHealthUrl = `http://127.0.0.1:${backendPort}/health-status`;

let mainWindow;
let backendProcess;
let nextProcess;

function getWindowIcon() {
  if (process.platform === "win32") {
    return path.join(__dirname, "..", "assets", "icon.ico");
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, "dashboard", "apps", "dashboard", "public", "logo.png");
  }

  return path.join(__dirname, "..", "apps", "dashboard", "public", "logo.png");
}

function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(check, 500);
      });

      req.setTimeout(1000, () => req.destroy());
    };

    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenu(null);

  mainWindow.loadURL(frontendUrl);
}

function startServers() {
  if (isDev) return;

  const userDataPath = app.getPath("userData");
  const packagedNodeModules = path.join(process.resourcesPath, "app.asar", "node_modules");
  const commonEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_PATH: packagedNodeModules,
  };

  backendProcess = fork(path.join(process.resourcesPath, "app.asar", "apps", "iot", "dist", "index.js"), [], {
    cwd: userDataPath,
    env: {
      ...commonEnv,
      PORT: backendPort,
      THERMODASH_DATA_DIR: path.join(userDataPath, "data"),
    },
    stdio: "pipe",
  });

  nextProcess = fork(path.join(process.resourcesPath, "dashboard", "apps", "dashboard", "server.js"), [], {
    cwd: path.join(process.resourcesPath, "dashboard"),
    env: {
      ...commonEnv,
      PORT: frontendPort,
      HOSTNAME: "127.0.0.1",
    },
    stdio: "pipe",
  });

  backendProcess.stdout?.on("data", (data) => console.log(`[iot] ${data}`));
  backendProcess.stderr?.on("data", (data) => console.error(`[iot] ${data}`));
  nextProcess.stdout?.on("data", (data) => console.log(`[dashboard] ${data}`));
  nextProcess.stderr?.on("data", (data) => console.error(`[dashboard] ${data}`));
}

function stopServers() {
  if (backendProcess) backendProcess.kill();
  if (nextProcess) nextProcess.kill();
}

app.whenReady().then(async () => {
  startServers();

  try {
    await Promise.all([
      waitForUrl(frontendUrl),
      waitForUrl(backendHealthUrl),
    ]);
    createWindow();
  } catch (error) {
    dialog.showErrorBox("ThermoDash failed to start", error.message);
    stopServers();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopServers();
  app.quit();
});
