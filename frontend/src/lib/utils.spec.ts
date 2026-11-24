import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('合并冲突的 tailwind 类', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('保留非冲突类并忽略假值', () => {
    expect(cn('text-sm', false, undefined, 'font-bold')).toBe('text-sm font-bold')
  })
})
