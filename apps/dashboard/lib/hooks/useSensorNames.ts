import { useCallback, useEffect, useState } from "react"
import { normalizeCalibrationExpression } from "@/lib/calibration"

const apiBaseUrl = "http://127.0.0.1:4000"

type SensorName = {
  sensorId: string
  displayName: string
}

type SensorCalibration = {
  sensorId: string
  expression: string
}

export function useSensorNames() {
  const [sensorNames, setSensorNames] = useState<Map<string, string>>(new Map())
  const [sensorCalibrations, setSensorCalibrations] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let isMounted = true

    async function loadSensorNames() {
      try {
        const [namesResponse, calibrationsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/sensor-names`),
          fetch(`${apiBaseUrl}/api/sensor-calibrations`),
        ])

        if (!isMounted) return

        if (namesResponse.ok) {
          const data = (await namesResponse.json()) as SensorName[]

          setSensorNames(
            new Map(
              data
                .filter((item) => item.sensorId && typeof item.displayName === "string")
                .map((item) => [item.sensorId, item.displayName.trim()])
            )
          )
        }

        if (calibrationsResponse.ok) {
          const data = (await calibrationsResponse.json()) as SensorCalibration[]

          setSensorCalibrations(
            new Map(
              data
                .filter((item) => item.sensorId && typeof item.expression === "string")
                .map((item) => [item.sensorId, item.expression.trim()])
            )
          )
        }
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

  const updateSensorCalibration = useCallback(async (sensorId: string, expression: string) => {
    const normalizedExpression = normalizeCalibrationExpression(expression)

    if (normalizedExpression == null) {
      throw new Error("Use a simple expression like +1, -0.5, *2, or /1.1")
    }

    const response = await fetch(`${apiBaseUrl}/api/sensor-calibrations/${encodeURIComponent(sensorId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expression: normalizedExpression }),
    })

    if (!response.ok) {
      throw new Error("Failed to update sensor calibration")
    }

    const data = (await response.json()) as SensorCalibration
    const savedExpression = data.expression.trim()

    setSensorCalibrations((current) => {
      const next = new Map(current)

      if (savedExpression) {
        next.set(sensorId, savedExpression)
      } else {
        next.delete(sensorId)
      }

      return next
    })

    return savedExpression
  }, [])

  return {
    sensorNames,
    sensorCalibrations,
    updateSensorName,
    updateSensorCalibration,
  }
}
