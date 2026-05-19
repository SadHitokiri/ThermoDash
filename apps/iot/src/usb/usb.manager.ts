import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { eventBus } from '../core/eventBus'

type ConnectedDevice = {
    port: SerialPort,
    path: string
}

const supportedVendorIds = new Set([
    "0403", // FTDI USB serial adapters
    "067B", // Prolific USB serial adapters
    "0843",
    "10C4", // Silicon Labs CP210x
    "1A86", // WCH CH340/CH341
    "2341", // Arduino
    "239A", // Adafruit boards
    "2A03", // Arduino.org
])
const supportedManufacturerPattern = /arduino|ch340|ch341|wch|silicon labs|cp210|ftdi|prolific/i
const devices = new Map<string, ConnectedDevice>()
const pendingDevices = new Set<string>()

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

    let ports

    try {
        ports = await SerialPort.list()
    } catch (error) {
        console.error(`Unable to list serial ports: ${error instanceof Error ? error.message : String(error)}`)
        return
    }

    for (const portInfo of ports) {
        const vendorId = portInfo.vendorId?.toUpperCase()
        const manufacturer = portInfo.manufacturer ?? ""
        const isSupported =
            Boolean(vendorId && supportedVendorIds.has(vendorId)) ||
            supportedManufacturerPattern.test(manufacturer)

        if (isSupported && !devices.has(portInfo.path) && !pendingDevices.has(portInfo.path)) {
            connectDevice(portInfo.path)
        }
    }
}

// Connect device and set up data listener.
function connectDevice(path: string) {
    if (devices.has(path) || pendingDevices.has(path)) return

    pendingDevices.add(path)
    const port = new SerialPort({
        path,
        baudRate: 9600,
        autoOpen: false,
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
        pendingDevices.delete(path)
        devices.delete(path)
        publishDeviceList()
    })

    port.on('error', (error) => {
        console.error(`Serial error on ${path}: ${error.message}`)
        pendingDevices.delete(path)

        if (!port.isOpen) {
            devices.delete(path)
        }
    })

    port.open((error) => {
        pendingDevices.delete(path)

        if (error) {
            console.error(`Unable to open ${path}: ${error.message}`)
            devices.delete(path)
            return
        }

        devices.set(path, { port, path })
        console.log(`Connected ${path}`)
        publishDeviceList()
    })
}
