'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Home, MapPin, DollarSign, Banknote, Building2,
  ChevronDown, Pencil, Trash2, TrendingUp, Calendar, Map,
  UserRound, Globe2, ChevronRight, Percent, ArrowRightLeft,
  Clock, BadgeCheck, BarChart2, Hash,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import dynamic from 'next/dynamic'
import AnalystAlert, { AnalystAlertProps } from './AnalystAlert'
import CMAModal from './CMAModal'

const PropertyMap = dynamic(() => import('./PropertyMap'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type PropertyType =
  | 'residential_apartment' | 'pinui_binui' | 'first_hand' | 'purchase_group'
  | 'urban_renewal' | 'house' | 'commercial' | 'land' | 'other'
  | 'overseas_usa' | 'overseas_europe'

interface ExpenseItem {
  label: string
  amount: number
  frequency: 'monthly' | 'annual' | 'one_time'
}

interface Professional {
  role: string
  name: string
  phone: string
}

export interface DirectoryProfessional {
  id: string
  role: string
  name: string
  phone: string | null
  company: string | null
}

export interface PensionRef {
  id: string
  name: string
  account_type: string
  balance: number
  maturity_date: string | null
}

export interface Property {
  id: string
  name: string
  address: string | null
  property_type: string
  current_value: number | null
  mortgage_outstanding: number | null
  mortgage_monthly_payment: number | null
  monthly_rent: number | null
  other_expenses: number | null
  total_cost: number | null
  contract_price: number | null
  closing_fees: number | null
  purchase_date: string | null
  target_exit_date: string | null
  expected_sale_amount: number | null
  created_at: string
  ownership_percentage: number | null
  developer: string | null
  expense_items: ExpenseItem[] | null
  initial_equity: number | null
  delivery_equity: number | null
  completion_amount: number | null
  completion_funding_source: string | null
  funding_pension_account_id: string | null
  overseas_region: string | null
  overseas_location: string | null
  professionals: Professional[] | null
  // v3 smart equity fields
  residence_status: string | null
  payment_terms: string | null
  linked_property_to_sell_id: string | null
  sell_by_date: string | null
  // Technical fields (v4 CMA)
  property_city: string | null
  rooms: number | null
  floor: number | null
  total_size_sqm: number | null
  balcony_size_sqm: number | null
  has_parking: boolean
  has_storage: boolean
  gush: string | null
  chelka: string | null
  ownership_type: string | null
  estimated_market_value: number | null
}

interface Props {
  properties: Property[]
  netCashFlow: number
  pensionAccounts: PensionRef[]
  userRole: string
  professionalDirectory: DirectoryProfessional[]
  hasCashFlowIncome: boolean
  hasCashFlowExpenses: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROJECT_TYPES     = new Set<string>(['first_hand'])
const OVERSEAS_TYPES    = new Set<string>(['overseas_usa', 'overseas_europe'])
const NO_MORTGAGE_TYPES = new Set<string>(['land', 'first_hand'])

// Legal equity requirements by residence status (%)
const RESIDENCE_EQUITY: Record<string, number> = {
  first_apartment:       25,
  alternative_apartment: 30,
  second_apartment:      50,
}

// Initial payment fraction from payment terms (%)
const PAYMENT_INITIAL: Record<string, number> = {
  '5/95':  5,
  '10/90': 10,
  '15/85': 15,
  '20/80': 20,
}

const PAYMENT_TERMS_OPTIONS = ['5/95', '10/90', '15/85', '20/80']

const USA_STATES    = ['Florida', 'Texas', 'New York', 'Georgia', 'Arizona', 'Other']
const EUROPE_CTRIES = ['Greece', 'Portugal', 'Cyprus', 'Germany', 'Spain', 'Other']

const PROPERTY_GROUPS_HE = [
  { label: 'מגורים',       types: ['residential_apartment', 'house']                                  },
  { label: 'השקעות',      types: ['commercial', 'land', 'other', 'first_hand', 'urban_renewal', 'purchase_group'] },
  { label: 'נדל"ן חו"ל', types: ['overseas_usa', 'overseas_europe']                                  },
]
const PROPERTY_GROUPS_EN = [
  { label: 'Residence',    types: ['residential_apartment', 'house']                                  },
  { label: 'Investments',  types: ['commercial', 'land', 'other', 'first_hand', 'urban_renewal', 'purchase_group'] },
  { label: 'Overseas',     types: ['overseas_usa', 'overseas_europe']                                 },
]

// ── CMA Engine ────────────────────────────────────────────────────────────────
// TODO: Connect to Madlan/Gov.il API for live valuation before production.
const CITY_PRICES_PER_SQM: Record<string, number> = {
  'תל אביב':       55000,
  'ירושלים':       30000,
  'חיפה':          18000,
  'ראשון לציון':   22000,
  'פתח תקווה':     20000,
  'נתניה':         22000,
  'באר שבע':        9500,
  'אשדוד':         14000,
  'רמת גן':        28000,
  'הרצליה':        32000,
  'כפר סבא':       20000,
  'רעננה':         25000,
}

const CITY_OPTIONS = [...Object.keys(CITY_PRICES_PER_SQM), 'אחר']

function computeCMA(city: string, sqm: number, floor: number, balcony: number): number | null {
  const p = CITY_PRICES_PER_SQM[city]
  if (!p || sqm <= 0) return null
  return Math.round((sqm * p) + (floor * 0.01 * p) + (balcony * 0.5 * p))
}

const PROF_ROLES = ['broker', 'lawyer', 'analyst', 'contractor', 'other']
const PROF_LABELS_HE: Record<string, string> = {
  broker: 'מתווך', lawyer: 'עורך דין', analyst: 'אנליסט', contractor: 'קבלן', other: 'אחר',
}
const PROF_LABELS_EN: Record<string, string> = {
  broker: 'Broker', lawyer: 'Lawyer', analyst: 'Analyst', contractor: 'Contractor', other: 'Other',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (n: number | null | undefined) =>
  n == null ? '—' : '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

const formatPct = (n: number | null) =>
  n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%'

const calcEquity = (value: number | null, outstanding: number | null) =>
  value == null ? null : value - (outstanding ?? 0)

const calcROI = (exitValue: number | null, cost: number | null): number | null => {
  if (exitValue == null || cost == null || cost === 0) return null
  return ((exitValue - cost) / cost) * 100
}

const calcProjectedROI = (expectedSale: number | null, cost: number | null): number | null => {
  if (expectedSale == null || cost == null || cost === 0) return null
  return ((expectedSale - cost) / cost) * 100
}

const calcIRR = (
  exitValue: number | null,
  cost: number | null,
  purchaseDate: string | null
): number | null => {
  if (exitValue == null || cost == null || cost <= 0 || !purchaseDate) return null
  const years = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (years < 0.1) return null
  return (Math.pow(exitValue / cost, 1 / years) - 1) * 100
}

const calcNetYield = (
  rent: number | null,
  cost: number | null,
  mortgageMonthly: number | null,
  otherExpenses: number | null,
  expenseItems: ExpenseItem[] | null,
  ownership: number
): number | null => {
  if (!cost || cost <= 0) return null
  const annualRent     = (rent ?? 0) * 12 * ownership
  const annualMortgage = (mortgageMonthly ?? 0) * 12
  const annualOther    = (otherExpenses ?? 0) * 12
  const annualExtra    = (expenseItems ?? []).reduce((s, e) =>
    s + (e.frequency === 'monthly' ? e.amount * 12 : e.frequency === 'annual' ? e.amount : 0), 0)
  return ((annualRent - annualMortgage - annualOther - annualExtra) / cost) * 100
}

const monthsDiff = (from: Date, toDateStr: string | null): number => {
  if (!toDateStr) return 0
  const to = new Date(toDateStr)
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// ── Analyst alert computation ─────────────────────────────────────────────────

function computeFormAlert(
  form: FormState,
  netCashFlow: number,
  pensionAccounts: PensionRef[],
  allProperties: Property[],
  hasCashFlowIncome: boolean,
  hasCashFlowExpenses: boolean
): AnalystAlertProps | null {
  const isProject = PROJECT_TYPES.has(form.property_type)

  // Alternative apartment: marketing chain-reaction check
  if (form.residence_status === 'alternative_apartment' && form.sell_by_date) {
    const today          = new Date()
    const sellBy         = new Date(form.sell_by_date)
    const monthsLeft     = Math.round((sellBy.getTime() - today.getTime()) / (30.44 * 24 * 3600 * 1000))
    if (monthsLeft >= 0 && monthsLeft <= 12) {
      const linkedProp = allProperties.find((p) => p.id === form.linked_property_to_sell_id)
      return { type: 'marketing_alert', sellByDate: form.sell_by_date, monthsToDeadline: monthsLeft, linkedPropertyName: linkedProp?.name }
    }
  }

  if (!isProject || !form.completion_funding_source) return null

  const completionAmt = parseFloat(form.completion_amount) || 0

  // Check for missing data
  if (completionAmt <= 0 && (form.residence_status || form.payment_terms)) {
    return { type: 'data_missing', missingFields: ['השלמת הון עצמי', 'מחיר חוזה'] }
  }

  if (form.completion_funding_source === 'monthly_savings') {
    // Before validating surplus, check that the user has actually filled cash flow data.
    if (!hasCashFlowIncome || !hasCashFlowExpenses)
      return { type: 'cashflow_missing' }
    const months = monthsDiff(new Date(), form.target_exit_date)
    const requiredMonthlySavings = months > 0 ? completionAmt / months : completionAmt
    if (requiredMonthlySavings > netCashFlow)
      return { type: 'savings_gap', requiredMonthlySavings, netCashFlow }
    return { type: 'ok', requiredMonthlySavings, netCashFlow }
  }

  if (form.completion_funding_source === 'capital_source') {
    // Empty capital board check
    if (pensionAccounts.length === 0) {
      return {
        type: 'empty_capital_board',
        ctaLink: '/dashboard/pension',
        ctaLabel: '← הון ופנסיה',
      }
    }

    const account = pensionAccounts.find((a) => a.id === form.funding_pension_account_id)
    if (!account) return null

    // Maturity date mismatch
    if (account.maturity_date && form.target_exit_date) {
      if (new Date(form.target_exit_date) < new Date(account.maturity_date))
        return { type: 'maturity_mismatch', deliveryDate: form.target_exit_date, maturityDate: account.maturity_date, fundName: account.name }
    }

    // Balance check
    if (completionAmt > 0 && account.balance < completionAmt)
      return {
        type: 'completion_gap',
        completionAmount: completionAmt,
        availableCapital: account.balance,
        gap: completionAmt - account.balance,
        fundName: account.name,
      }

    return { type: 'ok' }
  }
  return null
}

// Alert for a saved property card
function computeCardAlert(
  prop: Property,
  netCashFlow: number,
  pensionAccounts: PensionRef[],
  allProperties: Property[],
  hasCashFlowIncome: boolean,
  hasCashFlowExpenses: boolean
): AnalystAlertProps | null {
  // Marketing alert
  if (prop.residence_status === 'alternative_apartment' && prop.sell_by_date) {
    const today      = new Date()
    const sellBy     = new Date(prop.sell_by_date)
    const monthsLeft = Math.round((sellBy.getTime() - today.getTime()) / (30.44 * 24 * 3600 * 1000))
    if (monthsLeft >= 0 && monthsLeft <= 12) {
      const linked = allProperties.find((p) => p.id === prop.linked_property_to_sell_id)
      return { type: 'marketing_alert', sellByDate: prop.sell_by_date, monthsToDeadline: monthsLeft, linkedPropertyName: linked?.name }
    }
  }

  if (!PROJECT_TYPES.has(prop.property_type) || !prop.completion_funding_source) return null

  const completionAmt = prop.completion_amount ?? prop.delivery_equity ?? 0

  if (prop.completion_funding_source === 'monthly_savings') {
    // Before validating surplus, check that the user has actually filled cash flow data.
    if (!hasCashFlowIncome || !hasCashFlowExpenses)
      return { type: 'cashflow_missing' }
    const months = monthsDiff(new Date(), prop.target_exit_date)
    const requiredMonthlySavings = months > 0 ? completionAmt / months : completionAmt
    if (requiredMonthlySavings > netCashFlow)
      return { type: 'savings_gap', requiredMonthlySavings, netCashFlow }
    return { type: 'ok', requiredMonthlySavings, netCashFlow }
  }

  if (prop.completion_funding_source === 'capital_source') {
    const account = pensionAccounts.find((a) => a.id === prop.funding_pension_account_id)
    if (!account) return null
    if (account.maturity_date && prop.target_exit_date) {
      if (new Date(prop.target_exit_date) < new Date(account.maturity_date))
        return { type: 'maturity_mismatch', deliveryDate: prop.target_exit_date, maturityDate: account.maturity_date, fundName: account.name }
    }
    if (completionAmt > 0 && account.balance < completionAmt)
      return { type: 'completion_gap', completionAmount: completionAmt, availableCapital: account.balance, gap: completionAmt - account.balance, fundName: account.name }
  }
  return null
}

// ── EMPTY_FORM ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:                       '',
  address:                    '',
  property_type:              'residential_apartment' as PropertyType,
  contract_price:             '',
  closing_fees:               '',
  mortgage_outstanding:       '',
  mortgage_monthly_payment:   '',
  purchase_date:              '',
  target_exit_date:           '',
  expected_sale_amount:       '',
  ownership_percentage:       '100',
  developer:                  '',
  initial_equity:             '',
  delivery_equity:            '',
  completion_amount:          '',
  completion_funding_source:  '',
  funding_pension_account_id: '',
  overseas_location:          '',
  overseas_location_custom:   '',
  // v3 smart equity fields
  residence_status:            '',
  payment_terms:               '',
  linked_property_to_sell_id:  '',
  sell_by_date:                '',
  // v4 technical fields
  property_city:               '',
  rooms:                       '',
  floor:                       '',
  total_size_sqm:              '',
  balcony_size_sqm:            '',
  has_parking:                 false,
  has_storage:                 false,
  gush:                        '',
  chelka:                      '',
  ownership_type:              'tabu',
}

type FormState = typeof EMPTY_FORM

// ── Component ─────────────────────────────────────────────────────────────────

export default function PropertiesClient({
  properties: initial,
  netCashFlow,
  pensionAccounts,
  userRole,
  professionalDirectory,
  hasCashFlowIncome,
  hasCashFlowExpenses,
}: Props) {
  const router = useRouter()
  const { t }  = useLang()
  const p      = t.properties

  const [open, setOpen]               = useState(false)
  const [editProp, setEditProp]       = useState<Property | null>(null)
  const [mapProp, setMapProp]         = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [error, setError]             = useState<string | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [expenseItems, setExpenseItems]   = useState<ExpenseItem[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [profsOpen, setProfsOpen]         = useState(false)
  const [technicalOpen, setTechnicalOpen] = useState(true)
  const [cardProfsOpen, setCardProfsOpen]     = useState<Record<string, boolean>>({})
  const [cardAnalystOpen, setCardAnalystOpen] = useState<Record<string, boolean>>({})
  const [cmaOpen, setCmaOpen] = useState<{ address: string | null; name: string } | null>(null)

  const isProjectType      = PROJECT_TYPES.has(form.property_type)
  const isOverseasType     = OVERSEAS_TYPES.has(form.property_type)
  const isLandType         = form.property_type === 'land'
  const isAlternativeApt   = form.residence_status === 'alternative_apartment'
  const showMortgage       = !NO_MORTGAGE_TYPES.has(form.property_type) && !isOverseasType

  // CMA computation
  const cmaResult = computeCMA(
    form.property_city,
    parseFloat(form.total_size_sqm)    || 0,
    parseFloat(form.floor)             || 0,
    parseFloat(form.balcony_size_sqm)  || 0,
  )

  // First-hand financing engine
  const firstHandTotalCost    = (parseFloat(form.contract_price) || 0) + (parseFloat(form.closing_fees) || 0)
  const expectedMortgage      = isProjectType
    ? Math.max(0, firstHandTotalCost - (parseFloat(form.initial_equity) || 0) - (parseFloat(form.completion_amount) || 0))
    : 0
  const futurePmt             = Math.round(expectedMortgage / 1_000_000 * 5000)
  const requiredIncome        = Math.round(futurePmt / 0.38)
  const overseasLocations  = form.property_type === 'overseas_usa' ? USA_STATES : EUROPE_CTRIES
  const showLocationCustom = form.overseas_location === 'Other'
  const propertyGroups     = t.dir === 'rtl' ? PROPERTY_GROUPS_HE : PROPERTY_GROUPS_EN
  const profLabels         = t.dir === 'rtl' ? PROF_LABELS_HE : PROF_LABELS_EN
  const isAcademyClient    = userRole === 'client'

  // Derived equity pct for display (always computed, used in UI + useEffect)
  const totalEquityPct = RESIDENCE_EQUITY[form.residence_status] ?? 0
  const initialPct     = PAYMENT_INITIAL[form.payment_terms as keyof typeof PAYMENT_INITIAL] ?? 0
  const completionPct  = Math.max(0, totalEquityPct - initialPct)
  // Show the equity panel as soon as residence_status is chosen (no need to wait for payment_terms)
  const hasEquityCalc  = isProjectType && !!form.residence_status

  // Computed directly in render — instantly reactive to every keystroke (no useEffect delay)
  const totalCostNum   = (parseFloat(form.contract_price) || 0) + (parseFloat(form.closing_fees) || 0)
  const hasCostSet     = totalCostNum > 0
  const calcInitial    = hasCostSet && initialPct     > 0 ? Math.round(totalCostNum * initialPct     / 100) : null
  const calcDelivery   = hasCostSet && totalEquityPct > 0 ? Math.round(totalCostNum * totalEquityPct / 100) : null
  const calcCompletion = hasCostSet && completionPct  > 0 ? Math.round(totalCostNum * completionPct  / 100) : null

  // ── Auto-calculate equity from terms ──────────────────────────────────────

  useEffect(() => {
    if (!isProjectType || !form.residence_status || !form.payment_terms) return
    const totalCost = (parseFloat(form.contract_price) || 0) + (parseFloat(form.closing_fees) || 0)
    if (totalCost <= 0) return
    // Read constants directly inside the effect — avoids stale closure
    const eqPct    = RESIDENCE_EQUITY[form.residence_status] ?? 0
    const initPct  = PAYMENT_INITIAL[form.payment_terms]     ?? 0
    const compPct  = Math.max(0, eqPct - initPct)
    setForm((f) => ({
      ...f,
      initial_equity:    Math.round(totalCost * initPct  / 100).toString(),
      delivery_equity:   Math.round(totalCost * eqPct    / 100).toString(),
      completion_amount: Math.round(totalCost * compPct  / 100).toString(),
    }))
  }, [form.contract_price, form.closing_fees, form.residence_status, form.payment_terms, form.property_type, isProjectType])

  // ── Auto-calculate sell_by_date (delivery + 12 months) ────────────────────

  useEffect(() => {
    if (!isAlternativeApt || !form.target_exit_date) return
    const d = new Date(form.target_exit_date + 'T00:00:00')
    d.setFullYear(d.getFullYear() + 1)
    setForm((f) => ({ ...f, sell_by_date: d.toISOString().split('T')[0] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.target_exit_date, form.residence_status])

  // ── Alert for current form state ──────────────────────────────────────────

  const alertData = computeFormAlert(form, netCashFlow, pensionAccounts, initial, hasCashFlowIncome, hasCashFlowExpenses)

  // ── Open add ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setExpenseItems([])
    setProfessionals([])
    setProfsOpen(false)
    setTechnicalOpen(true)
    setEditProp(null)
    setError(null)
    setOpen(true)
  }

  // ── Open edit ─────────────────────────────────────────────────────────────

  const openEdit = (prop: Property) => {
    setForm({
      name:                       prop.name,
      address:                    prop.address ?? '',
      property_type:              prop.property_type as PropertyType,
      contract_price:             prop.contract_price?.toString() ?? (prop.total_cost?.toString() ?? ''),
      closing_fees:               prop.closing_fees?.toString() ?? '',
      mortgage_outstanding:       prop.mortgage_outstanding?.toString() ?? '',
      mortgage_monthly_payment:   prop.mortgage_monthly_payment?.toString() ?? '',
      purchase_date:              prop.purchase_date ?? '',
      target_exit_date:           prop.target_exit_date ?? '',
      expected_sale_amount:       prop.expected_sale_amount?.toString() ?? '',
      ownership_percentage:       (prop.ownership_percentage ?? 100).toString(),
      developer:                  prop.developer ?? '',
      initial_equity:             prop.initial_equity?.toString() ?? '',
      delivery_equity:            prop.delivery_equity?.toString() ?? '',
      completion_amount:          prop.completion_amount?.toString() ?? '',
      completion_funding_source:  prop.completion_funding_source ?? '',
      funding_pension_account_id: prop.funding_pension_account_id ?? '',
      overseas_location:          prop.overseas_location ?? '',
      overseas_location_custom:   '',
      residence_status:           prop.residence_status ?? '',
      payment_terms:              prop.payment_terms ?? '',
      linked_property_to_sell_id: prop.linked_property_to_sell_id ?? '',
      sell_by_date:               prop.sell_by_date ?? '',
      // Technical fields
      property_city:              prop.property_city ?? '',
      rooms:                      prop.rooms?.toString() ?? '',
      floor:                      prop.floor?.toString() ?? '',
      total_size_sqm:             prop.total_size_sqm?.toString() ?? '',
      balcony_size_sqm:           prop.balcony_size_sqm?.toString() ?? '',
      has_parking:                prop.has_parking ?? false,
      has_storage:                prop.has_storage ?? false,
      gush:                       prop.gush ?? '',
      chelka:                     prop.chelka ?? '',
      ownership_type:             prop.ownership_type ?? 'tabu',
    })
    setExpenseItems(prop.expense_items ?? [])
    setProfessionals(prop.professionals ?? [])
    setProfsOpen((prop.professionals?.length ?? 0) > 0)
    setTechnicalOpen(true)
    setEditProp(prop)
    setError(null)
    setOpen(true)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(p.form.notAuth); return }

    const isProject  = PROJECT_TYPES.has(form.property_type)
    const isOverseas = OVERSEAS_TYPES.has(form.property_type)
    const isLand     = form.property_type === 'land'
    const noMortgage = NO_MORTGAGE_TYPES.has(form.property_type) || isOverseas
    const finalLocation = form.overseas_location === 'Other' && form.overseas_location_custom
      ? form.overseas_location_custom
      : form.overseas_location || null

    const contractPriceNum = parseFloat(form.contract_price) || 0
    const closingFeesNum   = parseFloat(form.closing_fees)   || 0
    const computedTotalCost = contractPriceNum + closingFeesNum

    // CMA result for current_value and estimated_market_value
    const cmaVal = computeCMA(
      form.property_city,
      parseFloat(form.total_size_sqm)   || 0,
      parseFloat(form.floor)            || 0,
      parseFloat(form.balcony_size_sqm) || 0,
    )

    const payload = {
      name:                     form.name.trim(),
      address:                  form.address.trim() || null,
      property_type:            form.property_type,
      current_value:            cmaVal ?? 0,
      estimated_market_value:   cmaVal,
      contract_price:           contractPriceNum > 0 ? contractPriceNum : null,
      closing_fees:             closingFeesNum   > 0 ? closingFeesNum   : null,
      total_cost:               computedTotalCost > 0 ? computedTotalCost : null,
      mortgage_outstanding:     !noMortgage && form.mortgage_outstanding     ? parseFloat(form.mortgage_outstanding)     : 0,
      mortgage_monthly_payment: !noMortgage && form.mortgage_monthly_payment ? parseFloat(form.mortgage_monthly_payment) : null,
      purchase_date:            form.purchase_date || null,
      ownership_percentage:     form.ownership_percentage ? parseFloat(form.ownership_percentage) : 100,
      developer:                form.developer.trim() || null,
      expense_items:            expenseItems,
      professionals:            professionals,
      // Pre-construction fields
      target_exit_date:         isProject && form.target_exit_date    ? form.target_exit_date                       : null,
      expected_sale_amount:     isProject && form.expected_sale_amount ? parseFloat(form.expected_sale_amount)      : null,
      initial_equity:           isProject && form.initial_equity       ? parseFloat(form.initial_equity)            : null,
      delivery_equity:          isProject && form.delivery_equity      ? parseFloat(form.delivery_equity)           : null,
      completion_amount:        isProject && form.completion_amount    ? parseFloat(form.completion_amount)         : null,
      completion_funding_source: isProject && form.completion_funding_source ? form.completion_funding_source       : null,
      funding_pension_account_id:
        isProject && form.completion_funding_source === 'capital_source' && form.funding_pension_account_id
          ? form.funding_pension_account_id : null,
      // Smart equity v3
      residence_status: isProject && form.residence_status ? form.residence_status : null,
      payment_terms:    isProject && form.payment_terms    ? form.payment_terms    : null,
      linked_property_to_sell_id:
        isProject && form.residence_status === 'alternative_apartment' && form.linked_property_to_sell_id
          ? form.linked_property_to_sell_id : null,
      sell_by_date:
        isProject && form.residence_status === 'alternative_apartment' && form.sell_by_date
          ? form.sell_by_date : null,
      // Overseas fields
      overseas_region:   isOverseas ? (form.property_type === 'overseas_usa' ? 'usa' : 'europe') : null,
      overseas_location: isOverseas ? finalLocation : null,
      // Technical fields v4
      property_city:     form.property_city || null,
      rooms:             form.rooms    ? parseInt(form.rooms)           : null,
      floor:             form.floor    ? parseInt(form.floor)           : null,
      total_size_sqm:    form.total_size_sqm   ? parseFloat(form.total_size_sqm)   : null,
      balcony_size_sqm:  form.balcony_size_sqm ? parseFloat(form.balcony_size_sqm) : null,
      has_parking:       form.has_parking,
      has_storage:       form.has_storage,
      gush:              isLand ? (form.gush || null)   : null,
      chelka:            isLand ? (form.chelka || null) : null,
      ownership_type:    form.ownership_type || 'tabu',
    }

    let dbError
    if (editProp) {
      ;({ error: dbError } = await supabase.from('properties').update(payload).eq('id', editProp.id))
    } else {
      ;({ error: dbError } = await supabase.from('properties').insert({ ...payload, user_id: user.id }))
    }

    if (dbError) { setError(dbError.message); return }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!editProp) return
    const supabase = createClient()
    const { error: dbError } = await supabase.from('properties').delete().eq('id', editProp.id)
    if (dbError) { setError(dbError.message); return }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  // ── Expense items ─────────────────────────────────────────────────────────

  const addExpenseItem    = () => setExpenseItems((ei) => [...ei, { label: '', amount: 0, frequency: 'monthly' }])
  const updateExpenseItem = (i: number, patch: Partial<ExpenseItem>) =>
    setExpenseItems((ei) => ei.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removeExpenseItem = (i: number) => setExpenseItems((ei) => ei.filter((_, idx) => idx !== i))
  const monthlyExpensesTotal = expenseItems.reduce(
    (s, e) => s + (e.frequency === 'monthly' ? e.amount : e.frequency === 'annual' ? e.amount / 12 : 0), 0
  )

  // ── Professionals ─────────────────────────────────────────────────────────

  const addProfessional    = () => setProfessionals((ps) => [...ps, { role: 'broker', name: '', phone: '' }])
  const updateProfessional = (i: number, patch: Partial<Professional>) =>
    setProfessionals((ps) => ps.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removeProfessional = (i: number) => setProfessionals((ps) => ps.filter((_, idx) => idx !== i))

  // ── Field helper ──────────────────────────────────────────────────────────

  const inputCls  = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'
  const selectCls = 'w-full appearance-none rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] outline-none transition-colors cursor-pointer focus:border-[#C8AA8F]/50'
  const labelCls  = 'mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]'

  const fld = (
    id: keyof FormState,
    label: string,
    icon: React.ReactNode,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">{icon}</span>
        <input
          id={id}
          dir={opts?.type === 'date' ? 'ltr' : 'auto'}
          type={opts?.type ?? 'text'}
          placeholder={opts?.placeholder ?? ''}
          required={opts?.required}
          value={form[id] as string}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          className={inputCls}
        />
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-6 lg:p-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{p.section}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">{p.title}</h1>
          <p className="mt-1 text-sm text-[#86968B]">
            {initial.length === 0 ? p.subtitleEmpty
              : initial.length === 1 ? p.subtitleSingular
              : p.subtitlePlural(initial.length)}
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50">
          <Plus size={16} />{p.addButton}
        </button>
      </div>

      {/* Grid */}
      {initial.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#172530]/50 py-20 text-center">
          <Building2 size={36} className="mb-4 text-[#445147]" />
          <p className="text-sm font-medium text-[#86968B]">{p.emptyTitle}</p>
          <p className="mt-1 text-xs text-[#445147]">{p.emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((prop) => {
            const ownership     = (prop.ownership_percentage ?? 100) / 100
            const isProject     = PROJECT_TYPES.has(prop.property_type)
            const isOverseas    = OVERSEAS_TYPES.has(prop.property_type)
            const isAltApt      = prop.residence_status === 'alternative_apartment'
            const eq            = calcEquity(prop.current_value, prop.mortgage_outstanding)
            const roi           = calcROI(prop.current_value, prop.total_cost)
            const irr           = calcIRR(prop.current_value, prop.total_cost, prop.purchase_date)
            const projRoi       = isProject ? calcProjectedROI(prop.expected_sale_amount, prop.total_cost) : null
            const netYield      = calcNetYield(prop.monthly_rent, prop.total_cost, prop.mortgage_monthly_payment, prop.other_expenses, prop.expense_items, ownership)
            const mapOpen       = mapProp === prop.id
            const profsCardOpen = cardProfsOpen[prop.id] ?? false
            const analystOpen   = cardAnalystOpen[prop.id] ?? false
            const hasProfessionals = (prop.professionals?.length ?? 0) > 0
            const cardAlert     = computeCardAlert(prop, netCashFlow, pensionAccounts, initial, hasCashFlowIncome, hasCashFlowExpenses)
            const linkedPropName = initial.find((lp) => lp.id === prop.linked_property_to_sell_id)?.name

            return (
              <div key={prop.id} className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5 transition-colors hover:border-[#C8AA8F]/20">

                {/* Card header */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/8">
                      {isOverseas ? <Globe2 size={16} className="text-[#C8AA8F]" /> : <Home size={16} className="text-[#C8AA8F]" />}
                    </div>
                    <div className="min-w-0">
                      <p dir="auto" className="truncate font-semibold text-[#F0EDE8]">{prop.name}</p>
                      <p className="mt-0.5 text-xs text-[#C8AA8F]/70">{p.types[prop.property_type] ?? prop.property_type}</p>
                      {prop.address && <p dir="auto" className="mt-0.5 truncate text-xs text-[#86968B]">{prop.address}</p>}
                      {isOverseas && prop.overseas_location && <p className="mt-0.5 text-xs text-[#86968B]">{prop.overseas_location}</p>}
                      {/* Residence + payment terms badges */}
                      {prop.residence_status && (
                        <p className="mt-1 text-[10px] text-[#445147]">
                          {prop.residence_status === 'first_apartment' ? 'דירה ראשונה'
                           : prop.residence_status === 'alternative_apartment' ? 'דירה חלופית'
                           : 'דירה שנייה'}
                          {prop.payment_terms ? ` · ${prop.payment_terms}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* Alert indicator */}
                    {cardAlert && (
                      <div className={`h-2 w-2 rounded-full ${cardAlert.type === 'ok' ? 'bg-emerald-400' : cardAlert.type === 'marketing_alert' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    )}
                    {prop.address && (
                      <button onClick={() => setMapProp(mapOpen ? null : prop.id)} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${mapOpen ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]' : 'text-[#86968B] hover:text-[#F0EDE8]'}`} aria-label="map">
                        <Map size={13} />
                      </button>
                    )}
                    <button onClick={() => setCmaOpen({ address: prop.address, name: prop.name })} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C8AA8F]/60 transition-colors hover:text-[#C8AA8F] hover:bg-[#C8AA8F]/10" aria-label="CMA" title={p.cma.title}>
                      <BarChart2 size={13} />
                    </button>
                    <button onClick={() => openEdit(prop)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#86968B] transition-colors hover:text-[#F0EDE8]" aria-label="edit">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* Map */}
                {mapOpen && prop.address && <div className="mb-3"><PropertyMap address={prop.address} /></div>}

                {/* Values */}
                <div className="space-y-2 border-t border-[#2C3B38] pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#86968B]">{p.card.value}</span>
                    <span className="font-medium text-[#F0EDE8]">{formatCurrency(prop.current_value)}</span>
                  </div>
                  {ownership < 1 && prop.current_value != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#445147]">{p.card.ownershipShare} ({Math.round(ownership * 100)}%)</span>
                      <span className="text-[#C8AA8F]/70">{formatCurrency(prop.current_value * ownership)}</span>
                    </div>
                  )}
                  {prop.total_cost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.totalCost}</span>
                      <span className="font-medium text-[#F0EDE8]">{formatCurrency(prop.total_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#86968B]">{p.card.mortgage}</span>
                    <span className="font-medium text-[#F0EDE8]">{formatCurrency(prop.mortgage_outstanding)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#86968B]">{p.card.equity}</span>
                    <span className={`font-semibold ${eq != null && eq >= 0 ? 'text-[#C8AA8F]' : 'text-red-400'}`}>{formatCurrency(eq)}</span>
                  </div>
                  {ownership < 1 && eq != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#445147]">{p.card.ownershipShare}</span>
                      <span className={eq >= 0 ? 'text-[#C8AA8F]/70' : 'text-red-400/70'}>{formatCurrency(eq * ownership)}</span>
                    </div>
                  )}

                  {/* Smart equity summary */}
                  {isProject && prop.initial_equity != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.form.initialLabel}</span>
                      <span className="font-medium text-[#F0EDE8]">{formatCurrency(prop.initial_equity)}</span>
                    </div>
                  )}
                  {isProject && prop.completion_amount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.completionAmount}</span>
                      <span className="font-medium text-amber-400">{formatCurrency(prop.completion_amount)}</span>
                    </div>
                  )}

                  {/* Metrics */}
                  {(roi != null || irr != null || projRoi != null || netYield != null) && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#2C3B38] pt-2">
                      {roi != null && (
                        <div className="flex flex-1 flex-col items-center rounded-lg bg-[#101A26] py-1.5 min-w-[56px]">
                          <span className="text-[10px] text-[#86968B]">{p.card.roi}</span>
                          <span className={`text-sm font-semibold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(roi)}</span>
                        </div>
                      )}
                      {irr != null && (
                        <div className="flex flex-1 flex-col items-center rounded-lg bg-[#101A26] py-1.5 min-w-[56px]">
                          <span className="text-[10px] text-[#86968B]">{p.card.avgYield}</span>
                          <span className={`text-sm font-semibold ${irr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(irr)}</span>
                        </div>
                      )}
                      {netYield != null && (
                        <div className="flex flex-1 flex-col items-center rounded-lg bg-[#101A26] py-1.5 min-w-[56px]">
                          <span className="text-[10px] text-[#86968B]">{p.card.netYield}</span>
                          <span className={`text-sm font-semibold ${netYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(netYield)}</span>
                        </div>
                      )}
                      {projRoi != null && (
                        <div className="flex flex-1 flex-col items-center rounded-lg border border-[#C8AA8F]/15 bg-[#C8AA8F]/5 py-1.5 min-w-[56px]">
                          <span className="text-[10px] text-[#C8AA8F]/60">{t.dir === 'rtl' ? 'תשואה צפויה' : 'Projected'}</span>
                          <span className={`text-sm font-semibold ${projRoi >= 0 ? 'text-[#C8AA8F]' : 'text-red-400'}`}>{formatPct(projRoi)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project exit + chain reaction */}
                  {isProject && prop.target_exit_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.deliveryDate}</span>
                      <span className="font-medium text-[#F0EDE8]">{new Date(prop.target_exit_date).toLocaleDateString('he-IL')}</span>
                    </div>
                  )}
                  {isProject && prop.expected_sale_amount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.expectedSale}</span>
                      <span className="font-medium text-[#F0EDE8]">{formatCurrency(prop.expected_sale_amount)}</span>
                    </div>
                  )}
                  {isAltApt && linkedPropName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.linkedSaleProperty}</span>
                      <span className="font-medium text-[#F0EDE8] truncate max-w-[140px]">{linkedPropName}</span>
                    </div>
                  )}
                  {isAltApt && prop.sell_by_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{p.card.sellByDate}</span>
                      <span className={`font-medium ${
                        monthsDiff(new Date(), prop.sell_by_date) <= 12 ? 'text-amber-400' : 'text-[#F0EDE8]'
                      }`}>
                        {new Date(prop.sell_by_date).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Professionals section */}
                {hasProfessionals && (
                  <div className="mt-3 border-t border-[#2C3B38] pt-3">
                    <button onClick={() => setCardProfsOpen((o) => ({ ...o, [prop.id]: !o[prop.id] }))} className="flex w-full items-center justify-between text-xs text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                      <span>{t.dir === 'rtl' ? 'אנשי מקצוע' : 'Professionals'} ({prop.professionals!.length})</span>
                      <ChevronRight size={12} className={`transition-transform ${profsCardOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {profsCardOpen && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {prop.professionals!.map((prof, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2.5 py-1.5">
                            <UserRound size={10} className="shrink-0 text-[#C8AA8F]/60" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[#F0EDE8]">{prof.name}</p>
                              <p className="text-[10px] text-[#445147]">{profLabels[prof.role] ?? prof.role}</p>
                            </div>
                            {prof.phone && (
                              <a href={`https://wa.me/${prof.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400 transition-colors hover:bg-green-500/25">WA</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Analyst section on card */}
                {cardAlert && (
                  <div className="mt-3 border-t border-[#2C3B38] pt-3">
                    {cardAlert.type === 'cashflow_missing' ? (
                      /* Auto-expanded — redirect user to fill cash flow data */
                      <AnalystAlert
                        {...cardAlert}
                        ctaLink="/dashboard/cashflow"
                        ctaLabel={t.dir === 'rtl' ? 'השלם את נתוני התזרים ←' : '← Complete Cash Flow Data'}
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => setCardAnalystOpen((o) => ({ ...o, [prop.id]: !o[prop.id] }))}
                          className={`flex w-full items-center justify-between text-xs transition-colors ${
                            cardAlert.type === 'ok'             ? 'text-emerald-400 hover:text-emerald-300'
                            : cardAlert.type === 'marketing_alert' ? 'text-amber-400 hover:text-amber-300'
                            : 'text-red-400 hover:text-red-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`h-2 w-2 rounded-full ${cardAlert.type === 'ok' ? 'bg-emerald-400' : cardAlert.type === 'marketing_alert' ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span>{t.dir === 'rtl' ? 'האנליסט' : 'Analyst'}</span>
                          </div>
                          <ChevronRight size={12} className={`transition-transform ${analystOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {analystOpen && (
                          <div className="mt-2">
                            <AnalystAlert {...cardAlert} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CMA Modal ── */}
      {cmaOpen && (
        <CMAModal
          address={cmaOpen.address}
          propertyName={cmaOpen.name}
          onClose={() => setCmaOpen(null)}
        />
      )}

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#172530] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F0EDE8]">{editProp ? p.form.editTitle : p.form.title}</h2>
              <button onClick={() => setOpen(false)} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]" aria-label="close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              {fld('name', p.form.name, <Home size={14} />, { required: true, placeholder: p.form.namePlaceholder })}

              {/* Type — grouped */}
              <div>
                <label htmlFor="property_type" className={labelCls}>{p.form.type}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                  <select id="property_type" value={form.property_type} onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value as PropertyType, overseas_location: '', overseas_location_custom: '' }))} className={selectCls}>
                    {propertyGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.types.map((v) => <option key={v} value={v} className="bg-[#172530]">{p.types[v] ?? v}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              {fld('address', p.form.address, <MapPin size={14} />, { placeholder: p.form.addrPlaceholder })}

              {/* Contract Price + Closing Fees */}
              <div className="grid grid-cols-2 gap-3">
                {fld('contract_price', p.form.contractPrice, <TrendingUp size={14} />, { type: 'number' })}
                {fld('closing_fees',   p.form.closingFees,   <Banknote   size={14} />, { type: 'number' })}
              </div>

              {/* Total Acquisition Cost (read-only) */}
              {totalCostNum > 0 && (
                <div>
                  <label className={labelCls}>{p.form.acquisitionCost}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#C8AA8F]/50"><TrendingUp size={14} /></span>
                    <input readOnly tabIndex={-1} type="text" dir="ltr"
                      value={'₪' + totalCostNum.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                      className="w-full cursor-not-allowed rounded-xl border border-[#C8AA8F]/20 bg-[#172530]/60 py-2.5 pr-4 pl-10 text-sm font-semibold text-[#C8AA8F] opacity-80 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CMA market reference link */}
              {form.address.trim() && (
                <button type="button" onClick={() => setCmaOpen({ address: form.address, name: form.name || '' })}
                  className="flex items-center gap-1.5 text-xs text-[#C8AA8F]/60 transition-colors hover:text-[#C8AA8F]"
                >
                  <BarChart2 size={12} />
                  <span>{p.cma.openCMA}</span>
                </button>
              )}

              {/* ── Technical Details Section (collapsible) ── */}
              {!isOverseasType && (
                <div className="rounded-xl border border-[#2C3B38] bg-[#101A26]/50">
                  <button
                    type="button"
                    onClick={() => setTechnicalOpen((o) => !o)}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold tracking-widest text-[#86968B] transition-colors hover:text-[#F0EDE8]"
                  >
                    <span>{p.form.technicalSection}</span>
                    <ChevronDown size={13} className={`transition-transform ${technicalOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {technicalOpen && (
                    <div className="space-y-3 border-t border-[#2C3B38] px-4 pb-4 pt-3">
                      {!isLandType && (
                        <>
                          {/* City + Rooms */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>{p.form.city}</label>
                              <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><MapPin size={13} /></span>
                                <select value={form.property_city} onChange={(e) => setForm((f) => ({ ...f, property_city: e.target.value }))} className={selectCls}>
                                  <option value="">{t.dir === 'rtl' ? '— בחר עיר —' : '— select city —'}</option>
                                  {CITY_OPTIONS.map((c) => <option key={c} value={c === 'אחר' ? '' : c} className="bg-[#172530]">{c}</option>)}
                                </select>
                              </div>
                            </div>
                            {fld('rooms', p.form.rooms, <Hash size={13} />, { type: 'number', placeholder: '3.5' })}
                          </div>
                          {/* Floor + Total Size */}
                          <div className="grid grid-cols-2 gap-3">
                            {fld('floor',         p.form.floor,         <Building2    size={13} />, { type: 'number' })}
                            {fld('total_size_sqm', p.form.totalSizeSqm, <DollarSign   size={13} />, { type: 'number', placeholder: '80' })}
                          </div>
                          {/* Balcony */}
                          {fld('balcony_size_sqm', p.form.balconySizeSqm, <Home size={13} />, { type: 'number', placeholder: '10' })}
                          {/* Parking + Storage checkboxes */}
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#F0EDE8]">
                              <input type="checkbox" checked={form.has_parking} onChange={(e) => setForm((f) => ({ ...f, has_parking: e.target.checked }))} className="h-4 w-4 accent-[#C8AA8F]" />
                              {p.form.hasParking}
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#F0EDE8]">
                              <input type="checkbox" checked={form.has_storage} onChange={(e) => setForm((f) => ({ ...f, has_storage: e.target.checked }))} className="h-4 w-4 accent-[#C8AA8F]" />
                              {p.form.hasStorage}
                            </label>
                          </div>
                          {/* Estimated Market Value (CMA, read-only) */}
                          {cmaResult != null && (
                            <div>
                              <label className={labelCls}>{p.form.estimatedMarketValue}</label>
                              <div className="rounded-xl border border-[#C8AA8F]/20 bg-[#172530]/60 px-4 py-2.5">
                                <span className="text-sm font-semibold text-[#C8AA8F]">
                                  {'₪' + cmaResult.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {isLandType && (
                        <>
                          {/* Gush + Chelka */}
                          <div className="grid grid-cols-2 gap-3">
                            {fld('gush',   p.form.gush,   <Hash size={13} />, { placeholder: '1234' })}
                            {fld('chelka', p.form.chelka, <Hash size={13} />, { placeholder: '56' })}
                          </div>
                        </>
                      )}

                      {/* Ownership Type — all types */}
                      <div>
                        <label className={labelCls}>{p.form.ownershipType}</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={13} /></span>
                          <select value={form.ownership_type} onChange={(e) => setForm((f) => ({ ...f, ownership_type: e.target.value }))} className={selectCls}>
                            <option value="tabu">{p.form.ownershipTabu}</option>
                            <option value="ila">{p.form.ownershipIla}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ownership % + Developer */}
              <div className="grid grid-cols-2 gap-3">
                {fld('ownership_percentage', p.form.ownershipPct, <Percent   size={14} />, { type: 'number' })}
                {fld('developer',            p.form.developer,    <Building2 size={14} />, { placeholder: t.dir === 'rtl' ? 'לדוג׳ שיכון ובינוי' : 'e.g. Developer Corp' })}
              </div>

              {/* Mortgage */}
              {showMortgage && (
                <div className="grid grid-cols-2 gap-3">
                  {fld('mortgage_outstanding',     p.form.mortgage,        <Banknote size={14} />, { type: 'number' })}
                  {fld('mortgage_monthly_payment', p.form.mortgageMonthly, <Banknote size={14} />, { type: 'number' })}
                </div>
              )}

              {/* Purchase date */}
              {fld('purchase_date', p.form.purchaseDate, <Calendar size={14} />, { type: 'date' })}

              {/* ── Pre-construction section ── */}
              {isProjectType && (
                <>
                  <div className="rounded-xl border border-[#C8AA8F]/15 bg-[#C8AA8F]/5 px-3 py-2">
                    <p className="text-[11px] text-[#C8AA8F]/70">{t.dir === 'rtl' ? 'שדות מיוחדים לפרויקט השקעה' : 'Investment project fields'}</p>
                  </div>

                  {/* Residence Status */}
                  <div>
                    <label className={labelCls}>{p.form.residenceStatus}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                      <select value={form.residence_status} onChange={(e) => setForm((f) => ({ ...f, residence_status: e.target.value }))} className={selectCls}>
                        <option value="">{t.dir === 'rtl' ? '— בחר סטטוס —' : '— select status —'}</option>
                        <option value="first_apartment">{p.form.firstApartment}</option>
                        <option value="alternative_apartment">{p.form.alternativeApartment}</option>
                        <option value="second_apartment">{p.form.secondApartment}</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className={labelCls}>{p.form.paymentTerms}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                      <select value={form.payment_terms} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} className={selectCls}>
                        <option value="">{t.dir === 'rtl' ? '— בחר תנאים —' : '— select terms —'}</option>
                        {PAYMENT_TERMS_OPTIONS.map((pt) => <option key={pt} value={pt} className="bg-[#172530]">{pt}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Equity Calculator display — shows as soon as residence_status is chosen */}
                  {hasEquityCalc && (
                    <div className="rounded-xl border border-[#2C3B38] bg-[#101A26]/50 p-3">
                      {/* Header row: title + required equity % badge */}
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="text-[10px] font-semibold tracking-widest text-[#445147]">{p.form.equityCalcTitle}</p>
                        <span className="rounded-full border border-[#C8AA8F]/25 bg-[#C8AA8F]/12 px-2 py-0.5 text-xs font-bold text-[#C8AA8F]">
                          {totalEquityPct}% {t.dir === 'rtl' ? 'הון עצמי' : 'equity'}
                        </span>
                      </div>

                      {form.payment_terms ? (
                        /* Full 3-column breakdown once payment_terms is selected */
                        <>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-[#172530] py-2">
                              <p className="text-[10px] text-[#445147]">{p.form.initialLabel}</p>
                              <p className="mt-0.5 text-sm font-semibold text-[#C8AA8F]">
                                {calcInitial != null ? formatCurrency(calcInitial) : `${initialPct}%`}
                              </p>
                            </div>
                            <div className="rounded-lg bg-[#172530] py-2">
                              <p className="text-[10px] text-[#445147]">{p.form.completionLabel}</p>
                              <p className="mt-0.5 text-sm font-semibold text-amber-400">
                                {calcCompletion != null ? formatCurrency(calcCompletion) : `${completionPct}%`}
                              </p>
                            </div>
                            <div className="rounded-lg bg-[#172530] py-2">
                              <p className="text-[10px] text-[#445147]">{p.form.totalEquityLabel}</p>
                              <p className="mt-0.5 text-sm font-semibold text-[#F0EDE8]">
                                {calcDelivery != null ? formatCurrency(calcDelivery) : `${totalEquityPct}%`}
                              </p>
                            </div>
                          </div>
                          {!hasCostSet && (
                            <p className="mt-1.5 text-center text-[10px] text-[#445147]">
                              {t.dir === 'rtl' ? '← הזן מחיר חוזה לחישוב בשקלים' : 'Enter contract price to see amounts'}
                            </p>
                          )}
                          {hasCostSet && (
                            <p className="mt-1.5 text-center text-[10px] text-[#445147]">{p.form.autoCalculated}</p>
                          )}
                        </>
                      ) : (
                        /* Nudge to select payment terms */
                        <p className="text-center text-xs text-[#445147]">
                          {t.dir === 'rtl' ? '← בחר תנאי תשלום לפירוט מלא' : 'Select payment terms for full breakdown →'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivery date + expected sale */}
                  <div className="grid grid-cols-2 gap-3">
                    {fld('target_exit_date',     p.form.deliveryDate,      <Calendar    size={14} />, { type: 'date' })}
                    {fld('expected_sale_amount', p.form.expectedSaleAmount, <DollarSign size={14} />, { type: 'number' })}
                  </div>

                  {/* Manual equity override */}
                  <div className="grid grid-cols-2 gap-3">
                    {fld('initial_equity',   p.form.initialEquity,   <DollarSign size={14} />, { type: 'number' })}
                    {fld('completion_amount', p.form.completionAmount, <DollarSign size={14} />, { type: 'number' })}
                  </div>

                  {/* Alternative apartment: chain reaction */}
                  {isAlternativeApt && (
                    <>
                      <div>
                        <label className={labelCls}>{p.form.linkedPropertyToSell}</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ArrowRightLeft size={14} /></span>
                          <select value={form.linked_property_to_sell_id} onChange={(e) => setForm((f) => ({ ...f, linked_property_to_sell_id: e.target.value }))} className={selectCls}>
                            <option value="">{t.dir === 'rtl' ? '— בחר נכס למכירה —' : '— select property —'}</option>
                            {initial
                              .filter((pp) => !editProp || pp.id !== editProp.id)
                              .map((pp) => <option key={pp.id} value={pp.id} className="bg-[#172530]">{pp.name}</option>)}
                          </select>
                        </div>
                      </div>
                      {fld('sell_by_date', p.form.sellByDate, <Clock size={14} />, { type: 'date' })}
                    </>
                  )}

                  {/* Funding source */}
                  <div>
                    <label className={labelCls}>{p.form.fundingSource}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                      <select value={form.completion_funding_source} onChange={(e) => setForm((f) => ({ ...f, completion_funding_source: e.target.value, funding_pension_account_id: '' }))} className={selectCls}>
                        <option value="">{t.dir === 'rtl' ? '— בחר מקור —' : '— select source —'}</option>
                        <option value="monthly_savings">{p.form.fundingMonthlySavings}</option>
                        <option value="capital_source">{p.form.fundingCapitalSource}</option>
                      </select>
                    </div>
                  </div>

                  {/* Pension account selector */}
                  {form.completion_funding_source === 'capital_source' && pensionAccounts.length > 0 && (
                    <div>
                      <label className={labelCls}>{t.dir === 'rtl' ? 'בחר קרן' : 'Select Fund'}</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                        <select value={form.funding_pension_account_id} onChange={(e) => setForm((f) => ({ ...f, funding_pension_account_id: e.target.value }))} className={selectCls}>
                          <option value="">{t.dir === 'rtl' ? '— בחר קרן —' : '— select fund —'}</option>
                          {pensionAccounts.map((a) => (
                            <option key={a.id} value={a.id} className="bg-[#172530]">
                              {a.name}
                              {a.balance > 0 ? ` · ${formatCurrency(a.balance)}` : ''}
                              {a.maturity_date ? ` · (${new Date(a.maturity_date).getFullYear()})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* First-Hand Financing Engine */}
                  {isProjectType && expectedMortgage > 0 && (
                    <div className="rounded-xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/5 p-4 space-y-2">
                      <p className="text-[10px] font-semibold tracking-widest text-[#C8AA8F]/70">{t.dir === 'rtl' ? 'מנוע מימון — ניתוח ריאליות' : 'Financing Engine'}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#86968B]">{p.form.expectedMortgage}</span>
                        <span className="font-semibold text-[#F0EDE8]">{formatCurrency(expectedMortgage)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <span className="text-[#86968B]">{p.form.futurePmt}</span>
                          <p className="text-[10px] text-[#445147]">{p.form.futurePmtSub}</p>
                        </div>
                        <span className="font-semibold text-[#C8AA8F]">{formatCurrency(futurePmt)}</span>
                      </div>
                      {requiredIncome > 0 && (
                        <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                          <p className="text-xs text-amber-300 leading-relaxed">
                            {p.form.requiredIncomeMsg('₪' + requiredIncome.toLocaleString('he-IL', { maximumFractionDigits: 0 }))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analyst Alert */}
                  {alertData && (
                    <AnalystAlert
                      {...alertData}
                      {...(alertData.type === 'cashflow_missing'
                        ? { ctaLink: '/dashboard/cashflow', ctaLabel: t.dir === 'rtl' ? 'השלם את נתוני התזרים ←' : '← Complete Cash Flow Data' }
                        : {})}
                    />
                  )}
                </>
              )}

              {/* Overseas location */}
              {isOverseasType && (
                <>
                  <div>
                    <label className={labelCls}>{t.dir === 'rtl' ? 'מיקום' : 'Location'}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><Globe2 size={14} /></span>
                      <select value={form.overseas_location} onChange={(e) => setForm((f) => ({ ...f, overseas_location: e.target.value, overseas_location_custom: '' }))} className={selectCls}>
                        <option value="">{t.dir === 'rtl' ? '— בחר מיקום —' : '— select location —'}</option>
                        {overseasLocations.map((loc) => <option key={loc} value={loc} className="bg-[#172530]">{loc}</option>)}
                      </select>
                    </div>
                  </div>
                  {showLocationCustom && (
                    <div>
                      <label className={labelCls}>{t.dir === 'rtl' ? 'פרט מיקום' : 'Custom Location'}</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><MapPin size={14} /></span>
                        <input type="text" dir="auto" value={form.overseas_location_custom} onChange={(e) => setForm((f) => ({ ...f, overseas_location_custom: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Expense items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelCls}>{p.form.expenseItems}</label>
                  <button type="button" onClick={addExpenseItem} className="flex items-center gap-1 text-xs text-[#C8AA8F] transition-colors hover:text-[#C8AA8F]/80">
                    <Plus size={12} />{t.dir === 'rtl' ? 'הוסף' : 'Add'}
                  </button>
                </div>
                {expenseItems.length > 0 && (
                  <div className="space-y-2">
                    {expenseItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" dir="auto" placeholder={t.dir === 'rtl' ? 'שם הוצאה' : 'Expense name'} value={item.label} onChange={(e) => updateExpenseItem(i, { label: e.target.value })} className="min-w-0 flex-1 rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-xs text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50" />
                        <input type="number" min="0" placeholder="0" value={item.amount || ''} onChange={(e) => updateExpenseItem(i, { amount: parseFloat(e.target.value) || 0 })} className="w-20 rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-xs text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50" />
                        <select value={item.frequency} onChange={(e) => updateExpenseItem(i, { frequency: e.target.value as ExpenseItem['frequency'] })} className="rounded-xl border border-[#2C3B38] bg-[#101A26] px-2 py-2 text-xs text-[#F0EDE8] outline-none cursor-pointer focus:border-[#C8AA8F]/50">
                          <option value="monthly">{t.dir === 'rtl' ? 'חודשי' : 'Monthly'}</option>
                          <option value="annual">{t.dir === 'rtl' ? 'שנתי' : 'Annual'}</option>
                          <option value="one_time">{t.dir === 'rtl' ? 'חד פעמי' : 'One-time'}</option>
                        </select>
                        <button type="button" onClick={() => removeExpenseItem(i)} className="text-[#445147] transition-colors hover:text-red-400"><X size={14} /></button>
                      </div>
                    ))}
                    <p className="text-right text-xs text-[#86968B]">
                      {t.dir === 'rtl' ? 'סה״כ הוצאות חודשיות:' : 'Monthly total:'} {formatCurrency(monthlyExpensesTotal)}
                    </p>
                  </div>
                )}
              </div>

              {/* Professionals — hybrid (directory for Academy clients + manual) */}
              <div className="rounded-xl border border-[#2C3B38]">
                <button type="button" onClick={() => setProfsOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-widest text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                  <span>{p.form.professionals}{professionals.length > 0 ? ` (${professionals.length})` : ''}</span>
                  <ChevronRight size={12} className={`transition-transform ${profsOpen ? 'rotate-90' : ''}`} />
                </button>

                {profsOpen && (
                  <div className="space-y-2 border-t border-[#2C3B38] px-3 pb-3 pt-2">

                    {/* Academy clients see the verified directory first */}
                    {isAcademyClient && professionalDirectory.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-2 flex items-center gap-1.5">
                          <BadgeCheck size={12} className="text-[#C8AA8F]" />
                          <p className="text-xs font-semibold text-[#C8AA8F]">{p.form.directoryProfessionals}</p>
                        </div>
                        <div className="space-y-1.5">
                          {professionalDirectory.map((prof) => (
                            <div key={prof.id} className="flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <UserRound size={11} className="shrink-0 text-[#C8AA8F]/60" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-[#F0EDE8]">{prof.name}</p>
                                  <p className="text-[10px] text-[#445147]">{profLabels[prof.role] ?? prof.role}{prof.company ? ` · ${prof.company}` : ''}</p>
                                </div>
                              </div>
                              {prof.phone && (
                                <a href={`https://wa.me/${prof.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400 transition-colors hover:bg-green-500/25">WA</a>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="my-2.5 border-t border-[#2C3B38]" />
                        <p className="mb-1.5 text-xs font-semibold text-[#445147]">{p.form.personalContacts}</p>
                      </div>
                    )}

                    {/* Manual professionals */}
                    {professionals.map((prof, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={prof.role} onChange={(e) => updateProfessional(i, { role: e.target.value })} className="rounded-xl border border-[#2C3B38] bg-[#101A26] px-2 py-2 text-xs text-[#F0EDE8] outline-none cursor-pointer focus:border-[#C8AA8F]/50">
                          {PROF_ROLES.map((r) => <option key={r} value={r} className="bg-[#172530]">{profLabels[r]}</option>)}
                        </select>
                        <input type="text" dir="auto" placeholder={t.dir === 'rtl' ? 'שם' : 'Name'} value={prof.name} onChange={(e) => updateProfessional(i, { name: e.target.value })} className="min-w-0 flex-1 rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-xs text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50" />
                        <input type="tel" dir="ltr" placeholder="050-0000000" value={prof.phone} onChange={(e) => updateProfessional(i, { phone: e.target.value })} className="w-24 rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-xs text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50" />
                        {prof.phone.replace(/\D/g, '').length >= 9 && (
                          <a href={`https://wa.me/${prof.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md bg-green-500/15 px-1.5 py-1.5 text-[10px] font-semibold text-green-400 transition-colors hover:bg-green-500/25">WA</a>
                        )}
                        <button type="button" onClick={() => removeProfessional(i)} className="text-[#445147] transition-colors hover:text-red-400"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addProfessional} className="flex items-center gap-1.5 text-xs text-[#C8AA8F] transition-colors hover:text-[#C8AA8F]/80">
                      <Plus size={12} />{t.dir === 'rtl' ? '+ הוסף איש מקצוע' : '+ Add Professional'}
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

              <div className={`flex gap-3 pt-1 ${editProp ? 'justify-between' : ''}`}>
                {editProp && (
                  <button type="button" onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20">
                    <Trash2 size={14} />{p.form.delete}
                  </button>
                )}
                <div className={`flex gap-3 ${editProp ? '' : 'flex-1'}`}>
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                    {p.form.cancel}
                  </button>
                  <button type="submit" disabled={isPending} className="flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50 disabled:opacity-50">
                    {isPending ? p.form.saving : p.form.save}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
