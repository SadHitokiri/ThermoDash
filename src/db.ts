import fs from 'fs'
import path from 'path'

const logsDir = path.join(__dirname, './data/logs')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

export function saveTemperature(deviceId: string, temperature: number) {
  const today = new Date().toISOString().split('T')[0]
  const filePath = path.join(logsDir, `${today}.csv`)

  const timestamp = new Date().toISOString()
  const row = `${deviceId},${temperature},${timestamp}\n`

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'deviceId,temperature,timestamp\n')
    console.log(`Created new log file: ${filePath}`)
  }

  fs.appendFileSync(filePath, row)
  console.log(`Logged data: ${row.trim()} to ${filePath}`)
}

export function getReportsList() {
  const files = fs.readdirSync(logsDir)

  return files.map(file => {
    const stats = fs.statSync(path.join(logsDir, file))
    return {
      name: file,
      created: stats.birthtime
    }
  })
}

export function getReportPath(name: string) {
  return path.join(logsDir, name)
}