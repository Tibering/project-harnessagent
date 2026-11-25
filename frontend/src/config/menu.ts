import type { Component } from 'vue'
import { Activity, FileText, FolderOpen } from 'lucide-vue-next'
import OverviewPanel from '@/components/home/OverviewPanel.vue'
import DocsPanel from '@/components/home/DocsPanel.vue'
import FilesPanel from '@/components/home/files/FilesPanel.vue'

export interface MenuItem {
  key: string
  label: string
  icon: Component
  component: Component
}

/**
 * 侧栏菜单配置。新增业务组件时在这里加一项，布局与切换逻辑不用改。
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'overview',
    label: '概览',
    icon: Activity,
    component: OverviewPanel,
  },
  {
    key: 'files',
    label: '文件',
    icon: FolderOpen,
    component: FilesPanel,
  },
  {
    key: 'docs',
    label: '文档',
    icon: FileText,
    component: DocsPanel,
  },
]

export const DEFAULT_MENU_KEY = MENU_ITEMS[0].key
