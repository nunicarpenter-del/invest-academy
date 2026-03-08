'use client'

import { AlertTriangle, CheckCircle2, Clock, TrendingDown, Database, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export interface AnalystAlertProps {
  type: 'savings_gap' | 'maturity_mismatch' | 'completion_gap' | 'marketing_alert' | 'data_missing' | 'cashflow_missing' | 'double_allocation' | 'leverage_suggestion' | 'refinance_opportunity' | 'empty_capital_board' | 'ok'
  // savings_gap / surplus context
  requiredMonthlySavings?: number
  netCashFlow?: number
  // maturity_mismatch
  deliveryDate?: string
  maturityDate?: string
  fundName?: string
  // completion_gap
  completionAmount?: number
  availableCapital?: number
  gap?: number
  // marketing_alert
  sellByDate?: string
  monthsToDeadline?: number
  linkedPropertyName?: string
  // data_missing
  missingFields?: string[]
  // double_allocation
  allocatedPropertyName?: string
  // leverage_suggestion
  sourceName?: string
  sourceFutureValue?: number
  gapAmount?: number
  propertyName?: string
  // refinance_opportunity
  potentialSaving?: number
  marketRate?: number
  userRate?: number
  triggerReason?: 'pmt_ratio' | 'gap'
  // generic CTA (link to another board)
  ctaLink?: string
  ctaLabel?: string
}

const fmtILS = (n: number) =>
  '₪' + Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const fmtDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

const getMonthsDiff = (dateA: string, dateB: string) => {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

type AlertLevel = 'success' | 'warning' | 'danger' | 'info'

function getAlertLevel(type: AnalystAlertProps['type']): AlertLevel {
  if (type === 'ok')                  return 'success'
  if (type === 'marketing_alert')         return 'warning'
  if (type === 'leverage_suggestion')     return 'warning'
  if (type === 'refinance_opportunity')   return 'warning'
  if (type === 'empty_capital_board')     return 'warning'
  if (type === 'data_missing')        return 'info'
  if (type === 'cashflow_missing')    return 'info'
  return 'danger'
}

const LEVEL_STYLES: Record<AlertLevel, string> = {
  success: 'border-emerald-500/25 bg-emerald-500/8',
  warning: 'border-amber-500/25   bg-amber-500/8',
  danger:  'border-red-500/25     bg-red-500/8',
  info:    'border-blue-500/25    bg-blue-500/8',
}

const LEVEL_ICON_CLS: Record<AlertLevel, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-red-400',
  info:    'text-blue-400',
}

function AlertIcon({ level }: { level: AlertLevel }) {
  const cls = `mt-0.5 shrink-0 ${LEVEL_ICON_CLS[level]}`
  if (level === 'success') return <CheckCircle2 size={12} className={cls} />
  if (level === 'info')    return <Database     size={12} className={cls} />
  if (level === 'warning') return <Clock        size={12} className={cls} />
  return                          <AlertTriangle size={12} className={cls} />
}

export default function AnalystAlert(props: AnalystAlertProps) {
  const { type } = props
  const level = getAlertLevel(type)

  let message = ''
  let subMessage = ''

  if (type === 'ok') {
    message = 'מעולה! מימון הפרויקט נראה ריאלי.'
    if (props.requiredMonthlySavings != null && props.netCashFlow != null) {
      subMessage = `עודף חודשי נטו: ${fmtILS(props.netCashFlow)} · נדרש לחיסכון: ${fmtILS(props.requiredMonthlySavings)} — הפרויקט ריאלי.`
    }

  } else if (type === 'cashflow_missing') {
    message    = 'אני צריך את נתוני התזרים שלך כדי לאמת את העסקה הזו.'
    subMessage = 'נא להשלים הכנסות והוצאות חודשיות בלוח התזרים — ללא הנתונים האלה לא ניתן לאמת את העסקה.'

  } else if (type === 'savings_gap' && props.requiredMonthlySavings != null && props.netCashFlow != null) {
    const gap = props.requiredMonthlySavings - props.netCashFlow
    message    = `על מנת לממן את הפרויקט תצטרך לחסוך ${fmtILS(props.requiredMonthlySavings)} לחודש.`
    subMessage = `תזרים הנטו שלך עומד על ${fmtILS(props.netCashFlow)}. יש פער של ${fmtILS(gap)} לחודש — אנא עדכן את לוח התזרים שלך כדי שאוכל לאמת את העסקה.`

  } else if (type === 'maturity_mismatch' && props.deliveryDate && props.maturityDate) {
    const months = Math.abs(getMonthsDiff(props.deliveryDate, props.maturityDate))
    message    = `מועד המסירה (${fmtDate(props.deliveryDate)}) קודם לפדיון הקרן.`
    subMessage = `קרן "${props.fundName ?? ''}" תבשיל רק ב-${fmtDate(props.maturityDate)} — פער של ${months} חודשים. שקול מקור מימון חלופי.`

  } else if (type === 'completion_gap' && props.completionAmount != null && props.availableCapital != null) {
    message    = `זיהיתי פער של ${fmtILS(props.gap ?? 0)} בהשלמת ההון העצמי.`
    subMessage = `נדרש: ${fmtILS(props.completionAmount)} | זמין בקרן "${props.fundName ?? ''}": ${fmtILS(props.availableCapital)}. אנא עדכן את מקורות ההון שלך כדי שאוכל לאמת את העסקה.`

  } else if (type === 'marketing_alert' && props.sellByDate) {
    const months = props.monthsToDeadline ?? 0
    message    = `הגיע הזמן להתחיל לשווק את${props.linkedPropertyName ? ` "${props.linkedPropertyName}"` : ' הנכס המיועד למכירה'}.`
    subMessage = `תאריך המכירה האחרון: ${fmtDate(props.sellByDate)} — עוד ${months} חודשים. התחל בשיווק כדי לא להחמיץ את הדדליין.`

  } else if (type === 'double_allocation' && props.allocatedPropertyName) {
    message    = `שגיאת הקצאה כפולה!`
    subMessage = `מקור הון זה כבר מחויב ל-"${props.allocatedPropertyName}". לא ניתן להקצות את אותו מקור לשני פרויקטים שונים.`

  } else if (type === 'leverage_suggestion' && props.sourceName) {
    const fv = props.sourceFutureValue ? `₪${Math.round(props.sourceFutureValue).toLocaleString('he-IL')}` : ''
    message    = `הזדמנות מינוף מזוהה`
    subMessage = `ניתן לכסות את פער המימון${props.propertyName ? ` ב-"${props.propertyName}"` : ''} (${fmtILS(props.gapAmount ?? 0)} לחודש) באמצעות שעבוד "${props.sourceName}"${fv ? ` (שווי צפוי: ${fv})` : ''} במקום מימון בנקאי יקר.`

  } else if (type === 'refinance_opportunity') {
    if (props.triggerReason === 'pmt_ratio') {
      message    = 'תשלום ל-₪1M גבוה מהבנצ׳מרק — כדאי לבדוק מחזור'
      subMessage = 'התשלום החודשי שלך עולה על ₪5,000 לכל ₪1M קרן. ריביות השוק הנוכחיות עשויות לאפשר תנאים טובים יותר.'
    } else if (props.potentialSaving != null) {
      message    = `הזדמנות מחזור משכנתא — חיסכון פוטנציאלי: ${fmtILS(props.potentialSaving)} לחודש`
      subMessage = props.userRate != null && props.marketRate != null
        ? `הריבית שלך (${props.userRate.toFixed(2)}%) גבוהה מריבית השוק (${props.marketRate.toFixed(2)}%). שקול מחזור משכנתא.`
        : 'הריבית שלך גבוהה מריבית השוק הנוכחית. שקול לפנות לבנק ולבדוק מחזור.'
    }

  } else if (type === 'empty_capital_board') {
    message    = 'לוח ההון והפנסיה ריק — לא ניתן לאמת את מקור המימון.'
    subMessage = 'אני רואה שבחרת מקור הון לפרויקט זה, אך לוח ההון והפנסיה ריק. הוסף קרנות בלוח \'הון ופנסיה\' כדי שניתן יהיה לאמת את המימון.'

  } else if (type === 'data_missing') {
    message    = 'חסרים פרטים לניתוח מלא.'
    subMessage = props.missingFields?.length
      ? `אנא עדכן: ${props.missingFields.join(', ')} — כדי שאוכל לבדוק את המימון ולאשר את העסקה.`
      : 'אנא השלם את שדות המימון כדי שהאנליסט יוכל לבצע אימות.'
  }

  if (!message) return null

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${LEVEL_STYLES[level]}`}>
      {/* AI Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C8AA8F]/30 bg-[#C8AA8F]/15">
        <span className="text-xs font-bold text-[#C8AA8F]">AI</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-xs font-semibold text-[#C8AA8F]">האנליסט</p>
        <div className="flex items-start gap-2">
          <AlertIcon level={level} />
          <div>
            <p className="text-xs font-medium text-[#F0EDE8]">{message}</p>
            {subMessage && (
              <p className="mt-0.5 text-xs leading-relaxed text-[#86968B]">{subMessage}</p>
            )}
            {props.ctaLink && (
              <Link
                href={props.ctaLink}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
              >
                <ExternalLink size={10} />
                {props.ctaLabel ?? props.ctaLink}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
