import { db } from "./db"

export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      temperature REAL NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `)

  console.log("DB ready")
}

export async function insertSensorData(sensorId: string, temp: number) {
  await db.execute({
    sql: `
      INSERT INTO sensor_data (sensor_id, temperature, timestamp)
      VALUES (?, ?, ?)
    `,
    args: [sensorId, temp, Date.now()]
  })
}

export async function getReportDays() {
  const res = await db.execute(`
    SELECT
      DATE(timestamp / 1000, 'unixepoch') as day,
      COUNT(*) as rows
    FROM sensor_data
    GROUP BY day
    ORDER BY day DESC
  `)

  return res.rows.map((row) => ({
    day: String(row.day),
    rows: Number(row.rows),
  }))
}

export async function getReportForDay(start: Date, end: Date) {
  const res = await db.execute({
    sql: `
      SELECT sensor_id, temperature, timestamp
      FROM sensor_data
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `,
    args: [start.getTime(), end.getTime()]
  })

  return res
}

export async function getLastReadings(deviceId: string, limit = 100) {
  const res = await db.execute({
    sql: `
      SELECT *
      FROM sensor_data
      WHERE sensor_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `,
    args: [deviceId, limit]
  })

  return res.rows
}
