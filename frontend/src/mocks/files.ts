export type FileStatus = 'pending' | 'chunking' | 'chunked' | 'embedding' | 'ready' | 'failed'
export type FileType = 'txt' | 'md' | 'pdf' | 'docx'

export interface FileChunk {
  id: string
  index: number
  tokens: number
  text: string
  vectorized: boolean
}

export interface FileItem {
  id: string
  name: string
  type: FileType
  sizeBytes: number
  uploader: string
  status: FileStatus
  /** 被多少个知识库引用。知识库模块接入前为 mock 值。 */
  references: number
  referencedBy: string[]
  chunkCount: number
  createdAt: string
  /** 最后一次状态变更的操作人与时间（上传、分片、RAG、重试）。 */
  lastOperator: string
  lastOperatedAt: string
  /** 软删时间；为空表示有效。 */
  deletedAt?: string
  failureReason?: string
  chunks: FileChunk[]
  /** 分片任务已尝试次数（原型用于演示重试）。 */
  attempts?: number
  /** 前 N 次分片必定失败，用于演示失败与重试。 */
  failUntilAttempt?: number
}

export const ACCEPTED_TYPES: FileType[] = ['txt', 'md', 'pdf', 'docx']
export const MAX_FILE_BYTES = 20 * 1024 * 1024

export const STATUS_META: Record<
  FileStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  pending: { label: '未处理', tone: 'neutral' },
  chunking: { label: '分片中', tone: 'warning' },
  chunked: { label: '已分片', tone: 'info' },
  embedding: { label: '向量化中', tone: 'warning' },
  ready: { label: '已就绪', tone: 'success' },
  failed: { label: '失败', tone: 'danger' },
}

function chunksOf(prefix: string, count: number, texts: string[], vectorized = true): FileChunk[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-c${i + 1}`,
    index: i + 1,
    tokens: 120 + i * 37,
    text: texts[i % texts.length],
    vectorized,
  }))
}

export const MOCK_FILES: FileItem[] = [
  {
    id: 'f-1001',
    name: '产品需求说明.md',
    type: 'md',
    sizeBytes: 48_213,
    uploader: '爱丽丝',
    status: 'ready',
    references: 2,
    referencedBy: ['客服知识库', '产品知识库'],
    chunkCount: 7,
    createdAt: '2026-11-24 15:02',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-24 15:06',
    chunks: chunksOf('f-1001', 7, [
      '第一章 目标：为客服团队提供可检索的产品资料，减少重复问答。',
      '第二章 范围：本期只覆盖产品说明、常见问题与操作手册三类文档。',
      '第三章 权限：文件按租户隔离，知识库只能引用同租户的文件。',
      '第四章 解析：支持 txt、md、pdf、docx，解析失败进入任务重试队列。',
    ]),
  },
  {
    id: 'f-1002',
    name: '客服FAQ.txt',
    type: 'txt',
    sizeBytes: 12_890,
    uploader: '爱丽丝',
    status: 'ready',
    references: 1,
    referencedBy: ['客服知识库'],
    chunkCount: 5,
    createdAt: '2026-11-24 14:40',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-24 14:44',
    chunks: chunksOf('f-1002', 5, [
      '问：如何重置密码？答：进入设置页，点击“重置密码”，按邮件提示操作。',
      '问：发票如何开具？答：在订单详情页点击“申请发票”，填写抬头后提交。',
      '问：支持哪些文档格式？答：txt、md、pdf、docx，单个文件不超过 20MB。',
    ]),
  },
  {
    id: 'f-1003',
    name: '2026-采购合同.pdf',
    type: 'pdf',
    sizeBytes: 3_204_112,
    uploader: '鲍勃',
    status: 'pending',
    references: 0,
    referencedBy: [],
    chunkCount: 0,
    createdAt: '2026-11-24 15:18',
    lastOperator: '鲍勃',
    lastOperatedAt: '2026-11-24 15:18',
    chunks: [],
  },
  {
    id: 'f-1004',
    name: '组织架构.docx',
    type: 'docx',
    sizeBytes: 892_001,
    uploader: '鲍勃',
    status: 'ready',
    references: 0,
    referencedBy: [],
    chunkCount: 4,
    createdAt: '2026-11-23 18:05',
    lastOperator: '鲍勃',
    lastOperatedAt: '2026-11-23 18:09',
    chunks: chunksOf('f-1004', 4, [
      '公司组织架构：产品部、研发部、客服部、财务部。',
      '研发部下设平台组、应用组与质量组。',
      '客服部按渠道分为在线、电话与工单三个小组。',
    ]),
  },
  {
    id: 'f-1005',
    name: '旧版接口文档.md',
    type: 'md',
    sizeBytes: 75_400,
    uploader: '爱丽丝',
    status: 'failed',
    references: 0,
    referencedBy: [],
    chunkCount: 0,
    createdAt: '2026-11-23 11:20',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-23 11:24',
    failureReason: '解析失败：文件编码不是 UTF-8',
    attempts: 1,
    failUntilAttempt: 2,
    chunks: [],
  },
  {
    id: 'f-1006',
    name: '会议纪要-1118.md',
    type: 'md',
    sizeBytes: 8_204,
    uploader: '爱丽丝',
    status: 'ready',
    references: 0,
    referencedBy: [],
    chunkCount: 3,
    createdAt: '2026-11-22 09:30',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-22 09:32',
    chunks: chunksOf('f-1006', 3, [
      '会议结论：先做文件模块原型，再确定表结构。',
      '风险：解析失败需要可见的任务状态与重试入口。',
      '下一步：补充知识库引用关系。',
    ]),
  },
  {
    id: 'f-1007',
    name: '值班手册.md',
    type: 'md',
    sizeBytes: 15_360,
    uploader: '爱丽丝',
    status: 'chunked',
    references: 0,
    referencedBy: [],
    chunkCount: 4,
    createdAt: '2026-11-24 16:02',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-24 16:05',
    chunks: chunksOf('f-1007', 4, [
      '值班交接：每班结束前更新交接记录，标注未完成事项。',
      '告警分级：P0 立即电话通知负责人，P1 十五分钟内响应。',
      '复盘要求：故障结束后 48 小时内提交复盘文档。',
    ], false),
  },
  {
    id: 'f-1008',
    name: '旧版报价单.md',
    type: 'md',
    sizeBytes: 4_096,
    uploader: '爱丽丝',
    status: 'ready',
    references: 0,
    referencedBy: [],
    chunkCount: 3,
    createdAt: '2026-11-05 10:00',
    lastOperator: '爱丽丝',
    lastOperatedAt: '2026-11-10 09:00',
    deletedAt: '2026-11-10 09:00',
    chunks: chunksOf('f-1008', 3, [
      '旧版报价：标准版 999 元/年，专业版 1999 元/年（已作废）。',
      '折扣规则：年付九折，三年付八折（已作废）。',
    ]),
  },
  {
    id: 'f-1009',
    name: '客服FAQ.txt',
    type: 'txt',
    sizeBytes: 12_890,
    uploader: '鲍勃',
    status: 'ready',
    references: 0,
    referencedBy: [],
    chunkCount: 5,
    createdAt: '2026-11-01 09:00',
    lastOperator: '鲍勃',
    lastOperatedAt: '2026-11-12 10:00',
    deletedAt: '2026-11-12 10:00',
    chunks: chunksOf('f-1009', 5, [
      '问：如何重置密码？答：设置页点击“重置密码”。（已删除的旧版本）',
    ]),
  },
]

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function extensionOf(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : ''
}

export function nowText(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
