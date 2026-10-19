import { eventBus } from "./core/eventBus"
import { db } from "./db"
import { insertSensorData } from "./report-process"

const mockDevices = [
  { id: "mock-thermocouple-1", name: "Reactor A", baseline: 82 },
  { id: "mock-thermocouple-2", name: "Reactor B", baseline: 116 },
]
const DAY_MS = 24 * 60 * 60 * 1000

export async function seedMockSensorData() {
  const existing = await db.execute("SELECT COUNT(*) as count FROM sensor_data")
  if (Number(existing.rows[0]?.count ?? 0) > 0) return

  const now = Date.now()
  for (let dayOffset = 29; dayOffset >= 0; dayOffset -= 1) {
    for (const [index, device] of mockDevices.entries()) {
      for (let sample = 0; sample < 4; sample += 1) {
        const timestamp = now - dayOffset * DAY_MS - sample * 6 * 60 * 60 * 1000
        const temperature = device.baseline + Math.sin((dayOffset + sample + index) * 0.8) * 7
        await insertSensorData(device.id, Number(temperature.toFixed(1)), timestamp)
      }
    }
  }

  for (const device of mockDevices) {
    await db.execute({
      sql: `
        INSERT INTO sensor_names (sensor_id, display_name, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(sensor_id) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at
      `,
      args: [device.id, device.name, now],
    })
  }
}

export function startMockDevices() {
  let tick = 0
  const publish = () => {
    const time = Date.now()
    eventBus.emit("devices", { type: "devices", devices: mockDevices.map((device) => device.id), time })

    for (const [index, device] of mockDevices.entries()) {
      const value = device.baseline + Math.sin(tick / 4 + index) * 6 + Math.sin(tick / 13 + index) * 1.5
      eventBus.emit("telemetry", {
        type: "temperature",
        deviceId: device.id,
        value: Number(value.toFixed(1)),
        time,
      })
    }
    tick += 1
  }

  publish()
  return setInterval(publish, 2000)
}
