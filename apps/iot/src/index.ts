import express from 'express';
import http from 'http';
import { checkDevices } from './usb/usb.manager';
import { initWsServer } from './ws/ws.server';
import { initDB, getReportDays, getLastReadings, getReportForDay } from './report-process';

let wsBus: any;

async function bootstrap() {
    const app = express();
    const server = http.createServer(app);
    await initDB()

    app.get('/health-status', (_, res) => res.json({ ok: true, status: 'Thermocouple Spectator IoT Backend is running', timestamp: new Date().toUTCString() }));

    app.get("/api/reports", async (req, res) => {
        const data = await getReportDays()
        res.json(data)
    })

    app.get("/api/report-csv", async (req, res) => {
        const day = req.query.day as string

        const start = new Date(day)
        start.setHours(0, 0, 0, 0)

        const end = new Date(day)
        end.setHours(23, 59, 59, 999)

        const result = await getReportForDay(start, end)

        const header = "timestamp,sensor_id,temperature\n"

        const rows = result.rows
            .map(r => {
                const ts = Number(r.timestamp)

                return `${new Date(ts).toISOString()},${r.sensor_id},${r.temperature}`
            })
            .join("\n")

        const csv = header + rows

        res.setHeader("Content-Type", "text/csv")
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="report-${day}.csv"`
        )

        res.send(csv)
    })

    app.get('/api/sensor-data/:deviceId', (req, res) => {
        const { deviceId } = req.params
        const data = getLastReadings(deviceId)
        res.json(data)
    })

    wsBus = initWsServer(server)

    //Call the scan for devices each 5 seconds
    setInterval(checkDevices, 5000)

    server.listen(4000, () => {
        console.log('🚀 Backend running on :4000')
    })
}

bootstrap();