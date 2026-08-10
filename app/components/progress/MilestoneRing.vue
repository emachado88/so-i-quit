<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ progress: number; size?: number; strokeWidth?: number }>(),
  { size: 74, strokeWidth: 7 },
)

const clamped = computed(() => Math.min(Math.max(props.progress, 0), 1))
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - clamped.value))
</script>

<template>
  <!-- Wireframe ring: track + primary bar, fill eased via a CSS
       stroke-dashoffset transition (no animation library). -->
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="-rotate-90 shrink-0"
    role="img"
    aria-label="milestone progress"
  >
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      :stroke-width="strokeWidth"
      class="stroke-card"
    />
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${circumference} ${circumference}`"
      :stroke-dashoffset="dashOffset"
      class="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
    />
  </svg>
</template>
