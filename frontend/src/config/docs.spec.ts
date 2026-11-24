import { describe, expect, it } from 'vitest'
import { MENU_ITEMS } from '@/config/menu'
import { COMPONENT_DOCS } from '@/config/docs'

describe('component docs', () => {
  it('每条文档都对应一个存在的菜单项', () => {
    const menuKeys = new Set(MENU_ITEMS.map((item) => item.key))

    for (const doc of COMPONENT_DOCS) {
      expect(menuKeys.has(doc.key), `菜单里没有 ${doc.key}`).toBe(true)
    }
  })

  it('除文档自身外，每个菜单项都有说明', () => {
    const documented = new Set(COMPONENT_DOCS.map((doc) => doc.key))
    const missing = MENU_ITEMS
      .filter((item) => item.key !== 'docs')
      .filter((item) => !documented.has(item.key))
      .map((item) => item.key)

    expect(missing).toEqual([])
  })

  it('文档条目不自重复', () => {
    const keys = COMPONENT_DOCS.map((doc) => doc.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})
