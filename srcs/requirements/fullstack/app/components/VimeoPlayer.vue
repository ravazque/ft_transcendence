<template>
  <!-- Single .vimeo-ratio wrapper. Children are absolutely positioned
       inside it via .vimeo-embed / .vimeo-placeholder rules, so they
       must NEVER be combined onto the same element as .vimeo-ratio —
       doing that made the player escape its container and float over
       the whole page. -->
  <div class="vimeo-ratio">
    <!-- Loading -->
    <div v-if="loading" class="vimeo-placeholder vimeo-loading">
      <div class="vimeo-spinner" />
    </div>

    <!-- Error / locked -->
    <div v-else-if="error" class="vimeo-placeholder vimeo-error">
      <div class="vimeo-placeholder-inner">
        <span class="vimeo-icon">!</span>
        <p>{{ errorMessage }}</p>
        <button v-if="!locked" @click="load">{{ vimeoTexts.retry }}</button>
      </div>
    </div>

    <!-- Vimeo embed -->
    <div v-else-if="embedHtml" v-html="embedHtml" class="vimeo-embed" />

    <!-- Legacy fallback: direct videoUrl (mp4) -->
    <video
      v-else-if="legacyVideoUrl"
      :src="legacyVideoUrl"
      class="vimeo-embed"
      controls
      playsinline
      preload="metadata"
    />

    <!-- No real video yet (placeholder URL filtered by the API, or no
         source prop). Render the empty <video> chrome so the lesson
         keeps the player aesthetic and layout — no media request is
         issued, so CSP stays clean. -->
    <video
      v-else
      class="vimeo-embed"
      controls
      playsinline
      preload="none"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'

// Two playback modes:
//   - videoId  -> editorial Vimeo proxy (/api/videos/:id/embed), no auth.
//   - classId  -> class-level gated playback (/api/classes/:id/embed).
//     The class endpoint enforces userHasModuleAccess and returns either
//     a Vimeo iframe or a legacy videoUrl.
//
// classId takes precedence when both are present.
const props = defineProps<{
  videoId?: string | number
  classId?: string | number
}>()

const embedHtml = ref<string | null>(null)
const legacyVideoUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref(false)
const locked = ref(false)
const errorMessage = ref('')

const hasSource = computed(() => Boolean(props.classId || props.videoId))

const vimeoTexts = {
  comingSoon: 'Vídeo próximamente',
  loadError: 'No se ha podido cargar el vídeo',
  lockedError: 'Compra este módulo para ver la clase',
  authError: 'Inicia sesión para ver esta clase',
  retry: 'Reintentar',
}

async function load() {
  embedHtml.value = null
  legacyVideoUrl.value = null
  error.value = false
  locked.value = false
  errorMessage.value = ''

  if (!hasSource.value) return

  loading.value = true
  try {
    if (props.classId) {
      const data = await $fetch<
        | { source: 'vimeo'; embed: string }
        | { source: 'legacy'; videoUrl: string }
        | { source: 'placeholder' }
      >(`/api/classes/${props.classId}/embed`, { credentials: 'include' })
      if (data.source === 'vimeo') {
        embedHtml.value = data.embed
      } else if (data.source === 'legacy') {
        legacyVideoUrl.value = data.videoUrl
      }
      // 'placeholder' source: leave embedHtml and legacyVideoUrl empty;
      // the template's <video v-else> branch renders the empty chrome.
    } else if (props.videoId) {
      const data = await $fetch<{ embed: string }>(
        `/api/videos/${props.videoId}/embed`,
      )
      embedHtml.value = data.embed
    }
  } catch (err) {
    error.value = true
    const status = (err as { statusCode?: number }).statusCode
    if (status === 401) {
      locked.value = true
      errorMessage.value = vimeoTexts.authError
    } else if (status === 403) {
      locked.value = true
      errorMessage.value = vimeoTexts.lockedError
    } else {
      errorMessage.value = vimeoTexts.loadError
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [props.videoId, props.classId], load)
</script>

<style scoped>
.vimeo-ratio {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
  /* No border-radius — the brutalist aesthetic uses hard corners,
     and the previous 8px radius let a tiny corner of the page
     background peek through under the <video> control bar. */
  border-radius: 0;
  background: #000;
}

/* Black is applied both on the embed container and on the direct
   <video>. Any 16:9 letterbox → real content (e.g. 4:3) or a browser
   "loading" frame ends up on black, not on the page background. */
.vimeo-embed,
.vimeo-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #000;
}

.vimeo-embed video,
.vimeo-embed iframe,
video.vimeo-embed {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}

.vimeo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vimeo-placeholder-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #a0a0b8;
  font-size: 14px;
  text-align: center;
}

.vimeo-icon {
  font-size: 36px;
}

.vimeo-error button {
  margin-top: 6px;
  padding: 6px 16px;
  border: 1px solid #a0a0b8;
  background: transparent;
  color: #a0a0b8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.vimeo-error button:hover {
  border-color: #fff;
  color: #fff;
}

.vimeo-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #a0a0b8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
