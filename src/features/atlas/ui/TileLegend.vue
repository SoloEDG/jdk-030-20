<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ echo: boolean }>();

const base = [
  { name: "墙", swatch: "#3a2a1c" },
  { name: "地板", swatch: "#4a3b2a" },
  { name: "目标", swatch: "#7d9b6a" },
  { name: "缺口", swatch: "#0b0907" },
  { name: "门闩", swatch: "#c9a36a" },
  { name: "架桥", swatch: "#6a5638" },
];

const echo = [
  { name: "竖封板", swatch: "#8a93a0" },
  { name: "翻相板", swatch: "#b56a32" },
  { name: "贴条板", swatch: "#e8d7b8" },
  { name: "听音位", swatch: "#c9a36a" },
];

const items = computed(() => (props.echo ? [...base.slice(0, 5), ...echo] : base));
</script>

<template>
  <section class="panel legend" aria-label="图块图例">
    <h2>图块</h2>
    <ul>
      <li v-for="item in items" :key="item.name">
        <span class="swatch" :style="{ background: item.swatch }" />
        {{ item.name }}
      </li>
    </ul>
  </section>
</template>
