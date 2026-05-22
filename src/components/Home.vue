<script setup>
import TopWitge from "./V3TopWitge.vue";
import PlayMusic from "./PlayMusic.vue";
import PlayMusicMobile from "./PlayMusicMobile.vue"; // Added import for mobile player
import { useRoute, useRouter } from 'vue-router'
import { ref,watch ,nextTick, onMounted, onUnmounted } from 'vue';
import {NButton, NSpace,NTag,NImage,NAvatar,NText, NModal} from "naive-ui"; // Added NModal import
import usePlayListStore from "../stores/playList";
import configInfoStore from "../stores/config";
import {getAllOption, getTidalProxyUrl, baseUrl} from "../utils/api.js";
import * as dashjs from 'dashjs';

// 调试：检查 dashjs 是否正确导入
console.log('dashjs 导入检查:', dashjs);
console.log('dashjs.MediaPlayer:', dashjs.MediaPlayer);


const router = useRouter()
const stplayListStore = usePlayListStore()
const stconfigInfoStore =configInfoStore()


// 添加一个测试方法，验证 pushPlayListAndPlay 是否存在
// onMounted(() => {
//
// })

const audioElement = ref(null)
const showMusicDetail = ref(false)
const isDraggable = ref(true)
const listContainerRef = ref(null)

// DASH 播放器实例
let dashPlayer = null
// 当前是否为 DASH 流
const isDashStream = ref(false)
// 保存 DASH 流暂停时的时间
let dashPauseTime = 0

// 监听 isDashStream 变化，用于调试
watch(isDashStream, (newValue, oldValue) => {
  console.log('🔍 isDashStream 变化:', oldValue, '->', newValue);
});

// 检测是否为移动设备
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 添加键盘事件处理
const handleKeyDown = (event) => {
  // 防止在输入框中按这些键时触发播放控制
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  switch (event.key) {
    case ' ':
      event.preventDefault();
      toggleAudio();
      break;
    case 'p':
    case 'P':
      event.preventDefault();
      stplayListStore.playPrevious();
      break;
    case 'n':
    case 'N':
      event.preventDefault();
      stplayListStore.playNext();
      break;
  }
};

let nowPlay = ref({
  pic:"https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png"
})

let nowplayList = ref([])

// 移动端播放列表显示控制
const showMobilePlaylist = ref(false)

// 添加移动端播放器显示控制
const showMobilePlayer = ref(false);

// 组件挂载时滚动到当前播放的歌曲
onMounted(() => {
  nextTick(() => {
    // 页面加载完成后检查播放列表是否有数据
    if (stplayListStore.playList && stplayListStore.playList.length > 0) {
      // console.log("初始化数据："+JSON.stringify(stplayListStore.playList))
      // 更新本地播放列表
      nowplayList.value = [...stplayListStore.playList];

      // 如果播放列表有数据，则更新当前播放信息
      if (stplayListStore.playIndex >= 0 && stplayListStore.playIndex < stplayListStore.playList.length) {
        const currentSong = stplayListStore.playList[stplayListStore.playIndex];
        // console.log("当前播放歌曲："+JSON.stringify(currentSong))
        nowPlay.value = { ...currentSong };

        // 如果有音乐URL，则设置到audio元素
        if (stplayListStore.musicUrl && audioElement.value) {
          audioElement.value.src = stplayListStore.musicUrl;
        }
      }

      // 设置播放状态
      if (stplayListStore.isPlaying && audioElement.value) {
        nextTick(() => {
          // 确保在DOM更新后再尝试播放
          setTimeout(() => {
            playAudio();
          }, 100);
        });
      }
    }

    scrollToCurrentSong();
  });

  // 添加键盘事件监听器
  window.addEventListener('keydown', handleKeyDown);
  
  // 🚀 预检查 dash.js 是否可用（不创建实例，避免 reset 错误）
  if (typeof dashjs !== 'undefined' && dashjs.MediaPlayer) {
    console.log('✅ dash.js 库已加载，将在播放时创建实例');
  } else {
    console.warn('⚠️ dash.js 未加载');
  }
});

// 组件卸载时移除键盘事件监听器
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  // 清理 DASH 播放器
  stopDashPlayback();
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

      // 如果播放列表不为空且有当前播放索引，则更新当前播放歌曲信息
      if (newPlayList && newPlayList.length > 0) {
        if (stplayListStore.playIndex >= 0 && stplayListStore.playIndex < newPlayList.length) {
          const currentSong = newPlayList[stplayListStore.playIndex];
          nowPlay.value = { ...currentSong };
          
          // 检查新歌曲是否为 DASH 流，如果不是则停止 DASH 播放器
          if (!currentSong.otherData || currentSong.otherData.urlType !== 'DASH') {
            if (isDashStream.value) {
              stopDashPlayback();
            }
          }
        }
      } else {
        // 如果播放列表为空，使用默认图片
        nowPlay.value = {
          pic: "https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png"
        };
        // 停止 DASH 播放器
        stopDashPlayback();
      }

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
    // 在移动端显示模态框而不是跳转页面
    if (isMobile()) {
      showMobilePlayer.value = true;
    } else {
      showSongDetail();
      window.$message.info("正在播放点击成功");
    }
  } else {
    // 如果点击的是其他歌曲，则播放该歌曲
    playSong(index);
  }
};

// 处理 PlayMusic 组件的播放/暂停切换事件
const handleTogglePlay = () => {
  console.log('🎵 收到 toggle-play 事件');
  console.log('当前 isPlaying:', stplayListStore.isPlaying);
  console.log('isDashStream:', isDashStream.value);
  console.log('dashPlayer 存在:', !!dashPlayer);
  
  // 只要 dashPlayer 存在，就直接控制它（不管 isDashStream 的值）
  if (dashPlayer) {
    // DASH 流：直接控制播放器
    if (stplayListStore.isPlaying) {
      // 暂停 - dash.js 会触发 PLAYBACK_PAUSED 事件，在其中保存时间
      console.log('⏸️ 准备暂停 DASH');
      dashPlayer.pause();
      console.log('✅ DASH 已调用 pause()');
    } else {
      // 恢复播放 - dash.js 会自动从暂停位置继续
      console.log('▶️ 准备恢复 DASH 播放');
      dashPlayer.play();
      console.log('✅ DASH 已调用 play()');
    }
  } else {
    // 普通音频：通过 store 控制
    console.log('ℹ️ 普通音频，调用 store.togglePlay()');
    stplayListStore.togglePlay();
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

// 清空播放列表
const clearPlayList = () => {
  stplayListStore.clearPlayList();
  nowplayList.value = [];
  nowPlay.value = {
    pic:"https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png"
  };

  // 停止 DASH 播放器
  if (dashPlayer) {
    dashPlayer.reset();
    dashPlayer = null;
  }
  isDashStream.value = false;

  // 重置音频元素
  if (audioElement.value) {
    // 暂停播放
    audioElement.value.pause();
    // 清空 src
    audioElement.value.src = '';
    // 重置当前时间
    audioElement.value.currentTime = 0;
  }

  // 重置播放状态
  stplayListStore.setIsPlaying(false);
  stplayListStore.setCurrentTime(0);
  stplayListStore.setTotalTime(0);
  stplayListStore.setMusicUrl('');
  // 重置当前播放索引为 -1（表示没有正在播放的歌曲）
  stplayListStore.playIndex = -1;

  window.$message.success("播放列表已清空");
};

// 删除指定索引的歌曲
const deleteSong = (index) => {
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

  // 如果要删除的是当前正在播放的歌曲
  if (index === stplayListStore.playIndex) {
    const hasMoreSongs = stplayListStore.playList.length > 1
    
    // 先删除歌曲
    stplayListStore.removeSong(index)
    
    // 如果还有其他歌曲，则播放同一索引（现在是下一首了）
    if (hasMoreSongs) {
      // 确保索引不越界
      const newIndex = Math.min(index, stplayListStore.playList.length - 1)
      stplayListStore.setPlayIndex(newIndex)
    } else {
      // 是最后一首，停止播放
      stopDashPlayback();
      if (audioElement.value) {
        audioElement.value.pause()
        audioElement.value.src = ''
      }
      stplayListStore.setIsPlaying(false)
      stplayListStore.setMusicUrl('')
      stplayListStore.playIndex = -1
      nowPlay.value = {
        pic: "https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png"
      }
    }
  } else {
    // 如果删除的不是当前播放的歌曲
    if (index < stplayListStore.playIndex) {
      // 如果删除的是当前播放歌曲之前的歌曲，需要调整播放索引
      stplayListStore.setPlayIndex(stplayListStore.playIndex - 1)
    }
    // 从播放列表中移除该歌曲
    stplayListStore.removeSong(index)
  }
  
  window.$message.success("删除成功")
};

// 音频事件处理函数
const handleLoadedMetadata = () => {
  // 只有在非 DASH 流的情况下才处理元数据
  if (audioElement.value && (!isDashStream.value || !dashPlayer)) {
    stplayListStore.setTotalTime(audioElement.value.duration)
  }
}

const handleTimeUpdate = () => {
  // 只有在非 DASH 流的情况下才处理时间更新
  if (audioElement.value && (!isDashStream.value || !dashPlayer)) {
    stplayListStore.setCurrentTime(audioElement.value.currentTime)
  }
}

const handlePlay = () => {
  // 只有在非 DASH 流的情况下才设置播放状态
  if (!isDashStream.value || !dashPlayer) {
    stplayListStore.setIsPlaying(true)
  }
}

const handlePause = () => {
  // 只有在非 DASH 流的情况下才设置暂停状态
  if (!isDashStream.value || !dashPlayer) {
    stplayListStore.setIsPlaying(false)
  }
}

const handleEnded = () => {
  // 只有在非 DASH 流的情况下才处理结束事件
  if (!isDashStream.value || !dashPlayer) {
    stplayListStore.setIsPlaying(false)
    stplayListStore.setCurrentTime(0)
    // 自动播放下一首
    stplayListStore.playNext()
  }
}

const handleError = (e) => {
  // 检查是否为 DASH 流，如果是则不处理这个错误
  const currentSong = stplayListStore.playList && stplayListStore.playList.length > 0 
    ? stplayListStore.playList[stplayListStore.playIndex] 
    : null;
  
  if (currentSong && currentSong.otherData && currentSong.otherData.urlType === 'DASH') {
    // 这是 DASH 流，让 dash.js 处理错误
    console.log("DASH 流错误，由 dash.js 处理");
    return;
  }

  // 如果播放列表为空，则不显示错误（可能是清空播放列表导致的正常现象）
  if (!stplayListStore.playList || stplayListStore.playList.length === 0) {
    console.log("播放列表为空，忽略音频错误");
    return;
  }

  console.error("音频播放出错:", e);
  
  // 静默处理切换时的临时错误，不显示弹框
  // 只在真正需要用户注意时才显示错误
  
  // 确保播放状态被正确设置为停止
  stplayListStore.setIsPlaying(false);
}

// 监听音乐URL变化，更新音频元素的src
watch(() => stplayListStore.musicUrl, (newUrl) => {
  console.log("🎵 音乐URL变化:", newUrl ? '有值' : '空值')
  
  // 重要：先检查当前歌曲的类型，再决定如何处理
  const currentSong = stplayListStore.playList && stplayListStore.playList.length > 0 
    ? stplayListStore.playList[stplayListStore.playIndex] 
    : null;
  
  console.log('🔍 watch musicUrl - 当前歌曲:', currentSong?.name);
  console.log('🔍 watch musicUrl - otherData:', currentSong?.otherData);
  console.log('🔍 watch musicUrl - playIndex:', stplayListStore.playIndex);
  
  // 检查是否为 DASH 流（优先使用 otherData，其次使用 url 特征）
  const isDash = currentSong && (
    (currentSong.otherData && currentSong.otherData.urlType === 'DASH') ||
    (newUrl && (newUrl.includes('<MPD') || newUrl.includes('dash+xml')))
  );
  
  if (isDash) {
    console.log("✅ watch 检测到 DASH 流 URL 变化")
    // DASH 流的播放由 playAudio 函数处理，不设置到 audio 元素
    if (stplayListStore.shouldAutoPlay) {
      nextTick(() => {
        setTimeout(() => {
          playAudio()
        }, 100)
      })
      stplayListStore.shouldAutoPlay = false
    }
    return
  }

  // 普通音频处理
  console.log("ℹ️ watch 处理普通音频 URL")
  
  // 如果是从 DASH 切换到普通音频，需要先清理 DASH 播放器
  if (isDashStream.value || dashPlayer) {
    console.log('🧹 watch: 检测到从 DASH 切换到普通音频，清理 DASH 播放器');
    stopDashPlayback();
    
    // 等待更长时间确保清理完成（增加到 500ms）
    setTimeout(() => {
      if (audioElement.value && newUrl && newUrl.trim() !== '') {
        console.log('✅ watch: DASH 清理完成，设置普通音频 URL');
        
        // 再次确保 audio 元素是干净的
        audioElement.value.pause();
        audioElement.value.removeAttribute('src');
        audioElement.value.src = '';
        audioElement.value.load();
        
        // 然后设置新 URL
        audioElement.value.src = newUrl;
        
        // 如果有自动播放标志，则直接播放（不调用 playAudio，避免重复检查）
        if (stplayListStore.shouldAutoPlay) {
          nextTick(() => {
            setTimeout(() => {
              console.log('▶️ watch: 自动播放普通音频');
              audioElement.value.play().catch(error => {
                // 静默处理播放错误，不显示弹框
                console.error('❌ watch: 播放失败:', error);
                stplayListStore.setIsPlaying(false);
              });
            }, 200)
          })
          stplayListStore.shouldAutoPlay = false
        }
      }
    }, 500); // 增加到 500ms，确保完全清理
    return;
  }
  
  if (audioElement.value) {
    // 检查URL是否有效
    if (!newUrl || newUrl.trim() === '') {
      console.warn("音频URL为空")
      return
    }

    audioElement.value.src = newUrl

    // 如果有自动播放标志，则直接播放（不调用 playAudio）
    if (stplayListStore.shouldAutoPlay) {
      nextTick(() => {
        // 添加一个小延迟确保src已更新
        setTimeout(() => {
          console.log('▶️ watch: 自动播放普通音频');
          audioElement.value.play().catch(error => {
            // 静默处理播放错误，不显示弹框
            console.error('❌ watch: 播放失败:', error);
            stplayListStore.setIsPlaying(false);
          });
        }, 100)
      })
      stplayListStore.shouldAutoPlay = false
    }
  }
})

// 播放音频
const playAudio = () => {
  console.log('=== playAudio 被调用 ===');
  console.log('播放列表:', stplayListStore.playList);
  console.log('当前索引:', stplayListStore.playIndex);
  console.log('音乐URL:', stplayListStore.musicUrl);
  
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

  // 检查是否为 DASH 流
  const currentSong = stplayListStore.playList[stplayListStore.playIndex]
  console.log('当前歌曲:', currentSong);
  console.log('otherData:', currentSong?.otherData);
  
  if (currentSong && currentSong.otherData && currentSong.otherData.urlType === 'DASH') {
    console.log("✅ 检测到 DASH 流，使用 dash.js 播放")
    // 确保 URL 存在
    if (!stplayListStore.musicUrl || stplayListStore.musicUrl.trim() === '') {
      if (currentSong.url && currentSong.url.trim() !== '') {
        stplayListStore.setMusicUrl(currentSong.url)
      } else {
        window.$message.error("没有可播放的 DASH 音频文件")
        stplayListStore.setIsPlaying(false)
        return
      }
    }
    playDashMpd(stplayListStore.musicUrl)
    return
  }

  console.log("ℹ️ 普通音频播放");
  // 普通音频播放逻辑
  
  // 重要：如果是从 DASH 切换到普通音频，需要先清理 DASH 播放器
  if (isDashStream.value || dashPlayer) {
    console.log('🧹 检测到之前是 DASH 流，先清理 DASH 播放器');
    stopDashPlayback();
    
    // 等待更长时间，确保 audio 元素完全重置（增加到 300ms）
    // 这样可以避免 "MEDIA_ERR_SRC_NOT_SUPPORTED" 错误
    setTimeout(() => {
      console.log('✅ DASH 清理完成，继续播放普通音频');
      
      // 再次确保 audio 元素是干净的
      if (audioElement.value) {
        audioElement.value.pause();
        audioElement.value.removeAttribute('src');
        audioElement.value.src = '';
        audioElement.value.load();
      }
      
      playNormalAudio();
    }, 300);
    return;
  }
  
  // 如果不是从 DASH 切换，直接播放
  playNormalAudio();
}

// 播放普通音频的辅助函数
const playNormalAudio = () => {
  const currentSong = stplayListStore.playList[stplayListStore.playIndex]
  
  // 检查音乐URL是否有效
  if (!stplayListStore.musicUrl || stplayListStore.musicUrl.trim() === '') {
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
  if (isDashStream.value && dashPlayer) {
    // DASH 流暂停 - 使用 dash.js 的 pause 方法
    dashPlayer.pause();
    stplayListStore.setIsPlaying(false);
  } else if (audioElement.value) {
    audioElement.value.pause()
  }
}

// 切换播放/暂停状态
const toggleAudio = () => {
  console.log('🎵 toggleAudio 被调用');
  console.log('当前 isPlaying:', stplayListStore.isPlaying);
  console.log('dashPlayer 存在:', !!dashPlayer);
  
  // 只要 dashPlayer 存在，就直接控制它（不管 isDashStream 的值）
  if (dashPlayer) {
    // DASH 流：直接控制播放器
    if (stplayListStore.isPlaying) {
      // 暂停 - dash.js 会触发 PLAYBACK_PAUSED 事件，在其中保存时间
      console.log('⏸️ 准备暂停 DASH');
      dashPlayer.pause();
      console.log('✅ DASH 已调用 pause()');
    } else {
      // 恢复播放 - dash.js 会自动从暂停位置继续
      console.log('▶️ 准备恢复 DASH 播放');
      dashPlayer.play();
      console.log('✅ DASH 已调用 play()');
    }
  } else {
    // 普通音频：通过 store 控制
    console.log('ℹ️ 普通音频，调用 store.togglePlay()');
    stplayListStore.togglePlay();
  }
};

// 跳转到指定时间
const seekAudio = (time) => {
  if (isDashStream.value && dashPlayer) {
    // DASH 流跳转
    dashPlayer.seek(time);
  } else if (audioElement.value) {
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
  if (isDashStream.value && dashPlayer) {
    // DASH 流音量控制
    dashPlayer.setVolume(volume);
  } else if (audioElement.value) {
    audioElement.value.volume = volume
  }
}

// 停止 DASH 播放 - 对应 tidal-player.html 第 149-157 行的 stopPlayback 函数
const stopDashPlayback = () => {
  console.log('🛑 stopDashPlayback 被调用');
  
  if (dashPlayer) {
    try {
      console.log('🔄 开始清理 dashPlayer...');
      
      // 先暂停播放
      dashPlayer.pause();
      console.log('✅ 已暂停播放');
      
      // 然后重置播放器
      dashPlayer.reset();
      console.log('✅ dashPlayer.reset() 完成');
    } catch (e) {
      console.warn('⚠️ dashPlayer 清理出错:', e);
    }
    
    // 最后将播放器设为 null
    dashPlayer = null;
    console.log('✅ dashPlayer 已设为 null');
  }
  
  isDashStream.value = false;
  dashPauseTime = 0; // 重置暂停时间
  
  if (audioElement.value) {
    try {
      console.log('🔄 开始清理 audioElement...');
      
      // 先暂停
      audioElement.value.pause();
      
      // 清空所有源
      audioElement.value.removeAttribute('src');
      audioElement.value.src = '';
      audioElement.value.srcObject = null;
      
      // 移除所有子 source 元素
      while (audioElement.value.firstChild) {
        audioElement.value.removeChild(audioElement.value.firstChild);
      }
      
      // 强制加载空源，清除 MediaSource
      audioElement.value.load();
      
      console.log('✅ audioElement 已清理');
    } catch (e) {
      console.warn('⚠️ audioElement 清理出错:', e);
    }
  }
  
  console.log('✅ stopDashPlayback 完成');
}

// 播放 DASH MPD - 完全按照 tidal-player.html 第 159-242 行的 playMpd 函数
const playDashMpd = (mpdData) => {
  console.log('=== playDashMpd 被调用 ===');
  
  // 对应 tidal-player.html 第 160 行：stopPlayback()
  stopDashPlayback();
  
  // 对应 tidal-player.html 第 164 行：检查 dash.js 是否加载
  if (typeof dashjs === 'undefined') {
    console.error('❌ dash.js 未加载');
    window.$message.error('dash.js 未加载');
    return;
  }
  
  console.log('✅ dash.js 已加载');
  
  let mpdXml;
  
  // 对应 tidal-player.html 第 171-178 行：判断是 Data URI 还是原始 XML
  if (mpdData.startsWith('data:application/dash+xml;base64,')) {
    // Base64 编码的 MPD（兼容旧格式）
    const base64Content = mpdData.replace('data:application/dash+xml;base64,', '');
    mpdXml = atob(base64Content);
    console.log('从 Data URI 解码 MPD');
  } else {
    // 原始 XML 字符串
    mpdXml = mpdData;
    console.log('使用原始 XML MPD');
  }
  
  // 对应 tidal-player.html 第 180-182 行：输出 MPD 内容
  console.log('===== 原始 MPD 内容（前2000字符）=====');
  console.log(mpdXml.substring(0, 2000));
  console.log('=====================================');
  
  // 对应 tidal-player.html 第 185-186 行：查找所有 URL 属性
  const allUrls = mpdXml.match(/(sourceURL|media|initialization)=["']([^"']+)["']/g);
  console.log('找到的所有 URL 属性:', allUrls);
  
  // 对应 tidal-player.html 第 190-191 行：设置代理前缀（使用后端服务器地址）
  const proxyPrefix = baseUrl + '/api/proxy/tidal/direct?url=';
  console.log('代理前缀:', proxyPrefix);
  
  // 对应 tidal-player.html 第 194-204 行：替换所有 HTTPS URL
  let replaceCount = 0;
  const modifiedMpd = mpdXml.replace(
    /(initialization|media|sourceURL)="(https?:\/\/[^\"]+)"/g,
    (match, attr, url) => {
      replaceCount++;
      // URL 编码时保留 $Number$ 不被编码
      const encodedUrl = encodeURIComponent(url).replace(/%24Number%24/g, '$Number$');
      const finalUrl = `${proxyPrefix}${encodedUrl}`;
      console.log(`🔗 替换 ${replaceCount}:`);
      console.log(`   原始: ${url.substring(0, 100)}...`);
      console.log(`   代理: ${finalUrl.substring(0, 150)}...`);
      return `${attr}="${finalUrl}"`;
    }
  );
  
  // 对应 tidal-player.html 第 206 行：输出替换数量
  console.log(`总共替换了 ${replaceCount} 个 URL`);
  
  // 对应 tidal-player.html 第 208-209 行：输出修改前后的 MPD
  console.log('原始 MPD:', mpdXml.substring(0, 500));
  console.log('修改后 MPD:', modifiedMpd.substring(0, 500));
  
  // 对应 tidal-player.html 第 212-221 行：检查 URL 替换情况
  const urlMatches = mpdXml.match(/(sourceURL|media)=\"(https?:\/\/[^\"]+)\"/g);
  console.log('找到的 URL 数量:', urlMatches ? urlMatches.length : 0);
  if (urlMatches) {
    console.log('原始 URLs:', urlMatches);
  }
  
  const modifiedMatches = modifiedMpd.match(/(sourceURL|media)=\"([^\"]+)\"/g);
  if (modifiedMatches) {
    console.log('修改后 URLs:', modifiedMatches);
  }
  
  // 对应 tidal-player.html 第 224-225 行：重新编码为 Data URI
  const modifiedBase64 = btoa(modifiedMpd);
  const modifiedDataUri = 'data:application/dash+xml;base64,' + modifiedBase64;
  
  console.log('📦 Data URI 长度:', modifiedDataUri.length);
  console.log('📦 Data URI 前100字符:', modifiedDataUri.substring(0, 100));
  
  // 对应 tidal-player.html 第 227-228 行：创建并初始化 dash.js 播放器
  if (!audioElement.value) {
    console.error('❌ audioElement.value 为 null');
    window.$message.error('音频元素未准备好');
    return;
  }
  
  console.log('🎵 创建 dash.js MediaPlayer');
  dashPlayer = dashjs.MediaPlayer().create();
  console.log('✅ dashPlayer 创建成功');
  
  console.log('🎵 调用 initialize');
  dashPlayer.initialize(audioElement.value, modifiedDataUri, true);
  console.log('✅ initialize 调用完成');
  
  // 对应 tidal-player.html 第 230-232 行：监听 STREAM_INITIALIZED 事件
  dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
    console.log('✅✅✅ DASH 流初始化成功，可以播放了');
    // 重置暂停时间
    dashPauseTime = 0;
    stplayListStore.setIsPlaying(true);
    
    // 设置总时长
    const duration = dashPlayer.duration();
    if (duration && duration > 0) {
      stplayListStore.setTotalTime(duration);
      console.log('DASH 流总时长:', duration);
    }
  });
  
  // 使用定时器更新进度（替代 TIME_UPDATED 事件）
  let progressTimer = null;
  const startProgressUpdate = () => {
    if (progressTimer) return;
    progressTimer = setInterval(() => {
      if (dashPlayer && !dashPlayer.isPaused()) {
        const currentTime = dashPlayer.time();
        stplayListStore.setCurrentTime(currentTime);
      }
    }, 500); // 每 500ms 更新一次
  };
  
  const stopProgressUpdate = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };
  
  // 监听播放开始
  dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
    console.log('▶️ DASH 播放开始 - 设置 isPlaying = true');
    stplayListStore.setIsPlaying(true);
    startProgressUpdate();
  });
  
  // 监听播放暂停
  dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
    console.log('⏸️ DASH 播放暂停 - 设置 isPlaying = false');
    // 保存暂停时的时间
    dashPauseTime = dashPlayer.time();
    console.log('💾 保存暂停时间:', dashPauseTime);
    stplayListStore.setIsPlaying(false);
    stopProgressUpdate();
  });
  
  // 监听播放结束
  dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, () => {
    console.log('⏹️ DASH 播放结束 - 准备切换到下一曲');
    dashPauseTime = 0; // 重置暂停时间
    stplayListStore.setIsPlaying(false);
    stopProgressUpdate();
    
    // 重要：不要在这里重置 isDashStream 或清理播放器
    // 等待 playAudio() 根据下一首歌曲的类型决定如何处理
    
    // 自动播放下一曲 - 添加小延迟确保状态更新完成
    setTimeout(() => {
      console.log('🔄 调用 playNext()');
      stplayListStore.playNext();
    }, 50);
  });
  
  // 对应 tidal-player.html 第 234-237 行：监听 ERROR 事件
  dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e) => {
    console.error('❌ DASH 错误:', e);
    
    // 提取更详细的错误信息
    let errorMsg = '未知错误';
    if (e.error) {
      errorMsg = e.error.message || e.error.code || '未知错误';
    }
    
    // 静默处理所有 DASH 错误，不显示弹框
    // 只在控制台记录错误信息
    
    stplayListStore.setIsPlaying(false);
    stopProgressUpdate();
  });
  
  isDashStream.value = true;
  console.log('✅ DASH 播放器设置完成');
}

// 监听播放状态变化 - 仅用于普通音频，DASH 流由事件驱动
watch(() => stplayListStore.isPlaying, (isPlaying) => {
  // DASH 流不通过这个 watch 控制，由 dash.js 事件驱动
  if (isDashStream.value && dashPlayer) {
    console.log('⚠️ DASH 流跳过 watch 控制，由事件驱动');
    return;
  }
  
  // 普通音频控制
  console.log('🎵 普通音频 isPlaying 状态变化:', isPlaying);
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
  if (isDashStream.value && dashPlayer) {
    // DASH 流跳转
    if (Math.abs(dashPlayer.time() - time) > 0.5) {
      seekAudio(time)
    }
  } else if (audioElement.value && Math.abs(audioElement.value.currentTime - time) > 0.5) {
    seekAudio(time)
  }
})

// 监听播放列表变化，如果列表为空则重置播放状态
watch(() => stplayListStore.playList, (newPlayList) => {
  nowplayList.value = [...newPlayList]
  console.log(`播放列表已更新：${JSON.stringify(nowplayList.value)}`)

  // 如果播放列表为空，重置播放状态
  if (!newPlayList || newPlayList.length === 0) {
    stopDashPlayback();
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

// 创建一个新的 ref 用于约束 Motion 组件
const motionElementRef = ref(null)
// 使用绝对坐标体系（相对于视口）
const motionPosition = ref({
  x: (stconfigInfoStore.motionPosition.x !== undefined) ? stconfigInfoStore.motionPosition.x : window.innerWidth - 105,
  y: (stconfigInfoStore.motionPosition.y !== undefined) ? stconfigInfoStore.motionPosition.y : window.innerHeight - 105
})

// 添加实时位置信息
// const motionLivePosition = ref({ x: 0, y: 0 })
let isDragging = ref(false)
// 添加一个 ref 来控制 popover 的显示
const showPopover = ref(true)

// 处理拖拽过程中的位置更新
const handleDrag = (event) => {
  if (!isDragging.value) return;

  const x = event.clientX - 35; // 减去组件宽度的一半
  const y = event.clientY - 35; // 减去组件高度的一半

  // 更新实时位置信息
  // motionLivePosition.value = {
  //   x: event.clientX,
  //   y: event.clientY
  // };

  // 直接更新元素位置
  if (motionElementRef.value) {
    motionElementRef.value.style.transform = `translate(${x}px, ${y}px)`;
  }
}

// 处理拖拽开始
const handleDragStart = (event) => {
  isDragging.value = true;
  showPopover.value = false; // 开始拖拽时隐藏 popover
  // 阻止默认行为
  event.preventDefault();
}

// 处理拖拽结束
const handleDragEnd = (event) => {
  if (!isDragging.value) return;

  isDragging.value = false;
  // 延迟显示 popover，避免拖拽结束后立即显示
  setTimeout(() => {
    showPopover.value = true;
  }, 100);

  // 计算最终位置
  const position = {
    x: event.clientX - 35,  // 减去组件宽度的一半
    y: event.clientY - 35   // 减去组件高度的一半
  };

  // 更新位置状态
  motionPosition.value = position;

  // 保存位置到配置存储
  stconfigInfoStore.setMotionPosition(position);

  // 更新元素位置
  if (motionElementRef.value) {
    motionElementRef.value.style.transform = `translate(${position.x}px, ${position.y}px)`;
  }

  // 重置实时位置信息显示状态
  // setTimeout(() => {
  //   motionLivePosition.value = { x: 0, y: 0 };
  // }, 1000);
};

// 添加鼠标事件监听器
onMounted(() => {

  getAllOption().then((value)=>{
    console.log("获取的设置是：",value.data)
    if (value.data.code===200){
      stconfigInfoStore.setOption(value.data.data)
    }else{
      window.$message.error("错误信息："+"获取参数信息失败检查服务器是否异常！")
    }
  })


  // 添加全局鼠标事件监听器
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', handleDragEnd);

  // 确保初始位置在屏幕内
  if (motionPosition.value.x < 35) motionPosition.value.x = 35;
  if (motionPosition.value.y < 35) motionPosition.value.y = 35;
  if (motionPosition.value.x > window.innerWidth - 105) motionPosition.value.x = window.innerWidth - 105;
  if (motionPosition.value.y > window.innerHeight - 105) motionPosition.value.y = window.innerHeight - 105;

  // 设置初始位置
  if (motionElementRef.value) {
    motionElementRef.value.style.transform = `translate(${motionPosition.value.x}px, ${motionPosition.value.y}px)`;
  }
})

// 移除事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', handleDragEnd);
})

// 添加鼠标悬停事件处理函数
const handleMouseEnter = (event) => {
  if (!isDragging.value) {
    event.currentTarget.style.transform = `translate(${motionPosition.value.x}px, ${motionPosition.value.y}px) scale(1.3)`;
  }
}

const handleMouseLeave = (event) => {
  event.currentTarget.style.transform = `translate(${motionPosition.value.x}px, ${motionPosition.value.y}px) scale(1)`;
}

// 移动端显示播放列表
const toggleMobilePlaylist = () => {
  showMobilePlaylist.value = !showMobilePlaylist.value;
}

// 移动端隐藏播放列表
const hideMobilePlaylist = () => {
  showMobilePlaylist.value = false;
}

// 添加关闭移动端播放器的方法
const closeMobilePlayer = () => {
  showMobilePlayer.value = false;
};

</script>
<template>

  <n-flex vertical    >
    <TopWitge />
    <router-view />
    <!-- 隐藏的音频元素 -->
    <audio
        ref="audioElement"
        :src="stplayListStore.musicUrl && (!stplayListStore.playList[stplayListStore.playIndex]?.otherData?.urlType || stplayListStore.playList[stplayListStore.playIndex]?.otherData?.urlType !== 'DASH') ? stplayListStore.musicUrl : null"
        preload="auto"
        @loadedmetadata="handleLoadedMetadata"
        @timeupdate="handleTimeUpdate"
        @play="handlePlay"
        @pause="handlePause"
        @ended="handleEnded"
        @error="handleError"
    ></audio>


    <!-- 歌曲详情弹窗 -->
    <PlayMusic
        :song-info="nowPlay"
        :visible="showMusicDetail"
        @close="hideSongDetail"
        @seek="seekTo"
        @toggle-play="handleTogglePlay"
    />
    <!-- 移动端播放器模态框 -->
    <n-modal
      v-model:show="showMobilePlayer"
      :mask-closable="false"
      preset="dialog"
      :show-icon="false"
      :closable="false"
      style="width: 100vw; height: 100vh; background: transparent; box-shadow: none;"
    >
      <PlayMusicMobile @close="closeMobilePlayer" />
    </n-modal>
    
    <!-- 桌面端浮动按钮 -->
    <div v-if="!isMobile() && nowplayList.length > 0" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 999;">      
      <div
        ref="motionElementRef"
        style="width: 60px; height: 60px; cursor: grab; pointer-events: auto; position: fixed; top: 0; left: 0; transition: transform 0.3s ease;"
        :style="{ transform: `translate(${motionPosition.x}px, ${motionPosition.y}px)` }"
        @mousedown="handleDragStart"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <div style="width: 100%; height: 100%; position: relative;">
          <n-popover  placement="bottom"
                      trigger="hover"
                      :show-arrow="false"
                      :disabled="!showPopover">
            <template #trigger>
              <n-avatar
                  size="large"
                  :round="true"
                  :src="nowPlay.pic||'https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png'"
                  :class="[
              'rotating-avatar',
              { 'paused': !stplayListStore.isPlaying }
            ]"
                  @error="handleImageError"                  
                  style="width: 100%; height: 100%;"
              />
            </template>
            <n-card  size="small" style="width: 500px;cursor:default">

              <template #header>
                <n-popover trigger="hover">
                  <template #trigger>
                    <n-h2>
                      播放列表
                    </n-h2>
                  </template>
                  <span>空格 - 暂停/播放，P - 上一曲，N - 下一曲</span>
                </n-popover>
              </template>
              <template #header-extra>
                <n-button @click="clearPlayList">
                  清空播放列表
                </n-button>
              </template>

              <n-list ref="listContainerRef" class="list-container" hoverable clickable>
                <n-list-item v-for="(item, index) in nowplayList" :key="item.id || index" @click="() => handleItemClick(index)" style="display: flex; flex-direction: row; align-items: center;">
                  <n-thing style="flex: 1; min-width: 0;">

                    <template #avatar>
                      <n-avatar
                          size="large"
                          :round="true"
                          :src="item.pic || ''"
                          :class="{ 'rotating-avatar': index === stplayListStore.playIndex && stplayListStore.isPlaying }"
                          @error="handleImageError"
                      />
                    </template>

                    <template #header>
                      <n-ellipsis style="max-width: 200px;" :tooltip="true">
                        {{ item.name || '未知歌曲' }}
                      </n-ellipsis>
                    </template>

                    <template #description>
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <!-- 专辑信息 -->
                        <n-ellipsis style="max-width: 200px;" :tooltip="true">
                          {{ item.albumName || '未知专辑' }}
                        </n-ellipsis>
                        <!-- 歌手信息 -->
                        <n-ellipsis style="max-width: 200px;" :tooltip="true">
                          {{ Array.isArray(item.artistName) ? item.artistName.join(', ') : item.artistName || '未知歌手' }}
                        </n-ellipsis>
                      </div>
                    </template>
                  </n-thing>
                  
                  <template #suffix>
                    <div style="display: flex; gap: 4px;" @click.stop>
                      <n-tag v-if="index !== stplayListStore.playIndex" @click.stop="() => playSong(index)" style="cursor: pointer; flex-shrink: 0;">播放</n-tag>
                      <n-tag v-else-if="stplayListStore.isPlaying" @click.stop="() => toggleAudio()" style="cursor: pointer; flex-shrink: 0;" type="warning">暂停</n-tag>
                      <n-tag v-else @click.stop="() => toggleAudio()" style="cursor: pointer; flex-shrink: 0;" type="success">播放</n-tag>
                      <n-tag @click.stop="() => deleteSong(index)" style="cursor: pointer; flex-shrink: 0;" type="error">删除</n-tag>
                    </div>
                  </template>
                </n-list-item>
              </n-list>
            </n-card>
          </n-popover>

          <!-- 添加实时位置信息显示（使用绝对坐标） -->
          <!--          <div-->
          <!--            v-show="isDragging"-->
          <!--            style="position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%);-->
          <!--                   background: rgba(0, 0, 0, 0.7); color: white; padding: 4px 8px; border-radius: 4px;-->
          <!--                   font-size: 12px; white-space: nowrap;">-->
          <!--            Pos: {{ Math.round(motionLivePosition.x) }}, {{ Math.round(motionLivePosition.y) }}-->
          <!--          </div>-->
        </div>
      </div>
    </div>
    
    <!-- 移动端浮动按钮和播放列表 -->
    <div v-if="isMobile() && nowplayList.length > 0" style="position: fixed; bottom: 100px; right: 20px; z-index: 999;">
      <!-- 移动端浮动按钮 -->
      <n-avatar
        size="large"
        :round="true"
        :src="nowPlay.pic||'https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png'"
        :class="[
          'rotating-avatar',
          { 'paused': !stplayListStore.isPlaying }
        ]"
        @error="handleImageError"
        style="width: 60px; height: 60px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"
        @click="toggleMobilePlaylist"
      />
    </div>
    
    <!-- 移动端播放列表抽屉 -->
    <n-drawer v-model:show="showMobilePlaylist" :height="'80%'" placement="bottom" :trap-focus="false" :block-scroll="false">
      <n-drawer-content title="播放列表" closable>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <n-h2 style="margin: 0;">播放列表</n-h2>
            <n-button @click="clearPlayList" size="small">清空播放列表</n-button>
          </div>
        </template>
        
        <n-list ref="listContainerRef" hoverable clickable style="padding-bottom: 20px;">
          <n-list-item v-for="(item, index) in nowplayList" :key="item.id || index" @click="() => handleItemClick(index)" style="display: flex; flex-direction: row; align-items: center;">
            <n-thing style="flex: 1; min-width: 0;">
              <template #avatar>
                <n-avatar
                    size="large"
                    :round="true"
                    :src="item.pic || ''"
                    :class="{ 'rotating-avatar': index === stplayListStore.playIndex && stplayListStore.isPlaying }"
                    @error="handleImageError"
                />
              </template>

              <template #header>
                <n-ellipsis style="max-width: 200px;" :tooltip="true">
                  {{ item.name || '未知歌曲' }}
                </n-ellipsis>
              </template>

              <template #description>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <!-- 专辑信息 -->
                  <n-ellipsis style="max-width: 200px;" :tooltip="true">
                    {{ item.albumName || '未知专辑' }}
                  </n-ellipsis>
                  <!-- 歌手信息 -->
                  <n-ellipsis style="max-width: 200px;" :tooltip="true">
                    {{ Array.isArray(item.artistName) ? item.artistName.join(', ') : item.artistName || '未知歌手' }}
                  </n-ellipsis>
                </div>
              </template>
            </n-thing>

            <template #suffix>
              <div style="display: flex; gap: 4px;" @click.stop>
                <n-tag v-if="index !== stplayListStore.playIndex" @click.stop="() => playSong(index)" style="cursor: pointer; flex-shrink: 0;">播放</n-tag>
                <n-tag v-else-if="stplayListStore.isPlaying" @click.stop="() => toggleAudio()" style="cursor: pointer;" type="warning">暂停</n-tag>
                <n-tag v-else @click.stop="() => toggleAudio()" style="cursor: pointer;" type="success">播放</n-tag>
                <n-tag @click.stop="() => deleteSong(index)" style="cursor: pointer; flex-shrink: 0;" type="error">删除</n-tag>
              </div>
            </template>
          </n-list-item>
        </n-list>
      </n-drawer-content>
    </n-drawer>
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

/* 播放列表项的样式 */
.n-list-item {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.n-list-item .n-thing {
  flex: 1;
  min-width: 0; /* 允许内容收缩到0宽度，以启用省略号 */
}

.n-list-item .n-thing .n-thing-main__header,
.n-list-item .n-thing .n-thing-main__description,
.n-list-item .n-thing .n-thing-main__header-extra {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* 确保后缀按钮不会被挤压 */
.n-list-item .n-list-item__suffix {
  flex-shrink: 0;
  margin-left: 10px;
}

/* 旋转动画 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotating-avatar {
  animation: rotate 8s linear infinite;
}

.rotating-avatar.paused {
  animation-play-state: paused;
}
</style>
