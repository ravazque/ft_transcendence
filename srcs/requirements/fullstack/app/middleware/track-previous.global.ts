// Keeps a short history of visited routes so pages can offer a
// smart "back" button. The heuristic used in module_detail needs to
// ignore /lesson hops and other /module_detail entries (the case
// where you enter a regular module from the "Full Access" bundle
// index), so we store the whole stack and let the consumer filter.
//
// FIFO list capped at `HISTORY_LIMIT` — more than enough for the
// typical case (profile → modules → module_detail → lesson → lesson
// → module_detail back). If it grows we drop the oldest entries.

const HISTORY_LIMIT = 12

export default defineNuxtRouteMiddleware((to, from) => {
  const history = useState<string[]>('nav.history', () => [])
  // Compat: some views still read `nav.previous` (the immediate one).
  const previous = useState<string | null>('nav.previous', () => null)

  if (!from?.fullPath || from.fullPath === to.fullPath) return

  previous.value = from.fullPath
  const next = [...history.value, from.fullPath]
  while (next.length > HISTORY_LIMIT) next.shift()
  history.value = next
})
