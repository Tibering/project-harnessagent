import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_MENU_KEY, MENU_ITEMS } from '@/config/menu'

export const useNavStore = defineStore('nav', () => {
  const activeKey = ref(DEFAULT_MENU_KEY)

  const activeItem = computed(
    () => MENU_ITEMS.find((item) => item.key === activeKey.value) ?? MENU_ITEMS[0],
  )

  function select(key: string): void {
    if (MENU_ITEMS.some((item) => item.key === key)) {
      activeKey.value = key
    }
  }

  return { activeKey, activeItem, select }
})
