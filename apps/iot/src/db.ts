import { createClient } from "@libsql/client"
import path from "path"
import fs from "fs"

const dbFile = path.join(process.cwd(), "data/data.db")

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "")
}

export const db = createClient({
  url: `file:${dbFile}`
})