export interface DocApi {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  note?: string
}

export interface ComponentDoc {
  /** 对应菜单项的 key。 */
  key: string
  /** 一句话用途。 */
  summary: string
  /** 这个组件具体展示什么。 */
  details: string[]
  /** 依赖的后端接口；为空表示纯前端。 */
  apis: DocApi[]
  status: 'ready' | 'placeholder' | 'prototype'
  /** 补充说明，例如数据来源或后续计划。 */
  note?: string
}

/**
 * 各业务组件的说明，随组件一起维护。
 * 新增组件后在这里补一条；缺失的组件在文档页会显示「待补充」。
 */
export const COMPONENT_DOCS: ComponentDoc[] = [
  {
    key: 'overview',
    summary: '检查前端、后端、数据库三处是否连通。',
    details: [
      '后端健康状态与数据库连通性（读取 actuator 聚合结果）',
      '支持手动「重新检测」，结果分为检测中、成功、失败三态',
    ],
    apis: [
      { method: 'GET', path: '/api/actuator/health', note: '不套 ApiResponse 信封' },
    ],
    status: 'ready',
    note: '健康检查接口不受体验期身份拦截器约束，未登录也能访问。',
  },
  {
    key: 'files',
    summary: '上传文档，查看解析、分片与向量化状态。',
    details: [
      '列表：每行「查看」恒定可用，并按状态给出唯一「下一步」（分片 / RAG / 重试），最多三个动作',
      '回收站：软删保留 30 天，可恢复（同内容已被新文件占用时拒绝）或彻底删除',
      '上传抽屉：拖拽文件/文件夹或分别选择，逐个校验类型与 20MB 上限，带上传进度与拒绝汇总；同名不覆盖',
      '处理：上传后为未处理，手动「分片」→「RAG」；已分片可先预览分片，失败可重试，就绪后可重新分片 / 重新 RAG',
      '详情：文件信息（含最后操作人/时间）、横向摄取进度、分片分页预览、知识库引用（示例）；删除需二次确认',
    ],
    apis: [],
    status: 'prototype',
    note: '当前是前端静态原型，数据来自 mock；接口与表结构要在 DDL 定稿后接入。',
  },
]
