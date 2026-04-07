<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
    <header class="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <nav class="max-w-7xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-semibold">ft_transcendence</NuxtLink>
        <div class="flex items-center gap-4">
          <UButton
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="toggleDark"
          />
        </div>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 px-6 py-4 text-center text-sm text-gray-500">
    </footer>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleDark() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
