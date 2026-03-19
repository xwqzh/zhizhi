<template>
  <div class="post-create-container">
    <div class="post-create">
      <div class="post-editor">
        <div>
          <div class="input-info">
            <textarea
              v-model="content"
              class="post-textarea"
              :maxlength="maxLength"
              placeholder="分享你的想法..."
              @input="autoResize"
              ref="textareaRef"
            ></textarea>
            <div class="word-count">
              {{ content.length }}/{{ maxLength }}
            </div>
          </div>
          <!-- 图片预览区域 -->
          <div class="image-preview-container" v-if="imageList.length > 0">
            <div v-for="(image, index) in imageList" :key="image.url" class="image-preview">
              <img :src="image.url" alt="上传图片" class="preview-image" />
              <div class="delete-icon" @click="removeImage(index)">×</div>
            </div>
          </div>

          <!-- 显示已选择的标签 -->
          <div class="selected-tags" v-if="selectedTags.length > 0">
            <el-tag
              v-for="tag in selectedTags"
              :key="tag.id"
              class="mx-1"
              closable
              size="small"
              @close="removeSelectedTag(tag)"
            >
              #{{ tag.name }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="editor-footer">
        <div class="tools">
          <EmojiSelector v-model="showEmojiPicker" text="表情" @select="addEmoji" />
          <el-button text @click="triggerImageUpload">🖼️ 图片</el-button>
          <el-button text ref="linkTagBtn" v-click-outside="toggleTagSelect"># 添加标签</el-button>
        </div>
        <el-button type="primary" @click="publish" :loading="publishing" style="border-radius: 20px;width: 70px">
          发布
        </el-button>
      </div>
    </div>

    <!-- 标签搜索弹出层 -->
    <el-popover
      ref="popoverRef"
      :virtual-ref="linkTagBtn"
      trigger="click"
      virtual-triggering
    >
      <el-input
        v-model="tagSearchText"
        placeholder="搜索标签"
        clearable
        @input="fetchTags"
        :prefix-icon="Search"
        class="tag-search"
      />
      <div class="tags-list">
        <div
          v-for="tag in filteredTags"
          :key="tag.id"
          class="tag-item"
          @click="selectTag(tag)"
        >
          <div class="tag-name">#{{ tag.name }}</div>
        </div>
        <div v-if="filteredTags.length === 0" class="empty-tags">
          暂无匹配标签
        </div>
      </div>
    </el-popover>

    <!-- 隐藏的文件输入框 -->
    <input type="file" ref="imageInput" @change="handleImageSelect" style="display: none;" multiple accept="image/*" />
  </div>
</template>

<script setup lang="ts">
import { ref, unref, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { PopoverInstance } from 'element-plus'
import { createPost, uploadPostCover } from '@/api/post'
import { searchTags } from '@/api/tag'
import { useUserStore } from '@/stores/module/user'
import EmojiSelector from "@/components/EmojiSelector/index.vue"
import type { Tag } from '@/types'

interface ImageItem {
  url: string
  file: File
}

// 定义 emit
const emit = defineEmits<{
  'post-published': [data: unknown]
}>()

const userStore = useUserStore()

// 状态管理
const content = ref('')
const selectedTags = ref<Tag[]>([])
const imageList = ref<ImageItem[]>([])
const publishing = ref(false)

// 表情相关状态
const showEmojiPicker = ref(false)

// 图片相关状态
const imageInput = ref<HTMLInputElement | null>(null)

// 标签搜索相关状态
const tagSearchText = ref('')
const filteredTags = ref<Tag[]>([])
const showTagSearch = ref(false)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const maxLength = 1000

// 自动调整文本框高度
const autoResize = () => {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }
}

// 监听内容变化
watch(content, () => {
  nextTick(() => {
    autoResize()
  })
})

// 获取标签列表
const fetchTags = async () => {
  try {
    const response = await searchTags(tagSearchText.value || '')
    if (response.code === 20000) {
      filteredTags.value = response.data || []
    }
  } catch (error) {
    // 获取失败
  }
}

const addEmoji = (emoji: any) => {
  if (typeof emoji === 'string') {
    content.value += emoji
  } else {
    content.value += emoji?.i || ''
  }
}

// 监听搜索文本变化
watch(tagSearchText, () => {
  fetchTags()
})

const linkTagBtn = ref<HTMLElement | null>(null)
const popoverRef = ref<PopoverInstance | null>(null)
const toggleTagSelect = () => {
  ;(unref(popoverRef)?.popperRef as any)?.delayHide?.()
  showTagSearch.value = !showTagSearch.value
  if (showTagSearch.value) {
    fetchTags()
  }
}

const clearForm = () => {
  content.value = ''
  selectedTags.value = []
  imageList.value = []
}

// 选择标签
const selectTag = (tag: Tag) => {
  if (!selectedTags.value.find(t => t.id === tag.id)) {
    selectedTags.value.push(tag)
  }
}

// 移除选中的标签
const removeSelectedTag = (tag: Tag) => {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

// 触发图片上传
const triggerImageUpload = () => {
  imageInput.value?.click()
}

// 处理图片选择
const handleImageSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  for (const file of files) {
    if (imageList.value.length >= 9) {
      ElMessage.warning('最多上传9张图片')
      break
    }

    try {
      const response = await uploadPostCover(file)
      if (response.code === 20000 && response.data) {
        const url = Array.isArray(response.data) ? response.data[0] : response.data
        imageList.value.push({
          url: url as string,
          file: file
        })
      }
    } catch (error) {
      ElMessage.error('图片上传失败')
    }
  }

  // 清空 input，允许重复选择同一文件
  target.value = ''
}

// 移除图片
const removeImage = (index: number) => {
  imageList.value.splice(index, 1)
}

// 根据正文自动生成标题，满足后端标题必填校验
const generatePostTitle = (text: string): string => {
  const firstNonEmptyLine =
    text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) || text.trim()

  const normalized = firstNonEmptyLine.replace(/\s+/g, ' ')
  return normalized.length > 100 ? normalized.substring(0, 100) : normalized
}

// 发布帖子
const publish = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }

  const normalizedContent = content.value.trim()
  if (!normalizedContent) {
    ElMessage.warning('请输入内容')
    return
  }

  if (selectedTags.value.length === 0) {
    ElMessage.warning('请至少选择一个标签')
    return
  }

  const generatedTitle = generatePostTitle(normalizedContent)
  if (!generatedTitle) {
    ElMessage.warning('请完善帖子内容')
    return
  }

  publishing.value = true
  try {
    const postData = {
      title: generatedTitle,
      content: content.value,
      description: normalizedContent.substring(0, 200),
      type: 'POST',
      status: 'PUBLISHED',
      tagIds: selectedTags.value.map(t => t.id),
      coverUrl: imageList.value.length > 0 ? imageList.value[0].url : ''
    }

    const response = await createPost(postData)
    if (response.code === 20000) {
      ElMessage.success('发布成功')
      clearForm()
      emit('post-published', response.data)
    } else {
      ElMessage.error(response.info || '发布失败')
    }
  } catch (error) {
    ElMessage.error('发布失败，请重试')
  } finally {
    publishing.value = false
  }
}
</script>

<style scoped>
.post-create-container {
  margin-bottom: 16px;
}

.post-create {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.post-editor {
  margin-bottom: 12px;
}

.input-info {
  position: relative;
}

.post-textarea {
  width: 100%;
  min-height: 100px;
  max-height: 300px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #f7f8fa;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.post-textarea:focus {
  background: #f0f2f5;
}

.word-count {
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 12px;
  color: #8a919f;
}

.image-preview-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.image-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.delete-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}

.delete-icon:hover {
  background: rgba(0, 0, 0, 0.7);
}

.selected-tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.tools {
  display: flex;
  gap: 4px;
}

.tag-search {
  margin-bottom: 12px;
}

.tags-list {
  max-height: 200px;
  overflow-y: auto;
}

.tag-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.tag-item:hover {
  background: #f5f5f5;
}

.tag-name {
  color: #1e80ff;
  font-size: 14px;
}

.empty-tags {
  padding: 20px;
  text-align: center;
  color: #8a919f;
  font-size: 14px;
}
</style>
