import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { eventBus } from '../core/eventBus'

type ConnectedDevice = {
    port: SerialPort,
    path: string
}

const supportedVendorIds = new Set(["0843", "1A86", "10C4"])
const devices = new Map<string, ConnectedDevice>()

export function getConnectedDeviceIds() {
    return Array.from(devices.keys())
}

function publishDeviceList() {
    eventBus.emit('devices', {
        type: 'devices',
        devices: getConnectedDeviceIds(),
        time: Date.now()
    })
}

function parseTemperature(line: string) {
    const trimmed = line.trim()

    if (!trimmed) return null

    const directValue = Number(trimmed)
    if (Number.isFinite(directValue)) return directValue

    try {
        const json = JSON.parse(trimmed)
        const value = json.temperature ?? json.temp ?? json.value
        const temperature = Number(value)

        if (Number.isFinite(temperature)) return temperature
    } catch {
        // Some devices send plain text such as "Temperature: 24.5".
    }

    const match = trimmed.match(/-?\d+(?:[.,]\d+)?/)
    if (!match) return null

    const temperature = Number(match[0].replace(',', '.'))
    return Number.isFinite(temperature) ? temperature : null
}

// Scan for Arduino-compatible serial devices.
export async function checkDevices() {
    if (devices.size > 0) {
        console.log(`Connected devices: ${Array.from(devices.keys()).join(', ')}`)
    }

    const ports = await SerialPort.list()

    for (const portInfo of ports) {
        if (portInfo.vendorId && supportedVendorIds.has(portInfo.vendorId.toUpperCase())) {
            if (!devices.has(portInfo.path)) {
                connectDevice(portInfo.path)
            }
        }
    }
}

// Connect device and set up data listener.
function connectDevice(path: string) {
    if (devices.has(path)) return

    const port = new SerialPort({
        path,
        baudRate: 9600,
    })

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

    parser.on('data', (line) => {
        const temperature = parseTemperature(line)

        if (temperature == null) {
            console.warn(`Unable to parse temperature from ${path}: ${line}`)
            return
        }

        eventBus.emit('telemetry', {
            type: 'temperature',
            deviceId: path,
            value: temperature,
            time: Date.now()
        })
    })

    port.on('close', () => {
        console.log(`Disconnected ${path}`)
        devices.delete(path)
        publishDeviceList()
    })

    port.on('error', (error) => {
        console.error(`Serial error on ${path}: ${error.message}`)
    })

    devices.set(path, { port, path })
    console.log(`Connected ${path}`)
    publishDeviceList()
}
