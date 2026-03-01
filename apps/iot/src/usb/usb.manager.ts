import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { eventBus } from '../core/eventBus'

type ConnectedDevice = {
    port: SerialPort,
    path: string
}

const devices = new Map<string, ConnectedDevice>()

// Scan for Arduino devices
export async function checkDevices() {
    if (devices.size > 0) {
        console.log(`Connected devices: ${Array.from(devices.keys()).join(', ')}`)
    }
    const ports = await SerialPort.list()

    for (const portInfo of ports) {
        if (portInfo.vendorId == "0843" || portInfo.vendorId == "1A86" || portInfo.vendorId == "10C4") {
            if (!devices.has(portInfo.path)) {
                connectDevice(portInfo.path)
            }
        }
    }
}

// Connect device and set up data listener
function connectDevice(path: string) {
    if (devices.has(path)) return

    const port = new SerialPort({
        path: path,
        baudRate: 9600,
    })

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

    parser.on('data', (line) => {

            eventBus.emit('telemetry', {
                type: 'temperature',
                deviceId: path,
                value: parseFloat(line),
                time: Date.now()
            })
    })

    port.on('close', () => {
        console.log(`🔴 Disconnected ${path}`)
        devices.delete(path)
    })

    devices.set(path, { port, path })
    console.log(`🟢 Connected ${path}`)
}