import request from '@/utils/request'
import { LikeType } from '@/api/like'
import type { ApiResponse, Comment, PageResponse } from '@/types'

export const CommentType = {
  POST: 1,
  ESSAY: 2,
  COMMENT: 3
} as const

interface CommentCreateData {
  type?: number
  targetId: number
  content: string
  parentId?: number | null
  replyUserId?: number | null
  imageUrls?: string[]
  mentionUserIds?: number[]
}

interface CommentListParams {
  targetType: number
  targetId: number
  pageNo?: number
  pageSize?: number
  sortType?: 'HOT' | 'TIME' | 'NEW' | 'hot' | 'time' | 'new'
}

export function getCommentPage(data: CommentListParams): Promise<ApiResponse<PageResponse<Comment>>> {
  return request({ url: '/comment/list', method: 'post', data })
}

export function getReplyPage(data: {
  parentId: number
  pageNo?: number
  pageSize?: number
  sortType?: 'HOT' | 'TIME' | 'NEW' | 'hot' | 'time' | 'new'
}): Promise<ApiResponse<PageResponse<Comment>>> {
  return request({ url: '/comment/reply/page', method: 'post', data })
}

export function createComment(data: CommentCreateData): Promise<ApiResponse<Comment>> {
  return request({ url: '/comment/add', method: 'post', data })
}

export function replyComment(data: CommentCreateData): Promise<ApiResponse<Comment>> {
  return request({ url: '/comment/reply', method: 'post', data })
}

export function deleteComment(commentId: number): Promise<ApiResponse> {
  return request({ url: `/comment/delete/${commentId}`, method: 'post' })
}

export function reportComment(
  targetId: number,
  commentId: number,
  reason: string,
  type = CommentType.POST
): Promise<ApiResponse> {
  void type
  const parsedReason = Number(reason)
  const reasonCode = Number.isInteger(parsedReason) && parsedReason >= 1 && parsedReason <= 6
    ? parsedReason
    : 6
  const description = Number.isInteger(parsedReason) ? '' : reason

  // Compatibility alias: old /comment/report was removed, route to /reports
  return request({
    url: '/reports',
    method: 'post',
    data: {
      targetType: 2,
      targetId: commentId || targetId,
      reason: reasonCode,
      description
    }
  })
}

export function likeComment(commentId: number): Promise<ApiResponse> {
  return request({
    url: '/likes/like',
    method: 'post',
    data: { targetId: commentId, type: LikeType.COMMENT }
  })
}

export function unlikeComment(commentId: number): Promise<ApiResponse> {
  return request({
    url: '/likes/unlike',
    method: 'post',
    data: { targetId: commentId, type: LikeType.COMMENT }
  })
}

export function getUserComments(
  userId: number,
  params: { page?: number; size?: number } = {}
): Promise<ApiResponse<PageResponse<Comment>>> {
  return request({
    url: `/comment/user/${userId}`,
    method: 'get',
    params: { page: params.page || 1, size: params.size || 10 }
  })
}

export function getConversationChain(replyId: number): Promise<ApiResponse<Comment[]>> {
  return request({ url: `/comment/conversation/${replyId}`, method: 'get' })
}
