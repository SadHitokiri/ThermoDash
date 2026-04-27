import { createClient } from "@libsql/client"
import path from "path"
import fs from "fs"

const dataDir = process.env.THERMODASH_DATA_DIR ?? path.join(process.cwd(), "data")
const dbFile = path.join(dataDir, "data.db")

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "")
}

export const db = createClient({
  url: `file:${dbFile}`
})
