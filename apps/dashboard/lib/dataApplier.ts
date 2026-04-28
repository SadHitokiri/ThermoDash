export type DeviceState = {
    deviceId: string,
    temperature?: number,
    lastSeen?: string
}

const devices = new Map<string, DeviceState>()

export function applyData(message: any) {
    if (message.type === 'devices' && Array.isArray(message.devices)) {
        const activeDeviceIds = new Set<string>(
            message.devices.filter((deviceId: unknown): deviceId is string => typeof deviceId === 'string')
        )

        for (const deviceId of activeDeviceIds) {
            if (!devices.has(deviceId)) {
                devices.set(deviceId, { deviceId })
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
