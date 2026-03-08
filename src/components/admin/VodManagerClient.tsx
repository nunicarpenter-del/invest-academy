'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Eye, EyeOff, Trash2, X, Film, AlertTriangle } from 'lucide-react'
import { addVideo, updateVideo, togglePublished, deleteVideo } from '@/app/(admin)/admin/vod/actions'

interface Video {
  id:               string
  category_id:      string
  title_he:         string
  title_en:         string | null
  duration_seconds: number | null
  xp_value:         number
  display_order:    number
  is_published:     boolean
}
interface Category { id: string; name_he: string; name_en: string | null; parent_id: string | null }

interface FormState {
  category_id: string; title_he: string; title_en: string; video_url: string
  thumbnail_url: string; duration_seconds: string; xp_value: string
  display_order: string; description_he: string; description_en: string
}
const EMPTY: FormState = {
  category_id: '', title_he: '', title_en: '', video_url: '',
  thumbnail_url: '', duration_seconds: '', xp_value: '50',
  display_order: '0', description_he: '', description_en: '',
}
const INPUT = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">{label}</label>
      {children}
    </div>
  )
}

function fmt(s: number | null) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function VodManagerClient({ videos, categories }: { videos: Video[]; categories: Category[] }) {
  const [modal, setModal]            = useState<'closed' | 'add' | string>('closed')
  const [deleteId, setDeleteId]      = useState<string | null>(null)
  const [form, setForm]              = useState<FormState>(EMPTY)
  const [formError, setFormError]    = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const catMap   = new Map(categories.map(c => [c.id, c.name_he]))
  const rootCats = categories.filter(c => !c.parent_id)
  const subCats  = categories.filter(c => !!c.parent_id)

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }
  function openAdd()    { setForm(EMPTY); setFormError(null); setModal('add') }
  function openEdit(v: Video) {
    setForm({ category_id: v.category_id, title_he: v.title_he, title_en: v.title_en ?? '',
      video_url: '', thumbnail_url: '', duration_seconds: v.duration_seconds?.toString() ?? '',
      xp_value: v.xp_value.toString(), display_order: v.display_order.toString(),
      description_he: '', description_en: '' })
    setFormError(null); setModal(v.id)
  }

  function handleSubmit() {
    if (!form.category_id || !form.title_he || !form.xp_value) {
      setFormError('קטגוריה, כותרת בעברית ו-XP הם שדות חובה.')
      return
    }
    const payload = {
      category_id: form.category_id, title_he: form.title_he,
      title_en: form.title_en || undefined, video_url: form.video_url || undefined,
      thumbnail_url: form.thumbnail_url || undefined,
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : undefined,
      xp_value: parseInt(form.xp_value), display_order: parseInt(form.display_order) || 0,
      description_he: form.description_he || undefined, description_en: form.description_en || undefined,
    }
    startTransition(async () => {
      try {
        if (modal === 'add') await addVideo(payload)
        else await updateVideo(modal as string, payload)
        setModal('closed'); setFormError(null)
      } catch (e) { setFormError(e instanceof Error ? e.message : 'שגיאה.') }
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      try { await deleteVideo(deleteId); setDeleteId(null) }
      catch (e) { alert(e instanceof Error ? e.message : 'שגיאה במחיקה.') }
    })
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#2C3B38] bg-[#20302F]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#F0EDE8]">סרטונים</h2>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg bg-[#C8AA8F] px-3 py-2 text-xs font-semibold text-[#101A26] hover:bg-[#D4B99E]">
            <Plus size={13} />הוסף סרטון
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2C3B38]">
              {['כותרת', 'קטגוריה', 'משך', 'XP', 'סדר', 'סטטוס', 'פעולות'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#445147]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C3B38]">
            {videos.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center">
                <Film size={24} className="mx-auto mb-2 text-[#2C3B38]" />
                <p className="text-sm text-[#445147]">אין סרטונים עדיין. הוסף את הראשון!</p>
              </td></tr>
            )}
            {videos.map(v => (
              <tr key={v.id} className="hover:bg-[#2C3B38]/20">
                <td className="max-w-[160px] truncate px-4 py-3.5 font-medium text-[#F0EDE8]">{v.title_he}</td>
                <td className="px-4 py-3.5 text-xs text-[#86968B]">{catMap.get(v.category_id) ?? '—'}</td>
                <td className="px-4 py-3.5 text-[#86968B]">{fmt(v.duration_seconds)}</td>
                <td className="px-4 py-3.5 font-medium text-[#C8AA8F]">{v.xp_value}</td>
                <td className="px-4 py-3.5 text-[#86968B]">{v.display_order}</td>
                <td className="px-4 py-3.5">
                  <button onClick={() => startTransition(() => togglePublished(v.id, !v.is_published))}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      v.is_published
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-[#2C3B38] bg-[#2C3B38]/50 text-[#445147] hover:text-[#86968B]'
                    }`}>
                    {v.is_published ? <Eye size={10} /> : <EyeOff size={10} />}
                    {v.is_published ? 'פעיל' : 'טיוטה'}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(v)}
                      className="flex items-center gap-1 rounded-lg border border-[#2C3B38] px-2.5 py-1.5 text-xs text-[#86968B] hover:border-[#C8AA8F]/30 hover:text-[#C8AA8F]">
                      <Edit2 size={11} />ערוך
                    </button>
                    <button onClick={() => setDeleteId(v.id)}
                      className="flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-400">
                      <Trash2 size={11} />מחק
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#20302F] shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-6 py-4">
              <h3 className="font-semibold text-[#F0EDE8]">{modal === 'add' ? 'הוספת סרטון' : 'עריכת סרטון'}</h3>
              <button onClick={() => setModal('closed')} className="text-[#445147] hover:text-[#86968B]"><X size={18} /></button>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
              {formError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>}
              <Field label="קטגוריה *">
                <select value={form.category_id} onChange={set('category_id')} className={INPUT}>
                  <option value="">בחר קטגוריה…</option>
                  {rootCats.map(c => (
                    <optgroup key={c.id} label={c.name_he}>
                      <option value={c.id}>{c.name_he}</option>
                      {subCats.filter(s => s.parent_id === c.id).map(s => (
                        <option key={s.id} value={s.id}>└ {s.name_he}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="כותרת (עברית) *">
                  <input value={form.title_he} onChange={set('title_he')} placeholder="כותרת" className={INPUT} dir="rtl" />
                </Field>
                <Field label="כותרת (אנגלית)">
                  <input value={form.title_en} onChange={set('title_en')} placeholder="Title" className={INPUT} dir="ltr" />
                </Field>
              </div>
              <Field label={modal === 'add' ? 'כתובת סרטון' : 'כתובת סרטון (השאר ריק לשמור)'}>
                <input value={form.video_url} onChange={set('video_url')} placeholder="https://…" className={INPUT} dir="ltr" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="XP *">
                  <input type="number" value={form.xp_value} onChange={set('xp_value')} min="0" className={INPUT} />
                </Field>
                <Field label="משך (שניות)">
                  <input type="number" value={form.duration_seconds} onChange={set('duration_seconds')} min="0" placeholder="360" className={INPUT} />
                </Field>
                <Field label="סדר תצוגה">
                  <input type="number" value={form.display_order} onChange={set('display_order')} min="0" className={INPUT} />
                </Field>
              </div>
              <Field label="תיאור (עברית)">
                <textarea value={form.description_he} onChange={set('description_he')} rows={2} className={INPUT + ' resize-none'} dir="rtl" />
              </Field>
            </div>
            <div className="border-t border-[#2C3B38] px-6 py-4">
              <button onClick={handleSubmit} disabled={isPending}
                className="w-full rounded-xl bg-[#C8AA8F] py-3 text-sm font-semibold text-[#101A26] hover:bg-[#D4B99E] disabled:cursor-not-allowed disabled:opacity-50">
                {isPending ? 'שומר…' : modal === 'add' ? 'הוסף סרטון' : 'שמור שינויים'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6 shadow-2xl" dir="rtl">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="font-semibold text-[#F0EDE8]">מחיקת סרטון</h3>
            </div>
            <p className="mb-5 text-sm text-[#86968B]">פעולה זו תמחק את הסרטון לצמיתות. לא ניתן לבטל.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm text-[#86968B] hover:text-[#F0EDE8]">
                ביטול
              </button>
              <button onClick={handleDelete} disabled={isPending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50">
                {isPending ? 'מוחק…' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
