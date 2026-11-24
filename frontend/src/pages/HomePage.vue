<script setup lang="ts">
import { useNavStore } from '@/stores/nav'

const nav = useNavStore()
</script>

<template>
  <component
    :is="nav.activeItem.component"
    :key="nav.activeItem.key"
  />
</template>
