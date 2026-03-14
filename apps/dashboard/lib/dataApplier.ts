export type DeviceState = {
    deviceId: string,
    temperature?: number,
    lastSeen?: string
}

const devices = new Map<string, DeviceState>()

export function applyData(message: any) {
    const { deviceId, value, time } = message
    if (!deviceId) return

    if (!devices.has(deviceId)) {
        devices.set(deviceId, { deviceId })
    }

    const device = devices.get(deviceId)!

    const temperature = Number(value)
    if (!isNaN(temperature)) {
        device.temperature = temperature
        device.lastSeen = new Date(time).toLocaleTimeString()
    }
    return devices
}
