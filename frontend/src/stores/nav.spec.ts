import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNavStore } from './nav'
import { DEFAULT_MENU_KEY, MENU_ITEMS } from '@/config/menu'

describe('nav store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认选中第一个菜单项', () => {
    const nav = useNavStore()

    expect(nav.activeKey).toBe(DEFAULT_MENU_KEY)
    expect(nav.activeItem.key).toBe(MENU_ITEMS[0].key)
  })

  it('切换菜单项后返回对应的组件', () => {
    const nav = useNavStore()
    const docsItem = MENU_ITEMS.find((item) => item.key === 'docs')

    nav.select('docs')

    expect(nav.activeItem.key).toBe('docs')
    expect(nav.activeItem.component).toBe(docsItem?.component)
  })

  it('忽略不存在的菜单项', () => {
    const nav = useNavStore()

    nav.select('missing')

    expect(nav.activeKey).toBe(DEFAULT_MENU_KEY)
  })
})
