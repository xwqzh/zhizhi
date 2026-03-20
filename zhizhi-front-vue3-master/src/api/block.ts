import request from '@/utils/request'
import type { ApiResponse, PageResponse, User } from '@/types'

export function blockUser(userId: number): Promise<ApiResponse> {
  return request({ url: `/blocks/${userId}`, method: 'post' })
}

export function unblockUser(userId: number): Promise<ApiResponse> {
  return request({ url: `/blocks/unblock/${userId}`, method: 'post' })
}

export function isBlocked(userId: number): Promise<ApiResponse<boolean>> {
  return request({ url: `/blocks/status/${userId}`, method: 'get' })
}

export async function getBlockList(params: { pageNo?: number; pageSize?: number } = {}): Promise<ApiResponse<PageResponse<User>>> {
  const pageNo = params.pageNo || 1
  const pageSize = params.pageSize || 20
  const response = await request({
    url: '/blocks',
    method: 'get',
    params: { page: pageNo, size: pageSize }
  })

  if (Array.isArray(response?.data)) {
    return {
      ...response,
      data: {
        pageNo,
        pageSize,
        total: response.data.length,
        data: response.data
      }
    }
  }

  return response
}

export function getBlockCount(): Promise<ApiResponse<number>> {
  return request({ url: '/blocks/count', method: 'get' })
}
