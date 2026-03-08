'use client'

import { useState, useTransition } from 'react'
import { upsertServicePlan, sendNotificationAction } from '@/app/(admin)/admin/plans/actions'
import { Pencil, Send, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Client {
  id:        string
  full_name: string | null
  email:     string | null
  role:      string | null
}

interface ServicePlan {
  id:             string
  user_id:        string
  plan_name:      string
  total_sessions: number
  start_date:     string
  end_date:       string | null
  notes:          string | null
  is_active:      boolean
  created_at:     string
}

interface MeetingRow {
  user_id:   string
  date_time: string
}

interface NotificationRow {
  id:          string
  user_id:     string
  type:        string
  message:     string
  channel:     string
  status:      string
  triggered_by:string
  sent_at:     string | null
  created_at:  string
}

interface Props {
  clients:       Client[]
  plans:         ServicePlan[]
  meetings:      MeetingRow[]
  notifications: NotificationRow[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  meeting_reminder:  'תזכורת פגישה',
  engagement_nudge:  'עידוד מעורבות',
  welcome:           'ברוך הבא',
  upgrade_prompt:    'שדרוג לפרמיום',
}

const CHANNEL_LABELS: Record<string, string> = {
  email:    'אימייל',
  whatsapp: 'WhatsApp',
  in_app:   'התראה באפליקציה',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:    <CheckCircle2 size={13} className="text-emerald-400" />,
  pending: <Clock        size={13} className="text-amber-400"   />,
  failed:  <XCircle      size={13} className="text-red-400"     />,
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PlansManagerClient({ clients, plans, meetings, notifications }: Props) {
  const [isPending, startTransition] = useTransition()

  // Plan edit modal
  const [editClient, setEditClient]   = useState<Client | null>(null)
  const [editPlan, setEditPlan]       = useState<ServicePlan | null>(null)
  const [planName, setPlanName]       = useState('')
  const [totalSessions, setTotal]     = useState(12)
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [planNotes, setPlanNotes]     = useState('')
  const [planError, setPlanError]     = useState<string | null>(null)

  // Notification modal
  const [notifClient, setNotifClient] = useState<Client | null>(null)
  const [notifType, setNotifType]     = useState<string>('meeting_reminder')
  const [notifChannel, setNotifChannel] = useState<string>('in_app')
  const [notifMessage, setNotifMessage] = useState('')
  const [notifError, setNotifError]   = useState<string | null>(null)

  // Log expansion per client
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // ── Open plan edit modal ────────────────────────────────────────────────────
  function openEdit(client: Client) {
    const existing = plans.find(p => p.user_id === client.id)
    setEditClient(client)
    setEditPlan(existing ?? null)
    setPlanName(existing?.plan_name     ?? '')
    setTotal(existing?.total_sessions   ?? 12)
    setStartDate(existing?.start_date   ?? '')
    setEndDate(existing?.end_date       ?? '')
    setPlanNotes(existing?.notes        ?? '')
    setPlanError(null)
  }

  function closePlanModal() { setEditClient(null); setEditPlan(null) }

  function savePlan() {
    if (!editClient) return
    if (!planName.trim()) { setPlanError('נא להזין שם תוכנית'); return }
    if (!startDate)        { setPlanError('נא לבחור תאריך התחלה'); return }
    if (totalSessions < 1) { setPlanError('מספר פגישות חייב להיות לפחות 1'); return }
    setPlanError(null)

    startTransition(async () => {
      try {
        await upsertServicePlan({
          id:             editPlan?.id,
          user_id:        editClient.id,
          plan_name:      planName.trim(),
          total_sessions: totalSessions,
          start_date:     startDate,
          end_date:       endDate || null,
          notes:          planNotes || null,
        })
        closePlanModal()
      } catch (e: unknown) {
        setPlanError(e instanceof Error ? e.message : 'שגיאה בשמירה')
      }
    })
  }

  // ── Open notification modal ─────────────────────────────────────────────────
  function openNotif(client: Client) {
    setNotifClient(client)
    setNotifType('meeting_reminder')
    setNotifChannel('in_app')
    setNotifMessage('')
    setNotifError(null)
  }

  function closeNotifModal() { setNotifClient(null) }

  function sendNotif() {
    if (!notifClient) return
    if (!notifMessage.trim()) { setNotifError('נא להזין הודעה'); return }
    setNotifError(null)

    startTransition(async () => {
      try {
        await sendNotificationAction({
          user_id:   notifClient.id,
          recipient: notifClient.email ?? '',
          type:      notifType as 'meeting_reminder' | 'engagement_nudge' | 'welcome' | 'upgrade_prompt',
          message:   notifMessage.trim(),
          channel:   notifChannel as 'email' | 'whatsapp' | 'in_app',
        })
        closeNotifModal()
      } catch (e: unknown) {
        setNotifError(e instanceof Error ? e.message : 'שגיאה בשליחה')
      }
    })
  }

  // ── Compute sessions used per client ───────────────────────────────────────
  function sessionsUsed(clientId: string): number {
    const plan = plans.find(p => p.user_id === clientId)
    if (!plan) return 0
    return meetings.filter(m => m.user_id === clientId && new Date(m.date_time) >= new Date(plan.start_date)).length
  }

  return (
    <>
      {/* ── Client Table ────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-[#2C3B38] bg-[#172530]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2C3B38] text-xs text-[#445147]">
              <th className="px-4 py-3 text-right">שם לקוח</th>
              <th className="px-4 py-3 text-right">אימייל</th>
              <th className="px-4 py-3 text-right">שם תוכנית</th>
              <th className="px-4 py-3 text-right">סה"כ פגישות</th>
              <th className="px-4 py-3 text-right">נוצלו</th>
              <th className="px-4 py-3 text-right">נותרו</th>
              <th className="px-4 py-3 text-right">תאריך התחלה</th>
              <th className="px-4 py-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C3B38]">
            {clients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#445147]">אין לקוחות עדיין</td>
              </tr>
            )}
            {clients.map(client => {
              const plan   = plans.find(p => p.user_id === client.id)
              const used   = sessionsUsed(client.id)
              const total  = plan?.total_sessions ?? 0
              const remaining = Math.max(0, total - used)
              const notifCount = notifications.filter(n => n.user_id === client.id).length
              const logExpanded = expandedLog === client.id
              const clientNotifs = notifications.filter(n => n.user_id === client.id)

              return (
                <>
                  <tr key={client.id} className="transition-colors hover:bg-[#1E2F2D]">
                    <td className="px-4 py-3 font-medium text-[#F0EDE8]">
                      {client.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#86968B]">{client.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {plan
                        ? <span className="text-[#C8AA8F] font-medium">{plan.plan_name}</span>
                        : <span className="text-[#445147]">ללא תוכנית</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[#F0EDE8]">{total || '—'}</td>
                    <td className="px-4 py-3 text-[#F0EDE8]">{plan ? used : '—'}</td>
                    <td className="px-4 py-3">
                      {plan
                        ? <span className={`font-semibold ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {remaining}
                          </span>
                        : <span className="text-[#445147]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[#86968B] text-xs">
                      {plan?.start_date
                        ? new Date(plan.start_date).toLocaleDateString('he-IL')
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="flex items-center gap-1 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2.5 py-1 text-xs text-[#86968B] transition hover:border-[#C8AA8F]/30 hover:text-[#C8AA8F]"
                        >
                          <Pencil size={11} />
                          ערוך תוכנית
                        </button>
                        <button
                          onClick={() => openNotif(client)}
                          className="flex items-center gap-1 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2.5 py-1 text-xs text-[#86968B] transition hover:border-emerald-500/30 hover:text-emerald-400"
                        >
                          <Send size={11} />
                          שלח הודעה
                        </button>
                        {notifCount > 0 && (
                          <button
                            onClick={() => setExpandedLog(logExpanded ? null : client.id)}
                            className="flex items-center gap-1 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2.5 py-1 text-xs text-[#445147] transition hover:text-[#86968B]"
                          >
                            {logExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {notifCount} הודעות
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Notification log for this client */}
                  {logExpanded && clientNotifs.length > 0 && (
                    <tr key={`${client.id}-log`}>
                      <td colSpan={8} className="bg-[#101A26]/60 px-6 py-4">
                        <p className="mb-3 text-xs font-semibold text-[#445147]">יומן הודעות</p>
                        <div className="space-y-2">
                          {clientNotifs.map(n => (
                            <div key={n.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#2C3B38] bg-[#172530] px-4 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {STATUS_ICON[n.status] ?? STATUS_ICON.pending}
                                <span className="text-xs font-medium text-[#F0EDE8]">
                                  {TYPE_LABELS[n.type] ?? n.type}
                                </span>
                                <span className="text-xs text-[#445147]">·</span>
                                <span className="text-xs text-[#86968B]">
                                  {CHANNEL_LABELS[n.channel] ?? n.channel}
                                </span>
                                <span className="text-xs text-[#445147] truncate max-w-64">
                                  {n.message}
                                </span>
                              </div>
                              <span className="shrink-0 text-xs text-[#445147]">
                                {new Date(n.created_at).toLocaleDateString('he-IL')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Plan Edit Modal ──────────────────────────────────────────────────── */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-xl">
            <div className="border-b border-[#2C3B38] px-6 py-4">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {editPlan ? 'עריכת תוכנית' : 'הגדרת תוכנית'}
              </h2>
              <p className="mt-0.5 text-xs text-[#86968B]">{editClient.full_name ?? editClient.email}</p>
            </div>

            <div className="space-y-4 px-6 py-5">
              {planError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {planError}
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">שם תוכנית</label>
                <input
                  type="text"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder='לדוג׳ "פרמיום 12 פגישות"'
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/40"
                  dir="auto"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">מספר פגישות (1–100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={totalSessions}
                  onChange={e => setTotal(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#86968B]">תאריך התחלה</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#86968B]">תאריך סיום (אופציונלי)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">הערות (אופציונלי)</label>
                <textarea
                  rows={3}
                  value={planNotes}
                  onChange={e => setPlanNotes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/40"
                  dir="auto"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#2C3B38] px-6 py-4">
              <button
                onClick={closePlanModal}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm text-[#86968B] transition hover:text-[#F0EDE8]"
              >
                ביטול
              </button>
              <button
                onClick={savePlan}
                disabled={isPending}
                className="rounded-lg bg-[#C8AA8F] px-5 py-2 text-sm font-semibold text-[#101A26] transition hover:bg-[#D4B99E] disabled:opacity-60"
              >
                {isPending ? 'שומר…' : 'שמור תוכנית'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Notification Modal ──────────────────────────────────────────── */}
      {notifClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-xl">
            <div className="border-b border-[#2C3B38] px-6 py-4">
              <h2 className="text-base font-semibold text-[#F0EDE8]">שלח הודעה</h2>
              <p className="mt-0.5 text-xs text-[#86968B]">{notifClient.full_name ?? notifClient.email}</p>
            </div>

            <div className="space-y-4 px-6 py-5">
              {notifError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {notifError}
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">סוג הודעה</label>
                <select
                  value={notifType}
                  onChange={e => setNotifType(e.target.value)}
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/40"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">ערוץ שליחה</label>
                <select
                  value={notifChannel}
                  onChange={e => setNotifChannel(e.target.value)}
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/40"
                >
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86968B]">תוכן ההודעה</label>
                <textarea
                  rows={4}
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  placeholder="כתוב כאן את ההודעה ללקוח…"
                  className="w-full resize-none rounded-lg border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/40"
                  dir="auto"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#2C3B38] px-6 py-4">
              <button
                onClick={closeNotifModal}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm text-[#86968B] transition hover:text-[#F0EDE8]"
              >
                ביטול
              </button>
              <button
                onClick={sendNotif}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                <Send size={14} />
                {isPending ? 'שולח…' : 'שלח הודעה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
