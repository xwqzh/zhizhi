/**
 * API response related types
 */

/**
 * Base API response envelope
 */
export interface ApiResponse<T = any> {
  code: number
  info: string | null
  message?: string
  data: T
}

/**
 * Paged response data
 */
export interface PageResponse<T> {
  pageNo?: number
  pageSize?: number
  total?: number
  page?: number
  size?: number
  pages?: number
  data: T | any[]
  list?: any[]
  records?: any[]
  [key: string]: any
}

/**
 * Cursor pagination response
 */
export interface CursorResponse<T> {
  list?: T[]
  data?: T[]
  nextCursor?: string | null
  cursor?: string | null
  hasMore?: boolean
  total?: number
  [key: string]: any
}

/**
 * List response data (legacy compatibility)
 */
export interface ListResponse<T> {
  list: T
  total: number
  page?: number
  size?: number
}

/**
 * Upload response
 */
export interface UploadResponse {
  code: number
  data: string[]
  info?: string
}

/**
 * Form validation rule
 */
export interface FormRule {
  required?: boolean
  message?: string
  trigger?: string | string[]
  validator?: (rule: FormRule, value: unknown, callback: (error?: Error) => void) => void
  min?: number
  max?: number
  type?: string
  pattern?: RegExp
}

/**
 * Element Plus form instance
 */
export interface FormInstance {
  validate: () => Promise<boolean>
  validateField: (prop: string) => Promise<boolean>
  resetFields: () => void
  clearValidate: (props?: string | string[]) => void
}

/**
 * Favorite item
 */
export interface FavoriteItem {
  id: number
  postItem?: {
    id: number
    title: string
    description: string
    coverUrl: string
    viewCount: number
    likeCount: number
    commentCount: number
    createTime: string
  }
  // Backward-compatible fields
  title?: string
  description?: string
  coverUrl?: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  createTime?: string
}

/**
 * Favorite response
 */
export interface FavoriteResponse {
  list: FavoriteItem[]
  total: number
}

/**
 * Conversation chain item
 */
export interface ConversationChainItem {
  id: number
  content: string
  userId: number
  userName: string
  userAvatar: string
  createTime: string
  formattedTime?: string
}
