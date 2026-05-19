<script setup lang="ts">
const { footerLinks, socialLinks } = useFooterLinks()
</script>

<template>
  <footer class="bg-brand-yellow pt-16 pb-12 px-6 lg:px-[112px] relative overflow-hidden flex flex-col w-full">
    <!-- Contenedor Principal con Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-y-12 md:gap-y-16 gap-x-8 relative z-10 w-full">
      
      <!-- Bloques por orden: 0 → Documentos, 1 → Home -->
      <div v-for="column in footerLinks" :key="column.label" class="flex flex-col">
        <h4 class="text-sm font-semibold text-brand-black mb-6 uppercase tracking-widest">
          {{ column.label }}
        </h4>
        <ul class="space-y-4">
          <li v-for="link in column.children" :key="link.label">
            <NuxtLink
              :to="link.to"
              class="text-sm text-brand-grey-dark hover:text-brand-orange transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Bloque RRSS -->
      <div class="flex flex-col justify-end">
        <div class="flex gap-4">
          <NuxtLink
            v-for="social in socialLinks"
            :key="social.label"
            :to="social.to"
            :target="social.target"
            class="text-brand-black hover:text-brand-orange transition-colors"
            :aria-label="social.label"
          >
            <UIcon :name="social.icon" class="w-6 h-6" />
          </NuxtLink>
        </div>
      </div>

      <!-- Bloque Copyright -->
      <div class="flex flex-col justify-end">
        <p class="text-sm text-brand-grey-dark">
          Copyright © {{ new Date().getFullYear() }} Marco Yoga
        </p>
      </div>
    </div>

    <!-- Isotype / Graphic (outside the grid but inside the footer for proper clipping) -->
    <div class="absolute bottom-0 right-0 pointer-events-none select-none opacity-20 md:opacity-40 transform translate-x-[10%] translate-y-[15%]">
      <img
        src="/isotype.svg"
        alt=""
        class="w-[20rem] md:w-[31.25rem] h-auto object-contain mix-blend-multiply"
      />
    </div>
  </footer>
</template>

<style scoped>
footer {
  background-color: var(--color-brand-yellow);
}
</style>
