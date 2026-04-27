# ThermoDash

![ThermoDash logo](apps/dashboard/public/banner.png)

ThermoDash is a desktop application for monitoring thermocouple sensor data, viewing connected devices, and exporting temperature history reports.

The application is built as an Electron desktop app and runs two local services together:

- Dashboard frontend: Next.js UI on `127.0.0.1:3000`
- IoT backend: local API, WebSocket server, USB/device handling, and database access on `127.0.0.1:4000`

These two parts are designed to work together and should not be deployed separately for normal desktop usage.

## Main Features

- Live temperature monitoring from connected devices
- Device overview page
- Temperature history storage in a local database
- Statistics page with report days and row counts
- Excel report export for each recorded day
- Packaged Windows desktop installer

## Installing the Desktop App

```text
dist/ThermoDash Setup 1.0.0.exe
```

Run the installer and open ThermoDash from the Start menu or desktop shortcut. The application starts the dashboard and backend automatically.

The following build artifacts are internal and are not needed for installation:

- `dist/win-unpacked`
- `dist/latest.yml`
- `dist/*.blockmap`
- `dist/builder-debug.yml`

## Local Data

Each installation uses its own local database. The database is created automatically on first run.

On Windows, the database is stored in the application data directory:

```text
C:\Users\<user>\AppData\Roaming\ThermoDash\data\data.db
```

This means:

- Sensor history is stored on the local machine.
- Reinstalling the app usually keeps the database, because it is stored in `AppData`, not inside the installation folder.
- Deleting the app data folder removes the local temperature history.

## Using the App

1. Install and open ThermoDash.
2. Connect the supported thermocouple/Arduino device.
3. Use the main dashboard to monitor live temperature readings.
4. Open the Devices page to view detected devices.
5. Open the Statistics page to view stored history grouped by day.
6. Click `Download Excel` next to a day to export that day's report as an `.xlsx` file.

The Excel report contains:

- Timestamp
- Sensor ID
- Temperature

## Development

Install dependencies:

```bash
pnpm install
```

Run the full development environment:

```bash
pnpm dev:full
```

This starts the workspace development tasks and opens Electron after the dashboard is available.

Build all packages:

```bash
pnpm build
```

Create the Windows desktop installer:

```bash
pnpm dist
```

The installer is generated in:

```text
dist/ThermoDash Setup 1.0.0.exe
```

## Project Structure

```text
apps/dashboard  Next.js dashboard frontend
apps/iot        IoT backend, WebSocket server, database, reports
electron        Electron main/preload files
assets          Application icons and shared assets
dist            Generated desktop build output
```

## Runtime Notes

In the packaged desktop app, Electron starts both local services and waits until they are ready before opening the main window.

The frontend communicates with the backend through:

```text
http://127.0.0.1:4000
ws://127.0.0.1:4000
```

The Statistics page uses the backend report API and downloads Excel files from:

```text
http://127.0.0.1:4000/api/report-xlsx?day=YYYY-MM-DD
```

## License

ThermoDash is released under the ISC License. See [LICENSE](LICENSE) for details.
