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
  status: 'ready' | 'placeholder'
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
]
