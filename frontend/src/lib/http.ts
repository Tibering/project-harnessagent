import axios, { AxiosError } from 'axios'
import { clearIdentity, loadIdentity } from '@/lib/identity'

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  traceId?: string
}

export class ApiError extends Error {
  readonly code?: number
  readonly status?: number

  constructor(message: string, code?: number, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** 后端身份失效的错误码，见 backend ErrorCode。 */
const SESSION_INVALID_CODES = new Set([40101, 40102])

/** 把网络层与网关错误翻成用户能看懂的话，优先用后端返回的 message。 */
export function resolveErrorMessage(error: AxiosError<ApiEnvelope<unknown>>): string {
  const envelope = error.response?.data
  if (typeof envelope?.message === 'string' && envelope.message.length > 0) {
    return envelope.message
  }
  if (!error.response) {
    return '无法连接后端服务，请确认后端已启动'
  }

  const status = error.response.status
  if (status === 502 || status === 503 || status === 504) {
    return '后端服务暂不可用，请稍后重试'
  }
  if (status >= 500) {
    return '服务端异常，请稍后重试'
  }
  return `请求失败（HTTP ${status}）`
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  withCredentials: true,
})

http.interceptors.request.use((config) => {
  const identity = loadIdentity()
  if (identity) {
    config.headers.set('X-User-Id', identity.userId)
    config.headers.set('X-Session-Id', identity.sessionId)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const envelope = error.response?.data
    const message = resolveErrorMessage(error)

    if (envelope && SESSION_INVALID_CODES.has(envelope.code)) {
      clearIdentity()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(new ApiError(message, envelope?.code, error.response?.status))
  },
)
