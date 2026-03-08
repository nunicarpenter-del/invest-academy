'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Trash2, X, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import {
  addCategory, updateCategory, toggleCategoryActive, deleteCategory,
} from '@/app/(admin)/admin/categories/actions'

interface Category {
  id:            string
  slug:          string
  name_he:       string
  name_en:       string | null
  parent_id:     string | null
  lock_type:     string | null
  icon:          string | null
  display_order: number
  is_active:     boolean
}

interface FormState {
  slug: string; name_he: string; name_en: string
  parent_id: string; icon: string; lock_type: string; display_order: string
}
const EMPTY: FormState = { slug: '', name_he: '', name_en: '', parent_id: '', icon: '', lock_type: '', display_order: '0' }
const INPUT = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#86968B]">{label}</label>
      {children}
    </div>
  )
}

const LOCK_OPTIONS = [
  { value: '',               label: 'ללא נעילה' },
  { value: 'has_any_asset',  label: 'נדרש נכס כלשהו' },
  { value: 'has_property',   label: 'נדרש נכס נדל״ן' },
  { value: 'has_investment', label: 'נדרשת השקעה' },
]

export default function CategoryManagerClient({ categories }: { categories: Category[] }) {
  const [modal, setModal]            = useState<'closed' | 'add' | string>('closed')
  const [deleteId, setDeleteId]      = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [form, setForm]              = useState<FormState>(EMPTY)
  const [formError, setFormError]    = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const rootCats = categories.filter(c => !c.parent_id)
  const subCats  = categories.filter(c => !!c.parent_id)
  const catName  = new Map(categories.map(c => [c.id, c.name_he]))

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function openAdd()      { setForm(EMPTY); setFormError(null); setModal('add') }
  function openEdit(c: Category) {
    setForm({ slug: c.slug, name_he: c.name_he, name_en: c.name_en ?? '',
      parent_id: c.parent_id ?? '', icon: c.icon ?? '', lock_type: c.lock_type ?? '',
      display_order: c.display_order.toString() })
    setFormError(null); setModal(c.id)
  }

  function handleSubmit() {
    if (!form.slug || !form.name_he) { setFormError('Slug ושם בעברית הם שדות חובה.'); return }
    const payload = {
      slug: form.slug.toLowerCase().trim(), name_he: form.name_he,
      name_en: form.name_en || undefined, parent_id: form.parent_id || null,
      icon: form.icon || undefined, lock_type: form.lock_type || null,
      display_order: parseInt(form.display_order) || 0,
    }
    startTransition(async () => {
      try {
        if (modal === 'add') await addCategory(payload)
        else await updateCategory(modal as string, payload)
        setModal('closed'); setFormError(null)
      } catch (e) { setFormError(e instanceof Error ? e.message : 'שגיאה.') }
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      try { await deleteCategory(deleteId); setDeleteId(null); setDeleteError(null) }
      catch (e) { setDeleteError(e instanceof Error ? e.message : 'שגיאה במחיקה.') }
    })
  }

  function renderRows(cats: Category[], indent = false) {
    return cats.map(c => (
      <tr key={c.id} className="hover:bg-[#2C3B38]/20">
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            {indent && <span className="text-[#445147]">└</span>}
            <span className={`${indent ? 'text-[#86968B]' : 'font-medium text-[#F0EDE8]'}`}>
              {c.icon && <span className="mr-1.5">{c.icon}</span>}
              {c.name_he}
            </span>
          </div>
        </td>
        <td className="px-4 py-3.5 font-mono text-xs text-[#445147]">{c.slug}</td>
        <td className="px-4 py-3.5 text-xs text-[#86968B]">{c.parent_id ? catName.get(c.parent_id) ?? '—' : '—'}</td>
        <td className="px-4 py-3.5 text-xs text-[#86968B]">{c.lock_type ?? 'ללא'}</td>
        <td className="px-4 py-3.5 text-[#86968B]">{c.display_order}</td>
        <td className="px-4 py-3.5">
          <button onClick={() => startTransition(() => toggleCategoryActive(c.id, !c.is_active))}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              c.is_active
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-[#2C3B38] bg-[#2C3B38]/50 text-[#445147] hover:text-[#86968B]'
            }`}>
            {c.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
            {c.is_active ? 'פעיל' : 'מוסתר'}
          </button>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <button onClick={() => openEdit(c)}
              className="flex items-center gap-1 rounded-lg border border-[#2C3B38] px-2.5 py-1.5 text-xs text-[#86968B] hover:border-[#C8AA8F]/30 hover:text-[#C8AA8F]">
              <Edit2 size={11} />ערוך
            </button>
            <button onClick={() => { setDeleteId(c.id); setDeleteError(null) }}
              className="flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-400">
              <Trash2 size={11} />מחק
            </button>
          </div>
        </td>
      </tr>
    ))
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#2C3B38] bg-[#20302F]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#F0EDE8]">קטגוריות</h2>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg bg-[#C8AA8F] px-3 py-2 text-xs font-semibold text-[#101A26] hover:bg-[#D4B99E]">
            <Plus size={13} />הוסף קטגוריה
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2C3B38]">
              {['שם', 'Slug', 'קטגוריית אב', 'נעילה', 'סדר', 'סטטוס', 'פעולות'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#445147]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C3B38]">
            {categories.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#445147]">אין קטגוריות.</td></tr>
            )}
            {rootCats.flatMap(c => [
              ...renderRows([c]),
              ...renderRows(subCats.filter(s => s.parent_id === c.id), true),
            ])}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#20302F] shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-6 py-4">
              <h3 className="font-semibold text-[#F0EDE8]">{modal === 'add' ? 'הוספת קטגוריה' : 'עריכת קטגוריה'}</h3>
              <button onClick={() => setModal('closed')} className="text-[#445147] hover:text-[#86968B]"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-6">
              {formError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="שם (עברית) *">
                  <input value={form.name_he} onChange={set('name_he')} placeholder="שם הקטגוריה" className={INPUT} dir="rtl" />
                </Field>
                <Field label="שם (אנגלית)">
                  <input value={form.name_en} onChange={set('name_en')} placeholder="Category name" className={INPUT} dir="ltr" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug *">
                  <input value={form.slug} onChange={set('slug')} placeholder="my_category" className={INPUT} dir="ltr" />
                </Field>
                <Field label="אייקון">
                  <input value={form.icon} onChange={set('icon')} placeholder="📚" className={INPUT} />
                </Field>
              </div>
              <Field label="קטגוריית אב">
                <select value={form.parent_id} onChange={set('parent_id')} className={INPUT}>
                  <option value="">ראשית (ללא אב)</option>
                  {rootCats.map(c => <option key={c.id} value={c.id}>{c.name_he}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="נעילה">
                  <select value={form.lock_type} onChange={set('lock_type')} className={INPUT}>
                    {LOCK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="סדר תצוגה">
                  <input type="number" value={form.display_order} onChange={set('display_order')} min="0" className={INPUT} />
                </Field>
              </div>
            </div>
            <div className="border-t border-[#2C3B38] px-6 py-4">
              <button onClick={handleSubmit} disabled={isPending}
                className="w-full rounded-xl bg-[#C8AA8F] py-3 text-sm font-semibold text-[#101A26] hover:bg-[#D4B99E] disabled:opacity-50">
                {isPending ? 'שומר…' : modal === 'add' ? 'הוסף קטגוריה' : 'שמור שינויים'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6 shadow-2xl" dir="rtl">
            <div className="mb-3 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="font-semibold text-[#F0EDE8]">מחיקת קטגוריה</h3>
            </div>
            <p className="mb-2 text-sm text-[#86968B]">לא ניתן למחוק קטגוריה שיש בה תת-קטגוריות או סרטונים.</p>
            {deleteError && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteId(null); setDeleteError(null) }}
                className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm text-[#86968B] hover:text-[#F0EDE8]">ביטול</button>
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
