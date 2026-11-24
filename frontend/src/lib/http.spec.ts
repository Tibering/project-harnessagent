import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import { resolveErrorMessage, type ApiEnvelope } from './http'

function fakeError(status?: number, data?: unknown): AxiosError<ApiEnvelope<unknown>> {
  return {
    response: status === undefined ? undefined : { status, data },
  } as AxiosError<ApiEnvelope<unknown>>
}

describe('resolveErrorMessage', () => {
  it('优先使用后端返回的 message', () => {
    const error = fakeError(400, { code: 40001, message: '用户名 长度需在 3-32 之间' })

    expect(resolveErrorMessage(error)).toBe('用户名 长度需在 3-32 之间')
  })

  it('连不上后端时给出可操作的提示', () => {
    expect(resolveErrorMessage(fakeError())).toBe('无法连接后端服务，请确认后端已启动')
  })

  it('网关错误不把状态码抛给用户', () => {
    expect(resolveErrorMessage(fakeError(502, '<html>Bad Gateway</html>')))
      .toBe('后端服务暂不可用，请稍后重试')
  })

  it('其余失败回落到带状态码的提示', () => {
    expect(resolveErrorMessage(fakeError(404, ''))).toBe('请求失败（HTTP 404）')
  })
})
