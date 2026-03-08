'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Pencil, Trash2, MapPin, Clock,
  ChevronLeft, ChevronRight, CalendarDays,
  Cloud, Link as LinkIcon, Video, Users, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Meeting {
  id:                  string
  title:               string
  meeting_type:        string
  meeting_format:      'zoom' | 'frontal'
  date_time:           string
  location:            string | null
  notes:               string | null
  related_property_id: string | null
  google_event_id:     string | null
}

interface Property { id: string; name: string }

type CalView = 'day' | 'week' | 'month'

interface FormState {
  title:               string
  meeting_type:        string
  meeting_format:      'zoom' | 'frontal'
  date_time:           string
  location:            string
  related_property_id: string
  notes:               string
}

interface Props {
  initialMeetings: Meeting[]
  properties:      Property[]
  userId:          string
  gcalConnected:   boolean
  gcalStatus:      string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  strategy_frontal:   '#C8AA8F',
  strategy_zoom:      '#3B82F6',
  deal_closing:       '#10B981',
  monitoring:         '#6366F1',
  strategic_planning: '#F97316',
  viewing:            '#10B981',
  bank_meeting:       '#3B82F6',
  lawyer:             '#6366F1',
  contractor:         '#F97316',
  other:              '#86968B',
}

const TYPE_BG: Record<string, string> = {
  strategy_frontal:   'bg-[#C8AA8F]/10 text-[#C8AA8F]',
  strategy_zoom:      'bg-blue-400/10 text-blue-400',
  deal_closing:       'bg-emerald-400/10 text-emerald-400',
  monitoring:         'bg-indigo-400/10 text-indigo-400',
  strategic_planning: 'bg-orange-400/10 text-orange-400',
  viewing:            'bg-emerald-400/10 text-emerald-400',
  bank_meeting:       'bg-blue-400/10 text-blue-400',
  lawyer:             'bg-indigo-400/10 text-indigo-400',
  contractor:         'bg-orange-400/10 text-orange-400',
  other:              'bg-[#2C3B38] text-[#86968B]',
}

const BLANK: FormState = {
  title: '', meeting_type: 'strategy_frontal', meeting_format: 'frontal',
  date_time: '', location: '', related_property_id: '', notes: '',
}

const OFFICE_HOURS = Array.from({ length: 9 }, (_, i) => i + 9) // 9..17

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getWeekStart(anchor: Date): Date {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function fmtTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

function daysUntil(iso: string): number {
  const today  = startOfDay(new Date())
  const target = startOfDay(new Date(iso))
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function localToISO(local: string) {
  if (!local) return ''
  return new Date(local).toISOString()
}

function isoToLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const d   = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isOfficeHours(localDatetime: string): boolean {
  if (!localDatetime) return true
  const d      = new Date(localDatetime)
  const day    = d.getDay()
  const hour   = d.getHours()
  const minute = d.getMinutes()
  if (day === 5 || day === 6) return false
  if (hour < 9 || hour > 17 || (hour === 17 && minute > 0)) return false
  return true
}

function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

function pad2(n: number) { return String(n).padStart(2, '0') }

// ── MeetingCard ───────────────────────────────────────────────────────────────

function MeetingCard({
  meeting, typeLabel, onEdit, lang, inDays, gcalConnected, onSync, syncing,
}: {
  meeting:       Meeting
  typeLabel:     string
  onEdit:        (m: Meeting) => void
  lang:          string
  inDays:        (n: number) => string
  gcalConnected: boolean
  onSync:        (m: Meeting) => void
  syncing:       boolean
}) {
  const diff   = daysUntil(meeting.date_time)
  const isPast = diff < 0
  const isZoom = meeting.meeting_format === 'zoom'

  return (
    <div className={`relative flex gap-4 rounded-xl border p-4 transition hover:bg-[#263A37] ${
      isPast ? 'border-[#2C3B38] opacity-60' : 'border-[#2C3B38]'
    }`}>
      {/* Color bar */}
      <div
        className="absolute inset-y-0 start-0 w-[3px] rounded-full"
        style={{ background: TYPE_COLORS[meeting.meeting_type] ?? TYPE_COLORS.other }}
      />

      <div className="ms-2 flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BG[meeting.meeting_type] ?? TYPE_BG.other}`}>
              {typeLabel}
            </span>
            {isZoom
              ? <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-400/10 px-2 py-0.5 text-xs text-blue-400"><Video size={10} /> Zoom</span>
              : <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2C3B38] px-2 py-0.5 text-xs text-[#86968B]"><Users size={10} /> Frontal</span>
            }
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isPast && (
              <span className="text-xs font-medium text-[#C8AA8F]">{inDays(diff)}</span>
            )}
            {gcalConnected && !isPast && (
              <button
                onClick={(e) => { e.stopPropagation(); onSync(meeting) }}
                disabled={syncing}
                title={meeting.google_event_id ? 'Synced to Google' : 'Sync to Google Calendar'}
                className={`rounded-lg p-1.5 transition ${
                  meeting.google_event_id
                    ? 'text-emerald-400 hover:bg-emerald-400/10'
                    : 'text-[#445147] hover:bg-[#2C3B38] hover:text-[#C8AA8F]'
                } ${syncing ? 'opacity-50 cursor-wait' : ''}`}
              >
                <Cloud size={13} />
              </button>
            )}
            <button
              onClick={() => onEdit(meeting)}
              className="rounded-lg p-1.5 text-[#445147] transition hover:bg-[#2C3B38] hover:text-[#C8AA8F]"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <p className="mt-1.5 truncate text-sm font-semibold text-[#F0EDE8]">{meeting.title}</p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#86968B]">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {fmtDate(meeting.date_time, lang)} · {fmtTime(meeting.date_time, lang)}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1 truncate max-w-48">
              <MapPin size={11} />
              {meeting.location}
            </span>
          )}
        </div>

        {meeting.notes && (
          <p className="mt-2 text-xs text-[#445147] line-clamp-2">{meeting.notes}</p>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MeetingsClient({
  initialMeetings, properties, userId, gcalConnected, gcalStatus,
}: Props) {
  const router              = useRouter()
  const [, startTransition] = useTransition()
  const { lang, t }         = useLang()
  const mt                  = t.meetings
  const supabase            = createClient()

  const [meetings,    setMeetings]    = useState<Meeting[]>(initialMeetings)
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState<Meeting | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [form,        setForm]        = useState<FormState>({ ...BLANK })
  const [view,        setView]        = useState<CalView>('month')
  const [calYear,     setCalYear]     = useState(() => new Date().getFullYear())
  const [calMonth,    setCalMonth]    = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [weekAnchor,  setWeekAnchor]  = useState(() => getWeekStart(new Date()))
  const [dayAnchor,   setDayAnchor]   = useState(() => startOfDay(new Date()))
  const [syncingId,   setSyncingId]   = useState<string | null>(null)
  const [gcalMsg,     setGcalMsg]     = useState<string | null>(gcalStatus)

  // ── Derived ────────────────────────────────────────────────────────────────

  const today    = startOfDay(new Date())
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7)

  const upcoming = meetings
    .filter(m => new Date(m.date_time) >= today)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())

  const thisWeek = upcoming.filter(m => new Date(m.date_time) <= weekEnd)

  const pastMeetings = meetings
    .filter(m => new Date(m.date_time) < today)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())

  const eventsByDay: Record<string, Meeting[]> = {}
  meetings.forEach(m => {
    const key = dayKey(new Date(m.date_time))
    if (!eventsByDay[key]) eventsByDay[key] = []
    eventsByDay[key].push(m)
  })

  const displayList = selectedDay
    ? (eventsByDay[selectedDay] ?? []).sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
    : upcoming

  // ── Calendar helpers ───────────────────────────────────────────────────────

  const calDays = getCalendarDays(calYear, calMonth)

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function calDayKey(day: number) {
    return `${calYear}-${pad2(calMonth+1)}-${pad2(day)}`
  }

  function isToday(day: number) {
    const t = new Date()
    return t.getFullYear() === calYear && t.getMonth() === calMonth && t.getDate() === day
  }

  // Week view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAnchor); d.setDate(d.getDate() + i); return d
  })
  function prevWeek() { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) }
  function nextWeek() { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) }

  // Day view
  function prevDay() { setDayAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDayAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  const officeHoursOk = isOfficeHours(form.date_time)

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openAdd(defaultDateTime?: string) {
    setEditing(null)
    setForm({ ...BLANK, date_time: defaultDateTime ?? '' })
    setShowModal(true)
  }

  function openEdit(m: Meeting) {
    setEditing(m)
    setForm({
      title:               m.title,
      meeting_type:        m.meeting_type,
      meeting_format:      m.meeting_format ?? 'frontal',
      date_time:           isoToLocal(m.date_time),
      location:            m.location ?? '',
      related_property_id: m.related_property_id ?? '',
      notes:               m.notes ?? '',
    })
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null) }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title.trim() || !form.date_time) return
    setSaving(true)

    const payload = {
      user_id:             userId,
      title:               form.title.trim(),
      meeting_type:        form.meeting_type,
      meeting_format:      form.meeting_format,
      date_time:           localToISO(form.date_time),
      location:            form.location.trim() || null,
      related_property_id: form.related_property_id || null,
      notes:               form.notes.trim() || null,
      updated_at:          new Date().toISOString(),
    }

    let saved: Meeting | null = null

    if (editing) {
      const { data } = await supabase.from('meetings').update(payload).eq('id', editing.id).select().single()
      if (data) {
        setMeetings(prev => prev.map(m => m.id === editing.id ? data as Meeting : m))
        saved = data as Meeting
      }
    } else {
      const { data } = await supabase.from('meetings').insert(payload).select().single()
      if (data) {
        setMeetings(prev => [...prev, data as Meeting])
        saved = data as Meeting
      }
    }

    setSaving(false)
    closeModal()

    // Auto-sync to Google Calendar
    if (gcalConnected && saved) {
      const action = editing ? 'update' : 'create'
      fetch('/api/meetings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: saved.id, action }),
      })
        .then(r => r.json())
        .then(result => {
          if (result.google_event_id) {
            setMeetings(prev => prev.map(m =>
              m.id === saved!.id ? { ...m, google_event_id: result.google_event_id } : m
            ))
          }
        })
        .catch(() => {})
    }

    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)

    if (gcalConnected && editing.google_event_id) {
      await fetch('/api/meetings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: editing.id, action: 'delete' }),
      }).catch(() => {})
    }

    await supabase.from('meetings').delete().eq('id', editing.id)
    setMeetings(prev => prev.filter(m => m.id !== editing.id))
    setSaving(false)
    closeModal()
    startTransition(() => router.refresh())
  }

  async function handleSync(meeting: Meeting) {
    setSyncingId(meeting.id)
    try {
      const action = meeting.google_event_id ? 'update' : 'create'
      const result = await fetch('/api/meetings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, action }),
      }).then(r => r.json())

      if (result.google_event_id) {
        setMeetings(prev => prev.map(m =>
          m.id === meeting.id ? { ...m, google_event_id: result.google_event_id } : m
        ))
      }
    } catch {}
    setSyncingId(null)
  }

  // ── Shared card renderer ───────────────────────────────────────────────────

  function renderCard(m: Meeting) {
    return (
      <MeetingCard
        key={m.id}
        meeting={m}
        typeLabel={(mt.types[m.meeting_type] as string) ?? m.meeting_type}
        onEdit={openEdit}
        lang={lang}
        inDays={mt.inDays}
        gcalConnected={gcalConnected}
        onSync={handleSync}
        syncing={syncingId === m.id}
      />
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 lg:p-10">

      {/* GCal connected toast */}
      {gcalMsg === 'connected' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400">
          <Cloud size={14} />
          {mt.gcal.connectedMsg}
          <button onClick={() => setGcalMsg(null)} className="ms-auto rounded p-0.5 hover:bg-emerald-400/10">
            <X size={12} />
          </button>
        </div>
      )}
      {gcalMsg === 'denied' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle size={14} />
          Google Calendar access was denied.
          <button onClick={() => setGcalMsg(null)} className="ms-auto rounded p-0.5 hover:bg-amber-400/10">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#445147]">{mt.section}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">{mt.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {gcalConnected ? (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-400">
              <Cloud size={13} />
              {mt.gcal.connected}
            </span>
          ) : (
            <a
              href="/api/auth/google-calendar"
              className="flex items-center gap-1.5 rounded-xl bg-[#2C3B38] px-3 py-2 text-xs font-semibold text-[#86968B] transition hover:bg-[#2C3B38]/70 hover:text-[#F0EDE8]"
            >
              <LinkIcon size={13} />
              {mt.gcal.connect}
            </a>
          )}
          <button
            onClick={() => openAdd()}
            className="flex items-center gap-2 rounded-xl bg-[#C8AA8F]/15 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F] transition hover:bg-[#C8AA8F]/25"
          >
            <Plus size={15} />
            {mt.addButton}
          </button>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div className="flex items-center gap-1 rounded-xl bg-[#172530] p-1 w-fit">
        {(['month', 'week', 'day'] as CalView[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              view === v
                ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                : 'text-[#86968B] hover:text-[#F0EDE8]'
            }`}
          >
            {mt.views[v]}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ MONTH VIEW */}
      {view === 'month' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Calendar (3/5) */}
          <div className="lg:col-span-3 rounded-2xl border border-[#2C3B38] bg-[#20302F] p-5">
            {/* Month nav */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm font-semibold text-[#F0EDE8]">{mt.months[calMonth]} {calYear}</h3>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {mt.weekDays.map(d => (
                <div key={d} className="py-1 text-xs font-semibold text-[#445147]">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="aspect-square" />
                const key        = calDayKey(day)
                const events     = eventsByDay[key] ?? []
                const todayDay   = isToday(day)
                const isSelected = selectedDay === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-xs transition hover:bg-[#2C3B38]
                      ${todayDay   ? 'font-bold text-[#C8AA8F]' : 'text-[#86968B]'}
                      ${isSelected ? 'bg-[#C8AA8F]/10 ring-1 ring-[#C8AA8F]/30' : ''}
                    `}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${todayDay ? 'bg-[#C8AA8F]/20' : ''}`}>
                      {day}
                    </span>
                    {events.length > 0 && (
                      <div className="mt-0.5 flex gap-0.5 flex-wrap justify-center">
                        {events.slice(0, 3).map((e, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other }} />
                        ))}
                        {events.length > 3 && <span className="text-[8px] text-[#445147]">+{events.length - 3}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend — new types first */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[#2C3B38] pt-3">
              {['strategy_frontal','strategy_zoom','deal_closing','monitoring','strategic_planning'].map(key => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-[#86968B]">
                  <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[key] }} />
                  {(mt.types[key] as string)}
                </span>
              ))}
            </div>
          </div>

          {/* This Week / selected day (2/5) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F0EDE8]">
                {selectedDay ?? mt.upcomingWeek}
              </h3>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="text-xs text-[#445147] hover:text-[#86968B] transition">
                  ×
                </button>
              )}
            </div>

            {(selectedDay ? displayList : thisWeek).length === 0 ? (
              <div className="rounded-xl border border-[#2C3B38] p-6 text-center">
                <CalendarDays size={28} className="mx-auto mb-2 text-[#2C3B38]" />
                <p className="text-sm text-[#445147]">{mt.noUpcoming}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedDay ? displayList : thisWeek).map(m => renderCard(m))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ WEEK VIEW */}
      {view === 'week' && (
        <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] overflow-auto">
          {/* Week nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3B38]">
            <button onClick={prevWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[#F0EDE8]">
              {weekDays[0].toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' })}
              {' – '}
              {weekDays[4].toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Column headers: time gutter + 5 days (Sun-Thu) */}
          <div className="flex border-b border-[#2C3B38]">
            <div className="w-14 shrink-0" />
            {weekDays.slice(0, 5).map((d, i) => {
              const isT = dayKey(d) === dayKey(new Date())
              return (
                <div key={i} className={`flex-1 py-2 text-center text-xs font-semibold border-s border-[#2C3B38] ${isT ? 'text-[#C8AA8F]' : 'text-[#86968B]'}`}>
                  <div>{mt.weekDays[d.getDay()]}</div>
                  <div className={`text-sm ${isT ? 'font-bold' : ''}`}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          {OFFICE_HOURS.map(hour => (
            <div key={hour} className="flex border-b border-[#2C3B38] min-h-[3rem]">
              <div className="w-14 shrink-0 py-3 text-center text-xs text-[#445147] border-e border-[#2C3B38]">
                {pad2(hour)}:00
              </div>
              {weekDays.slice(0, 5).map((d, i) => {
                const key    = dayKey(d)
                const events = (eventsByDay[key] ?? []).filter(m => new Date(m.date_time).getHours() === hour)
                const dtStr  = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(hour)}:00`
                return (
                  <div
                    key={i}
                    className="flex-1 border-s border-[#2C3B38] p-1 cursor-pointer hover:bg-[#2C3B38]/30 transition"
                    onClick={() => openAdd(dtStr)}
                  >
                    {events.map(e => (
                      <button
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                        className="w-full rounded text-left px-1.5 py-0.5 text-xs truncate mb-0.5 transition hover:opacity-80"
                        style={{
                          background: (TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other) + '22',
                          color:       TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other,
                        }}
                      >
                        {fmtTime(e.date_time, lang)} {e.title}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ DAY VIEW */}
      {view === 'day' && (
        <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] overflow-hidden">
          {/* Day nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3B38]">
            <button onClick={prevDay} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[#F0EDE8]">
              {dayAnchor.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
            <button onClick={nextDay} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86968B] transition hover:bg-[#2C3B38] hover:text-[#F0EDE8]">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Time slots */}
          <div className="divide-y divide-[#2C3B38]">
            {OFFICE_HOURS.map(hour => {
              const key    = dayKey(dayAnchor)
              const events = (eventsByDay[key] ?? []).filter(m => new Date(m.date_time).getHours() === hour)
              const dtStr  = `${dayAnchor.getFullYear()}-${pad2(dayAnchor.getMonth()+1)}-${pad2(dayAnchor.getDate())}T${pad2(hour)}:00`
              return (
                <div
                  key={hour}
                  className="flex gap-4 px-5 py-3 min-h-[3.5rem] cursor-pointer hover:bg-[#2C3B38]/30 transition"
                  onClick={() => openAdd(dtStr)}
                >
                  <div className="w-12 shrink-0 text-xs text-[#445147] pt-0.5">{pad2(hour)}:00</div>
                  <div className="flex-1 space-y-1.5" onClick={e => e.stopPropagation()}>
                    {events.map(e => (
                      <button
                        key={e.id}
                        onClick={() => openEdit(e)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:opacity-80"
                        style={{ background: (TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other) + '22' }}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other }} />
                        <span className="font-semibold" style={{ color: TYPE_COLORS[e.meeting_type] ?? TYPE_COLORS.other }}>
                          {fmtTime(e.date_time, lang)}
                        </span>
                        <span className="text-[#F0EDE8] truncate">{e.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All upcoming ── */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#445147]">{mt.allMeetings}</h2>
          <div className="space-y-2">{upcoming.map(m => renderCard(m))}</div>
        </section>
      )}

      {/* ── Past ── */}
      {pastMeetings.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#445147]">{mt.past}</h2>
          <div className="space-y-2">{pastMeetings.slice(0, 5).map(m => renderCard(m))}</div>
        </section>
      )}

      {/* ── Empty state ── */}
      {meetings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#2C3B38] py-16 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-[#2C3B38]" />
          <p className="text-base font-semibold text-[#445147]">{mt.emptyTitle}</p>
          <p className="mt-1 text-sm text-[#2C3B38]">{mt.emptyHint}</p>
          <button
            onClick={() => openAdd()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C8AA8F]/15 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F] transition hover:bg-[#C8AA8F]/25"
          >
            <Plus size={15} /> {mt.addButton}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#1A2B29] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {editing ? mt.form.editTitle : mt.form.addTitle}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-[#445147] hover:text-[#F0EDE8]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">

              {/* ── Format toggle (primary) ── */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#86968B]">{mt.form.format}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['zoom', 'frontal'] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, meeting_format: fmt }))}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                        form.meeting_format === fmt
                          ? fmt === 'zoom'
                            ? 'border-blue-400/40 bg-blue-400/10 text-blue-400'
                            : 'border-[#C8AA8F]/40 bg-[#C8AA8F]/10 text-[#C8AA8F]'
                          : 'border-[#2C3B38] text-[#445147] hover:border-[#445147] hover:text-[#86968B]'
                      }`}
                    >
                      {fmt === 'zoom' ? <Video size={14} /> : <Users size={14} />}
                      {mt.formats[fmt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.title}</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={mt.form.titlePh}
                  dir="auto"
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
                />
              </div>

              {/* Category + Date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.type}</label>
                  <select
                    value={form.meeting_type}
                    onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
                  >
                    {Object.entries(mt.types).map(([k, v]) => (
                      <option key={k} value={k}>{v as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.dateTime}</label>
                  <input
                    type="datetime-local"
                    value={form.date_time}
                    onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))}
                    className={`w-full rounded-lg border bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none ${
                      form.date_time && !officeHoursOk
                        ? 'border-amber-400/50'
                        : 'border-[#2C3B38] focus:border-[#C8AA8F]/50'
                    }`}
                  />
                </div>
              </div>

              {/* Office hours warning */}
              {form.date_time && !officeHoursOk && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-400">
                  <AlertTriangle size={12} />
                  {mt.officeHoursWarning}
                </div>
              )}

              {/* Location */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.location}</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={mt.form.locationPh}
                  dir="auto"
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
                />
              </div>

              {/* Linked property */}
              {properties.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.property}</label>
                  <select
                    value={form.related_property_id}
                    onChange={e => setForm(f => ({ ...f, related_property_id: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
                  >
                    <option value="">{mt.form.propertyNone}</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{mt.form.notes}</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={mt.form.notesPh}
                  dir="auto"
                  className="w-full resize-none rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              {editing && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-400/10"
                >
                  <Trash2 size={13} />
                  {mt.form.delete}
                </button>
              )}
              <div className="ms-auto flex gap-3">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-[#2C3B38] px-4 py-2 text-xs font-semibold text-[#86968B] transition hover:border-[#445147] hover:text-[#F0EDE8]"
                >
                  {mt.form.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.date_time}
                  className="rounded-lg bg-[#C8AA8F]/20 px-4 py-2 text-xs font-semibold text-[#C8AA8F] transition hover:bg-[#C8AA8F]/30 disabled:opacity-50"
                >
                  {saving ? mt.form.saving : mt.form.save}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
