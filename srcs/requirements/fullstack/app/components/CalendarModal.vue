<script setup lang="ts">
// Calendar shared between "live classes" and "in-person classes" on
// the landing. Uses concrete dates (not recurrence) so the team can
// edit each week independently.
//
// Navigation:
//   - « previous / next » buttons  (week offset -1 / 0 / +1)
//   - "Today" jumps back to the current week.
//
// Editing (admin / editor):
//   - "Add" button on the day cell (only offset 0 and +1).
//   - Click on an event → inline form (edit / delete). Only offset 0 and +1.
//   - Past and far-future weeks are read-only.

interface CalendarEvent {
  id: number
  date: string                // ISO date "YYYY-MM-DD"
  startTime: string           // "HH:MM"
  endTime: string             // "HH:MM"
  title: string
  kind: 'live' | 'in_person'
  location: string | null
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useTags()
const { user } = useAuth()
const canEdit = computed(() => user.value?.role === 'admin' || user.value?.role === 'editor')

const weekOffset = ref(0) // -1 = past · 0 = current · +1 = next
const canEditThisWeek = computed(() => canEdit.value && weekOffset.value >= 0 && weekOffset.value <= 1)

const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)

// Week computation.

function mondayOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = out.getDay()
  const offset = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + offset)
  return out
}

const baseMonday = computed(() => {
  const m = mondayOfWeek(new Date())
  m.setDate(m.getDate() + weekOffset.value * 7)
  return m
})

const weekDays = computed(() => {
  const start = baseMonday.value
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
})

function ymd(d: Date): string {
  // YYYY-MM-DD format in local time (not UTC) — the back end stores
  // civil dates, not instants in time.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadEvents() {
  loading.value = true
  errorMsg.value = null
  try {
    const from = ymd(weekDays.value[0]!)
    const to = ymd(weekDays.value[6]!)
    const data = await $fetch<{ items: CalendarEvent[] }>('/api/calendar', {
      credentials: 'include',
      query: { from, to },
    })
    events.value = data.items.map((e) => ({ ...e, date: ymd(new Date(e.date)) }))
  } catch (err) {
    console.error('[calendar] load failed', err)
    errorMsg.value = t('CAL_LOAD_ERROR', 'Could not load the schedule.')
    events.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) loadEvents()
  },
  { immediate: true },
)
watch(weekOffset, () => {
  if (props.open) loadEvents()
})

// Day labels.
const dayNameTags = ['CAL_DAY_MON', 'CAL_DAY_TUE', 'CAL_DAY_WED', 'CAL_DAY_THU', 'CAL_DAY_FRI', 'CAL_DAY_SAT', 'CAL_DAY_SUN']
const dayNameFallbacks = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function dayLabel(index: number): string {
  return t(dayNameTags[index]!, dayNameFallbacks[index]!)
}

function eventsForDay(date: Date): CalendarEvent[] {
  const key = ymd(date)
  return events.value.filter((e) => e.date === key)
}

function eventKindClass(kind: CalendarEvent['kind']): string {
  return kind === 'live'
    ? 'bg-brand-teal/15 border-l-4 border-brand-teal text-brand-black'
    : 'bg-brand-mustard/15 border-l-4 border-brand-mustard text-brand-black'
}
function eventKindLabel(kind: CalendarEvent['kind']): string {
  return kind === 'live'
    ? t('CAL_KIND_LIVE_TXT', 'Live')
    : t('CAL_KIND_IN_PERSON_TXT', 'In person')
}

const weekRangeLabel = computed(() => {
  const start = weekDays.value[0]!
  const end = weekDays.value[6]!
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
})
const dateLineFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
function dateLine(d: Date): string {
  return dateLineFmt.format(d)
}
function isToday(d: Date): boolean {
  return d.toDateString() === new Date().toDateString()
}

// Inline editor.

const editorOpen = ref(false)
const editorSubmitting = ref(false)
const editorError = ref<string | null>(null)
type EditorMode = 'create' | 'edit'
const editorMode = ref<EditorMode>('create')
const editorForm = reactive<{
  id: number | null
  date: string
  startTime: string
  endTime: string
  title: string
  kind: CalendarEvent['kind']
  location: string
}>({ id: null, date: '', startTime: '09:00', endTime: '10:00', title: '', kind: 'live', location: '' })

function openCreate(date: Date) {
  if (!canEditThisWeek.value) return
  editorMode.value = 'create'
  editorForm.id = null
  editorForm.date = ymd(date)
  editorForm.startTime = '09:00'
  editorForm.endTime = '10:00'
  editorForm.title = ''
  editorForm.kind = 'live'
  editorForm.location = ''
  editorError.value = null
  editorOpen.value = true
}
function openEdit(ev: CalendarEvent) {
  if (!canEditThisWeek.value) return
  editorMode.value = 'edit'
  editorForm.id = ev.id
  editorForm.date = ev.date
  editorForm.startTime = ev.startTime
  editorForm.endTime = ev.endTime
  editorForm.title = ev.title
  editorForm.kind = ev.kind
  editorForm.location = ev.location ?? ''
  editorError.value = null
  editorOpen.value = true
}
async function onSubmitEditor() {
  if (!editorForm.title.trim()) {
    editorError.value = t('CAL_ERR_TITLE_REQUIRED', 'Title is required.')
    return
  }
  if (editorForm.startTime >= editorForm.endTime) {
    editorError.value = t('CAL_ERR_TIME_RANGE', 'End time must be after start time.')
    return
  }
  editorSubmitting.value = true
  editorError.value = null
  try {
    const payload = {
      date: editorForm.date,
      startTime: editorForm.startTime,
      endTime: editorForm.endTime,
      title: editorForm.title.trim(),
      kind: editorForm.kind,
      location: editorForm.location.trim() || null,
    }
    if (editorMode.value === 'create') {
      await $fetch('/api/calendar', { method: 'POST', credentials: 'include', body: payload })
    } else if (editorForm.id) {
      await $fetch(`/api/calendar/${editorForm.id}`, { method: 'PATCH', credentials: 'include', body: payload })
    }
    editorOpen.value = false
    await loadEvents()
  } catch (err) {
    editorError.value = (err as { statusMessage?: string; data?: { statusMessage?: string } }).statusMessage
      || (err as { data?: { statusMessage?: string } }).data?.statusMessage
      || t('CAL_ERR_GENERIC', 'Could not save the event.')
  } finally {
    editorSubmitting.value = false
  }
}
async function onDeleteEvent() {
  if (editorMode.value !== 'edit' || !editorForm.id) return
  if (!confirm(t('CAL_DELETE_CONFIRM', 'Delete this event?'))) return
  editorSubmitting.value = true
  try {
    await $fetch(`/api/calendar/${editorForm.id}`, { method: 'DELETE', credentials: 'include' })
    editorOpen.value = false
    await loadEvents()
  } catch (err) {
    editorError.value = (err as { statusMessage?: string; data?: { statusMessage?: string } }).statusMessage
      || (err as { data?: { statusMessage?: string } }).data?.statusMessage
      || t('CAL_ERR_GENERIC', 'Could not delete the event.')
  } finally {
    editorSubmitting.value = false
  }
}

// Navigation.
function goPrev() { weekOffset.value = Math.max(-1, weekOffset.value - 1) }
function goNext() { weekOffset.value = Math.min(1, weekOffset.value + 1) }
function goToday() { weekOffset.value = 0 }
const canGoPrev = computed(() => weekOffset.value > -1)
const canGoNext = computed(() => weekOffset.value < 1)

// Modal frame color depending on which week we are looking at: the
// team asked for clear visual feedback distinguishing prev / today /
// next.
const frameClass = computed(() => {
  if (weekOffset.value === -1) return 'ring-4 ring-brand-grey-light ring-offset-0'
  if (weekOffset.value === 1) return 'ring-4 ring-brand-teal/40 ring-offset-0'
  return 'ring-4 ring-brand-orange/40 ring-offset-0'
})
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-5xl rounded-none border-none p-0 overflow-hidden' }"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #content>
      <div class="bg-brand-white p-6 lg:p-10 flex flex-col gap-6 transition-shadow" :class="frameClass">
        <header class="flex flex-col gap-3">
          <h2 class="text-4xl lg:text-5xl font-serif text-brand-black">
            {{ t('CAL_MODAL_TITLE', 'Weekly schedule') }}
          </h2>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-brand-grey-dark">
              {{ t('CAL_MODAL_SUBTITLE', 'Live and in-person classes.') }}
              <span class="font-semibold text-brand-black">{{ weekRangeLabel }}</span>
            </p>
            <div class="flex items-center gap-2">
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-chevron-left"
                :disabled="!canGoPrev"
                :aria-label="t('CAL_NAV_PREV', 'Previous week')"
                @click="goPrev"
              />
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                :label="t('CAL_NAV_TODAY', 'Today')"
                @click="goToday"
              />
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                trailing-icon="i-lucide-chevron-right"
                :disabled="!canGoNext"
                :aria-label="t('CAL_NAV_NEXT', 'Next week')"
                @click="goNext"
              />
            </div>
          </div>
          <p v-if="canEdit && !canEditThisWeek" class="text-xs text-brand-grey-dark italic">
            {{ t('CAL_READ_ONLY_TXT', 'Read-only: you can only edit this week or the next.') }}
          </p>
        </header>

        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        <div v-if="loading" class="text-brand-grey-dark text-center py-12">
          {{ t('CAL_LOADING_TXT', 'Loading schedule…') }}
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-7 gap-2 lg:gap-3">
          <div
            v-for="(d, i) in weekDays"
            :key="i"
            class="flex flex-col border border-brand-grey-light min-h-40"
            :class="isToday(d) ? 'shadow-[0.25rem_0.25rem_0_0_var(--color-brand-teal)] border-brand-teal' : ''"
          >
            <div
              class="px-2 py-2 border-b border-brand-grey-light text-xs uppercase tracking-widest font-bold flex items-start justify-between gap-1"
              :class="isToday(d) ? 'bg-brand-teal text-brand-white' : 'bg-brand-cream text-brand-grey-dark'"
            >
              <div>
                <div>{{ dayLabel(i) }}</div>
                <div class="text-[0.65rem] normal-case tracking-normal font-normal opacity-80">
                  {{ dateLine(d) }}
                </div>
              </div>
              <button
                v-if="canEditThisWeek"
                type="button"
                :title="t('CAL_ADD_EVENT_TXT', 'Add event')"
                :aria-label="t('CAL_ADD_EVENT_TXT', 'Add event')"
                class="leading-none p-1 hover:bg-brand-orange/20 text-brand-orange rounded-sm"
                @click="openCreate(d)"
              >
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex-1 flex flex-col gap-1 p-2">
              <template v-if="eventsForDay(d).length">
                <button
                  v-for="ev in eventsForDay(d)"
                  :key="ev.id"
                  type="button"
                  class="text-left px-2 py-1.5 text-xs transition-colors"
                  :class="[eventKindClass(ev.kind), canEditThisWeek ? 'cursor-pointer hover:brightness-95' : 'cursor-default']"
                  :disabled="!canEditThisWeek"
                  @click="openEdit(ev)"
                >
                  <div class="font-mono text-[0.7rem] font-bold tracking-tight">
                    {{ ev.startTime }} – {{ ev.endTime }}
                  </div>
                  <div class="font-semibold leading-snug">{{ ev.title }}</div>
                  <div class="text-[0.65rem] opacity-75 mt-0.5">
                    <span class="uppercase tracking-widest font-bold">{{ eventKindLabel(ev.kind) }}</span>
                    <span v-if="ev.location"> · {{ ev.location }}</span>
                  </div>
                </button>
              </template>
              <p v-else class="text-[0.7rem] text-brand-grey-light italic">
                {{ t('CAL_DAY_EMPTY_TXT', '—') }}
              </p>
            </div>
          </div>
        </div>

        <footer class="flex justify-end pt-2">
          <UButton
            :label="t('COMMON_CLOSE', 'Close')"
            variant="outline"
            color="neutral"
            class="justify-center"
            @click="emit('update:open', false)"
          />
        </footer>
      </div>
    </template>
  </UModal>

  <!-- Event editor -->
  <UModal
    v-model:open="editorOpen"
    :ui="{ content: 'sm:max-w-md rounded-none border-none p-0 overflow-hidden' }"
  >
    <template #content>
      <div class="bg-brand-white p-8 flex flex-col gap-5">
        <h3 class="text-3xl font-serif text-brand-black">
          {{ editorMode === 'create'
            ? t('CAL_EDITOR_CREATE_TITLE', 'New event')
            : t('CAL_EDITOR_EDIT_TITLE', 'Edit event') }}
        </h3>
        <form class="space-y-4" @submit.prevent="onSubmitEditor">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_TITLE', 'Title') }}</label>
            <UInput v-model="editorForm.title" required :ui="{ base: 'rounded-none' }" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_DATE', 'Date') }}</label>
              <UInput v-model="editorForm.date" type="date" required :ui="{ base: 'rounded-none' }" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_KIND', 'Type') }}</label>
              <USelect
                v-model="editorForm.kind"
                :items="[
                  { label: t('CAL_KIND_LIVE_TXT', 'Live'), value: 'live' },
                  { label: t('CAL_KIND_IN_PERSON_TXT', 'In person'), value: 'in_person' },
                ]"
                :ui="{ base: 'rounded-none' }"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_START', 'Starts') }}</label>
              <UInput v-model="editorForm.startTime" type="time" required :ui="{ base: 'rounded-none' }" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_END', 'Ends') }}</label>
              <UInput v-model="editorForm.endTime" type="time" required :ui="{ base: 'rounded-none' }" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('CAL_FIELD_LOCATION', 'Location') }}</label>
            <UInput
              v-model="editorForm.location"
              :placeholder="t('CAL_FIELD_LOCATION_PH', 'Optional')"
              :ui="{ base: 'rounded-none' }"
            />
          </div>
          <p v-if="editorError" class="text-sm text-red-600">{{ editorError }}</p>
          <div class="flex gap-3 pt-2">
            <UButton
              v-if="editorMode === 'edit'"
              type="button"
              :label="t('COMMON_DELETE', 'Delete')"
              color="error"
              variant="outline"
              :loading="editorSubmitting"
              class="justify-center"
              @click="onDeleteEvent"
            />
            <div class="flex-1"></div>
            <UButton
              type="button"
              :label="t('COMMON_CANCEL', 'Cancel')"
              color="neutral"
              variant="outline"
              class="justify-center"
              @click="editorOpen = false"
            />
            <UButton
              type="submit"
              :label="t('COMMON_SAVE', 'Save')"
              color="primary"
              :loading="editorSubmitting"
              class="justify-center"
            />
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
