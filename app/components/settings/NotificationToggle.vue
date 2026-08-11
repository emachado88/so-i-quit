<script setup lang="ts">
defineProps<{ enabled: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="enabled"
    class="h-7 w-12 shrink-0 rounded-full transition-colors"
    :class="enabled ? 'bg-primary' : 'bg-border'"
    @click="emit('toggle')"
  >
    <span
      class="block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform"
      :class="enabled ? 'translate-x-[23px]' : 'translate-x-[3px]'"
    />
  </button>
</template>
