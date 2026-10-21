const departments = [
  { name: 'Operations', base: 42000, margin: 0.24, orders: 128 },
  { name: 'Sales', base: 57000, margin: 0.31, orders: 164 },
  { name: 'Marketing', base: 33000, margin: 0.19, orders: 92 },
  { name: 'Customer Success', base: 39000, margin: 0.27, orders: 116 },
  { name: 'Finance', base: 28000, margin: 0.34, orders: 75 },
]

export const sampleRecords = Array.from({ length: 360 }, (_, index) => {
  const month = Math.floor(index / 30)
  const day = (index % 30) + 1
  const calendarMonth = (month + 9) % 12 + 1
  const year = 2024 + Math.floor((month + 9) / 12)
  const department = departments[(index * 7 + Math.floor(index / 5)) % departments.length]
  const seasonality = 1 + month * 0.035
  const dailyVariation = 0.76 + ((index * 17) % 49) / 100
  const revenue = Math.round(department.base * seasonality * dailyVariation)
  const orders = Math.max(1, Math.round(department.orders * (0.72 + ((index * 13) % 53) / 100)))

  return {
    id: `sample-${index}`,
    date: `${year}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    department: department.name,
    revenue,
    orders,
    profit: Math.round(revenue * department.margin * (0.9 + ((index * 11) % 22) / 100)),
  }
})

const normalizeHeader = (header) => header.trim().toLowerCase().replace(/[\s_-]+/g, '')

const headerAliases = {
  date: ['date', 'transactiondate', 'day'],
  department: ['department', 'team', 'businessunit'],
  revenue: ['revenue', 'sales', 'income'],
  orders: ['orders', 'ordercount', 'transactions'],
  profit: ['profit', 'netprofit', 'earnings'],
}

export function normalizeCsvRows(rows) {
  if (!rows.length) throw new Error('The CSV has no data rows.')

  const headers = Object.keys(rows[0]).map((header) => [normalizeHeader(header), header])
  const columns = Object.fromEntries(
    Object.entries(headerAliases).map(([field, aliases]) => [
      field,
      headers.find(([header]) => aliases.includes(header))?.[1],
    ]),
  )
  const missing = Object.entries(columns).filter(([, column]) => !column).map(([field]) => field)
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}. Include Date, Department, Revenue, Orders, and Profit.`)
  }

  const normalized = rows.map((row, index) => {
    const parsedDate = new Date(row[columns.date])
    const date = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().slice(0, 10)
    const revenueValue = String(row[columns.revenue] ?? '').replace(/[,$]/g, '').trim()
    const ordersValue = String(row[columns.orders] ?? '').replace(/,/g, '').trim()
    const profitValue = String(row[columns.profit] ?? '').replace(/[,$]/g, '').trim()
    const revenue = Number(revenueValue)
    const orders = Number(ordersValue)
    const profit = Number(profitValue)
    const department = String(row[columns.department] ?? '').trim()

    if (!date || !department || !revenueValue || !ordersValue || !profitValue || !Number.isFinite(revenue) || !Number.isFinite(orders) || !Number.isFinite(profit)) {
      throw new Error(`Row ${index + 2} has an invalid date, department, revenue, orders, or profit value.`)
    }
    if (revenue < 0 || orders < 0) {
      throw new Error(`Row ${index + 2} cannot contain negative revenue or order counts.`)
    }

    return { id: `import-${index}`, date, department, revenue, orders, profit }
  })

  return normalized
}

export function aggregateByMonth(records) {
  const totals = new Map()
  records.forEach(({ date, revenue, profit }) => {
    const month = date.slice(0, 7)
    const total = totals.get(month) ?? { month, revenue: 0, profit: 0 }
    total.revenue += revenue
    total.profit += profit
    totals.set(month, total)
  })

  return [...totals.values()].sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({
    ...item,
    label: new Date(`${item.month}-02T00:00:00`).toLocaleDateString('en-US', { month: 'short' }),
  }))
}

export function aggregateByDepartment(current, previous) {
  const totals = new Map()
  current.forEach(({ department, revenue }) => {
    const total = totals.get(department) ?? { department, current: 0, previous: 0 }
    total.current += revenue
    totals.set(department, total)
  })
  previous.forEach(({ department, revenue }) => {
    const total = totals.get(department) ?? { department, current: 0, previous: 0 }
    total.previous += revenue
    totals.set(department, total)
  })
  return [...totals.values()].sort((a, b) => b.current - a.current)
}
