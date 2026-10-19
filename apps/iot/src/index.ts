import express from 'express';
import http from 'http';
import { checkDevices } from './usb/usb.manager';
import { initWsServer } from './ws/ws.server';
import {
    initDB,
    getReportDays,
    removeExpiredSensorData,
    getLastReadings,
    getReportForDay,
    getSensorNames,
    updateSensorName,
    getSensorCalibrations,
    updateSensorCalibration,
} from './report-process';
import { createReportWorkbook } from './xlsx';
import { seedMockSensorData, startMockDevices } from './mock';
import {
    getLogEntries,
    getLogFilePath,
    installConsoleLogger,
    writeLog,
    type LogLevel,
} from './logger';

let wsBus: any;
const isMockMode = process.env.THERMODASH_MOCK_MODE === "1"
const allowedOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000"])
const logLevels = new Set<LogLevel>(["info", "warn", "error"])

installConsoleLogger()

async function bootstrap() {
    const port = Number(process.env.PORT ?? 4000)
    const app = express();
    const server = http.createServer(app);
    await initDB()
    if (isMockMode) {
        await seedMockSensorData()
        console.log("Mock mode enabled: virtual devices and sample history are active")
    }
    const removedRows = await removeExpiredSensorData()
    if (removedRows > 0) {
        console.log(`Removed ${removedRows} sensor readings older than 30 days`)
    }

    app.use((req, res, next) => {
        const origin = req.headers.origin

        if (typeof origin === "string" && allowedOrigins.has(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin)
            res.setHeader("Vary", "Origin")
        }

        res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type")

        if (req.method === "OPTIONS") {
            res.sendStatus(204)
            return
        }

        next()
    })

    app.use(express.json())

    app.get('/health-status', (_, res) => res.json({ ok: true, status: 'Thermocouple Spectator IoT Backend is running', timestamp: new Date().toUTCString() }));

    app.get("/api/reports", async (req, res) => {
        const requestedPage = Number(req.query.page ?? 1)
        const requestedPageSize = Number(req.query.pageSize ?? 14)
        const data = await getReportDays(requestedPage, requestedPageSize)
        res.json(data)
    })

    app.get("/api/report-xlsx", async (req, res) => {
        try {
            const day = req.query.day as string

            const start = new Date(day)
            start.setHours(0, 0, 0, 0)

            const end = new Date(day)
            end.setHours(23, 59, 59, 999)

            const result = await getReportForDay(start, end)
            const workbook = createReportWorkbook(result.rows)

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
            res.setHeader("Pragma", "no-cache")
            res.setHeader("Expires", "0")
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="report-${day}.xlsx"`
            )

            res.send(workbook)
        } catch (error) {
            writeLog("error", "Failed to create Excel report", error)
            res.status(500).json({ error: "Failed to create Excel report" })
        }
    })

    app.get("/api/sensor-names", async (_, res) => {
        const data = await getSensorNames()
        res.json(data)
    })

    app.put("/api/sensor-names/:sensorId", async (req, res) => {
        const sensorId = req.params.sensorId
        const displayName = typeof req.body?.displayName === "string" ? req.body.displayName : ""

        if (!sensorId) {
            res.status(400).json({ error: "Sensor ID is required" })
            return
        }

        const result = await updateSensorName(sensorId, displayName)
        res.json(result ?? { sensorId, displayName: "" })
    })

    app.get("/api/sensor-calibrations", async (_, res) => {
        const data = await getSensorCalibrations()
        res.json(data)
    })

    app.put("/api/sensor-calibrations/:sensorId", async (req, res) => {
        const sensorId = req.params.sensorId
        const expression = typeof req.body?.expression === "string" ? req.body.expression : ""

        if (!sensorId) {
            res.status(400).json({ error: "Sensor ID is required" })
            return
        }

        try {
            const result = await updateSensorCalibration(sensorId, expression)
            res.json(result ?? { sensorId, expression: "" })
        } catch (error) {
            writeLog("warn", `Rejected calibration expression for ${sensorId}`, error)
            res.status(400).json({ error: "Use a simple expression like +1, -0.5, *2, or /1.1" })
        }
    })

    app.get('/api/sensor-data/:deviceId', (req, res) => {
        const { deviceId } = req.params
        const data = getLastReadings(deviceId)
        res.json(data)
    })

    app.get("/api/logs", (req, res) => {
        const limit = Math.min(Number(req.query.limit ?? 200) || 200, 1000)
        const requestedLevel = req.query.level
        const level =
            typeof requestedLevel === "string" && logLevels.has(requestedLevel as LogLevel)
                ? requestedLevel as LogLevel
                : undefined

        res.json({
            file: getLogFilePath(),
            entries: getLogEntries(limit, level),
        })
    })

    app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        writeLog("error", `${req.method} ${req.originalUrl} failed`, error)
        res.status(500).json({ error: "Internal server error" })
    })

    wsBus = initWsServer(server)

    server.listen(port, "127.0.0.1", () => {
        console.log(`Backend running on :${port}`)
    })

    if (isMockMode) {
        startMockDevices()
    } else {
        checkDevices()
        setTimeout(checkDevices, 1000)
        setTimeout(checkDevices, 3000)
        setInterval(checkDevices, 5000)
    }
    setInterval(async () => {
        try {
            const removed = await removeExpiredSensorData()
            if (removed > 0) {
                console.log(`Removed ${removed} sensor readings older than 30 days`)
            }
        } catch (error) {
            writeLog("error", "Failed to remove expired sensor readings", error)
        }
    }, 24 * 60 * 60 * 1000)
}

bootstrap();
