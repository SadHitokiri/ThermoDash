import express from 'express';
import http from 'http';
import { checkDevices } from './usb/usb.manager';
import { initWsServer } from './ws/ws.server';

let wsBus: any;

async function bootstrap() {
    const app = express();
    const server = http.createServer(app);

    app.get('/health-status', (_, res) => res.json({ ok: true, status: 'Thermocouple Spectator IoT Backend is running', timestamp: new Date().toUTCString() }));

    wsBus = initWsServer(server)
    
    //Call the scan for devices each 5 seconds
    setInterval(checkDevices, 5000)

    server.listen(4000, () => {
        console.log('🚀 Backend running on :4000')
    })
}

bootstrap();