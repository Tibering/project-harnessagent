import axios, { AxiosError } from 'axios'

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

export const http = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const envelope = error.response?.data
    const message = envelope?.message ?? error.message ?? '请求失败'
    return Promise.reject(new ApiError(message, envelope?.code, error.response?.status))
  },
)

export async function getJson<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await http.get<ApiEnvelope<T>>(url, { params })
  return data.data
}
