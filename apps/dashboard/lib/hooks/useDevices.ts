import { useEffect, useRef, useState } from 'react'
import { applyData, DeviceState } from '@/lib/dataApplier'
import { connectWs } from '@/lib/ws'

export function useDevices() {
    const [devices, setDevices] = useState<Map<string, DeviceState>>(
        new Map()
    )

    useEffect(() => {
        connectWs((msg) => { 
            const updated = applyData(msg)
            if (updated) {
                setDevices(new Map(updated))
            }
        })
    }, [])
    return devices
}
