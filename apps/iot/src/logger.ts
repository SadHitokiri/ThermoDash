import fs from "fs"
import path from "path"
import util from "util"

export type LogLevel = "info" | "warn" | "error"

export type LogEntry = {
  time: string
  level: LogLevel
  message: string
  details?: string
}

const dataDir = process.env.THERMODASH_DATA_DIR ?? path.join(process.cwd(), "data")
const logsDir = path.join(dataDir, "logs")
const logFilePath = path.join(logsDir, "app.log")
const maxReadableLogBytes = 1024 * 1024

let isConsoleLoggerInstalled = false

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message
  }

  return String(error)
}

function appendEntry(entry: LogEntry) {
  try {
    ensureLogsDir()
    fs.appendFileSync(logFilePath, `${JSON.stringify(entry)}\n`, "utf8")
  } catch {
    // Logging should never break the measurement service.
  }
}

export function writeLog(level: LogLevel, message: string, details?: unknown) {
  appendEntry({
    time: new Date().toISOString(),
    level,
    message,
    details: details == null ? undefined : stringifyError(details),
  })
}

export function installConsoleLogger() {
  if (isConsoleLoggerInstalled) return

  isConsoleLoggerInstalled = true

  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  console.log = (...args: unknown[]) => {
    originalConsole.log(...args)
    writeLog("info", util.format(...args))
  }

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args)
    writeLog("warn", util.format(...args))
  }

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args)
    writeLog("error", util.format(...args))
  }

  process.on("uncaughtException", (error) => {
    writeLog("error", "Uncaught exception", error)
    originalConsole.error(error)
  })

  process.on("unhandledRejection", (reason) => {
    writeLog("error", "Unhandled promise rejection", reason)
    originalConsole.error(reason)
  })
}

export function getLogEntries(limit = 200, level?: LogLevel) {
  ensureLogsDir()

  if (!fs.existsSync(logFilePath)) {
    return []
  }

  const stat = fs.statSync(logFilePath)
  const start = Math.max(0, stat.size - maxReadableLogBytes)
  const file = fs.openSync(logFilePath, "r")
  const buffer = Buffer.alloc(stat.size - start)

  try {
    fs.readSync(file, buffer, 0, buffer.length, start)
  } finally {
    fs.closeSync(file)
  }

  const lines = buffer.toString("utf8").split("\n")

  if (start > 0) {
    lines.shift()
  }

  return lines
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as LogEntry
      } catch {
        return {
          time: new Date(0).toISOString(),
          level: "error" as const,
          message: line,
        }
      }
    })
    .filter((entry) => (level ? entry.level === level : true))
    .slice(-limit)
    .reverse()
}

export function getLogFilePath() {
  ensureLogsDir()
  return logFilePath
}
