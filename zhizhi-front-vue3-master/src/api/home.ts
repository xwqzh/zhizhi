import request from '@/utils/request'
import { cachedRequest, clearCacheByPrefix } from '@/utils/cache'
import { CACHE_TTL } from '@/constants'
import type { ApiResponse, Post, PageResponse } from '@/types'

interface HomePostParams {
  type?: string
  tagId?: number
  sort?: string
  featured?: boolean
  page?: number
  size?: number
  forceRefresh?: boolean
  excludeId?: number
}

export function getFollowingPosts(params: { page?: number; size?: number }): Promise<ApiResponse<PageResponse<Post>>> {
  return request({
    url: '/home/following',
    method: 'get',
    params: { page: params.page || 1, size: params.size || 10 }
  })
}

export function getPosts(params: HomePostParams): Promise<ApiResponse<PageResponse<Post>>> {
  return request({
    url: '/home/posts',
    method: 'get',
    params: {
      tagId: params.tagId,
      sort: params.sort || 'latest',
      featured: params.featured === true,
      page: params.page || 1,
      size: params.size || 10
    }
  })
}

export function getFeaturedPosts(params: HomePostParams): Promise<ApiResponse<PageResponse<Post>>> {
  const requestFn = () =>
    getPosts({
      ...params,
      featured: true,
      sort: 'latest'
    })

  if (params.page === 1 && !params.tagId) {
    return cachedRequest('home:featured', requestFn, {
      ttl: CACHE_TTL.MEDIUM,
      forceRefresh: params.forceRefresh,
      params: { page: params.page, size: params.size }
    })
  }
  return requestFn()
}

export function getHotPosts(params: HomePostParams): Promise<ApiResponse<PageResponse<Post>>> {
  const requestFn = () =>
    getPosts({
      ...params,
      featured: false,
      sort: 'hot'
    })

  if (params.page === 1 && !params.tagId) {
    return cachedRequest('home:hot', requestFn, {
      ttl: CACHE_TTL.MEDIUM,
      forceRefresh: params.forceRefresh,
      params: { page: params.page, size: params.size }
    })
  }
  return requestFn()
}

export function getRelatedPosts(params: HomePostParams): Promise<ApiResponse<PageResponse<Post[]>>> {
  return request({
    url: '/home/related',
    method: 'get',
    params: {
      excludeId: params.excludeId,
      page: params.page || 1,
      size: params.size || 5
    }
  })
}

export function clearHomeCache(): void {
  clearCacheByPrefix('home:')
}

export const SortType = {
  LATEST: 'latest',
  HOTTEST: 'hot',
  COMMENTS: 'comments',
  LIKES: 'likes',
  FAVORITES: 'favorites'
} as const
