export type DeviceState = {
    deviceId: string,
    temperature?: number,
    lastSeen?: string,
    history: TemperaturePoint[]
}

export type TemperaturePoint = {
    timestamp: number,
    temperature: number
}

const MAX_HISTORY_POINTS = 50000
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000
const devices = new Map<string, DeviceState>()

export function getDevicesSnapshot() {
    return new Map(devices)
}

export function applyData(message: any) {
    if (message.type === 'devices' && Array.isArray(message.devices)) {
        const activeDeviceIds = new Set<string>(
            message.devices.filter((deviceId: unknown): deviceId is string => typeof deviceId === 'string')
        )

        for (const deviceId of activeDeviceIds) {
            if (!devices.has(deviceId)) {
                devices.set(deviceId, { deviceId, history: [] })
            }
        }

        for (const deviceId of devices.keys()) {
            if (!activeDeviceIds.has(deviceId)) {
                devices.delete(deviceId)
            }
        }

        return devices
    }

    const { deviceId, value, time } = message
    if (!deviceId) return

    if (!devices.has(deviceId)) {
        devices.set(deviceId, { deviceId, history: [] })
    }

    const device = devices.get(deviceId)!

    const temperature = Number(value)
    if (!isNaN(temperature)) {
        const timestamp = Number(time) || Date.now()
        device.temperature = temperature
        device.lastSeen = new Date(timestamp).toLocaleTimeString()
        device.history.push({ timestamp, temperature })

        while (
            device.history.length > 0 &&
            timestamp - device.history[0].timestamp > MAX_HISTORY_AGE_MS
        ) {
            device.history.shift()
        }

        if (device.history.length > MAX_HISTORY_POINTS) {
            device.history.shift()
        }
    }
    return devices
}
