<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{ progress: number; size?: number; strokeWidth?: number }>(),
  { size: 74, strokeWidth: 7 },
);

const clamped = computed(() => Math.min(Math.max(props.progress, 0), 1));
const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(() => circumference.value * (1 - clamped.value));

/**
 * Offset actually painted on the bar. Every fill change (mount included) is
 * driven by the Web Animations API from the currently rendered offset to the
 * new target, so the ring always grows from its current state — no full-ring
 * flash. CSS transitions on SVG presentation attributes are unreliable here:
 * Chromium starts them from the default 0 on insert ("shrink from 100%"),
 * and they can be swallowed when the attribute lands before the first paint.
 */
const renderedOffset = ref(circumference.value);
const barRef = ref<SVGCircleElement | null>(null);
let primed = false;

/** Cancel any in-flight fill and animate from the current offset to `to`. */
const animateTo = (to: number): void => {
  const el = barRef.value;
  if (!el) return;
  // Snapshot the visual position before cancelling: the computed style
  // reflects an in-flight animation, while the attribute only holds the end
  // value (reading it after cancel would snap back to the previous target).
  const current = parseFloat(getComputedStyle(el).strokeDashoffset);
  const from = Number.isFinite(current) ? current : renderedOffset.value;
  if (typeof el.getAnimations === "function") {
    for (const animation of el.getAnimations()) animation.cancel();
  }
  if (typeof el.animate === "function") {
    el.animate(
      [{ strokeDashoffset: `${from}` }, { strokeDashoffset: `${to}` }],
      { duration: 1000, easing: "ease-out" },
    );
  }
  renderedOffset.value = to;
};

onMounted(() => {
  // Prime on the first frame. If the page's milestone data hasn't landed
  // yet, the target equals the empty ring — a visible no-op that the data
  // arrival (below) replaces with the real fill.
  requestAnimationFrame(() => {
    primed = true;
    animateTo(dashOffset.value);
  });
});

watch(dashOffset, (value) => {
  if (primed) animateTo(value);
});
</script>

<template>
  <!-- Wireframe ring: track + primary bar, fill eased via a CSS
       stroke-dashoffset transition (no animation library). Mounts empty
       and animates up to the current progress (see renderedOffset). -->
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
      ref="barRef"
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="`${circumference} ${circumference}`"
      :stroke-dashoffset="renderedOffset"
      class="stroke-primary-hover transition-[stroke-dashoffset] duration-1000 ease-out"
    />
  </svg>
</template>
