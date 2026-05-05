import { useEffect, useState } from 'react'
import { applyData, DeviceState, getDevicesSnapshot } from '@/lib/dataApplier'
import { connectWs } from '@/lib/ws'

export function useDevices() {
    const [devices, setDevices] = useState<Map<string, DeviceState>>(
        getDevicesSnapshot()
    )

    useEffect(() => {
        setDevices(getDevicesSnapshot())

        const disconnect = connectWs((msg) => { 
            const updated = applyData(msg)
            if (updated) {
                setDevices(new Map(updated))
            }
        })

        return disconnect
    }, [])
    return devices
}
