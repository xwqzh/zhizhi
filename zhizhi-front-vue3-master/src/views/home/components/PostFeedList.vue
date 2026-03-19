<template>
  <div class="post-feed-list">
    <div v-for="(post, index) in postList" :key="getPostId(post) || index" class="feed-card">
      <!-- 作者信息 -->
      <div class="feed-author">
        <el-avatar :size="40" :src="getPostAvatar(post)" @click.stop="goToUser(getPostUserId(post))"/>
        <div class="author-info">
          <div class="author-name" @click.stop="goToUser(getPostUserId(post))">{{ getPostNickname(post) }}</div>
          <div class="publish-time">{{ formatTime(getPostCreateTime(post)) }}</div>
        </div>
      </div>
      
      <!-- 帖子内容 - 左右布局（封面图在左侧） -->
      <div class="feed-content">
        <!-- 左侧：封面图片（收起时显示） -->
        <div class="content-left-cover" v-if="getPostCover(post) && !post.isExpanded">
          <el-image
            :src="getPostCover(post)"
            :preview-src-list="[getPostCover(post)]"
            fit="cover"
            class="cover-image"
            @click.stop
          />
        </div>
        
        <!-- 右侧：标题、内容、标签 -->
        <div class="content-main" :class="{ 'full-width': post.isExpanded || !getPostCover(post) }">
          <!-- 标题 -->
          <h3 class="post-title" v-if="getPostTitle(post)" @click="goToPostDetail(getPostId(post))">{{ getPostTitle(post) }}</h3>
          
          <!-- 内容区域 -->
          <div v-if="!post.isExpanded" class="post-summary">
            <!-- 收起状态：显示摘要 -->
            <p class="post-text" v-if="getPostDescription(post)">
              {{ truncateText(getPostDescription(post), 150) }}
            </p>
            <!-- 展开全文按钮 - 收起状态时显示 -->
            <div class="expand-btn-wrapper">
              <span @click.stop="toggleExpand(post)" class="expand-toggle">
                展开全文
              </span>
            </div>
          </div>
          <div v-else class="post-full-content">
            <!-- 展开状态：使用MdPreview显示完整内容 -->
            <MdPreview 
              :editorId="'preview-' + getPostId(post)" 
              :modelValue="getPostContent(post) || getPostDescription(post) || ''" 
              class="md-preview-content"
            />
            <!-- 收起按钮 - 展开状态时显示 -->
            <div class="expand-btn-wrapper">
              <span @click.stop="toggleExpand(post)" class="expand-toggle">
                收起
              </span>
            </div>
          </div>
          
          <!-- 标签 -->
          <div class="feed-tags" v-if="getPostTags(post) && getPostTags(post).length > 0">
            <span v-for="(tag, idx) in getPostTags(post)" :key="idx" class="tag-item">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 操作栏 -->
      <div class="feed-footer">
        <div class="feed-actions">
          <div
            class="action-item"
            :class="{ 'is-active': post.isLiked }"
            @click.stop="handleLike(post)"
          >
            <CustomIcon name="thumb-up" :active="post.isLiked" :size="16" />
            <span>{{ getPostLikeCount(post) || 0 }}</span>
          </div>
          <div 
            class="action-item"
            :class="{ 'is-active': post.showComments }"
            @click.stop="toggleComments(post)"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span>{{ getPostCommentCount(post) || 0 }}</span>
          </div>
          <div class="action-item" :class="{ 'is-active': post.isFavorited }" @click.stop="handleCollect(post)">
            <el-icon><Star /></el-icon>
            <span>{{ getPostFavoriteCount(post) || 0 }}</span>
          </div>
        </div>
      </div>
      
      <!-- 评论区（展开时显示） -->
      <div v-if="post.showComments" class="feed-comments">
        <Comment :post-id="getPostId(post)" />
        <div class="collapse-comments-wrapper">
          <span class="collapse-comments-btn" @click.stop="toggleComments(post)">收起评论</span>
        </div>
      </div>
    </div>
    
    <!-- 底部提示 -->
    <div v-if="loading" class="loading-message">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="noMore && postList.length > 0" class="end-message">已经到底了 🎉</div>
    <div v-else-if="postList.length === 0" class="empty-message">暂无帖子</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound, Star, Loading } from '@element-plus/icons-vue'
import CustomIcon from '@/components/CustomIcon/index.vue'
import { ElMessage } from 'element-plus'
import { getPosts, getHotPosts, getFeaturedPosts, getFollowingPosts } from '@/api/home'
import { likePost, unlikePost } from '@/api/post'
import favoritesApi, { FavoriteType } from '@/api/favorites'
import { useUserStore } from '@/stores/module/user'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import Comment from '@/components/Comment/index.vue'
import { validateApiResponse } from '@/utils/typeGuards'

interface Props {
  activeTab?: string
  tagId?: number | string | null
}

interface PostItemData {
  id?: number
  userId?: number
  avatar?: string
  nickname?: string
  title?: string
  description?: string
  content?: string
  coverUrl?: string
  createTime?: string
  publishTime?: string
  likeCount?: number
  commentCount?: number
  favoriteCount?: number
  isFavorited?: boolean
  tagNameList?: string[]
}

interface FeedPost {
  postItem?: PostItemData
  id?: number
  userId?: number
  avatar?: string
  nickname?: string
  title?: string
  description?: string
  content?: string
  coverUrl?: string
  createTime?: string
  publishTime?: string
  likeCount?: number
  commentCount?: number
  favoriteCount?: number
  tagNameList?: string[]
  isExpanded?: boolean
  isLiked?: boolean
  isFavorited?: boolean
  showComments?: boolean
}

// 响应类型定义
interface PostListResponse {
  data?: PostItemData[]
  total?: number
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'latest',
  tagId: null
})

const emit = defineEmits<{
  'update:activeTab': [value: string]
}>()

const router = useRouter()
const userStore = useUserStore()

// 状态管理
const postList = ref<FeedPost[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const noMore = computed(() => postList.value.length >= total.value && total.value > 0)

// ========== 数据提取辅助函数（适配后端 PostListResponse 结构）==========
const getPostItem = (post: FeedPost): PostItemData | FeedPost => post?.postItem || post
const getPostId = (post: FeedPost): number | undefined => {
  const item = getPostItem(post) as PostItemData
  return item?.id
}
const getPostUserId = (post: FeedPost): number | undefined => {
  const item = getPostItem(post) as PostItemData
  return item?.userId
}
const getPostAvatar = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
}
const getPostNickname = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.nickname || '匿名用户'
}
const getPostTitle = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.title || ''
}
const getPostDescription = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.description || item?.content || ''
}
const getPostCover = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.coverUrl || ''
}
const getPostCreateTime = (post: FeedPost): string | undefined => {
  const item = getPostItem(post) as PostItemData
  return item?.createTime || item?.publishTime
}
const getPostLikeCount = (post: FeedPost): number => {
  const item = getPostItem(post) as PostItemData
  return item?.likeCount || 0
}
const getPostCommentCount = (post: FeedPost): number => {
  const item = getPostItem(post) as PostItemData
  return item?.commentCount || 0
}
const getPostFavoriteCount = (post: FeedPost): number => {
  const item = getPostItem(post) as PostItemData
  return item?.favoriteCount || 0
}
const getPostTags = (post: FeedPost): string[] => {
  const item = getPostItem(post) as PostItemData
  return item?.tagNameList || []
}
const getPostContent = (post: FeedPost): string => {
  const item = getPostItem(post) as PostItemData
  return item?.content || ''
}

// 截断文本
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 格式化时间
const formatTime = (time: string | undefined): string => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString()
}

// 切换展开状态
const toggleExpand = (post: FeedPost) => {
  post.isExpanded = !post.isExpanded
}

// 切换评论区显示
const toggleComments = (post: FeedPost) => {
  post.showComments = !post.showComments
}

// 导航
const goToUser = (userId: number | undefined) => {
  if (userId) router.push(`/user/${userId}`)
}

const goToPostDetail = (postId: number | undefined, focusComment = false) => {
  if (postId) {
    router.push({
      path: `/post/${postId}`,
      query: focusComment ? { focus: 'comment' } : {}
    })
  }
}

// 操作
const handleLike = async (post: FeedPost) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    window.dispatchEvent(new CustomEvent('show-login-dialog'))
    return
  }
  
  const originalIsLiked = post.isLiked
  const item = getPostItem(post) as PostItemData
  
  // 乐观更新
  post.isLiked = !post.isLiked
  if (item) {
    item.likeCount = post.isLiked ? (item.likeCount || 0) + 1 : Math.max(0, (item.likeCount || 0) - 1)
  }
  
  try {
    const postId = getPostId(post)
    if (!postId) return
    
    if (originalIsLiked) {
      await unlikePost(postId)
    } else {
      await likePost(postId)
    }
    ElMessage.success(post.isLiked ? '点赞成功' : '已取消点赞')
  } catch (error) {
    // 回滚状态
    post.isLiked = originalIsLiked
    if (item) {
      item.likeCount = originalIsLiked ? (item.likeCount || 0) + 1 : Math.max(0, (item.likeCount || 0) - 1)
    }
    ElMessage.error('操作失败，请稍后重试')
  }
}

const handleCollect = async (post: FeedPost) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    window.dispatchEvent(new CustomEvent('show-login-dialog'))
    return
  }

  const postId = getPostId(post)
  if (!postId) {
    return
  }

  const item = getPostItem(post) as PostItemData
  const originalIsFavorited = Boolean(post.isFavorited)
  const originalFavoriteCount = item.favoriteCount || 0

  // 乐观更新
  post.isFavorited = !originalIsFavorited
  if (item) {
    item.favoriteCount = post.isFavorited
      ? originalFavoriteCount + 1
      : Math.max(0, originalFavoriteCount - 1)
  }

  try {
    if (originalIsFavorited) {
      await favoritesApi.removeFavorite({
        targetId: postId,
        targetType: FavoriteType.POST
      })
      ElMessage.success('已取消收藏')
    } else {
      await favoritesApi.addFavorite({
        targetId: postId,
        targetType: FavoriteType.POST
      })
      ElMessage.success('收藏成功')
    }
  } catch (error: any) {
    // 回滚状态
    post.isFavorited = originalIsFavorited
    if (item) {
      item.favoriteCount = originalFavoriteCount
    }
    ElMessage.error(error?.response?.data?.info || '操作失败，请稍后重试')
  }
}

// 加载帖子
const loadPosts = async (page = 1) => {
  if (noMore.value && page > 1) return

  if (props.activeTab === 'following' && !userStore.isAuthenticated) {
    postList.value = []
    total.value = 0
    ElMessage.warning('请先登录以查看关注内容')
    emit('update:activeTab', 'latest')
    return
  }

  loading.value = true
  
  try {
    let response
    const params = {
      page,
      size: pageSize.value,
      tagId: props.activeTab === 'following' ? undefined : (props.tagId as number | undefined)
    }
    
    if (props.activeTab === 'following') {
      response = await getFollowingPosts({ page, size: pageSize.value })
    } else if (props.activeTab === 'latest') {
      response = await getPosts({ ...params, sort: 'latest' })
    } else if (props.activeTab === 'hot') {
      response = await getHotPosts(params)
    } else if (props.activeTab === 'featured') {
      response = await getFeaturedPosts(params)
    } else {
      response = await getPosts({ ...params, sort: 'latest' })
    }

    if (response?.data) {
      const pageData = validateApiResponse<PostListResponse>(response)
      if (!pageData) {
        return
      }
      
      const list = pageData.data || []
      
      const processedList: FeedPost[] = list.map((item: PostItemData) => {
        const raw = item as unknown as { isLiked?: boolean; isFavorited?: boolean; postItem?: { isLiked?: boolean; isFavorited?: boolean } }
        const initialIsLiked = Boolean(raw.isLiked ?? raw.postItem?.isLiked)
        const initialIsFavorited = Boolean(raw.isFavorited ?? raw.postItem?.isFavorited)
        return {
          ...item,
          isExpanded: false,
          isLiked: initialIsLiked,
          isFavorited: initialIsFavorited,
          showComments: false
        }
      })
      
      if (page === 1) {
        postList.value = processedList
      } else {
        postList.value = [...postList.value, ...processedList]
      }
      
      const resTotal = pageData.total
      if (resTotal !== undefined) {
        total.value = resTotal
      } else if (list.length < pageSize.value) {
        total.value = postList.value.length
      } else {
        total.value = 9999
      }
      
      currentPage.value = page
    }
  } catch (error: any) {
    if (props.activeTab === 'following' && error?.response?.status === 401) {
      ElMessage.warning('请先登录以查看关注内容')
      emit('update:activeTab', 'latest')
    }
  } finally {
    loading.value = false
  }
}

// 滚动加载
const handleScroll = () => {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const clientHeight = document.documentElement.clientHeight
  const scrollHeight = document.documentElement.scrollHeight
  if (scrollTop + clientHeight >= scrollHeight - 100 && !loading.value) {
    loadPosts(currentPage.value + 1)
  }
}

// 监听 tab 切换
watch(() => props.activeTab, () => {
  currentPage.value = 1
  postList.value = []
  total.value = 0
  loadPosts(1)
})

// 监听 tagId 变化
watch(() => props.tagId, (newId, oldId) => {
  if (newId !== oldId) {
    currentPage.value = 1
    postList.value = []
    total.value = 0
    loadPosts(1)
  }
})

// 刷新列表
const refresh = () => {
  currentPage.value = 1
  postList.value = []
  total.value = 0
  loadPosts(1)
}

// 暴露方法供父组件调用
defineExpose({
  refresh
})

onMounted(() => {
  loadPosts(1)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.post-feed-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 作者信息 */
.feed-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}

.author-name:hover {
  color: #1e80ff;
}

.publish-time {
  color: #9CA3AF;
  font-size: 13px;
}

/* 帖子内容 - 左右布局（封面图在左侧） */
.feed-content {
  display: flex;
  gap: 16px;
}

.content-left-cover {
  flex-shrink: 0;
  width: 120px;
  height: 90px;
}

.content-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-main.full-width {
  width: 100%;
}

.post-title {
  font-size: 17px;
  font-weight: 700;
  color: #1d2129;
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-title:hover {
  color: #1e80ff;
}

.post-summary {
  margin-bottom: 8px;
}

.post-text {
  font-size: 14px;
  line-height: 1.6;
  color: #515767;
  white-space: pre-line;
  word-break: break-all;
  word-wrap: break-word;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-full-content {
  margin-bottom: 12px;
}

/* Markdown预览样式 */
.md-preview-content {
  background: transparent !important;
}

.md-preview-content :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.md-preview-content :deep(.md-editor-preview) {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
}

.md-preview-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
}

.md-preview-content :deep(pre) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

.md-preview-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
}

.md-preview-content :deep(blockquote) {
  border-left: 4px solid #1e80ff;
  padding-left: 16px;
  margin: 12px 0;
  color: #666;
}

/* 展开按钮容器 */
.expand-btn-wrapper {
  margin-top: 8px;
  text-align: left;
}

.expand-toggle {
  font-size: 14px;
  color: #1e80ff;
  cursor: pointer;
  display: inline-block;
  padding: 4px 0;
}

.expand-toggle:hover {
  text-decoration: underline;
}

/* 左侧封面图 */
.cover-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

/* 标签 */
.feed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag-item {
  color: #1E80FF;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.tag-item:hover {
  background: rgba(30, 128, 255, 0.1);
}

/* 底部操作栏 */
.feed-footer {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

.feed-actions {
  display: flex;
  gap: 20px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  color: #8a919f;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-item:hover {
  background: #f4f5f5;
  color: #1e80ff;
}

.action-item.is-active {
  color: #1e80ff;
}

.action-item .el-icon {
  font-size: 16px;
}

/* 评论区 */
.feed-comments {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.feed-comments :deep(.comment-header) {
  padding: 0 0 12px 0;
}

.feed-comments :deep(.section-title) {
  font-size: 16px;
}

.feed-comments :deep(.comment-editor) {
  padding: 12px 0;
}

.feed-comments :deep(.comment-item) {
  padding: 12px 0;
}

/* 收起评论按钮 */
.collapse-comments-wrapper {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  text-align: left;
}

.collapse-comments-btn {
  font-size: 14px;
  color: #1e80ff;
  cursor: pointer;
  padding: 4px 0;
  display: inline-block;
}

.collapse-comments-btn:hover {
  text-decoration: underline;
}

/* 底部提示 */
.loading-message, .end-message, .empty-message {
  text-align: center;
  padding: 20px;
  color: #8a919f;
  font-size: 14px;
}

.loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 响应式 */
@media screen and (max-width: 768px) {
  .feed-card {
    border-radius: 0;
    padding: 16px;
  }
  
  .content-left-cover {
    width: 100px;
    height: 75px;
  }
  
  .feed-content {
    flex-direction: column;
  }
  
  .content-left-cover {
    width: 100%;
    height: 180px;
    margin-bottom: 12px;
  }
}
</style>
