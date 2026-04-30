import { useCallback, useEffect, useState } from "react"

const apiBaseUrl = "http://127.0.0.1:4000"

type SensorName = {
  sensorId: string
  displayName: string
}

export function useSensorNames() {
  const [sensorNames, setSensorNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let isMounted = true

    async function loadSensorNames() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/sensor-names`)
        if (!response.ok) return

        const data = (await response.json()) as SensorName[]
        if (!isMounted) return

        setSensorNames(
          new Map(
            data
              .filter((item) => item.sensorId && typeof item.displayName === "string")
              .map((item) => [item.sensorId, item.displayName.trim()])
          )
        )
      } catch {
        // The dashboard can still run with system port names if the backend is unavailable.
      }
    }

    loadSensorNames()

    return () => {
      isMounted = false
    }
  }, [])

  const updateSensorName = useCallback(async (sensorId: string, displayName: string) => {
    const trimmedName = displayName.trim()

    const response = await fetch(`${apiBaseUrl}/api/sensor-names/${encodeURIComponent(sensorId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: trimmedName }),
    })

    if (!response.ok) {
      throw new Error("Failed to update sensor name")
    }

    const data = (await response.json()) as SensorName
    const savedName = data.displayName.trim()

    setSensorNames((current) => {
      const next = new Map(current)

      if (savedName) {
        next.set(sensorId, savedName)
      } else {
        next.delete(sensorId)
      }

      return next
    })

    return savedName
  }, [])

  return {
    sensorNames,
    updateSensorName,
  }
}
