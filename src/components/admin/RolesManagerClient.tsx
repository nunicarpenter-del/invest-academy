'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Zap, CheckCircle2 } from 'lucide-react'
import { addRoleRule, deleteRoleRule, applyRulesToAll } from '@/app/(admin)/admin/roles/actions'
import { ROLE_LABEL, ROLE_STYLE } from '@/lib/admin-utils'

interface Rule {
  id:          string
  pattern:     string
  role:        string
  description: string | null
  created_at:  string
}

export default function RolesManagerClient({ rules }: { rules: Rule[] }) {
  const [pattern, setPattern]        = useState('')
  const [role, setRole]              = useState('client')
  const [desc, setDesc]              = useState('')
  const [formError, setFormError]    = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!pattern.trim()) { setFormError('תבנית האימייל היא שדה חובה.'); return }
    startTransition(async () => {
      try {
        await addRoleRule(pattern, role, desc)
        setPattern(''); setDesc(''); setFormError(null)
      } catch (e) { setFormError(e instanceof Error ? e.message : 'שגיאה.') }
    })
  }

  function handleApply() {
    setApplyResult(null)
    startTransition(async () => {
      try {
        const { updated } = await applyRulesToAll()
        setApplyResult(`עודכנו ${updated} משתמשים בהצלחה.`)
      } catch (e) { setApplyResult(e instanceof Error ? e.message : 'שגיאה.') }
    })
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* How it works */}
      <div className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-5">
        <h3 className="mb-2 text-sm font-semibold text-[#F0EDE8]">איך זה עובד?</h3>
        <p className="text-xs leading-relaxed text-[#86968B]">
          הגדר תבניות אימייל (לדוגמה: <span className="font-mono text-[#C8AA8F]">@investacademy.co.il</span> או <span className="font-mono text-[#C8AA8F]">admin</span>).
          בלחיצה על &quot;החל כללים&quot; — המערכת תעבור על כל המשתמשים הרשומים ותעדכן את תפקידם בהתאם לתבנית הראשונה שמתאימה.
        </p>
      </div>

      {/* Add rule form */}
      <div className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#F0EDE8]">הוסף כלל חדש</h3>
        {formError && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{formError}</div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">תבנית אימייל</label>
            <input
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="@example.com"
              dir="ltr"
              className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">תפקיד</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-2.5 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]">
              <option value="client">לקוח</option>
              <option value="partner">סוכן</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">תיאור (אופציונלי)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="לדוגמה: צוות הנהלה"
              className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={isPending}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#C8AA8F] px-4 py-2.5 text-sm font-semibold text-[#101A26] hover:bg-[#D4B99E] disabled:opacity-50">
          <Plus size={14} />
          {isPending ? 'מוסיף…' : 'הוסף כלל'}
        </button>
      </div>

      {/* Rules list */}
      <div className="overflow-hidden rounded-xl border border-[#2C3B38] bg-[#20302F]">
        <div className="border-b border-[#2C3B38] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#F0EDE8]">כללים קיימים</h3>
        </div>
        {rules.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#445147]">אין כללים עדיין.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2C3B38]">
                {['תבנית אימייל', 'תפקיד', 'תיאור', 'תאריך הוספה', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#445147]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C3B38]">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-[#2C3B38]/20">
                  <td className="px-5 py-3.5 font-mono text-sm text-[#C8AA8F]">{r.pattern}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[r.role] ?? ''}`}>
                      {ROLE_LABEL[r.role] ?? r.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#86968B]">{r.description ?? '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-[#445147]">
                    {new Date(r.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => startTransition(() => deleteRoleRule(r.id))}
                      className="flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-400"
                    >
                      <Trash2 size={11} />מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply rules */}
      <div className="rounded-xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/5 p-5">
        <h3 className="mb-1 text-sm font-semibold text-[#F0EDE8]">החל כללים על כל המשתמשים</h3>
        <p className="mb-4 text-xs text-[#86968B]">
          עדכן את תפקיד כל המשתמשים הרשומים בהתאם לכללים לעיל. פעולה זו תשנה את תפקיד כל משתמש שהאימייל שלו תואם תבנית.
        </p>
        {applyResult && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-400">
            <CheckCircle2 size={14} />
            {applyResult}
          </div>
        )}
        <button onClick={handleApply} disabled={isPending || rules.length === 0}
          className="flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-5 py-2.5 text-sm font-semibold text-[#101A26] hover:bg-[#D4B99E] disabled:cursor-not-allowed disabled:opacity-50">
          <Zap size={14} />
          {isPending ? 'מעדכן…' : 'החל כללים'}
        </button>
      </div>
    </div>
  )
}
