import { db } from "./db"
import { normalizeCalibrationExpression } from "./calibration"

export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      temperature REAL NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sensor_names (
      sensor_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sensor_calibrations (
      sensor_id TEXT PRIMARY KEY,
      expression TEXT NOT NULL,
      updated_at INTEGER NOT NULL
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
      SELECT
        sensor_data.sensor_id,
        sensor_names.display_name,
        sensor_calibrations.expression as calibration_expression,
        sensor_data.temperature,
        sensor_data.timestamp
      FROM sensor_data
      LEFT JOIN sensor_names ON sensor_names.sensor_id = sensor_data.sensor_id
      LEFT JOIN sensor_calibrations ON sensor_calibrations.sensor_id = sensor_data.sensor_id
      WHERE sensor_data.timestamp BETWEEN ? AND ?
      ORDER BY sensor_data.timestamp
    `,
    args: [start.getTime(), end.getTime()]
  })

  return res
}

export async function getSensorNames() {
  const res = await db.execute(`
    SELECT sensor_id, display_name
    FROM sensor_names
    ORDER BY sensor_id
  `)

  return res.rows.map((row) => ({
    sensorId: String(row.sensor_id),
    displayName: String(row.display_name),
  }))
}

export async function updateSensorName(sensorId: string, displayName: string) {
  const trimmedName = displayName.trim()

  if (trimmedName.length === 0) {
    await db.execute({
      sql: `
        DELETE FROM sensor_names
        WHERE sensor_id = ?
      `,
      args: [sensorId],
    })

    return null
  }

  await db.execute({
    sql: `
      INSERT INTO sensor_names (sensor_id, display_name, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sensor_id) DO UPDATE SET
        display_name = excluded.display_name,
        updated_at = excluded.updated_at
    `,
    args: [sensorId, trimmedName, Date.now()],
  })

  return {
    sensorId,
    displayName: trimmedName,
  }
}

export async function getSensorCalibrations() {
  const res = await db.execute(`
    SELECT sensor_id, expression
    FROM sensor_calibrations
    ORDER BY sensor_id
  `)

  return res.rows.map((row) => ({
    sensorId: String(row.sensor_id),
    expression: String(row.expression),
  }))
}

export async function updateSensorCalibration(sensorId: string, expression: string) {
  const normalizedExpression = normalizeCalibrationExpression(expression)

  if (normalizedExpression == null) {
    throw new Error("Invalid calibration expression")
  }

  if (normalizedExpression.length === 0) {
    await db.execute({
      sql: `
        DELETE FROM sensor_calibrations
        WHERE sensor_id = ?
      `,
      args: [sensorId],
    })

    return null
  }

  await db.execute({
    sql: `
      INSERT INTO sensor_calibrations (sensor_id, expression, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sensor_id) DO UPDATE SET
        expression = excluded.expression,
        updated_at = excluded.updated_at
    `,
    args: [sensorId, normalizedExpression, Date.now()],
  })

  return {
    sensorId,
    expression: normalizedExpression,
  }
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
