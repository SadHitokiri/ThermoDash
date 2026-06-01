const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
const frontendPort = process.env.DASHBOARD_PORT || "3000";
const backendPort = process.env.IOT_PORT || "4000";
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const backendHealthUrl = `http://127.0.0.1:${backendPort}/health-status`;

let mainWindow;
let backendProcess;
let nextProcess;
let updateCheckInterval;
let updateStatus = {
  state: "idle",
  updateAvailable: false,
  version: null,
  error: null,
};
let updatePromptShownForVersion = null;
let isCheckingForUpdates = false;
let isDownloadingUpdate = false;

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

  mainWindow.maximize();

  mainWindow.setMenu(null);

  mainWindow.loadURL(frontendUrl);
}

function sendUpdateStatus(nextStatus = {}) {
  updateStatus = {
    ...updateStatus,
    ...nextStatus,
  };

  mainWindow?.webContents.send("updates:status", updateStatus);
}

async function askToDownloadUpdate(version) {
  if (!mainWindow || updatePromptShownForVersion === version) return;

  updatePromptShownForVersion = version;
  const versionLabel = version ? ` ${version}` : "";

  const result = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["Update now", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "ThermoDash update available",
    message: `ThermoDash${versionLabel} is available.`,
    detail: "Install the update now or continue working and use the Update button later.",
  });

  if (result.response === 0) {
    downloadUpdate();
    return;
  }

  sendUpdateStatus({
    state: "available",
    updateAvailable: true,
    version,
    error: null,
  });
}

async function askToInstallDownloadedUpdate(version) {
  if (!mainWindow) return;

  const result = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["Restart and install", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "ThermoDash update ready",
    message: `ThermoDash ${version || ""} is ready to install.`.trim(),
    detail: "Restart the app to finish installing the update.",
  });

  if (result.response === 0) {
    autoUpdater.quitAndInstall(false, true);
    return;
  }

  sendUpdateStatus({
    state: "downloaded",
    updateAvailable: true,
    version,
    error: null,
  });
}

async function checkForUpdates({ userInitiated = false } = {}) {
  if (isDev) {
    sendUpdateStatus({
      state: "unavailable",
      updateAvailable: false,
      error: null,
    });
    return updateStatus;
  }

  if (isCheckingForUpdates || isDownloadingUpdate) {
    return updateStatus;
  }

  isCheckingForUpdates = true;

  if (userInitiated) {
    sendUpdateStatus({ state: "checking", error: null });
  }

  try {
    const result = await autoUpdater.checkForUpdates();

    if (!result?.updateInfo) {
      sendUpdateStatus({
        state: "unavailable",
        updateAvailable: false,
        error: null,
      });
    }
  } catch (error) {
    console.error("Update check failed", error);
    sendUpdateStatus({
      state: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isCheckingForUpdates = false;
  }

  return updateStatus;
}

async function downloadUpdate() {
  if (isDev || isDownloadingUpdate) {
    return updateStatus;
  }

  isDownloadingUpdate = true;
  sendUpdateStatus({ state: "downloading", updateAvailable: true, error: null });

  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.error("Update download failed", error);
    sendUpdateStatus({
      state: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isDownloadingUpdate = false;
  }

  return updateStatus;
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ state: "checking", error: null });
  });

  autoUpdater.on("update-available", (info) => {
    const version = info.version || null;

    sendUpdateStatus({
      state: "available",
      updateAvailable: true,
      version,
      error: null,
    });

    askToDownloadUpdate(version);
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus({
      state: "unavailable",
      updateAvailable: false,
      error: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      updateAvailable: true,
      progress: Math.round(progress.percent || 0),
      error: null,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    const version = info.version || updateStatus.version;

    sendUpdateStatus({
      state: "downloaded",
      updateAvailable: true,
      version,
      progress: 100,
      error: null,
    });

    askToInstallDownloadedUpdate(version);
  });

  autoUpdater.on("error", (error) => {
    console.error("Updater error", error);
    sendUpdateStatus({
      state: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

function startUpdateChecks() {
  if (isDev) return;

  checkForUpdates();
  updateCheckInterval = setInterval(() => checkForUpdates(), 60 * 60 * 1000);
}

function registerUpdateIpcHandlers() {
  ipcMain.handle("updates:get-status", () => updateStatus);
  ipcMain.handle("updates:check", () => checkForUpdates({ userInitiated: true }));
  ipcMain.handle("updates:install", async () => {
    if (updateStatus.state === "downloaded") {
      autoUpdater.quitAndInstall(false, true);
      return updateStatus;
    }

    return downloadUpdate();
  });
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
  if (updateCheckInterval) clearInterval(updateCheckInterval);
}

app.whenReady().then(async () => {
  configureAutoUpdater();
  registerUpdateIpcHandlers();
  startServers();

  try {
    await Promise.all([
      waitForUrl(frontendUrl),
      waitForUrl(backendHealthUrl),
    ]);
    createWindow();
    startUpdateChecks();
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
