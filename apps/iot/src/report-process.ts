import { db } from "./db"
import { normalizeCalibrationExpression } from "./calibration"

export const DATA_RETENTION_DAYS = 30
export const RETENTION_WARNING_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sensor_calibration_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      expression TEXT NOT NULL,
      effective_from INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp
    ON sensor_data (timestamp)
  `)

  await db.execute(`
    INSERT INTO sensor_calibration_history (sensor_id, expression, effective_from)
    SELECT sensor_id, expression, updated_at
    FROM sensor_calibrations
    WHERE NOT EXISTS (
      SELECT 1
      FROM sensor_calibration_history
      WHERE sensor_calibration_history.sensor_id = sensor_calibrations.sensor_id
    )
  `)

  console.log("DB ready")
}

export async function removeExpiredSensorData(now = Date.now()) {
  const expiresBefore = now - DATA_RETENTION_DAYS * DAY_MS
  const result = await db.execute({
    sql: `DELETE FROM sensor_data WHERE timestamp < ?`,
    args: [expiresBefore],
  })

  return Number(result.rowsAffected ?? 0)
}

export async function insertSensorData(sensorId: string, temp: number, timestamp = Date.now()) {
  await db.execute({
    sql: `
      INSERT INTO sensor_data (sensor_id, temperature, timestamp)
      VALUES (?, ?, ?)
    `,
    args: [sensorId, temp, timestamp]
  })
}

export async function getReportDays(page = 1, pageSize = 14, now = Date.now()) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.floor(pageSize)))
    : 14
  const offset = (safePage - 1) * safePageSize
  const [reportsResult, countResult, retentionResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT
          DATE(timestamp / 1000, 'unixepoch') as day,
          COUNT(*) as rows
        FROM sensor_data
        GROUP BY day
        ORDER BY day DESC
        LIMIT ? OFFSET ?
      `,
      args: [safePageSize, offset],
    }),
    db.execute(`
      SELECT COUNT(DISTINCT DATE(timestamp / 1000, 'unixepoch')) as total_days
      FROM sensor_data
    `),
    db.execute({
      sql: `
        SELECT MIN(timestamp) as next_deletion_source, COUNT(*) as rows
        FROM sensor_data
        WHERE timestamp >= ? AND timestamp < ?
      `,
      args: [
        now - DATA_RETENTION_DAYS * DAY_MS,
        now - (DATA_RETENTION_DAYS - RETENTION_WARNING_DAYS) * DAY_MS,
      ],
    }),
  ])

  const reports = reportsResult.rows.map((row) => ({
    day: String(row.day),
    rows: Number(row.rows),
  }))
  const totalDays = Number(countResult.rows[0]?.total_days ?? 0)
  const nextDeletionSource = retentionResult.rows[0]?.next_deletion_source

  return {
    reports,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalDays,
      totalPages: Math.ceil(totalDays / safePageSize),
    },
    retention: nextDeletionSource == null
      ? null
      : {
          deletesAt: new Date(Number(nextDeletionSource) + DATA_RETENTION_DAYS * DAY_MS).toISOString(),
          rows: Number(retentionResult.rows[0]?.rows ?? 0),
        },
  }
}

export async function getAllReportDays() {
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
        (
          SELECT expression
          FROM sensor_calibration_history
          WHERE sensor_calibration_history.sensor_id = sensor_data.sensor_id
            AND sensor_calibration_history.effective_from <= sensor_data.timestamp
          ORDER BY effective_from DESC, id DESC
          LIMIT 1
        ) as calibration_expression,
        (
          SELECT effective_from
          FROM sensor_calibration_history
          WHERE sensor_calibration_history.sensor_id = sensor_data.sensor_id
            AND sensor_calibration_history.effective_from <= sensor_data.timestamp
          ORDER BY effective_from DESC, id DESC
          LIMIT 1
        ) as calibration_effective_from,
        sensor_data.temperature,
        sensor_data.timestamp
      FROM sensor_data
      LEFT JOIN sensor_names ON sensor_names.sensor_id = sensor_data.sensor_id
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

  const effectiveFrom = Date.now()

  if (normalizedExpression.length === 0) {
    await db.execute({
      sql: `
        DELETE FROM sensor_calibrations
        WHERE sensor_id = ?
      `,
      args: [sensorId],
    })

    await db.execute({
      sql: `
        INSERT INTO sensor_calibration_history (sensor_id, expression, effective_from)
        VALUES (?, ?, ?)
      `,
      args: [sensorId, "", effectiveFrom],
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
    args: [sensorId, normalizedExpression, effectiveFrom],
  })

  await db.execute({
    sql: `
      INSERT INTO sensor_calibration_history (sensor_id, expression, effective_from)
      VALUES (?, ?, ?)
    `,
    args: [sensorId, normalizedExpression, effectiveFrom],
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
