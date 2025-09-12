<script setup lang="js">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { NImage, NText, NSpace, NButton, NIcon, NSlider } from 'naive-ui'
import { usePlayListStore } from '../stores/playList'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'seek'])

// 使用播放列表存储
const store = usePlayListStore()

// 歌词拖拽相关变量
const isLyricsDragging = ref(false)
const dragStartY = ref(0)
const dragStartScrollTop = ref(0)
const lyricsContainerRef = ref(null)
const isLyricsScrolling = ref(false) // 标记是否正在手动滚动歌词

// 监听键盘事件
const handleKeydown = (event) => {
  // 检查是否按下了ESC键 (keyCode 27)
  if (event.keyCode === 27 || event.key === 'Escape') {
    emit('close')
  }
}

// 组件挂载时添加键盘事件监听器
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  lyricsList.value = parseLyrics(store.lyric)
})

// 组件卸载时移除键盘事件监听器
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // 不需要做任何清理工作，因为音频元素在Home.vue中管理
})

// 解析歌词
const parseLyrics = (lyricStr) => {
  if (!lyricStr) return []

  const lines = lyricStr.split('\n')
  const lyrics = []

  for (const line of lines) {
    // 匹配时间戳 [00:00.00] 格式
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1])
      const seconds = parseInt(timeMatch[2])
      const milliseconds = parseInt(timeMatch[3])
      const text = timeMatch[4]

      const time = minutes * 60 + seconds + milliseconds / 1000

      lyrics.push({
        time,
        text
      })
    }
  }

  // 按时间排序
  lyrics.sort((a, b) => a.time - b.time)
  return lyrics
}

// 获取歌词列表
const lyricsList = ref([])

// 当前高亮歌词索引
const currentLyricIndex = ref(-1)

// 计算属性：当前歌曲信息
const currentSong = computed(() => {
  return {
    id: store.id,
    name: store.name,
    artistName: store.artistName,
    albumName: store.albumName,
    pic: store.pic,
    lyric: store.lyric
  }
})

// 格式化时间显示 (秒转为 mm:ss)
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 格式化tooltip显示的时间
const formatTooltip = (percentage) => {
  const timeInSeconds = (percentage / 100) * store.totalTime
  return formatTime(timeInSeconds)
}

// 计算进度条百分比
const progressPercentage = computed(() => {
  if (store.totalTime <= 0) return 0
  return (store.currentTime / store.totalTime) * 100
})

// 计算当前播放时间（以秒为单位）
const currentPlayTime = computed(() => {
  return (sliderPercentage.value / 100) * store.totalTime
})

// 用于slider的本地响应式变量
const sliderPercentage = ref(0)

// 标记是否正在拖动
const isDragging = ref(false)

// 监听播放进度变化，更新slider值（但不覆盖用户正在拖动时的值）
watch(() => progressPercentage.value, (newPercentage) => {
  // 只有在没有拖动时才更新slider值
  if (!isDragging.value) {
    sliderPercentage.value = newPercentage
  }
})

// 监听当前播放时间变化，更新当前歌词索引
watch(() => store.currentTime, (newTime) => {
  if (lyricsList.value.length > 0) {
    let index = -1
    for (let i = 0; i < lyricsList.value.length; i++) {
      if (lyricsList.value[i].time <= newTime) {
        index = i
      } else {
        break
      }
    }
    currentLyricIndex.value = index
  }
})

// 处理开始拖动
const handleDragStart = () => {
  isDragging.value = true
}

const handleUpdateSliderValue = (value) => {
  sliderPercentage.value = value
}

// 处理进度条变化 - 仅在释放时更新
const handleProgressChange = () => {
  // 计算实际时间并跳转
  const newTime = (sliderPercentage.value / 100) * store.totalTime
  console.log("结束正在更新进度："+ sliderPercentage.value)
  console.log("结束返回的值："+ sliderPercentage.value)
  console.log("计算出的实际时间："+ newTime)

  // 直接调用Home.vue中的seek方法而不是仅仅更新store
  // 通过事件传递给Home.vue来执行实际的跳转操作
  emit('seek', newTime)
  isDragging.value = false
}

// 切换播放/暂停状态
const togglePlay = () => {
  store.togglePlay()
}

// 播放上一曲
const playPrevious = () => {
  store.playPrevious()
}

// 播放下一曲
const playNext = () => {
  store.playNext()
}

// 监听歌曲ID变化，重新解析歌词
watch(() => store.id, (newId, oldId) => {
  if (newId !== oldId) {
    lyricsList.value = parseLyrics(store.lyric)
  }
}, { immediate: true })

// 监听歌词变化
watch(() => store.lyric, (newLyric, oldLyric) => {
  if (newLyric !== oldLyric) {
    lyricsList.value = parseLyrics(newLyric)
  }
}, { immediate: true })

// 监听当前歌词索引变化，滚动到当前歌词
watch(currentLyricIndex, () => {
  scrollToCurrentLyric()
})

// 开始拖拽歌词
const startLyricsDrag = (event) => {
  isLyricsDragging.value = true
  const container = lyricsContainerRef.value.querySelector('.lyrics-content')
  dragStartY.value = event.touches ? event.touches[0].clientY : event.clientY
  dragStartScrollTop.value = container.scrollTop
  event.preventDefault()
}

// 拖拽过程中
const onLyricsDrag = (event) => {
  if (!isLyricsDragging.value) return

  const container = lyricsContainerRef.value.querySelector('.lyrics-content')
  const currentY = event.touches ? event.touches[0].clientY : event.clientY
  const diff = dragStartY.value - currentY
  container.scrollTop = dragStartScrollTop.value + diff

  event.preventDefault()
}

// 结束拖拽
const endLyricsDrag = () => {
  isLyricsDragging.value = false
}

// 点击歌词跳转到指定时间
const handleLyricClick = (time) => {
  // 如果正在拖拽歌词，则不处理点击事件
  if (isLyricsDragging.value) {
    return
  }
  emit('seek', time)
}

// 滚动到当前歌词
const scrollToCurrentLyric = () => {
  // 如果正在拖拽，则不自动滚动
  if (isLyricsDragging.value) return

  nextTick(() => {
    const lyricsContainer = lyricsContainerRef.value.querySelector('.lyrics-content')
    const currentLyricElement = lyricsContainer.querySelector('.lyric-line.current')

    if (lyricsContainer && currentLyricElement) {
      const containerHeight = lyricsContainer.clientHeight
      const elementTop = currentLyricElement.offsetTop
      const elementHeight = currentLyricElement.clientHeight

      // 滚动使当前歌词居中
      lyricsContainer.scrollTop = elementTop - containerHeight / 2 + elementHeight / 2
    }
  })
}

</script>

<template>
  <div v-if="visible" class="music-detail-overlay">
    <div class="music-detail-container">
      <!-- 关闭按钮 -->
      <n-icon class="close-button" @click="emit('close')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
      </n-icon>

      <div class="content-wrapper">
        <!-- 左侧：歌曲图片、专辑和歌手信息 -->
        <div class="left-panel">
          <div class="album-art">
            <n-image
              width="300"
              height="300"
              :src="currentSong.pic || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
              :alt="currentSong.name"
              preview-disabled
              class="album-image"
            />
          </div>

          <div class="song-info">
            <n-text class="song-title">{{ currentSong.name || '未知歌曲' }}</n-text>
            <n-text class="artist-info">
              歌手: {{ Array.isArray(currentSong.artistName) ? currentSong.artistName.join(', ') : currentSong.artistName || '未知歌手' }}
            </n-text>
            <n-text class="album-info">
              专辑: {{ currentSong.albumName || '未知专辑' }}
            </n-text>
          </div>
        </div>

        <!-- 右侧：歌词信息 -->
        <div class="right-panel">
          <div
            ref="lyricsContainerRef"
            class="lyrics-container"
          >
            <div
              class="lyrics-content"
              @mousedown="startLyricsDrag"
              @touchstart="startLyricsDrag"
              @mousemove="onLyricsDrag"
              @touchmove="onLyricsDrag"
              @mouseup="endLyricsDrag"
              @touchend="endLyricsDrag"
              @mouseleave="endLyricsDrag"
            >
              <div
                v-for="(line, index) in lyricsList"
                :key="index"
                class="lyric-line"
                :class="{ current: index === currentLyricIndex }"
                @click="handleLyricClick(line.time)"
              >
                {{ line.text }}
              </div>
              <div v-if="lyricsList.length === 0" class="no-lyrics">
                暂无歌词
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 播放控制区域 -->
      <div class="player-controls">
        <div class="progress-container">
          <span class="time-text">{{ formatTime(currentPlayTime) }}</span>
          <n-slider
            :value="sliderPercentage"
            :min="0"
            :max="100"
            :step="0.1"
            :format-tooltip="formatTooltip"
            show-tooltip
            class="progress-slider"
            :on-dragstart="handleDragStart"
            :on-dragend="handleProgressChange"
            :on-update:value="handleUpdateSliderValue"
          />
          <span class="time-text">{{ formatTime(store.totalTime) }}</span>
        </div>

        <div class="control-buttons">
          <n-button circle size="large" @click="playPrevious">
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 4a.5.5 0 0 1 1 0v3.248l6.001-3.001a.5.5 0 0 1 .728.447V11.5a.5.5 0 0 1-.728.447L5 8.752V12a.5.5 0 0 1-1 0V4zm7.5 0a.5.5 0 0 1 1 0v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 1.5-1.5zm5 0a.5.5 0 0 1 1 0v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 1.5-1.5z"/>
              </svg>
            </n-icon>
          </n-button>

          <n-button circle size="large" @click="togglePlay">
            <n-icon v-if="!store.isPlaying">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
              </svg>
            </n-icon>
            <n-icon v-else>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V4a1.5 1.5 0 0 1 1.5-1.5z"/>
              </svg>
            </n-icon>
          </n-button>

          <n-button circle size="large" @click="playNext">
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12 3.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm-5.5 0A.5.5 0 0 1 7 4v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm5 3.252V12.5a.5.5 0 0 1-.728.447L5 9.752V12.5a.5.5 0 0 1-1 0V3.5a.5.5 0 0 1 1 0v2.752l6.001-3.001A.5.5 0 0 1 12 3.698z"/>
              </svg>
            </n-icon>
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.music-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.music-detail-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2c3e50, #1a1a2e);
  border-radius: 0;
  overflow: hidden;
  position: relative;
  box-shadow: none;
}

.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10001;
  background-color: transparent !important;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
}

.close-button:hover {
  background-color: transparent !important;
  color: white;
}

.close-button svg {
  width: 100%;
  height: 100%;
}

.content-wrapper {
  display: flex;
  height: calc(100% - 180px); /* 增加底部控制区域的空间 */
  padding-top: 10px;
  gap: 40px;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}

.album-art {
  width: 300px;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
  color: white;
}

.song-title {
  font-size: 28px;
  font-weight: bold;
  color: white;
}

.artist-info, .album-info {
  font-size: 18px;
  color: #ccc;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.lyrics-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: none;
  outline: none;
  padding: 60px 40px 20px 40px; /* 顶部留出关闭按钮空间 */
  cursor: grab;
  user-select: none;
  overflow: hidden;
}

.lyrics-container:active {
  cursor: grabbing;
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  /* 移除之前的背景色，使用父容器的毛玻璃效果 */
  border-radius: 12px;
  max-height: 100%;
  position: relative;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow-y: scroll; /* 强制显示滚动条以支持拖拽 */
}

.lyric-line {
  padding: 12px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
  font-size: 18px;
  line-height: 1.5;
  font-weight: 300;
  cursor: pointer;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.9);
}

.lyric-line.current {
  color: white;
  font-size: 24px;
  font-weight: 600;
  transform: scale(1.05);
  margin: 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.lyrics-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 30px;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.no-lyrics {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  padding: 40px 20px;
  font-size: 18px;
}

/* 播放控制区域 */
.player-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  z-index: 2;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.progress-slider {
  flex: 1;
}

.time-text {
  color: white;
  font-size: 14px;
  min-width: 40px;
  text-align: center;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
}

.control-buttons .n-button {
  background-color: rgba(255, 255, 255, 0.1);
}

.control-buttons .n-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
    padding: 20px;
    padding-top: 60px;
    height: calc(100% - 150px); /* 移动端为控制区域留出更多空间 */
  }

  .left-panel, .right-panel {
    width: 100%;
  }

  .album-art {
    width: 200px;
    height: 200px;
  }

  .song-title {
    font-size: 24px;
  }

  .artist-info, .album-info {
    font-size: 16px;
  }

  .control-buttons {
    gap: 20px;
  }
}
</style>