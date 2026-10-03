import { useCallback, useEffect, useRef, useState } from 'react'
import logoImg from '../../assets/logo.png'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { authRequest, clearAuthState, getAuthState } from '../../utils/auth'
import ReportsPage from './ReportsPage'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function entryDateISO(entry) {
  return new Date(entry.date).toISOString().slice(0, 10)
}

const TEA_PRICE = 15
const COFFEE_PRICE = 25

const SNACK_OPTIONS = [
  { id: 'bun-samosa', label: 'Bun Samosa', price: 50 },
  { id: 'samosa', label: 'Samosa', price: 15 },
  { id: 'other', label: 'Something else', price: null },
]

function drinkParts(entry, settings) {
  const type = entry?.drinkType
  const storedTea = Number(entry?.teaPrice ?? settings?.teaPrice ?? 0) || 0
  const storedCoffee = Number(entry?.coffeePrice) || 0

  if (type === 'both') {
    return {
      teaCups: entry.morningTea || 0,
      teaPrice: storedTea || TEA_PRICE,
      coffeeCups: entry.coffeeCups || 0,
      coffeePrice: storedCoffee || COFFEE_PRICE,
    }
  }

  if (type === 'coffee') {
    const cups = (entry.coffeeCups || 0) || ((entry.morningTea || 0) + (entry.eveningTea || 0))
    return {
      teaCups: 0,
      teaPrice: 0,
      coffeeCups: cups,
      coffeePrice: storedCoffee || storedTea || COFFEE_PRICE,
    }
  }

  return {
    teaCups: (entry?.morningTea || 0) + (entry?.eveningTea || 0),
    teaPrice: storedTea,
    coffeeCups: entry?.coffeeCups || 0,
    coffeePrice: storedCoffee || COFFEE_PRICE,
  }
}

function totalCups(entry) {
  const parts = drinkParts(entry)
  return parts.teaCups + parts.coffeeCups
}

function drinkSummary(entry) {
  const parts = drinkParts(entry)
  const bits = []
  if (parts.teaCups) bits.push(`${parts.teaCups} Tea`)
  if (parts.coffeeCups) bits.push(`${parts.coffeeCups} Coffee`)
  return bits.length ? bits.join(', ') : '—'
}

function drinkPriceLabel(entry, settings) {
  const parts = drinkParts(entry, settings)
  const bits = []
  if (parts.teaCups) bits.push(`₹${parts.teaPrice}`)
  if (parts.coffeeCups) bits.push(`₹${parts.coffeePrice}`)
  return bits.join(' / ') || '—'
}

function snackOptionFromName(name) {
  const normalized = String(name || '').trim().toLowerCase()
  if (!normalized) return 'other'
  const match = SNACK_OPTIONS.find((option) => option.id !== 'other' && option.label.toLowerCase() === normalized)
  return match ? match.id : 'other'
}

function formatDrinkCounts(counts) {
  const parts = []
  if (counts?.tea) parts.push(`${counts.tea} Tea`)
  if (counts?.coffee) parts.push(`${counts.coffee} Coffee`)
  return parts.length ? parts.join(', ') : '—'
}

function calcEntryBill(entry, settings) {
  const parts = drinkParts(entry, settings)
  const teaPrice = parts.teaCups ? parts.teaPrice : parts.coffeePrice
  const snacksPrice = Number(entry.snacksPrice ?? settings?.snackPrice ?? 0) || 0
  const teaTotal = parts.teaCups * parts.teaPrice + parts.coffeeCups * parts.coffeePrice
  const snacksTotal = (entry.snacks || 0) * snacksPrice
  const subTotal = teaTotal + snacksTotal
  const discountType = entry.discount?.type || null
  const discountValue = Number(entry.discount?.amount || 0)
  const discountAmount = discountType === 'percent'
    ? (subTotal * discountValue) / 100
    : discountType === 'rupees'
      ? discountValue
      : 0

  return {
    teaPrice,
    snacksPrice,
    teaTotal,
    snacksTotal,
    subTotal,
    discountLabel: discountType === 'percent' ? `${discountValue}%` : discountType === 'rupees' ? `₹${discountValue}` : '—',
    finalTotal: Math.max(0, subTotal - discountAmount),
  }
}

const EMPTY_FORM = {
  date: todayISO(),
  morningTea: '',
  eveningTea: '',
  snacks: '',
  othersDescription: '',
  othersQuantity: '',
  othersCost: '',
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M3 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm0 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4zm8-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4zm0 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z" />
  </svg>
)

const IconPlus = ({ size = 'w-5 h-5' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={size}>
    <path fillRule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1z" clipRule="evenodd" />
  </svg>
)

const IconHistory = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-12a1 1 0 1 0-2 0v4l3.293 3.293a1 1 0 0 0 1.414-1.414L11 9.586V6z" clipRule="evenodd" />
  </svg>
)

const IconChart = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M2 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5zm6-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zm6-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4z" />
  </svg>
)

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

const IconMenu = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z" clipRule="evenodd" />
  </svg>
)

const IconX = ({ size = 'w-5 h-5' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={size}>
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
  </svg>
)

const IconEdit = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
)

const IconEye = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10 3C5.455 3 1.73 6.007.458 10c1.272 3.993 4.997 7 9.542 7s8.27-3.007 9.542-7C18.27 6.007 14.545 3 10 3zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2.2A1.8 1.8 0 1 0 10 8.2a1.8 1.8 0 0 0 0 3.6z" />
  </svg>
)

const IconCheck = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.981-1.742 2.981H4.42c-1.53 0-2.493-1.647-1.743-2.981l5.58-9.92zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z" clipRule="evenodd" />
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 1 1 0 2H3a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3h6a1 1 0 1 1 0 2H3zm11.707 4.293a1 1 0 0 1 0 1.414l-2 2a1 1 0 0 1-1.414-1.414L13.586 8l-2.293-2.293a1 1 0 0 1 1.414-1.414l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L13.586 12H7a1 1 0 1 1 0-2h6.586l-1.879-1.879a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
  </svg>
)

const IconQuestion = ({ size = 'w-5 h-5' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={size}>
    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H9z" clipRule="evenodd" />
  </svg>
)

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ entries, settings }) {
  const totals = entries.reduce(
    (acc, entry) => {
      const bill = calcEntryBill(entry, settings)
      acc.totalTea += totalCups(entry)
      acc.totalSnacks += entry.snacks || 0
      acc.totalCost += bill.finalTotal
      return acc
    },
    { totalTea: 0, totalSnacks: 0, totalCost: 0 },
  )
  const daysLogged = new Set(entries.map((e) => entryDateISO(e))).size

  const cards = [
    {
      label: 'Cups',
      sub: 'This month',
      value: totals.totalTea,
      icon: <IconCup />,
      color: '#8B5E3C',
      bg: 'rgba(139,94,60,0.1)',
    },
    {
      label: 'Snacks',
      sub: 'This month',
      value: totals.totalSnacks,
      icon: <IconSnack />,
      color: '#D08770',
      bg: 'rgba(208,135,112,0.12)',
    },
    {
      label: 'Total Cost',
      sub: 'This month',
      value: `₹${totals.totalCost.toFixed(0)}`,
      icon: <IconCoin />,
      color: '#7A8F6B',
      bg: 'rgba(122,143,107,0.12)',
    },
    {
      label: 'Days Logged',
      sub: 'This month',
      value: daysLogged,
      icon: <IconCalendar />,
      color: '#8B5E3C',
      bg: 'rgba(139,94,60,0.08)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border p-4 transition-shadow hover:shadow-md"
          style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
        >
          <div
            className="mb-3 inline-flex items-center justify-center rounded-xl p-2"
            style={{ background: card.bg, color: card.color }}
          >
            {card.icon}
          </div>
          <p className="text-2xl font-bold" style={{ color: '#3E2C23' }}>
            {card.value}
          </p>
          <p className="text-sm font-semibold" style={{ color: '#3E2C23' }}>
            {card.label}
          </p>
          <p className="text-xs" style={{ color: '#6F5E53' }}>
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Today Status ─────────────────────────────────────────────────────────────

function TodayStatus({ entries, onAddClick, onEditClick }) {
  const today = todayISO()
  const todayEntry = entries.find((e) => entryDateISO(e) === today)

  if (todayEntry) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
        style={{ background: 'rgba(122,143,107,0.08)', borderColor: 'rgba(122,143,107,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'rgba(122,143,107,0.2)', color: '#7A8F6B' }}
          >
            <IconCheck />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#3E2C23' }}>
              Today&apos;s entry logged ✓
            </p>
            <p className="text-xs" style={{ color: '#6F5E53' }}>
              {drinkSummary(todayEntry)} · {todayEntry.snacks || 0} snacks
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditClick(todayEntry)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors"
          style={{ borderColor: '#8B5E3C', color: '#8B5E3C' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#EFE6DD' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <IconEdit /> Edit
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
      style={{ background: 'rgba(208,135,112,0.08)', borderColor: 'rgba(208,135,112,0.3)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'rgba(208,135,112,0.2)', color: '#D08770' }}
        >
          <IconAlert />
        </div>
        <div>
          <p className="font-semibold" style={{ color: '#3E2C23' }}>
            No entry for today yet
          </p>
          <p className="text-xs" style={{ color: '#6F5E53' }}>
            Log tea or coffee for today
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAddClick}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: '#8B5E3C' }}
      >
        <IconPlus /> Add Entry
      </button>
    </div>
  )
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function entryToForm(entry) {
  if (!entry) {
    return {
      date: todayISO(),
      drinkType: 'tea',
      teaQty: '',
      coffeeQty: '',
      teaPrice: String(TEA_PRICE),
      coffeePrice: String(COFFEE_PRICE),
      snackOption: '',
      snacksName: '',
      snacksQty: '',
      snacksPrice: '',
    }
  }

  const parts = drinkParts(entry)
  const snackName = entry.others?.description || ''
  const hasSnack = (entry.snacks || 0) > 0 || Boolean(snackName)
  const snackOption = hasSnack ? snackOptionFromName(snackName) : ''
  const drinkType = entry.drinkType === 'coffee' || entry.drinkType === 'both'
    ? entry.drinkType
    : (parts.coffeeCups && parts.teaCups ? 'both' : parts.coffeeCups ? 'coffee' : 'tea')

  return {
    date: entryDateISO(entry),
    drinkType,
    teaQty: parts.teaCups ? String(parts.teaCups) : '',
    coffeeQty: parts.coffeeCups ? String(parts.coffeeCups) : '',
    teaPrice: String(parts.teaPrice || TEA_PRICE),
    coffeePrice: String(parts.coffeePrice || COFFEE_PRICE),
    snackOption,
    snacksName: snackOption === 'other' ? snackName : '',
    snacksQty: entry.snacks ? String(entry.snacks) : '',
    snacksPrice: hasSnack ? String(entry.snacksPrice ?? 0) : '',
  }
}

function EntryForm({ editingEntry, onSuccess, onCancel }) {
  const cupsRef = useRef(null)
  const [form, setForm] = useState(() => entryToForm(editingEntry))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discount, setDiscount] = useState(() => {
    const saved = editingEntry?.discount
    if (saved?.type && Number(saved.amount) > 0) {
      return { type: saved.type, amount: Number(saved.amount) }
    }
    return { type: null, amount: 0 }
  })
  const [discountInput, setDiscountInput] = useState({ type: 'percent', value: '' })

  useEffect(() => {
    setTimeout(() => cupsRef.current?.focus(), 60)
  }, [])

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function onSnackChange(event) {
    const id = event.target.value
    if (!id) {
      setForm((prev) => ({ ...prev, snackOption: '', snacksName: '', snacksQty: '', snacksPrice: '' }))
      return
    }
    const snack = SNACK_OPTIONS.find((option) => option.id === id)
    setForm((prev) => ({
      ...prev,
      snackOption: id,
      snacksName: id === 'other' ? prev.snacksName : '',
      snacksQty: prev.snacksQty || '1',
      snacksPrice: snack?.price == null ? (id === 'other' ? prev.snacksPrice : '') : String(snack.price),
    }))
  }

  const showTea = form.drinkType !== 'coffee'
  const showCoffee = form.drinkType !== 'tea'
  const selectedSnack = SNACK_OPTIONS.find((option) => option.id === form.snackOption)
  const teaQty = showTea ? (Number(form.teaQty) || 0) : 0
  const coffeeQty = showCoffee ? (Number(form.coffeeQty) || 0) : 0
  const teaPrice = Number(form.teaPrice) || TEA_PRICE
  const coffeePrice = Number(form.coffeePrice) || COFFEE_PRICE
  const snacksQty = Number(form.snacksQty) || 0
  const snacksPrice = Number(form.snacksPrice) || 0
  const teaTotal = teaQty * teaPrice
  const coffeeTotal = coffeeQty * coffeePrice
  const snacksTotal = snacksQty * snacksPrice
  const totalPrice = teaTotal + coffeeTotal + snacksTotal
  const snackLabel = form.snackOption === 'other'
    ? (form.snacksName.trim() || 'Snack')
    : (selectedSnack?.label || 'Snack')
  
  let discountAmount = 0
  if (discount.type === 'percent') {
    discountAmount = (totalPrice * discount.amount) / 100
  } else if (discount.type === 'rupees') {
    discountAmount = discount.amount
  }
  const finalPrice = Math.max(0, totalPrice - discountAmount)

  function handleDiscountSave() {
    const value = Number(discountInput.value)
    if (value > 0) {
      setDiscount({ type: discountInput.type, amount: value })
      setShowDiscountModal(false)
    }
  }

  function clearDiscount() {
    setDiscount({ type: null, amount: 0 })
    setDiscountInput({ type: 'percent', value: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.date || teaQty + coffeeQty === 0) {
      setError(form.drinkType === 'both'
        ? 'Enter how many teas and how many coffees'
        : `Enter at least 1 ${form.drinkType === 'coffee' ? 'coffee' : 'tea'}`)
      return
    }
    if (form.snackOption === 'other' && snacksQty > 0 && !form.snacksName.trim()) {
      setError('Please name the snack')
      return
    }
    setSaving(true)
    try {
      const snackName = form.snackOption === 'other'
        ? form.snacksName.trim()
        : (selectedSnack?.label || '')
      const payload = {
        date: form.date,
        morningTea: teaQty,
        eveningTea: 0,
        coffeeCups: coffeeQty,
        drinkType: form.drinkType,
        snacks: snacksQty,
        teaPrice: teaQty > 0 ? teaPrice : 0,
        coffeePrice: coffeeQty > 0 ? coffeePrice : 0,
        snacksPrice: snacksPrice,
        others: {
          description: snacksQty > 0 ? (snackName || 'Snacks') : '',
          quantity: snacksQty > 0 ? snacksPrice : 0,
          cost: snacksQty * snacksPrice,
        },
        discount: discount.type ? { type: discount.type, amount: discount.amount } : null,
      }
      if (editingEntry) {
        await authRequest(`/api/entries/${editingEntry._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await authRequest('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2'
  const inputStyle = {
    borderColor: '#D8CFC6',
    background: '#F7F3EF',
    color: '#3E2C23',
  }

  return (
    <div
      className="rounded-2xl border p-6 shadow-sm"
      style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: '#3E2C23' }}>
          {editingEntry ? 'Edit Entry' : 'Add Today\'s Entry'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 transition-colors"
          style={{ color: '#6F5E53' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#D8CFC6' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <IconX />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
            Date
          </label>
          <input
            type="date"
            max={todayISO()}
            value={form.date}
            onChange={set('date')}
            className={inputClass}
            style={{ ...inputStyle, '--tw-ring-color': '#8B5E3C' }}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
            Drink
          </label>
          <select
            value={form.drinkType}
            onChange={set('drinkType')}
            className={inputClass}
            style={inputStyle}
          >
            <option value="tea">Tea · ₹{TEA_PRICE} each</option>
            <option value="coffee">Coffee · ₹{COFFEE_PRICE} each</option>
            <option value="both">Tea and coffee</option>
          </select>
        </div>

        <div className={form.drinkType === 'both' ? 'grid grid-cols-2 gap-3' : ''}>
          {showTea && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                Tea cups
              </label>
              <input
                ref={form.drinkType === 'coffee' ? undefined : cupsRef}
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={form.teaQty}
                onChange={set('teaQty')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}
          {showCoffee && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                Coffee cups
              </label>
              <input
                ref={form.drinkType === 'coffee' ? cupsRef : undefined}
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={form.coffeeQty}
                onChange={set('coffeeQty')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
            Snack
          </label>
          <select
            value={form.snackOption}
            onChange={onSnackChange}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">None</option>
            {SNACK_OPTIONS.map((snack) => (
              <option key={snack.id} value={snack.id}>
                {snack.price == null ? snack.label : `${snack.label} · ₹${snack.price} each`}
              </option>
            ))}
          </select>
        </div>

        {form.snackOption === 'other' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                Snack name
              </label>
              <input
                type="text"
                placeholder="Biscuits, cake..."
                value={form.snacksName}
                onChange={set('snacksName')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                Quantity
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.snacksQty}
                onChange={set('snacksQty')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                Price each (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={form.snacksPrice}
                onChange={set('snacksPrice')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {form.snackOption && form.snackOption !== 'other' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
              {selectedSnack?.label} quantity
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={form.snacksQty}
              onChange={set('snacksQty')}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}

        {/* Total Bill Section */}
        <div
          className="rounded-lg border-2 px-4 py-4"
          style={{ background: 'rgba(122,143,107,0.08)', borderColor: '#7A8F6B' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: '#3E2C23' }}>TOTAL BILL</p>
            <button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              className="flex items-center gap-1 rounded-full p-1.5 transition-colors"
              style={{ color: '#7A8F6B', background: 'rgba(122,143,107,0.1)' }}
              title="Add or edit discount"
            >
              <IconQuestion size="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {teaQty > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#6F5E53' }}>Tea · {teaQty} × ₹{teaPrice}</p>
                <p className="text-sm font-semibold" style={{ color: '#3E2C23' }}>₹{teaTotal.toFixed(0)}</p>
              </div>
            )}
            {coffeeQty > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#6F5E53' }}>Coffee · {coffeeQty} × ₹{coffeePrice}</p>
                <p className="text-sm font-semibold" style={{ color: '#3E2C23' }}>₹{coffeeTotal.toFixed(0)}</p>
              </div>
            )}
            {snacksQty > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#6F5E53' }}>{snackLabel} · {snacksQty} × ₹{snacksPrice}</p>
                <p className="text-sm font-semibold" style={{ color: '#3E2C23' }}>₹{snacksTotal.toFixed(0)}</p>
              </div>
            )}
            
            {discount.type && (
              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'rgba(122,143,107,0.2)' }}>
                <p className="text-xs" style={{ color: '#6F5E53' }}>
                  Discount ({discount.type === 'percent' ? `${discount.amount}%` : `₹${discount.amount}`})
                </p>
                <p className="text-sm font-semibold" style={{ color: '#D08770' }}>-₹{discountAmount.toFixed(0)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t-2" style={{ borderColor: '#7A8F6B' }}>
            <p className="text-base font-bold" style={{ color: '#3E2C23' }}>You Pay</p>
            <p className="text-3xl font-black" style={{ color: '#7A8F6B' }}>
              ₹{finalPrice.toFixed(0)}
            </p>
          </div>

          {discount.type && (
            <button
              type="button"
              onClick={clearDiscount}
              className="mt-2 w-full text-xs py-1 rounded text-center transition-colors"
              style={{ color: '#D08770', background: 'rgba(208,135,112,0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(208,135,112,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(208,135,112,0.1)' }}
            >
              Clear Discount
            </button>
          )}
        </div>

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div
              className="rounded-2xl border p-6 max-w-sm w-full shadow-lg space-y-4"
              style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
            >
              <h2 className="text-lg font-bold" style={{ color: '#3E2C23' }}>Add Discount</h2>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="percent"
                      checked={discountInput.type === 'percent'}
                      onChange={(e) => setDiscountInput({ ...discountInput, type: e.target.value })}
                      style={{ accentColor: '#8B5E3C' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: '#3E2C23' }}>Percent (%)</span>
                  </label>
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="rupees"
                      checked={discountInput.type === 'rupees'}
                      onChange={(e) => setDiscountInput({ ...discountInput, type: e.target.value })}
                      style={{ accentColor: '#8B5E3C' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: '#3E2C23' }}>Rupees (₹)</span>
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                    {discountInput.type === 'percent' ? 'Discount %' : 'Discount Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter discount value"
                    value={discountInput.value}
                    onChange={(e) => setDiscountInput({ ...discountInput, value: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2"
                    style={{
                      borderColor: '#D8CFC6',
                      background: '#F7F3EF',
                      color: '#3E2C23',
                      '--tw-ring-color': '#8B5E3C'
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDiscountSave}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all"
                  style={{ background: '#8B5E3C' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#7A4F33' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#8B5E3C' }}
                >
                  Apply Discount
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{ borderColor: '#D8CFC6', color: '#6F5E53' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#D8CFC6' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg px-4 py-2 text-sm" style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c' }}>
            ⚠️ {error}
          </p>
        )}

        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#8B5E3C' }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#7A4F33' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#8B5E3C' }}
          >
            {saving ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <IconCheck />
            )}
            {saving ? 'Saving...' : editingEntry ? 'Update' : 'Save Entry'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-6 py-3 text-sm font-semibold transition-colors"
            style={{ borderColor: '#D8CFC6', color: '#6F5E53' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#D8CFC6' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({ entries, month, onMonthChange, settings }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)

  const groupedEntries = entries.reduce((acc, entry) => {
    const dateKey = entryDateISO(entry)

    if (!acc[dateKey]) {
      acc[dateKey] = {
        dateKey,
        entries: [],
        totalTeaCups: 0,
        drinkCounts: { tea: 0, coffee: 0 },
        snacksNames: new Set(),
        snacksTotal: 0,
        dayTotal: 0,
      }
    }

    const bill = calcEntryBill(entry, settings)
    const snacksName = String(entry.others?.description || '').trim()
    const snacksTotal = (entry.snacks || 0) * bill.snacksPrice

    const parts = drinkParts(entry, settings)
    acc[dateKey].entries.push(entry)
    acc[dateKey].totalTeaCups += parts.teaCups + parts.coffeeCups
    acc[dateKey].drinkCounts.tea += parts.teaCups
    acc[dateKey].drinkCounts.coffee += parts.coffeeCups
    if (snacksName) {
      acc[dateKey].snacksNames.add(snacksName)
    }
    acc[dateKey].snacksTotal += snacksTotal
    acc[dateKey].dayTotal += bill.finalTotal

    return acc
  }, {})

  const dayRows = Object.values(groupedEntries)
    .map((day) => ({
      ...day,
      entries: day.entries.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)),
      snacksNamesLabel: day.snacksNames.size ? Array.from(day.snacksNames).join(', ') : '—',
      drinksLabel: formatDrinkCounts(day.drinkCounts),
    }))
    .sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey))

  const invoiceSummary = dayRows.reduce(
    (acc, day) => {
      acc.totalTea += day.totalTeaCups
      acc.totalSnacks += day.entries.reduce((sum, entry) => sum + (entry.snacks || 0), 0)
      acc.totalSnackCost += day.snacksTotal
      acc.totalAmount += day.dayTotal

      for (const entry of day.entries) {
        const bill = calcEntryBill(entry, settings)
        acc.totalTeaCost += bill.teaTotal
      }

      return acc
    },
    { totalTea: 0, totalSnacks: 0, totalTeaCost: 0, totalSnackCost: 0, totalAmount: 0 },
  )

  const periodStart = dayRows.length ? dayRows[dayRows.length - 1].dateKey : month
  const periodEnd = dayRows.length ? dayRows[0].dateKey : month

  function formatInvoiceCurrency(value) {
    return `Rs. ${Number(value || 0).toFixed(0)}`
  }

  function downloadMonthlyInvoicePdf() {
    const doc = new jsPDF()
    const fileMonth = month || currentMonth()

    doc.setFontSize(17)
    doc.setTextColor(62, 44, 35)
    doc.text('Athena LMS - Monthly Invoice', 14, 18)

    doc.setFontSize(11)
    doc.setTextColor(111, 94, 83)
    doc.text('Vendor Name: Jai Tea Pantry', 14, 28)
    doc.text(`Duration: ${fmtDate(periodStart)} to ${fmtDate(periodEnd)}`, 14, 35)
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 42)

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Drinks', 'Snacks', 'Snacks Total', 'Day Total']],
      body: dayRows.map((day) => [
        fmtDate(day.dateKey),
        day.drinksLabel,
        day.snacksNamesLabel,
        formatInvoiceCurrency(day.snacksTotal),
        formatInvoiceCurrency(day.dayTotal),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 94, 60] },
      styles: { fontSize: 10 },
    })

    const summaryStartY = doc.lastAutoTable.finalY + 12
    doc.setFontSize(12)
    doc.setTextColor(62, 44, 35)
    doc.text('Bill Summary', 14, summaryStartY)

    autoTable(doc, {
      startY: summaryStartY + 3,
      head: [['Metric', 'Value']],
      body: [
        ['Total Cups', String(invoiceSummary.totalTea)],
        ['Total Snacks', String(invoiceSummary.totalSnacks)],
        ['Drink Cost', formatInvoiceCurrency(invoiceSummary.totalTeaCost)],
        ['Total Snacks Cost', formatInvoiceCurrency(invoiceSummary.totalSnackCost)],
        ['Total Amount Payable', formatInvoiceCurrency(invoiceSummary.totalAmount)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [122, 143, 107] },
      styles: { fontSize: 10 },
    })

    doc.setFontSize(10)
    doc.setTextColor(111, 94, 83)
    doc.text('Generated by Aaj Ki Chai', 14, doc.lastAutoTable.finalY + 10)

    doc.save(`athena-lmm-invoice-${fileMonth}.pdf`)
  }

  return (
    <div>
      {/* Month filter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold" style={{ color: '#3E2C23' }}>
          Entry History
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInvoicePreview(true)}
            disabled={dayRows.length === 0}
            className="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ borderColor: '#8B5E3C', color: '#8B5E3C', background: '#FFF9F2' }}
          >
            Invoice
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm font-medium outline-none"
            style={{ borderColor: '#D8CFC6', background: '#EFE6DD', color: '#3E2C23' }}
          />
        </div>
      </div>

      {dayRows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
          style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
        >
          <IconCup />
          <p className="mt-2 font-semibold" style={{ color: '#6F5E53' }}>
            No entries for {fmtMonth(month)}
          </p>
          <p className="text-sm" style={{ color: '#A0897C' }}>
            Start logging to see your history here.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: '#D8CFC6' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#EFE6DD', borderBottom: '1px solid #D8CFC6' }}>
                  {['Date', 'Drinks', 'Snacks Name', 'Snacks Total', 'Total Day Cost', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#6F5E53' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayRows.map((day, idx) => (
                  <tr
                    key={day.dateKey}
                    style={{
                      background: idx % 2 === 0 ? '#FFFDF8' : '#F7F3EF',
                      borderBottom: '1px solid #EFE6DD',
                    }}
                    className="transition-colors hover:bg-[#EFE6DD]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: '#3E2C23' }}>
                      {fmtDate(day.dateKey)}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#8B5E3C' }}>
                      {day.drinksLabel}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6F5E53' }}>
                      {day.snacksNamesLabel}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#D08770' }}>
                      ₹{day.snacksTotal.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#7A8F6B' }}>
                      ₹{day.dayTotal.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{ color: '#8B5E3C' }}
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
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border" style={{ background: '#F7F3EF', borderColor: '#D8CFC6' }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: '#D8CFC6' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#3E2C23' }}>
                  Day Details - {fmtDate(selectedDay.dateKey)}
                </h3>
                <p className="text-xs" style={{ color: '#6F5E53' }}>
                  Time-wise orders and billing breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1.5"
                style={{ color: '#6F5E53' }}
              >
                <IconX />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#EFE6DD' }}>
                    {['Time', 'Drink', 'Price', 'Snacks', 'Snack Qty', 'Snack Price', 'Discount', 'Total'].map((head) => (
                      <th key={head} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.entries.map((entry, index) => {
                    const bill = calcEntryBill(entry, settings)
                    const time = new Date(entry.createdAt || entry.date).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <tr key={entry._id} style={{ background: index % 2 === 0 ? '#FFFDF8' : '#F7F3EF', borderTop: '1px solid #E8DED4' }}>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>{time}</td>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>{drinkSummary(entry)}</td>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>{drinkPriceLabel(entry, settings)}</td>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>{entry.others?.description || '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>{entry.snacks || 0}</td>
                        <td className="px-3 py-2.5" style={{ color: '#3E2C23' }}>₹{bill.snacksPrice}</td>
                        <td className="px-3 py-2.5" style={{ color: '#D08770' }}>{bill.discountLabel}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: '#7A8F6B' }}>₹{bill.finalTotal.toFixed(0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showInvoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border" style={{ background: '#F7F3EF', borderColor: '#D8CFC6' }}>
            <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: '#D8CFC6' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#3E2C23' }}>Monthly Invoice Preview</h3>
                <p className="text-sm" style={{ color: '#6F5E53' }}>Athena LMS - Monthly Invoice</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="rounded-lg p-1.5"
                style={{ color: '#6F5E53' }}
              >
                <IconX />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <p style={{ color: '#3E2C23' }}><span className="font-semibold">Vendor Name:</span> Jai Tea Pantry</p>
                <p style={{ color: '#3E2C23' }}><span className="font-semibold">Duration:</span> {fmtDate(periodStart)} to {fmtDate(periodEnd)}</p>
                <p style={{ color: '#3E2C23' }}><span className="font-semibold">Month:</span> {fmtMonth(month)}</p>
              </div>

              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#D8CFC6' }}>
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr style={{ background: '#EFE6DD' }}>
                      {['Date', 'Drinks', 'Snacks', 'Snacks Total', 'Day Total'].map((head) => (
                        <th key={head} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6F5E53' }}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((day, index) => (
                      <tr key={day.dateKey} style={{ background: index % 2 === 0 ? '#FFFDF8' : '#F7F3EF', borderTop: '1px solid #E8DED4' }}>
                        <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{fmtDate(day.dateKey)}</td>
                        <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{day.drinksLabel}</td>
                        <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{day.snacksNamesLabel}</td>
                        <td className="px-4 py-2.5" style={{ color: '#D08770' }}>{formatInvoiceCurrency(day.snacksTotal)}</td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: '#7A8F6B' }}>{formatInvoiceCurrency(day.dayTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl border p-4" style={{ borderColor: '#D8CFC6', background: '#EFE6DD' }}>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: '#3E2C23' }}>Bill Summary</h4>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <p style={{ color: '#3E2C23' }}>Total Cups: <span className="font-semibold">{invoiceSummary.totalTea}</span></p>
                  <p style={{ color: '#3E2C23' }}>Total Snacks: <span className="font-semibold">{invoiceSummary.totalSnacks}</span></p>
                  <p style={{ color: '#3E2C23' }}>Drink Cost: <span className="font-semibold">{formatInvoiceCurrency(invoiceSummary.totalTeaCost)}</span></p>
                  <p style={{ color: '#3E2C23' }}>Total Snacks Cost: <span className="font-semibold">{formatInvoiceCurrency(invoiceSummary.totalSnackCost)}</span></p>
                </div>
                <div className="mt-3 border-t pt-3" style={{ borderColor: '#D8CFC6' }}>
                  <p className="text-base font-bold" style={{ color: '#7A8F6B' }}>
                    Total Amount Payable: {formatInvoiceCurrency(invoiceSummary.totalAmount)}
                  </p>
                </div>
                <p className="mt-3 text-sm italic" style={{ color: '#6F5E53' }}>
                  Generated by Aaj Ki Chai
                </p>
              </div>
            </div>

            <div className="border-t px-6 py-4" style={{ borderColor: '#D8CFC6', background: '#FFF9F2' }}>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvoicePreview(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: '#D8CFC6', color: '#6F5E53' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={downloadMonthlyInvoicePdf}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                  style={{ background: '#8B5E3C' }}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TodayBriefSheet({ entries, settings, onViewAll }) {
  const today = todayISO()
  const todayEntries = entries
    .filter((entry) => entryDateISO(entry) === today)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))

  return (
    <section className="rounded-2xl border" style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#D8CFC6' }}>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#3E2C23' }}>
            Today Brief Sheet
          </h3>
          <p className="text-xs" style={{ color: '#6F5E53' }}>
            Day-wise summary for {fmtDate(today)}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ borderColor: '#8B5E3C', color: '#8B5E3C' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF9F2' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          View All
        </button>
      </div>

      {todayEntries.length === 0 ? (
        <p className="px-4 py-6 text-sm" style={{ color: '#6F5E53' }}>
          No entry added for today yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr style={{ background: '#F7F3EF' }}>
                {['Date', 'Time', 'Drink', 'Price ₹', 'Snacks', 'Snack Qty', 'Snack ₹', 'Discount', 'Total ₹'].map((head) => (
                  <th
                    key={head}
                    className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#6F5E53' }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayEntries.map((entry, index) => {
                const bill = calcEntryBill(entry, settings)
                const time = new Date(entry.createdAt || entry.date).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <tr
                    key={entry._id}
                    style={{
                      background: index % 2 === 0 ? '#FFFDF8' : '#F7F3EF',
                      borderTop: '1px solid #E8DED4',
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#3E2C23' }}>{fmtDate(entry.date)}</td>
                    <td className="px-4 py-2.5" style={{ color: '#6F5E53' }}>{time}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{drinkSummary(entry)}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{drinkPriceLabel(entry, settings)}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{entry.others?.description || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>{entry.snacks || 0}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3E2C23' }}>₹{bill.snacksPrice}</td>
                    <td className="px-4 py-2.5" style={{ color: '#D08770' }}>{bill.discountLabel}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: '#7A8F6B' }}>₹{bill.finalTotal.toFixed(0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ─── Monthly Report ────────────────────────────────────────────────────────────

function MonthlyReport({ summary, settings, month }) {
  const data = summary?.employees?.[0]
  const teaPrice = settings?.teaPrice || 0
  const snackPrice = settings?.snackPrice || 0

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconChart />
        <p className="mt-2" style={{ color: '#6F5E53' }}>
          No data for {fmtMonth(month)}
        </p>
      </div>
    )
  }

  const teaCost = data.totalTea * teaPrice
  const snackCost = data.totalSnacks * snackPrice
  const otherCost = data.otherCost || 0
  const total = teaCost + snackCost + otherCost

  const bars = [
    { label: 'Tea cost', value: teaCost, max: total || 1, color: '#8B5E3C', bg: 'rgba(139,94,60,0.12)', symbol: `₹${teaCost.toFixed(0)}` },
    { label: 'Snacks cost', value: snackCost, max: total || 1, color: '#D08770', bg: 'rgba(208,135,112,0.12)', symbol: `₹${snackCost.toFixed(0)}` },
    { label: 'Others cost', value: otherCost, max: total || 1, color: '#7A8F6B', bg: 'rgba(122,143,107,0.12)', symbol: `₹${otherCost.toFixed(0)}` },
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold" style={{ color: '#3E2C23' }}>
        Monthly Report — {fmtMonth(month)}
      </h2>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Cups', value: data.totalTea, color: '#8B5E3C' },
          { label: 'Total Snacks', value: data.totalSnacks, color: '#D08770' },
          { label: 'Other qty', value: data.otherQuantity, color: '#7A8F6B' },
          { label: 'Total Bill', value: `₹${data.estimatedCost?.toFixed(0)}`, color: '#3E2C23' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4 text-center"
            style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs font-medium" style={{ color: '#6F5E53' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Cost breakdown bars */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#3E2C23' }}>
          Cost Breakdown
        </p>
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold" style={{ color: '#6F5E53' }}>
              <span>{bar.label}</span>
              <span style={{ color: bar.color }}>{bar.symbol}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#D8CFC6' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${total > 0 ? (bar.value / total) * 100 : 0}%`,
                  background: `linear-gradient(to right, ${bar.color}, ${bar.color}cc)`,
                }}
              />
            </div>
          </div>
        ))}
        <div className="mt-1 flex justify-between text-sm font-bold pt-1 border-t" style={{ borderColor: '#D8CFC6', color: '#3E2C23' }}>
          <span>Total Estimated Bill</span>
          <span>₹{total.toFixed(0)}</span>
        </div>
      </div>

      {/* Pricing note */}
      <p className="text-xs px-1" style={{ color: '#A0897C' }}>
        Prices: Tea ₹{teaPrice}/cup · Snacks ₹{snackPrice}/item. Contact your vendor to update pricing.
      </p>
    </div>
  )
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

function AlertsSection({ entries }) {
  const alerts = []

  const today = new Date()
  const missedDays = []

  // Check last 7 days (excluding today)
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Skip weekends (0=Sun, 6=Sat)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const iso = d.toISOString().slice(0, 10)
    if (!entries.find((e) => entryDateISO(e) === iso)) {
      missedDays.push(iso)
    }
  }


  // Compare cups this week vs last week
  const thisWeekCups = entries
    .filter((e) => {
      const diff = (today - new Date(e.date)) / 86400000
      return diff >= 0 && diff < 7
    })
    .reduce((acc, e) => acc + totalCups(e), 0)

  const lastWeekCups = entries
    .filter((e) => {
      const diff = (today - new Date(e.date)) / 86400000
      return diff >= 7 && diff < 14
    })
    .reduce((acc, e) => acc + totalCups(e), 0)

  if (lastWeekCups > 0 && thisWeekCups > lastWeekCups) {
    alerts.push({
      type: 'info',
      message: `Your tea consumption increased this week (${thisWeekCups} cups vs ${lastWeekCups} last week).`,
      color: '#8B5E3C',
      bg: 'rgba(139,94,60,0.08)',
      border: 'rgba(139,94,60,0.25)',
    })
  }

  if (lastWeekCups > 0 && thisWeekCups < lastWeekCups) {
    alerts.push({
      type: 'success',
      message: `Great job! Tea intake is down this week (${thisWeekCups} vs ${lastWeekCups} last week). 🌿`,
      color: '#7A8F6B',
      bg: 'rgba(122,143,107,0.08)',
      border: 'rgba(122,143,107,0.3)',
    })
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-2xl border px-4 py-3"
          style={{ background: alert.bg, borderColor: alert.border }}
        >
          <div className="mt-0.5 shrink-0" style={{ color: alert.color }}>
            <IconAlert />
          </div>
          <p className="text-sm font-medium" style={{ color: '#3E2C23' }}>
            {alert.message}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── NAV ITEMS ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard /> },
  { id: 'history', label: 'History', icon: <IconHistory /> },
  { id: 'reports', label: 'Reports', icon: <IconChart /> },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user } = getAuthState()

  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [entries, setEntries] = useState([])
  const [settings, setSettings] = useState({ teaPrice: 0, snackPrice: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [editingEntry, setEditingEntry] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [prevMonthEntries, setPrevMonthEntries] = useState([])

  const fetchData = useCallback(async (month) => {
    setLoading(true)
    try {
      const [entriesRes, settingsRes] = await Promise.all([
        authRequest(`/api/entries?month=${month}`),
        authRequest('/api/settings'),
      ])
      setEntries(entriesRes.entries || [])
      setSettings(settingsRes.settings || { teaPrice: 0, snackPrice: 0 })

      // Fetch previous month entries for comparison
      const [y, m] = month.split('-').map(Number)
      const prevDate = new Date(y, m - 2, 1)
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      try {
        const prevRes = await authRequest(`/api/entries?month=${prevMonth}`)
        setPrevMonthEntries(prevRes.entries || [])
      } catch {
        setPrevMonthEntries([])
      }
    } catch {
      // silently fail — entries will just be empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(selectedMonth)
  }, [selectedMonth, fetchData])

  function handleLogout() {
    clearAuthState()
    navigate('/login')
  }

  function handleEditEntry(entry) {
    setEditingEntry(entry)
    setShowForm(true)
    setActiveSection('dashboard')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditingEntry(null)
    setSuccessMsg(editingEntry ? 'Entry updated!' : 'Entry saved!')
    setTimeout(() => setSuccessMsg(''), 3000)
    fetchData(selectedMonth)
  }

  function handleFormCancel() {
    setShowForm(false)
    setEditingEntry(null)
  }

  function handleMonthChange(month) {
    setSelectedMonth(month)
  }

  function navigate2(section) {
    setActiveSection(section)
    setSidebarOpen(false)
    setShowForm(false)
    setEditingEntry(null)
  }

  // ─── Sidebar ─────────────────────────────────────────────────────────────

  function Sidebar({ mobile = false }) {
    return (
      <nav
        className={mobile ? 'flex flex-col gap-1 p-4' : 'flex flex-col gap-1 p-4 h-full'}
      >
        {/* Logo */}
        <div className="mb-6 px-2">
          <div
            className="flex items-center rounded-full border p-1.5 pr-4 shadow-[0_16px_34px_-26px_rgba(62,44,35,0.8)]"
            style={{ background: '#FFF9F2', borderColor: '#D8CFC6' }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'radial-gradient(circle at top, #fffdf8, #efe6dd)', boxShadow: 'inset 0 0 0 1px #E3D8CE' }}
            >
              <img src={logoImg} alt="Aaj Ki Chai" className="h-7 w-auto object-contain" />
            </span>
            {!mobile && (
              <span className="ml-3 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#8B5E3C' }}>
                AKC
              </span>
            )}
          </div>
        </div>

        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate2(item.id)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all text-left w-full"
              style={{
                background: active ? 'rgba(139,94,60,0.12)' : 'transparent',
                color: active ? '#8B5E3C' : '#6F5E53',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(139,94,60,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ color: active ? '#8B5E3C' : '#A0897C' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}

        {/* Logout at bottom */}
        <div className="mt-auto pt-4 border-t" style={{ borderColor: '#D8CFC6' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            style={{ color: '#6F5E53' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,94,60,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconLogout />
            Logout
          </button>
        </div>
      </nav>
    )
  }

  // ─── Dashboard Section ────────────────────────────────────────────────────

  function DashboardSection() {
    return (
      <div className="space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#3E2C23' }}>
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} ☕
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6F5E53' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div
            className="flex items-center gap-2 rounded-2xl border px-4 py-3"
            style={{ background: 'rgba(122,143,107,0.1)', borderColor: 'rgba(122,143,107,0.35)', color: '#3E2C23' }}
          >
            <span style={{ color: '#7A8F6B' }}><IconCheck /></span>
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Summary Cards */}
        <SummaryCards entries={entries} settings={settings} />

        {/* Today Status */}
        <TodayStatus
          entries={entries}
          onAddClick={() => { setEditingEntry(null); setShowForm(true) }}
          onEditClick={handleEditEntry}
        />

        {/* Entry Form */}
        {showForm && (
          <EntryForm
            key={editingEntry?._id || 'new'}
            editingEntry={editingEntry}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        <TodayBriefSheet
          entries={entries}
          settings={settings}
          onViewAll={() => setActiveSection('history')}
        />

        {/* Alerts */}
        <AlertsSection entries={entries} />

        {/* Month note */}
        <p className="text-xs px-1" style={{ color: '#A0897C' }}>
          Showing data for {fmtMonth(selectedMonth)}. Switch to History to filter by month.
        </p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F7F3EF' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r lg:flex"
        style={{ background: '#F7F3EF', borderColor: '#D8CFC6' }}
      >
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(62,44,35,0.35)' }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="absolute inset-y-0 left-0 w-72 overflow-y-auto shadow-2xl"
            style={{ background: '#F7F3EF' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#D8CFC6' }}>
              <span className="font-bold" style={{ color: '#3E2C23' }}>Menu</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg"
                style={{ color: '#6F5E53' }}
              >
                <IconX size="w-6 h-6" />
              </button>
            </div>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6"
          style={{ background: '#F7F3EF', borderColor: '#D8CFC6' }}
        >
          {/* Left: Hamburger (mobile) + Page title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 lg:hidden"
              style={{ color: '#6F5E53' }}
              onClick={() => setSidebarOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EFE6DD' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <IconMenu />
            </button>
            <span className="text-sm font-bold capitalize" style={{ color: '#3E2C23' }}>
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Dashboard'}
            </span>
          </div>

          {/* Right: user + add btn */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setActiveSection('dashboard'); setEditingEntry(null); setShowForm(true) }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-4 sm:text-sm"
              style={{ background: '#8B5E3C' }}
            >
              <IconPlus size="w-4 h-4" /> <span className="hidden sm:inline">Add Entry</span>
            </button>
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5"
              style={{ background: '#EFE6DD', borderColor: '#D8CFC6' }}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #8B5E3C, #D08770)' }}
              >
                {user?.name?.[0]?.toUpperCase() || 'E'}
              </div>
              <span className="hidden text-xs font-semibold sm:block" style={{ color: '#3E2C23' }}>
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div
                className="h-10 w-10 animate-spin rounded-full border-4"
                style={{ borderColor: '#D8CFC6', borderTopColor: '#8B5E3C' }}
              />
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && <DashboardSection />}
              {activeSection === 'history' && (
                <HistoryTable
                  entries={entries}
                  settings={settings}
                  month={selectedMonth}
                  onMonthChange={handleMonthChange}
                />
              )}
              {activeSection === 'reports' && (
                <ReportsPage
                  entries={entries}
                  settings={settings}
                  month={selectedMonth}
                  onMonthChange={handleMonthChange}
                  user={user}
                  prevMonthEntries={prevMonthEntries}
                />
              )}
            </>
          )}
        </main>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => { setActiveSection('dashboard'); setEditingEntry(null); setShowForm(true) }}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
          style={{ background: 'linear-gradient(135deg, #8B5E3C, #D08770)', boxShadow: '0 6px 20px rgba(139,94,60,0.4)' }}
          aria-label="Add entry"
        >
          <IconPlus size="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
