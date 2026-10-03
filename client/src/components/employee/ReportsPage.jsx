import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Helpers (shared types) ─────────────────────────────────────────────────

const DEFAULT_COMPANY_NAME = 'Athena LMM'
const DEFAULT_VENDOR_NAME = 'Jai Tea Pantry'

function toDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDisplayDate(value) {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function entryDateISO(entry) {
  return toDateKey(entry.date)
}

function drinkParts(entry, settings) {
  const type = entry?.drinkType
  const storedTea = Number(entry?.teaPrice ?? settings?.teaPrice ?? 0) || 0
  const storedCoffee = Number(entry?.coffeePrice) || 0

  if (type === 'both') {
    return {
      teaCups: entry.morningTea || 0,
      teaPrice: storedTea || 15,
      coffeeCups: entry.coffeeCups || 0,
      coffeePrice: storedCoffee || 25,
    }
  }

  if (type === 'coffee') {
    const cups = (entry.coffeeCups || 0) || ((entry.morningTea || 0) + (entry.eveningTea || 0))
    return {
      teaCups: 0,
      teaPrice: 0,
      coffeeCups: cups,
      coffeePrice: storedCoffee || storedTea || 25,
    }
  }

  return {
    teaCups: (entry?.morningTea || 0) + (entry?.eveningTea || 0),
    teaPrice: storedTea,
    coffeeCups: entry?.coffeeCups || 0,
    coffeePrice: storedCoffee || 25,
  }
}

function totalCups(entry) {
  const parts = drinkParts(entry)
  return parts.teaCups + parts.coffeeCups
}

function drinkLabel(entry) {
  const parts = drinkParts(entry)
  const bits = []
  if (parts.teaCups) bits.push(`${parts.teaCups} Tea`)
  if (parts.coffeeCups) bits.push(`${parts.coffeeCups} Coffee`)
  return bits.join(', ') || '—'
}

function drinkRateLabel(entry, settings) {
  const parts = drinkParts(entry, settings)
  const bits = []
  if (parts.teaCups) bits.push(`Rs.${parts.teaPrice}`)
  if (parts.coffeeCups) bits.push(`Rs.${parts.coffeePrice}`)
  return bits.join(' / ') || '—'
}

function calcEntryBill(entry, settings) {
  const parts = drinkParts(entry, settings)
  const teaPrice = parts.teaCups ? parts.teaPrice : parts.coffeePrice
  const snacksPrice = Number(entry.snacksPrice ?? settings?.snackPrice ?? 0) || 0
  const otherCost = Number(entry.others?.cost ?? 0) || 0
  const teaTotal = parts.teaCups * parts.teaPrice + parts.coffeeCups * parts.coffeePrice
  const snacksTotal = (entry.snacks || 0) * snacksPrice + otherCost
  const subTotal = teaTotal + snacksTotal
  const discountType = entry.discount?.type || null
  const discountValue = Number(entry.discount?.amount || 0)
  const discountAmount = discountType === 'percent'
    ? (subTotal * discountValue) / 100
    : discountType === 'rupees'
      ? discountValue
      : 0
  return {
    teaPrice, snacksPrice, otherCost, teaTotal, snacksTotal, subTotal,
    discountLabel: discountType === 'percent' ? `${discountValue}%` : discountType === 'rupees' ? `Rs.${discountValue}` : '—',
    finalTotal: Math.max(0, subTotal - discountAmount),
  }
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = toDisplayDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function fmtShortDate(iso) {
  if (!iso) return ''
  const d = toDisplayDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function getDayName(iso) {
  const d = toDisplayDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { weekday: 'long' })
}

function getMonthBounds(ym) {
  if (!ym) return null
  const [year, month] = ym.split('-').map(Number)
  if (!year || !month) return null

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start,
    end,
    totalDays: end.getDate(),
  }
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return 'Rs. 0'
  return Number.isInteger(amount) ? `Rs. ${amount.toFixed(0)}` : `Rs. ${amount.toFixed(2)}`
}

function buildSnackItems(entry, settings) {
  const items = []
  const genericSnackQty = Number(entry.snacks || 0)
  const snackPrice = Number(entry.snacksPrice ?? settings?.snackPrice ?? 0) || 0
  const otherName = String(entry.others?.description || '').trim()
  const otherCost = Number(entry.others?.cost || 0) || 0
  const otherQty = Number(entry.others?.quantity || 0) || 0

  if (genericSnackQty > 0) {
    items.push({
      name: 'Snacks',
      quantity: genericSnackQty,
      cost: genericSnackQty * snackPrice,
    })
  }

  if (otherName || otherQty > 0 || otherCost > 0) {
    items.push({
      name: otherName || 'Other Snacks',
      quantity: otherQty > 0 ? otherQty : otherCost > 0 ? 1 : 0,
      cost: otherCost,
    })
  }

  return items.filter((item) => item.quantity > 0 || item.cost > 0)
}

function mergeSnackItems(items) {
  const merged = new Map()

  for (const item of items) {
    const key = item.name.trim().toLowerCase() || 'other snacks'
    const current = merged.get(key) || { name: item.name || 'Other Snacks', quantity: 0, cost: 0 }
    current.quantity += Number(item.quantity || 0)
    current.cost += Number(item.cost || 0)
    merged.set(key, current)
  }

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name))
}

// ─── Palette ────────────────────────────────────────────────────────────────

const C = {
  brown: '#8B5E3C',
  brownDark: '#6F4E37',
  brownDeep: '#3E2C23',
  terracotta: '#D08770',
  cream: '#EFE6DD',
  creamLight: '#FFF9F2',
  creamBg: '#F7F3EF',
  border: '#D8CFC6',
  muted: '#6F5E53',
  mutedLight: '#A0897C',
  green: '#7A8F6B',
  greenBg: 'rgba(122,143,107,0.12)',
}

const PIE_COLORS = [C.brown, C.terracotta, C.green, '#B5927B']

// ─── Icons ──────────────────────────────────────────────────────────────────

const IconCup = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7V5c0-1.1-.9-2-2-2zm-1 2v3H7V5h10.5zm-3 11.44V18H9v-1.56C7.19 15.36 6 13.28 6 10.71V10h12v.71c0 2.57-1.19 4.65-3 5.73zM4 19h16v2H4z" />
  </svg>
)
const IconSnack = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-3.5-3.36-7-7.51-7S1 11.49 1 14.99v1h15.03v-1z" />
  </svg>
)
const IconCoin = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
  </svg>
)
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
  </svg>
)
const IconTrend = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
  </svg>
)
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
)
const IconEye = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10 3C5.455 3 1.73 6.007.458 10c1.272 3.993 4.997 7 9.542 7s8.27-3.007 9.542-7C18.27 6.007 14.545 3 10 3zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2.2A1.8 1.8 0 1 0 10 8.2a1.8 1.8 0 0 0 0 3.6z" />
  </svg>
)
const IconX = ({ size = 'w-5 h-5' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={size}>
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
  </svg>
)
const IconBulb = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
  </svg>
)
const IconArrowUp = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1-1.414 1.414L11 7.414V15a1 1 0 1 1-2 0V7.414L6.707 9.707a1 1 0 0 1-1.414 0z" clipRule="evenodd" />
  </svg>
)
const IconArrowDown = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 12.586V5a1 1 0 0 1 2 0v7.586l2.293-2.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
  </svg>
)
const IconSort = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline ml-1 opacity-50">
    <path d="M5 7l5-5 5 5H5zm0 6l5 5 5-5H5z" />
  </svg>
)

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{ background: C.creamLight, borderColor: C.border, color: C.brownDeep }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

// ─── AnimatedNumber ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  // Simple display — animation via CSS transition on parent
  const display = typeof value === 'number' ? value.toFixed(0) : value
  return <>{prefix}{display}{suffix}</>
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReportsPage({ entries, settings, month, onMonthChange, user, prevMonthEntries }) {
  const [filterType, setFilterType] = useState('all') // all|tea|snacks
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [tablePage, setTablePage] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)

  const ROWS_PER_PAGE = 10

  // ── Computed Data ──────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    // Group by date
    const byDate = {}
    for (const entry of entries) {
      const dk = entryDateISO(entry)
      if (!byDate[dk]) byDate[dk] = { dateKey: dk, entries: [], cups: 0, snacks: 0, teaCost: 0, snacksCost: 0, total: 0 }
      const bill = calcEntryBill(entry, settings)
      byDate[dk].entries.push(entry)
      byDate[dk].cups += totalCups(entry)
      byDate[dk].snacks += entry.snacks || 0
      byDate[dk].teaCost += bill.teaTotal
      byDate[dk].snacksCost += bill.snacksTotal
      byDate[dk].total += bill.finalTotal
    }

    const dayRows = Object.values(byDate).sort((a, b) => a.dateKey.localeCompare(b.dateKey))

    // Totals
    const totalTeaCups = dayRows.reduce((s, d) => s + d.cups, 0)
    const totalSnacks = dayRows.reduce((s, d) => s + d.snacks, 0)
    const totalTeaCost = dayRows.reduce((s, d) => s + d.teaCost, 0)
    const totalSnacksCost = dayRows.reduce((s, d) => s + d.snacksCost, 0)
    const totalCost = dayRows.reduce((s, d) => s + d.total, 0)
    const daysActive = dayRows.length
    const avgDailySpend = daysActive > 0 ? totalCost / daysActive : 0

    // Peak day
    let peakDay = null
    let peakCups = 0
    for (const d of dayRows) {
      if (d.cups > peakCups) { peakCups = d.cups; peakDay = d.dateKey }
    }

    // Hourly tea distribution (9am – 6pm) based on entry createdAt timestamp
    const byHour = {}
    for (let h = 9; h <= 18; h++) byHour[h] = 0
    for (const entry of entries) {
      const hour = new Date(entry.createdAt || entry.date).getHours()
      if (hour >= 9 && hour <= 18) {
        byHour[hour] = (byHour[hour] || 0) + totalCups(entry)
      }
    }
    const hourlyTeaTrend = Object.entries(byHour).map(([h, cups]) => ({
      hour: `${Number(h) === 12 ? 12 : Number(h) > 12 ? Number(h) - 12 : Number(h)}${Number(h) < 12 ? 'AM' : 'PM'}`,
      hourNum: Number(h),
      cups,
    }))
    let peakHour = null
    let peakHourCups = 0
    for (const h of hourlyTeaTrend) {
      if (h.cups > peakHourCups) { peakHourCups = h.cups; peakHour = h.hour }
    }

    // Day of week analysis
    const byDow = {}
    for (const d of dayRows) {
      const dow = getDayName(d.dateKey)
      if (!byDow[dow]) byDow[dow] = { cups: 0, count: 0 }
      byDow[dow].cups += d.cups
      byDow[dow].count += 1
    }
    let topDow = null
    let topDowAvg = 0
    for (const [dow, data] of Object.entries(byDow)) {
      const avg = data.cups / data.count
      if (avg > topDowAvg) { topDowAvg = avg; topDow = dow }
    }

    // Chart data — tea consumption trend
    const consumptionTrend = dayRows.map((d) => ({
      date: fmtShortDate(d.dateKey),
      fullDate: d.dateKey,
      cups: d.cups,
      isPeak: d.dateKey === peakDay,
    }))

    // Chart data — snacks consumption trend
    const snacksTrend = dayRows.map((d) => ({
      date: fmtShortDate(d.dateKey),
      fullDate: d.dateKey,
      snacks: d.snacks,
    }))
    let peakSnacksDay = null
    let peakSnacksCount = 0
    for (const d of dayRows) {
      if (d.snacks > peakSnacksCount) { peakSnacksCount = d.snacks; peakSnacksDay = d.dateKey }
    }

    // Pie chart — tea vs snacks
    const pieData = [
      { name: 'Drinks', value: Math.round(totalTeaCost) },
      { name: 'Snacks', value: Math.round(totalSnacksCost) },
    ].filter((d) => d.value > 0)

    // Prev month comparison
    let prevTotalCost = 0
    let prevTeaCups = 0
    let prevDaysActive = 0
    if (prevMonthEntries?.length) {
      const prevByDate = {}
      for (const entry of prevMonthEntries) {
        const dk = entryDateISO(entry)
        if (!prevByDate[dk]) prevByDate[dk] = true
        const bill = calcEntryBill(entry, settings)
        prevTotalCost += bill.finalTotal
        prevTeaCups += totalCups(entry)
      }
      prevDaysActive = Object.keys(prevByDate).length
    }

    const costChange = prevTotalCost > 0 ? ((totalCost - prevTotalCost) / prevTotalCost) * 100 : null
    const cupsChange = prevTeaCups > 0 ? ((totalTeaCups - prevTeaCups) / prevTeaCups) * 100 : null

    return {
      dayRows, totalTeaCups, totalSnacks, totalTeaCost, totalSnacksCost, totalCost,
      daysActive, avgDailySpend, peakDay, peakCups,
      topDow, topDowAvg,
      consumptionTrend, snacksTrend, peakSnacksDay, peakSnacksCount, pieData,
      hourlyTeaTrend, peakHour, peakHourCups,
      costChange, cupsChange, prevTotalCost, prevTeaCups, prevDaysActive,
    }
  }, [entries, settings, prevMonthEntries])

  const invoiceData = useMemo(() => {
    const bounds = getMonthBounds(month)
    if (!bounds) {
      return {
        companyName: DEFAULT_COMPANY_NAME,
        vendorName: DEFAULT_VENDOR_NAME,
        employeeName: user?.name || 'Employee',
        rows: [],
        snackBreakdown: [],
        totalDays: 0,
        totalTeaCups: 0,
        totalTeaPrice: 0,
        totalSnackQuantity: 0,
        totalSnackCost: 0,
        totalBillAmount: 0,
        durationLabel: '',
        snackQuantitySummary: 'No snacks',
      }
    }

    const rowsByDate = new Map()
    for (let day = 1; day <= bounds.totalDays; day += 1) {
      const date = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), day)
      const dateKey = toDateKey(date)
      rowsByDate.set(dateKey, {
        dateKey,
        teaCups: 0,
        teaCost: 0,
        snackQuantity: 0,
        snackItems: [],
        snackDisplay: 'No snacks',
        snacksCost: 0,
        total: 0,
      })
    }

    for (const entry of entries) {
      const dateKey = entryDateISO(entry)
      const row = rowsByDate.get(dateKey)
      if (!row) continue

      const bill = calcEntryBill(entry, settings)
      const snackItems = buildSnackItems(entry, settings)

      row.teaCups += totalCups(entry)
      row.teaCost += bill.teaTotal
      row.snacksCost += bill.snacksTotal
      row.total += bill.finalTotal

      for (const item of snackItems) {
        row.snackQuantity += item.quantity
        row.snackItems.push(item)
      }
    }

    const rows = Array.from(rowsByDate.values())
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
      .map((row) => {
        const mergedSnackItems = mergeSnackItems(row.snackItems)
        return {
          ...row,
          snackItems: mergedSnackItems,
          snackDisplay: mergedSnackItems.length > 0
            ? mergedSnackItems.map((item) => `${item.quantity} ${item.name}`).join(', ')
            : 'No snacks',
        }
      })

    const snackBreakdown = mergeSnackItems(rows.flatMap((row) => row.snackItems))
    const totalTeaCups = rows.reduce((sum, row) => sum + row.teaCups, 0)
    const totalTeaPrice = rows.reduce((sum, row) => sum + row.teaCost, 0)
    const totalSnackQuantity = rows.reduce((sum, row) => sum + row.snackQuantity, 0)
    const totalSnackCost = rows.reduce((sum, row) => sum + row.snacksCost, 0)
    const totalBillAmount = rows.reduce((sum, row) => sum + row.total, 0)

    return {
      companyName: DEFAULT_COMPANY_NAME,
      vendorName: DEFAULT_VENDOR_NAME,
      employeeName: user?.name || 'Employee',
      rows,
      snackBreakdown,
      totalDays: bounds.totalDays,
      totalTeaCups,
      totalTeaPrice,
      totalSnackQuantity,
      totalSnackCost,
      totalBillAmount,
      durationLabel: `${fmtDate(bounds.start)} to ${fmtDate(bounds.end)}`,
      snackQuantitySummary: snackBreakdown.length > 0
        ? snackBreakdown.map((item) => `${item.quantity} ${item.name}`).join(', ')
        : 'No snacks',
    }
  }, [entries, month, settings, user?.name])



  // ── Table sort/filter/pagination ───────────────────────────────────────

  const tableData = useMemo(() => {
    let rows = analytics.dayRows.map((d) => ({
      ...d,
      snacksNames: d.entries.map((e) => e.others?.description || '').filter(Boolean),
    }))

    if (filterType === 'tea') {
      rows = rows.filter((d) => d.cups > 0)
    } else if (filterType === 'snacks') {
      rows = rows.filter((d) => d.snacks > 0)
    }

    rows.sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'date': cmp = a.dateKey.localeCompare(b.dateKey); break
        case 'cups': cmp = a.cups - b.cups; break
        case 'snacks': cmp = a.snacks - b.snacks; break
        case 'teaCost': cmp = a.teaCost - b.teaCost; break
        case 'snacksCost': cmp = a.snacksCost - b.snacksCost; break
        case 'total': cmp = a.total - b.total; break
        default: cmp = 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [analytics.dayRows, filterType, sortCol, sortDir])

  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE)
  const pagedRows = tableData.slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE)

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
    setTablePage(0)
  }

  // ── Export PDF ─────────────────────────────────────────────────────────

  function downloadPDF() {
    const doc = new jsPDF()
    const generatedOn = fmtDate(new Date())

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(62, 44, 35)
    doc.text(invoiceData.companyName, 14, 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(111, 94, 83)
    doc.text(`Vendor Name: ${invoiceData.vendorName}`, 14, 28)
    doc.text(`Duration: ${invoiceData.durationLabel}`, 14, 35)
    doc.text(`Total Days: ${invoiceData.totalDays}`, 14, 42)
    doc.text(`Generated On: ${generatedOn}`, 14, 49)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(62, 44, 35)
    doc.text('Monthly Invoice', 14, 68)

    autoTable(doc, {
      startY: 73,
      head: [['Date', 'Cups', 'Snacks', 'Day Total']],
      body: invoiceData.rows.map((row) => [
        fmtDate(row.dateKey),
        String(row.teaCups),
        row.snackDisplay,
        formatCurrency(row.total),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 94, 60], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 82 },
        3: { cellWidth: 32, halign: 'right' },
      },
    })

    const summaryStartY = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Monthly Summary', 14, summaryStartY)

    autoTable(doc, {
      startY: summaryStartY + 4,
      head: [['Metric', 'Value']],
      body: [
        ['Total Cups', String(invoiceData.totalTeaCups)],
        ['Drink Cost', formatCurrency(invoiceData.totalTeaPrice)],
        ['Total Snacks', `${invoiceData.totalSnackQuantity} item(s)`],
        ['Snack Items', invoiceData.snackQuantitySummary],
        ['Total Snacks Price', formatCurrency(invoiceData.totalSnackCost)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [122, 143, 107], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 124 },
      },
    })

    if (invoiceData.snackBreakdown.length > 0) {
      const snackBreakdownY = doc.lastAutoTable.finalY + 10
      doc.text('Snack Cost Breakdown', 14, snackBreakdownY)

      autoTable(doc, {
        startY: snackBreakdownY + 4,
        head: [['Snack Name', 'Quantity', 'Amount']],
        body: invoiceData.snackBreakdown.map((item) => [
          item.name,
          String(item.quantity),
          formatCurrency(item.cost),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 94, 60], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 88 },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 36, halign: 'right' },
        },
      })
    }

    const billSummaryY = doc.lastAutoTable.finalY + 10
    doc.text('Bill Summary', 14, billSummaryY)

    autoTable(doc, {
      startY: billSummaryY + 4,
      head: [['Metric', 'Value']],
      body: [
        ['Tea Total', formatCurrency(invoiceData.totalTeaPrice)],
        ['Snacks Total', formatCurrency(invoiceData.totalSnackCost)],
        ['Total Bill Summary', formatCurrency(invoiceData.totalBillAmount)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [122, 143, 107], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 52, halign: 'right' },
      },
    })

    const footerY = doc.lastAutoTable.finalY + 12
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(111, 94, 83)
    doc.text('Generated by Aaj Ki Chai', 14, footerY)

    doc.save(`athena-lms-invoice-${month}.pdf`)
    setExportOpen(false)
  }

  // ── Export CSV ─────────────────────────────────────────────────────────

  function downloadCSV() {
    const headers = ['Date', 'Cups', 'Snacks Qty', 'Drink Cost', 'Snacks Cost', 'Total Cost']
    const rows = tableData.map((d) =>
      [fmtDate(d.dateKey), d.cups, d.snacks, d.teaCost.toFixed(0), d.snacksCost.toFixed(0), d.total.toFixed(0)].join(','),
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `akc-report-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  // ── Change badge helper ────────────────────────────────────────────────

  function ChangeBadge({ change }) {
    if (change === null || change === undefined) return null
    const up = change > 0
    const color = up ? '#D08770' : C.green
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1" style={{ color }}>
        {up ? <IconArrowUp /> : <IconArrowDown />}
        {Math.abs(change).toFixed(0)}% vs last month
      </span>
    )
  }

  // ─── RENDER ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.brownDeep }}>
            Reports
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            Track your chai consumption &amp; spending insights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => { onMonthChange(e.target.value); setTablePage(0) }}
            className="rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-colors focus:ring-2"
            style={{ borderColor: C.border, background: C.cream, color: C.brownDeep }}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-all hover:shadow-sm"
              style={{ borderColor: C.brown, color: C.brown, background: C.creamLight }}
            >
              <IconDownload /> Export
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border shadow-lg"
                  style={{ background: C.creamLight, borderColor: C.border }}
                >
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors text-left"
                    style={{ color: C.brownDeep }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.cream }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    📄 Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={downloadCSV}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors text-left"
                    style={{ color: C.brownDeep }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.cream }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    📊 Download Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: 'Total Cups', sub: 'This month',
            value: analytics.totalTeaCups, icon: <IconCup />,
            color: C.brown, bg: 'rgba(139,94,60,0.1)',
            change: analytics.cupsChange,
          },
          {
            label: 'Total Snacks', sub: 'This month',
            value: analytics.totalSnacks, icon: <IconSnack />,
            color: C.terracotta, bg: 'rgba(208,135,112,0.12)',
          },
          {
            label: 'Total Cost', sub: 'This month',
            value: analytics.totalCost, icon: <IconCoin />,
            color: C.green, bg: C.greenBg, prefix: 'Rs.',
            change: analytics.costChange,
          },
          {
            label: 'Avg Daily Spend', sub: 'Per active day',
            value: analytics.avgDailySpend, icon: <IconTrend />,
            color: C.terracotta, bg: 'rgba(208,135,112,0.08)', prefix: 'Rs.',
          },
          {
            label: 'Days Active', sub: 'This month',
            value: analytics.daysActive, icon: <IconCalendar />,
            color: C.brown, bg: 'rgba(139,94,60,0.08)',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="group rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: C.cream, borderColor: C.border }}
          >
            <div
              className="mb-3 inline-flex items-center justify-center rounded-xl p-2"
              style={{ background: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: C.brownDeep }}>
              <AnimatedNumber value={card.value} prefix={card.prefix || ''} />
            </p>
            <p className="text-sm font-semibold" style={{ color: C.brownDeep }}>
              {card.label}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>{card.sub}</p>
            {card.change !== undefined && <ChangeBadge change={card.change} />}
          </div>
        ))}
      </div>

      {/* ─── Charts Grid ─────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">

          {/* A. Tea Consumption Trend (Line) */}
          <div
            className="rounded-2xl border p-5 transition-shadow hover:shadow-md"
            style={{ background: C.cream, borderColor: C.border }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: C.brownDeep }}>
              Tea Consumption Trend
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.consumptionTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="date" tick={{ fill: C.muted, fontSize: 11 }}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 11 }} allowDecimals={false}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix=" cups" />} />
                  <Line
                    type="monotone" dataKey="cups" name="Cups"
                    stroke={C.brown} strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload.isPeak) {
                        return (
                          <circle cx={cx} cy={cy} r={5} fill={C.terracotta} stroke="#fff" strokeWidth={2} />
                        )
                      }
                      return <circle cx={cx} cy={cy} r={3} fill={C.brown} stroke="#fff" strokeWidth={1.5} />
                    }}
                    activeDot={{ r: 5, fill: C.brown, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {analytics.peakDay && (
              <p className="text-xs mt-2" style={{ color: C.mutedLight }}>
                Peak: {fmtDate(analytics.peakDay)} ({analytics.peakCups} cups)
              </p>
            )}
          </div>

          {/* B. Snacks Consumption Trend (Area) */}
          <div
            className="rounded-2xl border p-5 transition-shadow hover:shadow-md"
            style={{ background: C.cream, borderColor: C.border }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: C.brownDeep }}>
              Snacks Consumption Trend
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.snacksTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSnacks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.terracotta} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.terracotta} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="date" tick={{ fill: C.muted, fontSize: 11 }}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 11 }} allowDecimals={false}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix=" items" />} />
                  <Area
                    type="monotone" dataKey="snacks" name="Snacks"
                    stroke={C.terracotta} strokeWidth={2.5}
                    dot={{ r: 3, fill: C.terracotta, stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: C.terracotta, stroke: '#fff', strokeWidth: 2 }}
                    fill="url(#gradSnacks)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {analytics.peakSnacksDay && (
              <p className="text-xs mt-2" style={{ color: C.mutedLight }}>
                Peak: {fmtDate(analytics.peakSnacksDay)} ({analytics.peakSnacksCount} items)
              </p>
            )}
          </div>

          {/* C. Tea vs Snacks (Pie) */}
          <div
            className="rounded-2xl border p-5 transition-shadow hover:shadow-md"
            style={{ background: C.cream, borderColor: C.border }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: C.brownDeep }}>
              Drinks vs Snacks Spending
            </h3>
            {analytics.pieData.length > 0 ? (
              <div className="flex items-center justify-center gap-6">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.pieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {analytics.pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`Rs.${value}`, name]}
                        contentStyle={{ background: C.creamLight, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {analytics.pieData.map((d, i) => {
                    const total = analytics.pieData.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-sm" style={{ color: C.brownDeep }}>
                          {d.name}: <span className="font-semibold">Rs.{d.value}</span>
                          <span className="text-xs ml-1" style={{ color: C.mutedLight }}>({pct}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: C.muted }}>No cost data this month</p>
            )}
          </div>

          {/* D. Tea by Hour 9AM–6PM (Bar) */}
          <div
            className="rounded-2xl border p-5 transition-shadow hover:shadow-md"
            style={{ background: C.cream, borderColor: C.border }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold" style={{ color: C.brownDeep }}>
                  Tea Consumption by Time
                </h3>
                <p className="text-xs mt-0.5" style={{ color: C.mutedLight }}>9 AM – 6 PM</p>
              </div>
              {analytics.peakHour && analytics.peakHourCups > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'rgba(139,94,60,0.12)', color: C.brown }}
                >
                  Peak: {analytics.peakHour}
                </span>
              )}
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.hourlyTeaTrend}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="hour" tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 11 }} allowDecimals={false}
                    axisLine={{ stroke: C.border }} tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix=" cups" />} />
                  <Bar dataKey="cups" name="Cups" radius={[6, 6, 0, 0]}>
                    {analytics.hourlyTeaTrend.map((h) => (
                      <Cell
                        key={h.hour}
                        fill={h.hour === analytics.peakHour ? C.terracotta : C.brown}
                        opacity={h.cups === 0 ? 0.25 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Insights ─────────────────────────────────────────────────── */}
     

      {/* ─── Filter Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-bold" style={{ color: C.brownDeep }}>Detailed Report</h3>
        <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.border }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'tea', label: 'Tea' },
            { id: 'snacks', label: 'Snacks' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setFilterType(opt.id); setTablePage(0) }}
              className="px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: filterType === opt.id ? C.brown : C.creamLight,
                color: filterType === opt.id ? '#fff' : C.muted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: C.mutedLight }}>
          {tableData.length} day{tableData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Detailed Table ──────────────────────────────────────────── */}
      {tableData.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border py-14 text-center"
          style={{ background: C.cream, borderColor: C.border }}
        >
          <IconCup />
          <p className="mt-2 font-semibold" style={{ color: C.muted }}>
            No data for {fmtMonth(month)}
          </p>
          <p className="text-sm" style={{ color: C.mutedLight }}>
            Start logging entries to see reports.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: C.border }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { key: 'date', label: 'Date' },
                    { key: 'cups', label: 'Cups' },
                    { key: 'snacks', label: 'Snacks Qty' },
                    { key: 'teaCost', label: 'Drink Cost' },
                    { key: 'snacksCost', label: 'Snacks Cost' },
                    { key: 'total', label: 'Total Cost' },
                    { key: 'action', label: 'Action' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide select-none"
                      style={{ color: C.muted, cursor: col.key !== 'action' ? 'pointer' : 'default' }}
                      onClick={() => col.key !== 'action' && toggleSort(col.key)}
                    >
                      {col.label}
                      {col.key !== 'action' && <IconSort />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((day, idx) => (
                  <tr
                    key={day.dateKey}
                    className="transition-colors"
                    style={{
                      background: idx % 2 === 0 ? C.creamLight : C.creamBg,
                      borderBottom: `1px solid ${C.cream}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.cream }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? C.creamLight : C.creamBg }}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: C.brownDeep }}>
                      {fmtDate(day.dateKey)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: C.brown }}>
                      {day.cups}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: C.muted }}>
                      {day.snacks}
                    </td>
                    <td className="px-4 py-3" style={{ color: C.brownDeep }}>
                      Rs.{day.teaCost.toFixed(0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: C.terracotta }}>
                      Rs.{day.snacksCost.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: C.green }}>
                      Rs.{day.total.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{ color: C.brown }}
                        title="View details"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,94,60,0.1)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between border-t px-4 py-3"
              style={{ borderColor: C.border, background: C.cream }}
            >
              <p className="text-xs" style={{ color: C.muted }}>
                Page {tablePage + 1} of {totalPages}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={tablePage === 0}
                  onClick={() => setTablePage((p) => p - 1)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ borderColor: C.border, color: C.brownDeep, background: C.creamLight }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={tablePage >= totalPages - 1}
                  onClick={() => setTablePage((p) => p + 1)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ borderColor: C.border, color: C.brownDeep, background: C.creamLight }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Day Detail Modal ─────────────────────────────────────────── */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border"
            style={{ background: C.creamBg, borderColor: C.border }}
          >
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: C.border }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: C.brownDeep }}>
                  Day Details — {fmtDate(selectedDay.dateKey)}
                </h3>
                <p className="text-xs" style={{ color: C.muted }}>
                  Time-wise orders and billing breakdown
                </p>
              </div>
              <button type="button" onClick={() => setSelectedDay(null)} className="rounded-lg p-1.5" style={{ color: C.muted }}>
                <IconX />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: C.cream }}>
                    {['Time', 'Drink', 'Price', 'Snacks', 'Snack Qty', 'Snack Price', 'Discount', 'Total'].map((head) => (
                      <th key={head} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.entries.map((entry, index) => {
                    const bill = calcEntryBill(entry, settings)
                    const time = new Date(entry.createdAt || entry.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <tr key={entry._id} style={{ background: index % 2 === 0 ? C.creamLight : C.creamBg, borderTop: `1px solid ${C.cream}` }}>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>{time}</td>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>{drinkLabel(entry)}</td>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>{drinkRateLabel(entry, settings)}</td>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>{entry.others?.description || '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>{entry.snacks || 0}</td>
                        <td className="px-3 py-2.5" style={{ color: C.brownDeep }}>Rs.{bill.snacksPrice}</td>
                        <td className="px-3 py-2.5" style={{ color: C.terracotta }}>{bill.discountLabel}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: C.green }}>Rs.{bill.finalTotal.toFixed(0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Day totals */}
              <div
                className="mt-4 rounded-xl border px-4 py-3 flex flex-wrap gap-4 text-sm"
                style={{ background: C.cream, borderColor: C.border }}
              >
                <span style={{ color: C.brownDeep }}>
                  Total Cups: <span className="font-bold" style={{ color: C.brown }}>{selectedDay.cups}</span>
                </span>
                <span style={{ color: C.brownDeep }}>
                  Drink Cost: <span className="font-bold">Rs.{selectedDay.teaCost.toFixed(0)}</span>
                </span>
                <span style={{ color: C.brownDeep }}>
                  Snacks Cost: <span className="font-bold" style={{ color: C.terracotta }}>Rs.{selectedDay.snacksCost.toFixed(0)}</span>
                </span>
                <span style={{ color: C.brownDeep }}>
                  Day Total: <span className="font-bold" style={{ color: C.green }}>Rs.{selectedDay.total.toFixed(0)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
