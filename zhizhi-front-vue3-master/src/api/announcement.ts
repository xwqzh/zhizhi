import request from '@/utils/request'
import type { ApiResponse, PageResponse } from '@/types'

interface Announcement {
  id: number
  title: string
  content: string
  type: number
  createTime: string
}

export function getAnnouncementList(params: { pageNo?: number; pageSize?: number; page?: number; size?: number } = {}): Promise<ApiResponse<PageResponse<Announcement>>> {
  const page = params.pageNo ?? params.page ?? 1
  const size = params.pageSize ?? params.size ?? 10
  return request({
    url: '/announcements',
    method: 'get',
    params: { page, size }
  })
}

export function getAnnouncementDetail(id: number): Promise<ApiResponse<Announcement>> {
  return request({ url: `/announcements/${id}`, method: 'get' })
}

export const AnnouncementType = {
  NORMAL: 0,
  ACTIVITY: 1,
  SYSTEM: 2,
  UPDATE: 3
} as const

export const AnnouncementTypeOptions = [
  { value: 0, label: '普通', type: 'info' },
  { value: 1, label: '活动', type: 'warning' },
  { value: 2, label: '系统', type: 'danger' },
  { value: 3, label: '更新', type: 'success' }
]

export function getTypeTag(type: number): { label: string; type: string } {
  const option = AnnouncementTypeOptions.find((o) => o.value === type)
  return option || { label: '普通', type: 'info' }
}
