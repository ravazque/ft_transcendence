// Helpers for the calendar's "editable window".
//
// Policy: the team can only create/edit/delete events inside the
// current week or the next one. Earlier weeks are immutable
// (historical) and later weeks are handled when their turn comes.

// Returns Monday 00:00 (UTC) of the week of the given Date.
export function mondayOfWeek(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = out.getUTCDay() // 0=Sun … 6=Sat
  const offset = day === 0 ? -6 : 1 - day
  out.setUTCDate(out.getUTCDate() + offset)
  return out
}

// Start (Monday 00:00) and end (following Sunday 23:59:59) of the
// editable window: two weeks — current and next.
export function editableWindow(now: Date = new Date()): { start: Date; end: Date } {
  const start = mondayOfWeek(now)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 14) // Monday +14 days = Monday of week 3
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1) // 1ms earlier → Sunday 23:59:59.999
  return { start, end }
}

export function isWithinEditableWindow(date: Date, now: Date = new Date()): boolean {
  const { start, end } = editableWindow(now)
  return date >= start && date <= end
}
