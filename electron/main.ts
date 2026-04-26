import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import waitOn from "wait-on";

let mainWindow: BrowserWindow | null = null;
let turboProcess: any;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
    });

    mainWindow.loadURL("http://localhost:3000");
}

app.whenReady().then(async () => {
    turboProcess = spawn("pnpm", ["start"], {
        cwd: path.join(__dirname, ".."),
        shell: true,
    });

    turboProcess.stdout.on("data", (data: Buffer) => {
        console.log(`[turbo]: ${data}`);
    });

    turboProcess.stderr.on("data", (data: Buffer) => {
        console.error(`[turbo error]: ${data}`);
    });

    await waitOn({
        resources: ["http://localhost:3000"],
    });

    createWindow();
});

app.on("window-all-closed", () => {
    if (turboProcess) turboProcess.kill();
    app.quit();
});