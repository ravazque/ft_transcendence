// Per-module user progress, persisted in localStorage.
//
// Intentionally simple model: per module we store a single `level`
// number (0..totalLevels) representing how far the user has
// advanced. The rule agreed with the team:
//
//   - level = 0 → no lesson done
//   - level = N → lessons 1..N are "completed" and the top bar
//                 shows N/total. Visually, diamonds 1..N are
//                 marked; diamond N+1 is the "next" one.
//
//   - Mark diamond N    → setLevel(slug, N). Also marks 1..N-1.
//   - Unmark diamond N  → setLevel(slug, N-1). Unmarks N, N+1..
//   - Visit lesson N    → setLevel(slug, N). If the user navigates
//                          backwards, progress goes down too.
//
// No backend sync required for the client. If cross-device sync is
// needed later, it's enough to write this same number to a
// `ModuleProgress` (userId, moduleSlug, level) table.

interface ModuleProgress {
  level: number       // 0..totalLevels (how many lessons are complete)
  totalLevels: number
  updatedAt: number
}

type ProgressMap = Record<string, ModuleProgress>

const STORAGE_KEY = 'yoga.module-progress.v2'

function safeLoad(): ProgressMap {
  if (import.meta.server) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressMap
  } catch {
    return {}
  }
}

function safeSave(map: ProgressMap) {
  if (import.meta.server) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch { /* noop */ }
}

export function useModuleProgress() {
  const state = useState<ProgressMap>('yoga.module-progress', () => ({}))
  const version = useState<number>('yoga.module-progress.v', () => 0)

  // Initial client-side load from localStorage.
  onMounted(() => {
    if (Object.keys(state.value).length === 0) {
      state.value = safeLoad()
    }
  })

  function persist() {
    version.value++
    safeSave(state.value)
  }

  function getProgress(slug: string): ModuleProgress | null {
    void version.value
    return state.value[slug] ?? null
  }

  function ensure(slug: string, totalLevels: number): ModuleProgress {
    const existing = state.value[slug]
    if (existing) {
      if (totalLevels && existing.totalLevels !== totalLevels) {
        existing.totalLevels = totalLevels
        // Catalogue changed and `level` is now > total — cap it.
        if (existing.level > totalLevels) existing.level = totalLevels
        persist()
      }
      return existing
    }
    const created: ModuleProgress = {
      level: 0,
      totalLevels,
      updatedAt: Date.now(),
    }
    state.value[slug] = created
    persist()
    return created
  }

  // Sets the module progress to level `n` exactly. Keeps the
  // invariant completed = [1..n]: marking 5 implies 1..4 are done
  // as well; unmarking 3 implies 4 and 5 are no longer done.
  function setLevel(slug: string, n: number, totalLevels: number) {
    const p = ensure(slug, totalLevels)
    p.level = Math.max(0, Math.min(n, p.totalLevels))
    p.updatedAt = Date.now()
    persist()
  }

  // Toggle for a specific diamond. If it was at N or above, drop to
  // N-1 (unmark N). If it was below, raise to N (mark up to N).
  function toggleLevel(slug: string, n: number, totalLevels: number) {
    const p = ensure(slug, totalLevels)
    if (p.level >= n) setLevel(slug, n - 1, totalLevels)
    else setLevel(slug, n, totalLevels)
  }

  function isCompleted(slug: string, level: number): boolean {
    const p = getProgress(slug)
    return !!p && p.level >= level
  }

  function percentFor(slug: string): number {
    const p = state.value[slug]
    if (!p || p.totalLevels === 0) return 0
    return Math.round((p.level / p.totalLevels) * 100)
  }

  return {
    state: readonly(state),
    getProgress,
    ensure,
    setLevel,
    toggleLevel,
    isCompleted,
    percentFor,
  }
}
