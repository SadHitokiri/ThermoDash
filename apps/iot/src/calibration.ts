const calibrationPattern = /^([+\-*/])\s*(-?\d+(?:[.,]\d+)?)$/

export function normalizeCalibrationExpression(expression: string) {
  const trimmedExpression = expression.trim()
  if (!trimmedExpression) return ""

  const match = trimmedExpression.match(calibrationPattern)
  if (!match) return null

  const operator = match[1]
  const value = Number(match[2].replace(",", "."))

  if (!Number.isFinite(value)) return null
  if (operator === "/" && value === 0) return null

  return `${operator}${value}`
}

export function applyTemperatureCalibration(value: number, expression?: string) {
  const normalizedExpression = normalizeCalibrationExpression(expression || "")
  if (!normalizedExpression) return value

  const operator = normalizedExpression[0]
  const coefficient = Number(normalizedExpression.slice(1))

  switch (operator) {
    case "+":
      return value + coefficient
    case "-":
      return value - coefficient
    case "*":
      return value * coefficient
    case "/":
      return value / coefficient
    default:
      return value
  }
}
