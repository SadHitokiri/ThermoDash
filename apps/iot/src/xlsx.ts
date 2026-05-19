import { deflateRawSync } from "zlib"
import { applyTemperatureCalibration } from "./calibration"

type CellValue = string | number
type ReportRow = Record<string, unknown>
type SensorReport = {
  label: string
  sheetName: string
  rows: CellValue[][]
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index

  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }

  return crc >>> 0
})

function crc32(buffer: Buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function xmlEscape(value: CellValue) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function columnName(index: number) {
  let name = ""
  let current = index + 1

  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }

  return name
}

function createCell(value: CellValue, columnIndex: number, rowIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex}`

  if (typeof value === "number") {
    return `<c r="${ref}"><v>${Number.isFinite(value) ? value : ""}</v></c>`
  }

  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}

function formatTimestamp(value: unknown) {
  const date = new Date(Number(value))

  if (isNaN(date.getTime())) {
    return ""
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function createWorksheet(rows: CellValue[][], drawingRelId?: string) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 1
      const cells = row.map((value, columnIndex) => createCell(value, columnIndex, excelRow)).join("")

      return `<row r="${excelRow}">${cells}</row>`
    })
    .join("")
  const drawing = drawingRelId ? `<drawing r:id="${drawingRelId}"/>` : ""

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>${sheetRows}</sheetData>
  ${drawing}
</worksheet>`
}

function sanitizeSheetName(value: string) {
  const sanitized = value
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return (sanitized || "Arduino").slice(0, 31)
}

function createUniqueSheetName(label: string, usedNames: Set<string>) {
  const baseName = sanitizeSheetName(label)
  let sheetName = baseName
  let suffix = 2

  while (usedNames.has(sheetName.toLowerCase())) {
    const suffixText = ` ${suffix}`
    sheetName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`
    suffix += 1
  }

  usedNames.add(sheetName.toLowerCase())
  return sheetName
}

function escapeSheetReference(sheetName: string) {
  return sheetName.replace(/'/g, "''")
}

function createDrawing(chartIndex: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor>
    <xdr:from>
      <xdr:col>3</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>1</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>13</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>22</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${chartIndex}" name="Temperature Chart ${chartIndex}"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
      </xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`
}

function createChart(sensor: SensorReport) {
  const sheetRef = escapeSheetReference(sensor.sheetName)
  const lastRow = sensor.rows.length
  const categoriesRef = `'${sheetRef}'!$A$2:$A$${lastRow}`
  const valuesRef = `'${sheetRef}'!$B$2:$B$${lastRow}`

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx>
        <c:rich>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:t>${xmlEscape(sensor.label)}</a:t>
            </a:r>
          </a:p>
        </c:rich>
      </c:tx>
      <c:layout/>
    </c:title>
    <c:plotArea>
      <c:layout/>
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx>
            <c:v>Temperature °C</c:v>
          </c:tx>
          <c:cat>
            <c:strRef>
              <c:f>${xmlEscape(categoriesRef)}</c:f>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>${xmlEscape(valuesRef)}</c:f>
            </c:numRef>
          </c:val>
          <c:smooth val="0"/>
        </c:ser>
        <c:axId val="100"/>
        <c:axId val="200"/>
      </c:lineChart>
      <c:catAx>
        <c:axId val="100"/>
        <c:scaling>
          <c:orientation val="minMax"/>
        </c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="200"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="200"/>
        <c:scaling>
          <c:orientation val="minMax"/>
        </c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorGridlines/>
        <c:title>
          <c:tx>
            <c:rich>
              <a:bodyPr/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:t>Temperature °C</a:t>
                </a:r>
              </a:p>
            </c:rich>
          </c:tx>
          <c:layout/>
        </c:title>
        <c:numFmt formatCode="0.00" sourceLinked="0"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="100"/>
        <c:crosses val="autoZero"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:layout/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:printSettings>
    <c:headerFooter/>
    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
    <c:pageSetup/>
  </c:printSettings>
</c:chartSpace>`
}

function createZip(files: Array<{ name: string; content: string | Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name)
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content)
    const compressed = deflateRawSync(content)
    const crc = crc32(content)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(name.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, name, compressed)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralParts.push(centralHeader, name)
    offset += localHeader.length + name.length + compressed.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

export function createReportWorkbook(rows: ReportRow[]) {
  const sensorReportsById = new Map<string, SensorReport>()
  const usedSheetNames = new Set<string>(["report"])
  const worksheetRows: CellValue[][] = [
    ["Timestamp", "Sensor", "Raw Temperature", "Calibrated Temperature", "Calibration", "Calibration Since"],
    ...rows.map((row) => {
      const sensorId = String(row.sensor_id)
      const displayName = typeof row.display_name === "string" ? row.display_name.trim() : ""
      const calibrationExpression = typeof row.calibration_expression === "string" ? row.calibration_expression.trim() : ""
      const calibrationEffectiveFrom = Number(row.calibration_effective_from)
      const rawTemperature = Number(row.temperature)
      const timestamp = formatTimestamp(row.timestamp)
      const sensorLabel = displayName ? `${displayName} (${sensorId})` : sensorId
      const calibratedTemperature = applyTemperatureCalibration(rawTemperature, calibrationExpression)

      if (!sensorReportsById.has(sensorId)) {
        sensorReportsById.set(sensorId, {
          label: sensorLabel,
          sheetName: createUniqueSheetName(sensorLabel, usedSheetNames),
          rows: [["Timestamp", "Calibrated Temperature"]],
        })
      }

      sensorReportsById.get(sensorId)!.rows.push([timestamp, calibratedTemperature])

      return [
        timestamp,
        sensorLabel,
        rawTemperature,
        calibratedTemperature,
        calibrationExpression || "None",
        calibrationExpression && Number.isFinite(calibrationEffectiveFrom)
          ? formatTimestamp(calibrationEffectiveFrom)
          : "",
      ]
    }),
  ]
  const sensorReports = Array.from(sensorReportsById.values())
  const worksheetFiles = [
    {
      name: "xl/worksheets/sheet1.xml",
      content: createWorksheet(worksheetRows),
    },
    ...sensorReports.map((sensor, index) => ({
      name: `xl/worksheets/sheet${index + 2}.xml`,
      content: createWorksheet(sensor.rows, "rId1"),
    })),
  ]
  const sheetRelationshipFiles = sensorReports.map((_, index) => ({
    name: `xl/worksheets/_rels/sheet${index + 2}.xml.rels`,
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${index + 1}.xml"/>
</Relationships>`,
  }))
  const drawingFiles = sensorReports.flatMap((_, index) => [
    {
      name: `xl/drawings/drawing${index + 1}.xml`,
      content: createDrawing(index + 1),
    },
    {
      name: `xl/drawings/_rels/drawing${index + 1}.xml.rels`,
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${index + 1}.xml"/>
</Relationships>`,
    },
  ])
  const chartFiles = sensorReports.map((sensor, index) => ({
    name: `xl/charts/chart${index + 1}.xml`,
    content: createChart(sensor),
  }))

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${sensorReports.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 2}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n  ")}
  ${sensorReports.map((_, index) => `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("\n  ")}
  ${sensorReports.map((_, index) => `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("\n  ")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Report" sheetId="1" r:id="rId1"/>
    ${sensorReports.map((sensor, index) => `<sheet name="${xmlEscape(sensor.sheetName)}" sheetId="${index + 2}" r:id="rId${index + 2}"/>`).join("\n    ")}
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  ${sensorReports.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 2}.xml"/>`).join("\n  ")}
</Relationships>`,
    },
    ...worksheetFiles,
    ...sheetRelationshipFiles,
    ...drawingFiles,
    ...chartFiles,
  ])
}
