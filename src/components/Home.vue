<script setup>
import TopWitge from "./V3TopWitge.vue";
import PlayMusic from "./PlayMusic.vue";
import { useRoute, useRouter } from 'vue-router'
import vDraggable from "../utils/v-draggable";
import { ref,watch ,nextTick, onMounted } from 'vue';
import {NButton, NSpace,NTag,NImage,NAvatar,NText} from "naive-ui";
import usePlayListStore from "../stores/playList";

const router = useRouter()
const stplayListStore = usePlayListStore()

// 添加一个测试方法，验证 pushPlayListAndPlay 是否存在
onMounted(() => {
  console.log('stplayListStore 方法检查:')
  console.log('pushPlayListAndPlay exists:', typeof stplayListStore.pushPlayListAndPlay === 'function')
  console.log('addToPlayList exists:', typeof stplayListStore.addToPlayList === 'function')
})

const audioElement = ref(null)
const showMusicDetail = ref(false)
const isDraggable = ref(true)
const listContainerRef = ref(null)

let nowPlay = ref({
  pic:""
})

let nowplayList = ref([])

// 组件挂载时滚动到当前播放的歌曲
onMounted(() => {
  nextTick(() => {
    scrollToCurrentSong();
  });
});

// 监听 当前播放ID 的变化
watch(
    () => stplayListStore.id,
    (newValue, oldValue) => {
      nowPlay.value = {
        albumName : stplayListStore.albumName,
        albumid : stplayListStore.albumid,
        artistName : stplayListStore.artistName,
        artistids : stplayListStore.artistids,
        brTypes : stplayListStore.brTypes,
        duration : stplayListStore.duration,
        id : stplayListStore.id,
        lyric : stplayListStore.lyric,
        lyricId : stplayListStore.lyricId,
        name : stplayListStore.name,
        pic : stplayListStore.pic,
        plugName : stplayListStore.plugName,
      }

      // 当前播放的歌曲变化时，滚动到对应位置
      nextTick(() => {
        scrollToCurrentSong();
      });
    },
    {
      deep: true
    }
);

// 监听播放列表的变化
watch(
    () => stplayListStore.playList,
    (newPlayList) => {
      nowplayList.value = [...newPlayList]; // 创建新数组确保响应性
      console.log(`播放列表已更新：${JSON.stringify(nowplayList.value)}`);

      // 在下次DOM更新后滚动到当前播放的歌曲
      nextTick(() => {
        scrollToCurrentSong();
      });
    },
    {
      deep: true
    }
);

// 滚动到当前播放歌曲的函数
const scrollToCurrentSong = () => {
  if (listContainerRef.value && nowplayList.value.length > 0) {
    const container = listContainerRef.value.$el || listContainerRef.value;
    // 获取当前播放的歌曲索引
    const currentIndex = stplayListStore.playIndex;

    // 查找对应索引的DOM元素并滚动到该元素
    nextTick(() => {
      const itemElements = container.querySelectorAll('.n-list-item');
      if (itemElements.length > currentIndex && currentIndex >= 0) {
        const targetElement = itemElements[currentIndex];
        if (targetElement) {
          // 滚动到目标元素，使其在可视区域居中
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    });
  }
};

// 控制旋转状态的响应式变量
const isRotating = ref(true);

// 切换旋转状态的方法
const toggleRotation = () => {
  isRotating.value = !isRotating.value;
}
const handleImageError = (e) => {
  console.log('图片加载失败:', e);
  // 可以设置一个默认图片或者保持空值
}

// 播放指定索引的歌曲
const playSong = (index) => {
  // 检查播放列表是否为空
  if (!stplayListStore.playList || stplayListStore.playList.length === 0) {
    window.$message.warning("播放列表为空")
    return
  }

  // 检查索引是否有效
  if (index < 0 || index >= stplayListStore.playList.length) {
    window.$message.error("无效的歌曲索引")
    return
  }
  stplayListStore.setPlayIndex(index)
  window.$message.success("开始播放歌曲")
};

// 处理列表项点击事件
const handleItemClick = (index) => {
  // 如果点击的是当前正在播放的歌曲
  if (index === stplayListStore.playIndex) {
    showSongDetail()
    window.$message.info("正在播放点击成功");
  } else {
    // 如果点击的是其他歌曲，则播放该歌曲
    playSong(index);
  }
};

// 显示歌曲详情
const showSongDetail = () => {
  showMusicDetail.value = true;
};

// 隐藏歌曲详情
const hideSongDetail = () => {
  showMusicDetail.value = false;
};

// 音频事件处理函数
const handleLoadedMetadata = () => {
  if (audioElement.value) {
    stplayListStore.setTotalTime(audioElement.value.duration)
  }
}

const handleTimeUpdate = () => {
  if (audioElement.value) {
    stplayListStore.setCurrentTime(audioElement.value.currentTime)
  }
}

const handlePlay = () => {
  stplayListStore.setIsPlaying(true)
}

const handlePause = () => {
  stplayListStore.setIsPlaying(false)
}

const handleEnded = () => {
  stplayListStore.setIsPlaying(false)
  stplayListStore.setCurrentTime(0)
  // 自动播放下一首
  stplayListStore.playNext()
}

const handleError = (e) => {
  console.error("音频播放出错:", e)
  window.$message.error("音频播放出错，请检查网络或文件格式")
}

// 监听音乐URL变化，更新音频元素的src
watch(() => stplayListStore.musicUrl, (newUrl) => {
  console.log("音乐URL变化:", newUrl)

  if (audioElement.value) {
    // 检查URL是否有效
    if (!newUrl || newUrl.trim() === '') {
      console.warn("音频URL为空")
      return
    }

    audioElement.value.src = newUrl

    // 如果有自动播放标志，则开始播放
    if (stplayListStore.shouldAutoPlay) {
      nextTick(() => {
        // 添加一个小延迟确保src已更新
        setTimeout(() => {
          playAudio()
        }, 100)
      })
      stplayListStore.shouldAutoPlay = false
    }
  }
})

// 播放音频
const playAudio = () => {
  // 检查播放列表是否为空
  if (!stplayListStore.playList || stplayListStore.playList.length === 0) {
    console.warn("播放列表为空，无法播放")
    window.$message.warning("播放列表为空")
    stplayListStore.setIsPlaying(false)
    return
  }

  // 检查当前播放索引是否有效
  if (stplayListStore.playIndex < 0 || stplayListStore.playIndex >= stplayListStore.playList.length) {
    console.warn("当前播放索引无效")
    window.$message.error("当前播放索引无效")
    stplayListStore.setIsPlaying(false)
    return
  }

  // 检查音乐URL是否有效
  if (!stplayListStore.musicUrl || stplayListStore.musicUrl.trim() === '') {
    const currentSong = stplayListStore.playList[stplayListStore.playIndex]
    if (!currentSong || !currentSong.url || currentSong.url.trim() === '') {
      window.$message.error("没有可播放的音频文件")
      stplayListStore.setIsPlaying(false)
      return
    } else {
      // 如果store中的URL为空，但歌曲对象中有URL，则更新store
      stplayListStore.setMusicUrl(currentSong.url)
      console.log("从当前歌曲对象中获取URL:", currentSong.url)
    }
  }

  if (audioElement.value && stplayListStore.musicUrl) {
    console.log("尝试播放音频:", stplayListStore.musicUrl)

    audioElement.value.play().catch(error => {
      console.error("播放失败:", error)
      let errorMsg = "播放失败"

      if (error.name === 'NotAllowedError') {
        errorMsg = "浏览器不允许自动播放，请手动点击播放"
      } else if (error.name === 'NotSupportedError') {
        errorMsg = "不支持的音频格式"
      } else {
        errorMsg = "播放失败: " + error.message
      }

      window.$message.error(errorMsg)
      stplayListStore.setIsPlaying(false)
    })
  } else {
    console.warn("无法播放音频: audio元素或URL不存在")
    window.$message.error("播放组件未正确初始化")
  }
}

// 暂停音频
const pauseAudio = () => {
  if (audioElement.value) {
    audioElement.value.pause()
  }
}

// 切换播放/暂停状态
const toggleAudio = () => {
  if (stplayListStore.isPlaying) {
    pauseAudio()
  } else {
    playAudio()
  }
}

// 跳转到指定时间
const seekAudio = (time) => {
  if (audioElement.value) {
    audioElement.value.currentTime = time
  }
}

// 添加一个标志来标识是否是用户触发的跳转
let isUserSeeking = false

// 修改seekTo方法，添加标志
const seekTo = (time) => {
  isUserSeeking = true
  seekAudio(time)
  // 延迟重置标志，确保跳转操作完成
  setTimeout(() => {
    isUserSeeking = false
  }, 100)
}

// 设置音量
const setAudioVolume = (volume) => {
  if (audioElement.value) {
    audioElement.value.volume = volume
  }
}

// 监听播放状态变化
watch(() => stplayListStore.isPlaying, (isPlaying) => {
  if (isPlaying) {
    playAudio()
  } else {
    pauseAudio()
  }
})

// 监听音量变化
watch(() => stplayListStore.volume, (volume) => {
  setAudioVolume(volume)
})

// 监听跳转时间变化
watch(() => stplayListStore.currentTime, (time) => {
  // 使用一个简单的条件来避免不必要的跳转
  // 只有当audio元素的当前时间和store中的时间差异较大时才跳转
  if (audioElement.value && Math.abs(audioElement.value.currentTime - time) > 0.5) {
    seekAudio(time)
  }
})

// 监听播放列表变化，如果列表为空则重置播放状态
watch(() => stplayListStore.playList, (newPlayList) => {
  nowplayList.value = [...newPlayList]
  console.log(`播放列表已更新：${JSON.stringify(nowplayList.value)}`)

  // 如果播放列表为空，重置播放状态
  if (!newPlayList || newPlayList.length === 0) {
    stplayListStore.setIsPlaying(false)
    stplayListStore.setCurrentTime(0)
    stplayListStore.setTotalTime(0)
    stplayListStore.setPlayIndex(-1)
  }

  // 在下次DOM更新后滚动到当前播放的歌曲
  nextTick(() => {
    scrollToCurrentSong()
  })
})

</script>
<template>

  <n-flex vertical >
    <TopWitge />
    <router-view />
    <!-- 隐藏的音频元素 -->
    <audio
      ref="audioElement"
      :src="stplayListStore.musicUrl"
      preload="auto"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @error="handleError"
    ></audio>
    <n-float-button
        v-if="nowplayList.length > 0"
        :right="300"
        :bottom="400"
        menu-trigger="hover"
        class="always-top-button"
        style="background: lightslategray"
    >
      <template #menu>
        <n-card title="播放列表" size="small" style="width: 500px;cursor:default">
          <n-list ref="listContainerRef" class="list-container" hoverable clickable>
            <n-list-item v-for="(item, index) in nowplayList" :key="item.id || index" @click="() => handleItemClick(index)">
              <n-thing>
                <template #avatar>
                  <n-avatar
                      size="large"
                      :round="true"
                      :src="item.pic || ''"
                      :class="{ 'rotating-avatar': isRotating }"
                      @error="handleImageError"
                  />
                </template>

                <template #description>
                  <n-ellipsis style="max-width: 140px">
                    {{ Array.isArray(item.artistName) ? item.artistName.join(', ') : item.artistName || '未知歌手' }}
                    <template #tooltip>
                      <div style="text-align: center">
                        {{ Array.isArray(item.artistName) ? item.artistName.join(', ') : item.artistName || '未知歌手' }}
                      </div>
                    </template>
                  </n-ellipsis>
                </template>

                <template #header>
                  <n-ellipsis style="max-width: 140px">
                    {{ item.name || '未知歌曲' }}
                    <template #tooltip>
                      <div style="text-align: center">
                        {{ item.name || '未知歌曲' }}
                      </div>
                    </template>
                  </n-ellipsis>
                </template>

                <template #header-extra>
                  <n-ellipsis style="max-width: 140px">
                    {{ item.albumName || '未知专辑' }}
                    <template #tooltip>
                      <div style="text-align: center">
                        {{ item.albumName || '未知专辑' }}
                      </div>
                    </template>
                  </n-ellipsis>
                </template>
              </n-thing>

              <template #suffix>
                <n-button v-if="index !== stplayListStore.playIndex" @click.stop="() => playSong(index)">播放</n-button>
                <n-button v-else @click.stop="() => playSong(index)">暂停</n-button>

                <n-tag v-else type="success">正在播放</n-tag>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </template>
      <n-avatar
          size="large"
          :round="true"
          :src="nowPlay.pic||''"
          :class="{ 'rotating-avatar': isRotating }"
          @error="handleImageError"
      />
    </n-float-button>

    <!-- 歌曲详情弹窗 -->
    <PlayMusic
      :song-info="nowPlay"
      :visible="showMusicDetail"
      @close="hideSongDetail"
      @seek="seekTo"
    />
  </n-flex>
</template>
<style >
.always-top-button {
  z-index: 9999 !important;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0;
}

::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  cursor: pointer;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.15);
  transition: color 0.2s ease;
}

.menu-center-wrapper {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
}

.n-float-button__menu {
  transform: translate(-30%, -0%) !important;
}
.list-container {
  max-height: 300px;
  overflow-y: auto;
}
</style>
<style>
/* 添加旋转动画 */
.rotating-avatar {
  animation: rotate 5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
