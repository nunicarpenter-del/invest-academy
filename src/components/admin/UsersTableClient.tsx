'use client'

import { useState, useTransition, useMemo } from 'react'
import { UserPlus, X, CheckCircle2, Users2 } from 'lucide-react'
import { assignTask, assignAgent } from '@/app/(admin)/admin/users/actions'
import { ROLE_LABEL, ROLE_STYLE, fmtDate, fmtMin } from '@/lib/admin-utils'

interface User {
  id:          string
  full_name:   string | null
  role:        string | null
  agent_id:    string | null
  agent_name:  string | null
  totalXP:     number
  level:       number
  last_login:  string | null
  session_min: number
}
interface TaskBankItem { id: string; title: string; difficulty: string | null }
interface Agent        { id: string; full_name: string | null }

const DIFF_COLOR: Record<string, string> = { easy: 'text-emerald-400', medium: 'text-amber-400', hard: 'text-red-400' }

type Modal = { type: 'task' | 'agent'; user: User } | null

export default function UsersTableClient({
  users, taskBank, agents,
}: {
  users: User[]; taskBank: TaskBankItem[]; agents: Agent[]
}) {
  const [filterAgent, setFilterAgent] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [modal, setModal]             = useState<Modal>(null)
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [success, setSuccess]           = useState(false)
  const [isPending, startTransition]    = useTransition()

  const filtered = useMemo(() => users.filter(u => {
    if (filterAgent && u.agent_id !== filterAgent) return false
    if (filterLevel) {
      const tier = filterLevel === '1' ? u.level <= 3 :
                   filterLevel === '2' ? u.level <= 7 :
                   filterLevel === '3' ? u.level <= 12 : u.level > 12
      if (!tier) return false
    }
    return true
  }), [users, filterAgent, filterLevel])

  function openModal(type: 'task' | 'agent', user: User) {
    setModal({ type, user })
    setSelectedTask('')
    setSelectedAgent(user.agent_id ?? '')
    setSuccess(false)
  }
  function close() { setModal(null); setSuccess(false) }

  function handleAssignTask() {
    if (!modal || !selectedTask) return
    startTransition(async () => {
      await assignTask(modal.user.id, selectedTask)
      setSuccess(true)
      setTimeout(close, 1200)
    })
  }
  function handleAssignAgent() {
    if (!modal) return
    startTransition(async () => {
      await assignAgent(modal.user.id, selectedAgent || null)
      setSuccess(true)
      setTimeout(close, 1200)
    })
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3" dir="rtl">
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="rounded-xl border border-[#2C3B38] bg-[#20302F] px-4 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]"
        >
          <option value="">כל הסוכנים</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>)}
        </select>

        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="rounded-xl border border-[#2C3B38] bg-[#20302F] px-4 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]"
        >
          <option value="">כל הרמות</option>
          <option value="1">מתחיל (רמות 1–3)</option>
          <option value="2">משקיע (רמות 4–7)</option>
          <option value="3">מומחה (רמות 8–12)</option>
          <option value="4">עלית (רמה 13+)</option>
        </select>

        <span className="flex items-center text-xs text-[#445147]">
          {filtered.length} / {users.length} חברים
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2C3B38] bg-[#20302F]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[#2C3B38]">
                {['חבר', 'תפקיד', 'סוכן משויך', 'רמה', 'סה״כ XP', 'זמן שהייה', 'כניסה אחרונה', 'פעולות'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#445147]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C3B38]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#445147]">
                    <Users2 size={24} className="mx-auto mb-2 text-[#2C3B38]" />
                    לא נמצאו חברים בסינון זה.
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#2C3B38]/20">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C3B38] text-xs font-medium text-[#C8AA8F]">
                        {(u.full_name ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-[#F0EDE8]">{u.full_name ?? 'לא ידוע'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[u.role ?? 'client'] ?? ROLE_STYLE.client}`}>
                      {ROLE_LABEL[u.role ?? 'client'] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#86968B]">
                    {u.agent_name ?? <span className="text-[#445147]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-[#C8AA8F]">רמה {u.level}</td>
                  <td className="px-4 py-3.5 text-[#86968B]">{u.totalXP.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-xs text-[#86968B]">{fmtMin(u.session_min)}</td>
                  <td className="px-4 py-3.5 text-xs text-[#86968B]">{fmtDate(u.last_login)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal('task', u)}
                        className="flex items-center gap-1 rounded-lg border border-[#2C3B38] px-2.5 py-1.5 text-xs text-[#86968B] transition-colors hover:border-[#C8AA8F]/30 hover:text-[#C8AA8F]"
                      >
                        <UserPlus size={11} />
                        משימה
                      </button>
                      <button
                        onClick={() => openModal('agent', u)}
                        className="flex items-center gap-1 rounded-lg border border-[#2C3B38] px-2.5 py-1.5 text-xs text-[#86968B] transition-colors hover:border-blue-400/30 hover:text-blue-400"
                      >
                        שיוך
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6 shadow-2xl" dir="rtl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-[#F0EDE8]">
                {modal.type === 'task' ? 'הקצאת משימה' : 'שיוך לסוכן'} — {modal.user.full_name ?? 'משתמש'}
              </h3>
              <button onClick={close} className="text-[#445147] hover:text-[#86968B]"><X size={18} /></button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle2 size={32} className="text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">בוצע בהצלחה!</p>
              </div>
            ) : modal.type === 'task' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">בחר משימה</label>
                  <select
                    value={selectedTask}
                    onChange={e => setSelectedTask(e.target.value)}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]"
                  >
                    <option value="">בחר משימה…</option>
                    {taskBank.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}{t.difficulty ? ` (${t.difficulty})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTask && (
                    <p className={`text-xs ${DIFF_COLOR[taskBank.find(t => t.id === selectedTask)?.difficulty ?? ''] ?? ''}`}>
                      רמת קושי: {taskBank.find(t => t.id === selectedTask)?.difficulty ?? '—'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAssignTask}
                  disabled={!selectedTask || isPending}
                  className="w-full rounded-xl bg-[#C8AA8F] py-3 text-sm font-semibold text-[#101A26] transition-all hover:bg-[#D4B99E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'מקצה…' : 'הקצה משימה'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">בחר סוכן</label>
                  <select
                    value={selectedAgent}
                    onChange={e => setSelectedAgent(e.target.value)}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]"
                  >
                    <option value="">ללא שיוך</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleAssignAgent}
                  disabled={isPending}
                  className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'משייך…' : 'שייך סוכן'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
