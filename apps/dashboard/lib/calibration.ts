const operationPattern = /([+\-*/])\s*(-?\d+(?:[.,]\d+)?)/gy

type CalibrationOperation = {
  operator: string
  value: number
}

function parseCalibrationOperations(expression: string) {
  const operations: CalibrationOperation[] = []
  operationPattern.lastIndex = 0

  let position = 0

  while (position < expression.length) {
    while (expression[position] === " ") {
      position += 1
    }

    operationPattern.lastIndex = position
    const match = operationPattern.exec(expression)

    if (!match) return null

    const operator = match[1]
    const value = Number(match[2].replace(",", "."))

    if (!Number.isFinite(value)) return null
    if (operator === "/" && value === 0) return null

    operations.push({ operator, value })
    position = operationPattern.lastIndex
  }

  return operations.length > 0 ? operations : null
}

export function normalizeCalibrationExpression(expression: string) {
  const trimmedExpression = expression.trim()
  if (!trimmedExpression) return ""

  const operations = parseCalibrationOperations(trimmedExpression)
  if (!operations) return null

  return operations
    .map((operation) => `${operation.operator}${operation.value}`)
    .join("")
}

export function applyTemperatureCalibration(value: number, expression?: string) {
  const normalizedExpression = normalizeCalibrationExpression(expression || "")
  if (!normalizedExpression) return value

  const operations = parseCalibrationOperations(normalizedExpression)
  if (!operations) return value

  return operations.reduce((currentValue, operation) => {
    switch (operation.operator) {
      case "+":
        return currentValue + operation.value
      case "-":
        return currentValue - operation.value
      case "*":
        return currentValue * operation.value
      case "/":
        return currentValue / operation.value
      default:
        return currentValue
    }
  }, value)
}
