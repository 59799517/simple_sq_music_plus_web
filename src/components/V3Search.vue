<script setup lang="js">
import {ref, nextTick, h,defineComponent,inject,watch ,watchEffect, computed, onMounted, onBeforeUnmount } from 'vue'
import configInfoStore from "../stores/config";
import playListStore from "../stores/playList";
import {
  searchTips,
  musicSearch,
  musicDownload,
  getArtistInfo,
  getAlbumInfo,
  musicDownloadAlbum,
  musicDownloadArtist
} from "../utils/api.js";
import {NButton, NSpace,NTag,NImage, NGrid, NGridItem, NCard, NAvatar, NTooltip} from "naive-ui";
import {storeToRefs} from "pinia";
import ArtistInfo from "./ArtistInfo.vue";
import AlbumInfo from "./AlbumInfo.vue";


const stconfigInfoStore =configInfoStore()
const stplayListStore  = playListStore()

// 检测是否为移动设备
const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// 回到顶部按钮显示控制
let showBackTop = ref(false)

// 监听滚动事件
let handleScroll = () => {
  showBackTop.value = window.scrollY > 300
}

// 回到顶部方法
let backToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  // 顶部 SqMusic logo 点击后由 V3TopWitge 派发，重置为空态并清空输入
  window.addEventListener('sqmusic:reset-search', resetSearch)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('sqmusic:reset-search', resetSearch)
})

// 搜索关键字
let keyword_value = ref("")
// 每页长度（禁止修改）
let pageSize = ref(10)
// 页码
let pageIndex = ref(1)
// 每次查询数据
let list_data = ref([])
// 是否已进入结果态（区别于列表是否为空：刷新期间列表清空但结果态保持，避免闪回空态大搜索条）
let has_result = ref(false)
// 搜索请求序号：丢弃过期响应，防止快速连续搜索时旧响应晚返回覆盖新结果
let search_seq = 0
//总条数
let item_total = ref(1);
//搜索结果tips
let search_tips = ref([])

let show_spin = ref(false)
// 显示播放按钮
let showbutton = ref(stconfigInfoStore.showPlayButton)



// 控制歌手信息弹窗显示
let show_artist_modal = ref(false)
// 歌手信息数据
let artist_info_data = ref({

})

// 控制专辑信息弹窗显示
let show_album_modal = ref(false)
// 专辑信息数据
let album_info_data = ref({

})
watch(
    () => stconfigInfoStore.showPlayButton,
    (newValue, oldValue) => {
      console.log("v3搜索按钮显示：", stconfigInfoStore.showPlayButton)
      showbutton.value = stconfigInfoStore.showPlayButton
    }
);



// onMounted(() => {
//
// })



// 播放整张专辑
const playAlbum = async (row) => {
  // 显示加载状态
  show_spin.value = true

  try {
    // 获取专辑详细信息
    const response = await getAlbumInfo(row.albumid, row.plugName)

    if (response.data.code === 200) {
      const albumData = response.data.data

      if (!albumData.musics || albumData.musics.length === 0) {
        window.$message.warning("该专辑暂无歌曲")
        show_spin.value = false
        return
      }

      // 清空当前播放列表
      stplayListStore.clearPlayList()

      // 将专辑中的所有歌曲添加到播放列表
      for (let i = 0; i < albumData.musics.length; i++) {
        const data = albumData.musics[i]
        const songData = {
          id: data.id,
          name: data.musicName,
          artistName: data.musicArtists,
          artistids: data.artistsIds,
          pic: data.musicImage,
          albumName: data.musicAlbum,
          lyric: "",
          lyricId: data.id,
          plugName: row.plugName,
          duration: data.musicDuration,
          brTypes: data.bits
        }

        // 添加到播放列表
        stplayListStore.pushPlayList(songData)
      }

      // 播放第一首歌曲
      if (stplayListStore.playList.length > 0) {
        stplayListStore.setPlayIndex(0)
        window.$message.success("开始播放专辑《" + albumData.albumName + "》")
      }
    } else {
      window.$message.error("获取专辑信息失败：" + response.data.msg)
    }
  } catch (error) {
    console.error("播放专辑时发生错误：", error)
    window.$message.error("播放专辑时发生错误")
  } finally {
    show_spin.value = false
  }
}

//搜索提示每次触发
let search_tips_trigger = (value)=>{
  searchTips(plugType_value.value, value).then(svalue=>{
    nextTick(()=>{
      search_tips.value = svalue.data.data
      search_tips.value.unshift(value)
    })
  })
}


const paginationRef = computed(() => ({
  pageSize: pageSize.value,
  page: pageIndex.value,
  itemCount:item_total.value
}))


let handlePageChange=(curPage)=>{
  pageIndex.value=curPage;
  onSecrch();
}
let pageSizeUpdata=(number)=>{
  pageSizes.value = number
  onSecrch();
}


// 顶部 SqMusic logo 点击（V3TopWitge 派发 sqmusic:reset-search）：回到空态大搜索页并清空输入框
let resetSearch = () => {
  // 使在途搜索请求全部失效，避免旧响应把状态又切回结果态
  search_seq++
  window.$loadingBar.finish()
  keyword_value.value = ''
  pageIndex.value = 1
  list_data.value = []
  item_total.value = 1
  has_result.value = false
  search_tips.value = []
  show_spin.value = false
  // 若 hero 仍在（空态下点击 logo），清除可能残留的动画内联样式
  clearTimeout(collapseTimer)
  if (heroInnerRef.value) {
    heroInnerRef.value.style.transition = 'none'
    heroInnerRef.value.style.transform = ''
    heroInnerRef.value.style.opacity = ''
    heroInnerRef.value.style.animation = ''
  }
  if (heroTitleRef.value) {
    heroTitleRef.value.style.transition = 'none'
    heroTitleRef.value.style.transform = ''
    heroTitleRef.value.style.opacity = ''
  }
  heroPending.value = false
  heroCollapsing.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 空态 hero 引用（搜索成功、数据就绪后，仅让品牌字“SqMusic”缩小飞到左上角）
const heroSectionRef = ref(null)
const heroInnerRef = ref(null)
const heroTitleRef = ref(null)
// 空态搜索请求进行中：hero 保持原位、仅给加载反馈并防重复触发
const heroPending = ref(false)
// 折叠动画播放中：禁止再次点击
const heroCollapsing = ref(false)
let collapseTimer = null
// 结果内容视图版本号：结果态内类型切换成功后自增，驱动内容区横移切换
const viewKey = ref(0)
// 结果态内类型切换是否已发生（等待本次搜索结果渲染时消费）
const tabSlidePending = ref(false)
// 本次切换方向：right = 前进（新内容自右滑入）；left = 回退（新内容自左滑入）
const slideDir = ref('right')

// 数据就绪后播放离场动画：只把“SqMusic”品牌字缩小并移向左上角导航处，
// 其余内容（副标语/搜索条/提示行）经 CSS 原地淡出，动画结束 resolve
const collapseHeroToTopLeft = () => {
  return new Promise((resolve) => {
    const title = heroTitleRef.value
    if (!title) {
      resolve()
      return
    }
    heroCollapsing.value = true
    // 解除 inner 入场动画结束帧对内联样式的锁定（CSS 动画优先级高于内联样式）
    const inner = heroInnerRef.value
    if (inner) inner.style.animation = 'none'
    const rect = title.getBoundingClientRect()
    const curX = rect.left + rect.width / 2
    const curY = rect.top + rect.height / 2
    // 目标位置：顶部导航左侧 SqMusic 文字中心（相对视口的近似值）
    const targetX = 64
    const targetY = 40
    // 缩小到接近导航 logo 字号的比例（按当前字宽推算，限制在 0.2~0.4 之间）
    const scale = Math.min(0.4, Math.max(0.2, 90 / rect.width))
    // 先归零起点并强制回流，确保从原始位置开始缓动
    title.style.transition = 'none'
    title.style.transform = ''
    title.style.opacity = ''
    void title.offsetWidth
    requestAnimationFrame(() => {
      // 移动节奏放慢；透明度延迟到中段才开始衰减，先看清“飞向角落”再淡出
      title.style.transition =
          'transform 0.8s cubic-bezier(0.22, 0.8, 0.28, 1), opacity 0.45s ease 0.42s'
      title.style.transform =
          `translate(${targetX - curX}px, ${targetY - curY}px) scale(${scale})`
      title.style.opacity = '0'
    })
    clearTimeout(collapseTimer)
    collapseTimer = setTimeout(() => {
      heroCollapsing.value = false
      resolve()
    }, 860)
  })
}

//点击搜索或者回车的搜索
let onSecrch = async ()=>{
  const keyword = keyword_value.value && keyword_value.value.trim()
  if (!keyword) {
    window.$message.warning("请输入搜索内容")
    return
  }
  const seq = ++search_seq
  const fromHero = !has_result.value
  // 请求或折叠动画进行中不重复触发
  if (fromHero && (heroCollapsing.value || heroPending.value)) return
  // 立即发出请求；空态搜索要等数据就绪后才播放离场动画
  const reqP = musicSearch(plugType_value.value, shear_select_value.value, keyword, pageSize.value, pageIndex.value)
  window.$loadingBar.start()
  // 空态大搜索区触发搜索：数据就绪后才播放“SqMusic 飞到左上角”动画，
  // 保证切到结果态的瞬间表格已有数据，不再出现“动画放完还要等数据”的空白感
  if (fromHero) {
    heroPending.value = true
    try {
      const value = await reqP
      // 若期间已发起更新的搜索，丢弃本次响应，避免旧请求晚返回时覆盖新结果
      if (seq !== search_seq) {
        window.$loadingBar.finish()
        return
      }
      if (value.data.code === 200) {
        const records = value.data.data.records
        if (records && records.length > 0) {
          // 先把数据挂到列表（此刻 hero 仍在展示，结果表格尚未挂载）
          list_data.value = records
          item_total.value = value.data.data.searchTotal
          // 数据已就绪，播放离场动画，结束后切结果态即可直接渲染完整数据
          await collapseHeroToTopLeft()
          if (seq !== search_seq) {
            window.$loadingBar.finish()
            return
          }
          has_result.value = true
          window.$loadingBar.finish()
        } else {
          // 0 条结果：留在空态大搜索区，保留输入内容便于换词重试
          window.$message.warning("暂无结果")
          window.$loadingBar.finish()
        }
      } else {
        // 请求失败：留在空态，保留输入内容便于重试
        window.$loadingBar.error()
      }
    } finally {
      heroPending.value = false
      if (seq === search_seq) show_spin.value = false
    }
    return
  }
  // —— 结果态内再次搜索（换词 / 切类型 / 换页等）：维持原有加载与刷新逻辑 ——
  show_spin.value = true
  try {
    const value = await reqP
    // 若期间已发起更新的搜索，丢弃本次响应，避免旧请求晚返回时覆盖新结果
    if (seq !== search_seq) {
      window.$loadingBar.finish()
      return
    }
    // window.$message.info("搜索成功:"+keyword_value.value+"  searType："+shear_select_value.value+"  plugName："+plugType_value.value)
    if (value.data.code === 200) {
      const records = value.data.data.records
      nextTick(()=>{
        list_data.value = records;
        item_total.value = value.data.data.searchTotal;
        // 有数据才留在结果态；0 条结果回到空态大搜索区（与既有一致）
        has_result.value = records && records.length > 0
        // 结果态内类型切换：本次结果渲染时自增视图版本号，触发内容区横移切换
        if (tabSlidePending.value) {
          tabSlidePending.value = false
          viewKey.value++
        }
        window.$loadingBar.finish()
      })
      // 搜索返回 0 条结果时给出底部提示
      if (!records || records.length === 0) {
        window.$message.warning("暂无结果")
      }
    }else{
      // 请求失败：退回空态或维持现状（保留输入内容便于重试）
      tabSlidePending.value = false
      window.$loadingBar.error()
    }
  } finally {
    if (seq === search_seq) show_spin.value = false
  }
}

//时间格式化
let formateTime = (duration) => {
  var milliseconds = Math.floor((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  // 格式化分钟和秒数，确保至少两位数
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  // 构建时间字符串
  let timeString = "";

  // 只有当小时大于0时才显示小时部分
  if (hours > 0) {
    timeString += hours + ":";
  }

  timeString += minutes + ":" + seconds;

  // 只有当毫秒大于0时才显示毫秒部分
  if (milliseconds > 0) {
    timeString += "." + milliseconds;
  }

  return timeString;
}


//单曲表格列
let TableColumns = [
  {
    title: '封面',
    key: 'pic',
    maxWidth: 200,
    width: 100,
    minWidth: 100,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(NImage, {
        src: row.pic,
        lazy: true,
        height: 45,
        width: 45,
        fallbackSrc:"https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
        onError: () => {
          window.$message.error("图片加载失败")
        },
        style: {
          borderRadius: '4px'
        }
      });
    }
  },
  {
    title: '歌曲名称',
    key: 'name',
    maxWidth: 300,
    width: 200,
    minWidth: 150,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    }
  },
    {
      title: '歌手',
      key: 'artistName',
      maxWidth: 300,
      width: 250,
      minWidth: 150,
      resizable: true,
      align: 'center',
      ellipsis: {
        tooltip: true
      },
      render(row) {
        const tags = row.artistName.map((tagKey,index) => {
          return h(
              NTag,
              {
                style: {
                  marginRight: '6px',
                  cursor: 'pointer'
                },
                type: 'info',
                bordered: false,
                onClick: () => {
                  // getArtistInfo
                  artist_info_data={"id":row.artistids[index],"plugName":row.plugName}
                  show_artist_modal.value = true
                }

              },
              {
                default: () => tagKey
              }
          )
        })
        return tags
      }
    },
    {
      title: '专辑',
      key: 'albumName',
      maxWidth: 300,
      minWidth: 100,
      resizable: true,
      align: 'center',
      width: 250,
      ellipsis: {
        tooltip: true
      },
      render(row) {
        if (row.albumName){
          return h(NTag,{
            type: 'error',
            bordered: false,
            strong: true,
            style: {
              cursor: 'pointer'
            },
            onClick:() => {
              // getAlbumInfo
              album_info_data={"id":row.albumid,"plugName":row.plugName}
              show_album_modal.value = true
            }
          },{
            default: () => row.albumName
          })
        }

      }

    },
    {
      title: '时长',
      key: 'duration',
      maxWidth: 100,
      minWidth: 50,
      width: 100,
      resizable: true,
      align: 'center',
      ellipsis: {
        tooltip: true
      },
      render(row) {
        return h(NTag,{
          type: 'success',
          bordered: false,
          strong: true,

        },{
          default: () => formateTime(row.duration)
        })
      }
    },
  {
    title: '码率(下载)',
    key: 'brTypes',
    resizable: true,
    align: 'left',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      const tags = row.brTypes.map((tagKey) => {
        return h(
            NButton,
            {
              style: {
                 marginRight: '6px',
                 marginTop: '4px'
              },
              ghost: true,
              type: 'warning',
              onClick: () => {
                musicDownload(row,tagKey).then(value=>{
                  if (value.data.code===200){
                    window.$message.success("开始下载")
                  }else{
                    window.$message.error("操作失败："+value.data.msg)
                  }
                })

              }
            },
            {
              default: () => tagKey
            }
        )
      })
      return h('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap'
        }
      }, [
        h('span', {
          style: {
            display: 'inline-block',
            minWidth: '40px',
            marginRight: '6px'
          }
        }, '码率: '),
        h('div', {
          style: {
            display: 'inline-flex',
            flexWrap: 'wrap',
            maxWidth: 'calc(100% - 50px)'
          }
        }, tags)
      ])
    }
  },
]
//专辑表格列表
let album_TableColumns = [
  {
    title: '封面',
    key: 'pic',
    maxWidth: 200,
    width: 100,
    minWidth: 100,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(NImage, {
        src: row.pic,
        lazy: true,
        height: 45,
        width: 45,
        fallbackSrc:"https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
        onError: () => {
          window.$message.error("图片加载失败")
        },
        style: {
          borderRadius: '4px'
        }
      });
    },

  },
  {
    title: '歌手',
    key: 'artistName',
    maxWidth: 300,
    width: 250,
    minWidth: 150,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    },
    render(row) {
        return h(
            NTag,
            {
              style: {
                marginRight: '6px',
                cursor: 'pointer'
              },
              type: 'info',
              bordered: false,
              onClick: () => {
                // getArtistInfo
                artist_info_data={"id":row.artistid,"plugName":row.plugName}
                show_artist_modal.value = true
              }

            },
            {
              default: () => row.artistName
            }
        )

    }
  },
  {
    title: '专辑',
    key: 'albumName',
    maxWidth: 300,
    minWidth: 100,
    resizable: true,
    align: 'center',
    width: 250,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      if (row.albumName){
        return h(NTag,{
          type: 'error',
          bordered: false,
          strong: true,
          style: {
            cursor: 'pointer'
          },
          onClick:() => {
            // getAlbumInfo
            album_info_data={"id":row.albumid,"plugName":row.plugName}
            show_album_modal.value = true
          }
        },{
          default: () => row.albumName
        })
      }

    }

  },

  {
    title: '操作',
    maxWidth: 200,
    width: 150,
    minWidth: 150,
    resizable: true,
    align: 'left',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      if (showbutton.value){
        return [
          h(
              NButton,
              {
                style: {
                  marginRight: '6px'
                },
                ghost: true,
                type: 'success',
                onClick: () => {
                  //一会写下载专辑接口
                  musicDownloadAlbum(row).then(value=>{
                    if (value.data.code===200){
                      window.$message.success("开始下载当前专辑：已按照设置下载对应音质文件")
                    }else{
                      window.$message.error("操作失败："+value.data.msg)
                    }
                  })

                }
              },
              {
                default: () => '下载专辑'
              }
          )
        ]
      }
      return [
        h(
            NButton,
            {
              style: {
                marginRight: '6px'
              },
              ghost: true,
              type: 'primary',
              onClick: () => {
                playAlbum(row)
              }
            },
            {
              default: () => '播放专辑'
            }
        ),




        h(
          NButton,
          {
            style: {
              marginRight: '6px'
            },
            ghost: true,
            type: 'success',
            onClick: () => {
              //一会写下载专辑接口
              musicDownloadAlbum(row).then(value=>{
                if (value.data.code===200){
                  window.$message.success("开始下载当前专辑：已按照设置下载对应音质文件")
                }else{
                  window.$message.error("操作失败："+value.data.msg)
                }
              })

            }
          },
          {
            default: () => '下载专辑'
          }
        )
      ]
    }
  },
]
//歌手表格列
let artist_TableColumns = [
  {
    title: '封面',
    key: 'pic',
    maxWidth: 200,
    width: 100,
    minWidth: 100,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(NImage, {
        src: row.pic,
        lazy: true,
        height: 45,
        width: 45,
        fallbackSrc:"https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
        onError: () => {
          window.$message.error("图片加载失败")
        },
        style: {
          borderRadius: '50%'
        }
      });
    },

  },
  {
    title: '歌手',
    key: 'artistName',
    maxWidth: 300,
    width: 250,
    minWidth: 150,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    },
    render(row) {
        return h(
            NTag,
            {
              style: {
                marginRight: '6px',
                cursor: 'pointer'
              },
              type: 'info',
              bordered: false,
              onClick: () => {
                // getArtistInfo
                artist_info_data={"id":row.artistid,"plugName":row.plugName}
                show_artist_modal.value = true
              }

            },
            {
              default: () => row.artistName
            }
        )

    }
  },
  {
    title: '专辑数',
    key: 'total',
    maxWidth: 100,
    minWidth: 50,
    width: 100,
    resizable: true,
    align: 'center',
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '操作',
    maxWidth: 200,
    width: 100,
    minWidth: 100,
    resizable: true,
    align: 'left',
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(
          NButton,
          {
            style: {
              marginRight: '6px'
            },
            ghost: true,
            type: 'success',
            onClick: () => {
              musicDownloadArtist(row).then(value=>{
                if (value.data.code===200){
                  window.$message.success("开始下载当前歌手：已按照设置下载对应音质文件")
                }else{
                  window.$message.error("操作失败："+value.data.msg)
                }
              })

            }
          },
          {
            default: () => '下载全部专辑'
          }
      )
    }
  },
]

// 根据搜索类型计算应该使用的表格列
const computedTableColumns = computed(() => {
  if (shear_select_value.value === 'album') {
    return album_TableColumns;
  } else if (shear_select_value.value === 'artist') {
    return artist_TableColumns;
  } else {
    if (showbutton.value){
      const baseColumns = [...TableColumns];
      baseColumns.push({
        title: '播放',
        maxWidth: 200,
        width: 100,
        minWidth: 100,
        resizable: true,
        align: 'left',
        ellipsis: {
          tooltip: true
        },
        render(row) {
          return h(
              NButton,
              {
                style: {
                  marginRight: '6px'
                },
                ghost: true,
                type: 'success',
                onClick: () => {
                  stplayListStore.pushPlayListAndPlay(row)
                }
              },
              {
                default: () => '播放'
              }
          )
        }
      });
      return baseColumns;
    }else{
      return TableColumns;
    }
  }
});

//下拉选项默认值
let select_options = ref(stconfigInfoStore.getOption)
// 音源下拉选项渲染：悬停时用 Tooltip 展示后端 getOption 下发的 desc（音源来源/接口说明），desc 为空则不显示提示
const renderSourceOption = ({ node, option }) => {
  const desc = option && option.desc ? option.desc : ''
  return h(NTooltip, {
    disabled: !desc,
    placement: 'right',
  }, {
    trigger: () => node,
    default: () => desc
  })
}
// 搜索类型
let plugType_value = ref("kw")
// 二级下拉
let shear_select_options=ref([
  {
    label: "单曲",
    value: "music"
  },
  {
    label: "专辑",
    value: "album"
  },
  {
    label: "歌手",
    value: "artist"
  }
])
// 搜索类型图标：与 shear_select_options 一一对应（按 value 取值），内嵌于搜索条前端图标按钮中
let typeIcons = {
  music: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  album: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
  artist: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
}
let shear_select_value=ref("music")

//清空搜索结果
let update_select_type=(value, option)=>{
  pageIndex.value=1
  list_data.value=[]
  has_result.value=false
}

// 类型图标按钮切换：逻辑与原“类型”下拉完全一致，仅呈现方式改为搜索条前端的内嵌图标按钮
let onShearTabClick=(opt)=>{
  if (shear_select_value.value === opt.value) return
  // 记录“是否已在结果态内互切”与切换方向（用于结果内容区横移动画）
  const wasResult = has_result.value
  // 注意：shear_select_options 是 ref，普通 JS 内需 .value（模板中会自动解包）
  const oldIdx = shear_select_options.value.findIndex((o) => o.value === shear_select_value.value)
  const newIdx = shear_select_options.value.findIndex((o) => o.value === opt.value)
  shear_select_value.value = opt.value
  // 输入框中有关键字时：不清空输入内容、不切回空态，直接用该关键字按切换后的类型重新搜索
  if (keyword_value.value && keyword_value.value.trim()) {
    pageIndex.value = 1
    // 先清空旧数据，避免“旧类型行 + 新类型列”在请求返回前渲染报错
    list_data.value = []
    item_total.value = 1
    has_result.value = true
    // 结果态内互切才播放横移（空态点类型图标按钮进入结果态由顶部搜索条上滑承接，不重复动画）
    if (wasResult) {
      tabSlidePending.value = true
      slideDir.value = newIdx > oldIdx ? 'right' : 'left'
    }
    onSecrch()
  } else {
    // 无关键字：仅切回空态（原逻辑，保留给后续手动输入搜索）
    update_select_type(opt.value, opt)
  }
}

// 渲染单曲卡片
const renderMusicCard = (item) => {
  return h(NCard, {
    style: {
      marginBottom: '16px'
    }
  }, {
    default: () => [
      // 第一行：图片
      h('div', { 
        style: { 
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '12px'
        } 
      }, [
        h(NImage, {
          src: item.pic,
          fallbackSrc: "https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
          style: {
            width: '100%',
            height: '150px',
            borderRadius: '8px',
            objectFit: 'cover'
          }
        })
      ]),
      
      // 第二行：歌曲名称
      h('div', { 
        style: { 
          fontWeight: 'bold', 
          fontSize: '16px',
          marginBottom: '8px',
          textAlign: 'left'
        } 
      }, item.name),
      
      // 第三行：歌手（可以点击）
      h('div', { 
        style: { 
          marginBottom: '8px'
        } 
      }, [
        h('span', { 
          style: { 
            color: '#666', 
            fontSize: '14px',
            marginRight: '6px'
          } 
        }, '歌手: '),
        ...item.artistName.map((artist, index) => 
          h(NTag, {
            style: {
              marginRight: '6px',
              marginTop: '4px',
              cursor: 'pointer'
            },
            type: 'info',
            bordered: false,
            onClick: () => {
              artist_info_data.value = { "id": item.artistids[index], "plugName": item.plugName }
              show_artist_modal.value = true
            }
          }, { default: () => artist })
        )
      ]),
      
      // 第四行：专辑信息（可以点击）
      h('div', { 
        style: { 
          marginBottom: '8px'
        } 
      }, [
        h('span', { 
          style: { 
            color: '#666', 
            fontSize: '14px',
            marginRight: '6px'
          } 
        }, '专辑: '),
        h(NTag, {
          type: 'error',
          bordered: false,
          strong: true,
          style: {
            cursor: 'pointer',
            marginTop: '4px'
          },
          onClick: () => {
            album_info_data.value = { "id": item.albumid, "plugName": item.plugName }
            show_album_modal.value = true
          }
        }, { default: () => item.albumName })
      ]),
      
      // 第五行：时长信息
      h('div', { 
        style: { 
          marginBottom: '8px'
        } 
      }, [
        h('span', { 
          style: { 
            color: '#666', 
            fontSize: '14px',
            marginRight: '6px'
          } 
        }, '时长: '),
        h(NTag, {
          type: 'success',
          bordered: false,
          strong: true,
          style: {
            marginTop: '4px'
          }
        }, { default: () => formateTime(item.duration) })
      ]),
      
      // 第六行：码率
      h('div', { 
        style: { 
          marginBottom: '12px'
        } 
      }, [
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'flex-start'
          }
        }, [
          h('span', { 
            style: { 
              color: '#666', 
              fontSize: '14px', 
              marginRight: '6px',
              flexShrink: 0
            } 
          }, '码率: '),
          h('div', {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              flex: 1
            }
          }, [
            ...item.brTypes.map(tagKey => 
              h(NButton, {
                style: {
                  marginRight: '6px',
                  marginTop: '4px'
                },
                size: 'small',
                ghost: true,
                type: 'warning',
                onClick: () => {
                  musicDownload(item, tagKey).then(value => {
                    if (value.data.code === 200) {
                      window.$message.success("开始下载")
                    } else {
                      window.$message.error("操作失败：" + value.data.msg)
                    }
                  })
                }
              }, { default: () => tagKey })
            )
          ])
        ])
      ]),
      
      // 第七行：播放按钮
      showbutton.value ? 
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'flex-start'
          }
        }, [
          h(NButton, {
            style: {
              marginRight: '6px'
            },
            ghost: true,
            type: 'success',
            onClick: () => {
              stplayListStore.pushPlayListAndPlay(item)
            }
          }, { default: () => '播放' })
        ]) : 
        null
    ]
  })
}

// 渲染专辑卡片
const renderAlbumCard = (item) => {
  return h(NCard, {
    style: {
      marginBottom: '16px'
    }
  }, {
    cover: () => h(NImage, {
      src: item.pic,
      lazy: true,
      height: 150,
      width: '100%',
      fallbackSrc: "https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
      onError: () => {
        window.$message.error("图片加载失败")
      },
      style: {
        objectFit: 'cover',
        borderRadius: '8px'
      }
    }),
    default: () => [
      h('div', { style: { fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' } }, item.albumName),
      h('div', { style: { marginBottom: '8px' } }, [
        h('span', { style: { color: '#666', fontSize: '14px' } }, '歌手: '),
        h(NTag, {
          style: {
            marginRight: '6px',
            marginTop: '4px',
            cursor: 'pointer'
          },
          type: 'info',
          bordered: false,
          onClick: () => {
            artist_info_data.value = { "id": item.artistid, "plugName": item.plugName }
            show_artist_modal.value = true
          }
        }, { default: () => item.artistName })
      ]),
      h(NSpace, { style: { marginTop: '12px' } }, () => [
        h(NButton, {
          style: {
            marginRight: '6px'
          },
          ghost: true,
          type: 'primary',
          onClick: () => {
            playAlbum(item)
          }
        }, { default: () => '播放专辑' }),
        h(NButton, {
          style: {
            marginRight: '6px'
          },
          ghost: true,
          type: 'success',
          onClick: () => {
            musicDownloadAlbum(item).then(value => {
              if (value.data.code === 200) {
                window.$message.success("开始下载当前专辑：已按照设置下载对应音质文件")
              } else {
                window.$message.error("操作失败：" + value.data.msg)
              }
            })
          }
        }, { default: () => '下载专辑' })
      ])
    ]
  })
}

// 渲染歌手卡片
const renderArtistCard = (item) => {
  return h(NCard, {
    style: {
      marginBottom: '16px'
    }
  }, {
    cover: () => h(NAvatar, {
      src: item.pic,
      lazy: true,
      round: false,
      height: 150,
      width: '100%',
      fallbackSrc: "https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png",
      onError: () => {
        window.$message.error("图片加载失败")
      },
      style: {
        objectFit: 'cover',
        borderRadius: '8px'
      }
    }),
    default: () => [
      h('div', { style: { fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' } }, item.artistName),
      h('div', { style: { marginBottom: '8px' } }, [
        h('span', { style: { color: '#666', fontSize: '14px' } }, '专辑数: '),
        h(NTag, {
          type: 'info',
          bordered: false,
          strong: true,
          style: {
            marginTop: '4px'
          }
        }, { default: () => item.total })
      ]),
      h(NButton, {
        style: {
          marginTop: '12px'
        },
        ghost: true,
        type: 'success',
        onClick: () => {
          musicDownloadArtist(item).then(value => {
            if (value.data.code === 200) {
              window.$message.success("开始下载当前歌手：已按照设置下载对应音质文件")
            } else {
              window.$message.error("操作失败：" + value.data.msg)
            }
          })
        }
      }, { default: () => '下载全部专辑' })
    ]
  })
}

// 根据搜索类型渲染对应的卡片
const renderCard = (item) => {
  if (shear_select_value.value === 'album') {
    return renderAlbumCard(item)
  } else if (shear_select_value.value === 'artist') {
    return renderArtistCard(item)
  } else {
    return renderMusicCard(item)
  }
}
</script>

<template>

    <n-spin :show="show_spin">
   <div class="sq-search-page">
    <!-- 空态：没有任何搜索结果（含首次进入、切换类型清空、搜索返回 0 条）时，百度首页式居中大搜索区 -->
    <section v-if="!has_result" ref="heroSectionRef" class="sq-hero" :class="{ 'sq-hero--pending': heroPending, 'sq-hero--collapsing': heroCollapsing }">
      <div class="sq-hero__bg" aria-hidden="true"></div>
      <div ref="heroInnerRef" class="sq-hero__inner">
        <div class="sq-hero__brand">
          <!-- 搜索成功且数据就绪后，只有这行品牌字会缩小飞向左上角，其余内容原地淡出 -->
          <h1 ref="heroTitleRef" class="sq-hero__title">SqMusic</h1>
          <p class="sq-hero__slogan">{{ heroPending ? '正在搜索，请稍候…' : '聚合全网音源，搜索你喜欢的音乐、专辑与歌手' }}</p>
        </div>
        <!-- 注意：类型图标按钮与音源/输入/按钮绑定需与结果态顶部搜索栏保持一致，改动时两处需同步 -->
        <div class="sq-search-unit" @keyup.enter="onSecrch">
          <div class="sq-search-unit__bar">
            <div class="sq-search-unit__types" role="radiogroup" aria-label="搜索类型" @keyup.enter.stop>
              <n-tooltip v-for="opt in shear_select_options" :key="opt.value" placement="bottom">
                <template #trigger>
                  <button
                      type="button"
                      role="radio"
                      class="sq-search-unit__typebtn"
                      :class="{ 'is-active': shear_select_value === opt.value }"
                      :aria-checked="shear_select_value === opt.value"
                      :aria-label="opt.label"
                      @click="onShearTabClick(opt)"
                  >
                    <span class="sq-search-unit__typebtn-icon" aria-hidden="true" v-html="typeIcons[opt.value]"></span>
                  </button>
                </template>
                {{ opt.label }}
              </n-tooltip>
            </div>
            <div class="sq-search-unit__source">
              <n-select
                  v-model:value="plugType_value"
                  class="sq-search-unit__source-select"
                  size="small"
                  placeholder="音源"
                  :options="select_options"
                  :render-option="renderSourceOption"
                  @update:value="update_select_type"
              />
            </div>
            <span class="sq-search-unit__divider" aria-hidden="true"></span>
            <n-auto-complete
                v-model:value="keyword_value"
                class="sq-search-unit__input"
                size="large"
                :loading="false"
                @input="search_tips_trigger"
                :input-props="{
                 autocomplete: 'disabled',
                }"
                :options="search_tips"
                placeholder="输入关键字，如：周杰伦 / 晴天 / 专辑名"
                clearable
            />
            <n-button
                class="sq-search-unit__btn"
                attr-type="button"
                size="large"
                round
                type="primary"
                @click="onSecrch"
            >
              搜索
            </n-button>
          </div>
        </div>
        <div class="sq-hero__tips">
          <span class="sq-hero__tip-item">回车键快速搜索</span>
          <span class="sq-hero__tip-dot"></span>
          <span class="sq-hero__tip-item">支持单曲 / 专辑 / 歌手三种类型</span>
        </div>
      </div>
    </section>

    <!-- 结果态：顶部搜索条与空态统一为新风格，下方列表/分页保持原有布局与绑定 -->
    <template v-else>
    <n-form
      inline
      @keyup.enter.native="onSecrch"
      style="width: 100%;"
  >

    <div class="sqFlex" style="width: 100%;">
      <!-- 注意：类型图标按钮与音源/输入/按钮绑定需与空态大搜索区保持一致，改动时两处需同步 -->
      <div class="sq-resultbar">
        <div class="sq-search-unit">
          <div class="sq-search-unit__bar">
            <div class="sq-search-unit__types" role="radiogroup" aria-label="搜索类型" @keyup.enter.stop>
              <n-tooltip v-for="opt in shear_select_options" :key="opt.value" placement="bottom">
                <template #trigger>
                  <button
                      type="button"
                      role="radio"
                      class="sq-search-unit__typebtn"
                      :class="{ 'is-active': shear_select_value === opt.value }"
                      :aria-checked="shear_select_value === opt.value"
                      :aria-label="opt.label"
                      @click="onShearTabClick(opt)"
                  >
                    <span class="sq-search-unit__typebtn-icon" aria-hidden="true" v-html="typeIcons[opt.value]"></span>
                  </button>
                </template>
                {{ opt.label }}
              </n-tooltip>
            </div>
            <div class="sq-search-unit__source">
              <n-select
                  v-model:value="plugType_value"
                  class="sq-search-unit__source-select"
                  size="small"
                  placeholder="音源"
                  :options="select_options"
                  :render-option="renderSourceOption"
                  @update:value="update_select_type"
              />
            </div>
            <span class="sq-search-unit__divider" aria-hidden="true"></span>
            <n-auto-complete
                v-model:value="keyword_value"
                class="sq-search-unit__input"
                size="large"
                :loading="false"
                @input="search_tips_trigger"
                :input-props="{
                 autocomplete: 'disabled',
                }"
                :options="search_tips"
                placeholder="输入关键字，如：周杰伦 / 晴天 / 专辑名"
                clearable
            />
            <n-button
                class="sq-search-unit__btn"
                attr-type="button"
                size="large"
                round
                type="primary"
                @click="onSecrch"
            >
              搜索
            </n-button>
          </div>
        </div>
      </div>
<!--      <n-divider />-->
      <!--表格数据行：类型切换时随方向横移切换（旧内容先滑出，新内容随后滑入）-->
      <transition :name="'sq-slide-' + slideDir" mode="out-in">
        <div class="sqRow" :key="viewKey">
          <!-- 桌面端显示表格 -->
          <n-data-table
              v-if="!isMobile"
              :flex-height="false"
              :key="(row) => row.id"
              :bordered="false"
              :single-line="false"
              :columns="computedTableColumns"
              :data="list_data"
              remote
              :on-update:page="handlePageChange"
          />

          <!-- 移动端显示卡片 -->
          <div v-else>
            <n-grid :cols="1" responsive="screen">
              <n-grid-item v-for="item in list_data" :key="item.id">
                <component :is="renderCard(item)" />
              </n-grid-item>
            </n-grid>
          </div>
        </div>
      </transition>
      <n-flex justify="center">
        <n-card title="">
          <n-flex justify="center">
            <n-pagination
                v-model:page="pageIndex"
                :item-count="item_total"
                size="large"
                :page-sizes="[10,20,50,100]"
                show-quick-jumper
                show-size-picker
                @update:page="handlePageChange"
                @update:page-size="pageSizeUpdata"
            >
              <template #goto >
                跳转
              </template>
              <template #suffix>
                页
              </template>

            </n-pagination>
          </n-flex>

        </n-card>
      </n-flex>

    </div>




  </n-form>
    </template>
   </div>

    </n-spin>

    <!-- 回到顶部按钮 -->
    <transition name="fade">
      <div v-if="showBackTop" class="back-top" @click="backToTop">
        <n-button circle type="primary" size="large">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-8 8h6v8h4v-8h6l-8-8z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </div>
    </transition>
  
  <!-- 歌手信息弹窗 -->
  <n-modal v-model:show="show_artist_modal" preset="card" style="width: 90%; height: 90%;" :title="artist_info_data.musicArtistsName">
    <ArtistInfo
        :id="artist_info_data.id"
        :plugName="artist_info_data.plugName"
    />
  </n-modal>

  <!-- 专辑信息弹窗 -->
  <n-modal v-model:show="show_album_modal" preset="card" style="width: 90%; height: 90%;" :title="album_info_data.albumName">
    <AlbumInfo
        :id="album_info_data.id"
        :plugName="album_info_data.plugName"
    />
  </n-modal>

</template>

<style scoped>
.headerSearch{
  display: flex;
  flex-direction: row;
  width: 30%;
  justify-content: center;
}
.headerInput{
   display: flex;
   width: 60%;
 }
.sqFlex{
  flex-direction: column;
  justify-content: flex-start;
  display: inline-flex;
}
.sqRow{
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
}
.hover-hand {
  cursor: pointer;
  transition: all 0.3s ease;
}
:deep(.n-data-table__pagination) {
  display: flex !important;
  justify-content: center !important;
}

/* ==================== 搜索结果表格：现代化列表观感（仅样式，不改逻辑） ==================== */
/* 1) 去掉单行网格的竖线，横线弱化为极淡的引导线，不再“格子化” */
.sqRow :deep(.n-data-table-th),
.sqRow :deep(.n-data-table-td) {
  border-right: none !important;
}
.sqRow :deep(.n-data-table-td) {
  border-bottom: 1px solid color-mix(in srgb, currentColor 6%, transparent);
}
/* 表格最后一行不留分隔线 */
.sqRow :deep(.n-data-table-tr:last-child .n-data-table-td) {
  border-bottom: none;
}

/* 2) 行高更舒展，内容不再贴边 */
.sqRow :deep(.n-data-table-th) {
  padding: 15px 18px;
}
.sqRow :deep(.n-data-table-td) {
  padding: 13px 18px;
}

/* 3) 表头：整块浅色带打底 + 底部柔和分隔线，文字“轻声标签”化 */
.sqRow :deep(.n-data-table-base-table-header) {
  background: color-mix(in srgb, currentColor 4%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.sqRow :deep(.n-data-table-th) {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.4;
  white-space: nowrap;
  color: color-mix(in srgb, currentColor 55%, transparent);
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  transition: color 0.25s ease, background-color 0.25s ease;
}
/* 表头 hover：文字提亮 + 品牌蓝紫柔和打底，变色明显且暗/亮主题通用 */
.sqRow :deep(.n-data-table-th:hover) {
  color: color-mix(in srgb, currentColor 92%, transparent);
  background-color: color-mix(in srgb, rgba(96, 138, 255, 0.17), rgba(139, 92, 246, 0.13)) !important;
}
.sqRow :deep(.n-data-table-th:hover .n-data-table-sorter) {
  color: color-mix(in srgb, rgba(122, 147, 255, 0.95), currentColor) !important;
}
/* 列宽拖拽细线：默认淡出，hover/拖拽时才显现，不打断表头 */
.sqRow :deep(.n-data-table-resize-button::after) {
  opacity: 0;
  width: 2px;
  border-radius: 2px;
  transition: opacity 0.2s ease;
}
.sqRow :deep(.n-data-table-resize-button:hover::after),
.sqRow :deep(.n-data-table-resize-button--active::after) {
  opacity: 1;
}

/* 4) 码率(下载)列：下载按钮 hover 呈“被选中”的实底高亮（仅该列 warning 幽灵按钮） */
.sqRow :deep(.n-data-table-td .n-button--warning-type.n-button--ghost:not(.n-button--disabled)) {
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease,
      box-shadow 0.2s ease, transform 0.2s ease;
}
.sqRow :deep(.n-data-table-td .n-button--warning-type.n-button--ghost:not(.n-button--disabled):hover) {
  color: #fff !important;
  background: linear-gradient(135deg, #ffb64d, #f0a020) !important;
  border-color: transparent !important;
  box-shadow: 0 3px 12px color-mix(in srgb, rgba(240, 160, 32, 0.55), transparent) !important;
  transform: scale(1.03);
}
.sqRow :deep(.n-data-table-td .n-button--warning-type.n-button--ghost:not(.n-button--disabled):active) {
  transform: scale(0.97);
  box-shadow: none;
}

/* 5) 歌手 / 专辑等可点击标签：hover 呈“被选中”的实底高亮（仅带 pointer 的可点标签，不影响时长等展示标签） */
.sqRow :deep(.n-data-table-td .n-tag[style*="pointer"]) {
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.sqRow :deep(.n-data-table-td .n-tag[style*="pointer"]:not(.n-tag--disabled):hover) {
  color: #fff !important;
  background-image: linear-gradient(135deg, #5b8cff, #8b5cf6) !important;
  background-color: transparent !important;
  box-shadow: 0 2px 10px color-mix(in srgb, rgba(99, 102, 241, 0.4), transparent) !important;
}

/* 6) 播放 / 下载等操作按钮：hover 呈“被选中”的实底高亮（按类型各配色，与码率下载按钮同一套语言） */
.sqRow :deep(.n-data-table-td .n-button--primary-type.n-button--ghost:not(.n-button--disabled)),
.sqRow :deep(.n-data-table-td .n-button--success-type.n-button--ghost:not(.n-button--disabled)) {
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease,
      box-shadow 0.2s ease, transform 0.2s ease;
}
.sqRow :deep(.n-data-table-td .n-button--primary-type.n-button--ghost:not(.n-button--disabled):hover) {
  color: #fff !important;
  background: linear-gradient(135deg, #4f9dff, #2080f0) !important;
  border-color: transparent !important;
  box-shadow: 0 3px 12px color-mix(in srgb, rgba(32, 128, 240, 0.45), transparent) !important;
  transform: scale(1.03);
}
.sqRow :deep(.n-data-table-td .n-button--success-type.n-button--ghost:not(.n-button--disabled):hover) {
  color: #fff !important;
  background: linear-gradient(135deg, #3ecf8e, #18a058) !important;
  border-color: transparent !important;
  box-shadow: 0 3px 12px color-mix(in srgb, rgba(24, 160, 88, 0.45), transparent) !important;
  transform: scale(1.03);
}
.sqRow :deep(.n-data-table-td .n-button--primary-type.n-button--ghost:not(.n-button--disabled):active),
.sqRow :deep(.n-data-table-td .n-button--success-type.n-button--ghost:not(.n-button--disabled):active) {
  transform: scale(0.97);
  box-shadow: none;
}

/* 移动端适配样式 */
@media (max-width: 768px) {
  .sqRow {
    flex-direction: column;
    width: 100% !important;
  }
  
  .sqRow > div {
    width: 100% !important;
    margin-bottom: 10px;
  }
  
  .n-pagination {
    flex-wrap: wrap;
  }
  
  /* 优化移动端卡片样式 */
  :deep(.n-card) {
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* 优化移动端图片展示 */
  :deep(.n-image img) {
    border-radius: 8px;
    transition: transform 0.3s ease;
  }
  
  :deep(.n-image img:hover) {
    transform: scale(1.02);
  }
  
  /* 优化移动端标签显示 */
  :deep(.n-tag) {
    margin-top: 4px;
    margin-bottom: 4px;
  }
  
  /* 优化按钮在小屏幕上的显示 */
  :deep(.n-button) {
    margin-top: 4px;
    margin-bottom: 4px;
  }
  
  /* 确保码率按钮不会超出容器 */
  :deep(.n-button) {
    white-space: nowrap;
  }
}

/* 回到顶部按钮样式 */
.back-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 999;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ==================== 空态（无结果）现代居中搜索区 ==================== */
.sq-search-page{
  width: 100%;
}

/* hero 容器：占满导航栏下方可视区并垂直居中 */
.sq-hero{
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: calc(100vh - 120px);
  padding: 40px 16px 64px;
  box-sizing: border-box;
}

/* 多层柔和光斑背景（dark/light 均可） */
.sq-hero__bg{
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(620px 340px at 16% 20%, rgba(78, 123, 255, 0.16), transparent 60%),
    radial-gradient(560px 320px at 85% 12%, rgba(139, 92, 246, 0.16), transparent 60%),
    radial-gradient(660px 380px at 82% 90%, rgba(52, 211, 153, 0.12), transparent 60%),
    radial-gradient(520px 300px at 10% 88%, rgba(244, 114, 182, 0.12), transparent 60%);
}

.sq-hero__inner{
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 880px;
  animation: sqHeroRise 0.5s ease-out both;
  will-change: transform, opacity;
}

/* 离场动画播放中：禁止再次点击，背景光斑同步淡出 */
.sq-hero--collapsing{
  pointer-events: none;
}
.sq-hero--collapsing .sq-hero__bg{
  transition: opacity 0.5s ease;
  opacity: 0;
}
/* 离场时只有品牌字“SqMusic”飞行；副标语/搜索条/提示行原地快速淡出 */
.sq-hero--collapsing .sq-hero__slogan,
.sq-hero--collapsing .sq-search-unit,
.sq-hero--collapsing .sq-hero__tips{
  transition: opacity 0.3s ease;
  opacity: 0;
}
/* 请求进行中（数据未回）：等待反馈 */
.sq-hero--pending{
  cursor: progress;
}

.sq-hero__brand{
  text-align: center;
  margin-bottom: 34px;
}

/* 渐变品牌标题 */
.sq-hero__title{
  margin: 0 0 14px;
  font-size: clamp(40px, 6vw, 58px);
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 1.15;
  background: linear-gradient(120deg, #5B8CFF 0%, #8B5CF6 38%, #F472B6 76%, #34D399 110%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.sq-hero__slogan{
  margin: 0;
  font-size: 15px;
  letter-spacing: 1px;
  opacity: 0.6;
}

/* ==================== 统一搜索单元（空态 / 结果态共用）：类型图标按钮 + 一体化大胶囊搜索条 ==================== */
.sq-search-unit{
  width: min(760px, 100%);
}

/* 搜索类型图标按钮组（单曲/专辑/歌手）：内嵌于搜索条最前端（原音乐图标位置），图标展示、悬停 Tooltip 显示中文名 */
.sq-search-unit__types{
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;
  margin-right: 10px;
  padding-right: 10px;
  border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
.sq-search-unit__typebtn{
  appearance: none;
  border: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: color-mix(in srgb, currentColor 55%, transparent);
  background: transparent;
  transition: color 0.2s ease, background-color 0.2s ease,
      box-shadow 0.2s ease, transform 0.2s ease;
}
.sq-search-unit__typebtn:hover{
  color: currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.sq-search-unit__typebtn:active{
  transform: scale(0.92);
}
/* 选中态：与搜索按钮同语言的渐变高亮圆钮 */
.sq-search-unit__typebtn.is-active{
  color: #fff;
  background: linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%);
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.35);
}
.sq-search-unit__typebtn.is-active:hover{
  background: linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%);
}

/* 一体化大胶囊：音源(内嵌) | 输入框 | 搜索按钮 */
.sq-search-unit__bar{
  display: flex;
  align-items: center;
  width: 100%;
  height: 56px;
  box-sizing: border-box;
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 13%, transparent);
  background: color-mix(in srgb, currentColor 5%, transparent);
  box-shadow: 0 10px 28px color-mix(in srgb, currentColor 5%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
.sq-search-unit__bar:focus-within{
  border-color: rgba(91, 140, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.16), 0 10px 28px color-mix(in srgb, currentColor 5%, transparent);
}

/* 音源内嵌段：去掉自身边框底色，融入胶囊 */
.sq-search-unit__source{
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.sq-search-unit__source-select{
  width: 124px;
}
.sq-search-unit__source-select,
.sq-search-unit__source-select :deep(.n-base-selection),
.sq-search-unit__source-select :deep(.n-base-selection-label),
.sq-search-unit__source-select :deep(.n-base-selection-tags),
.sq-search-unit__source-select :deep(.n-base-selection__border),
.sq-search-unit__source-select :deep(.n-base-selection__state-border){
  border: none;
  border-color: transparent;
  box-shadow: none !important;
  background: transparent !important;
}
.sq-search-unit__source-select:hover :deep(.n-base-selection__border),
.sq-search-unit__source-select:hover :deep(.n-base-selection__state-border){
  border: none;
  border-color: transparent;
  box-shadow: none !important;
  background: color-mix(in srgb, currentColor 6%, transparent) !important;
}
.sq-search-unit__source-select :deep(.n-base-selection__arrow){
  color: color-mix(in srgb, currentColor 45%, transparent);
}
.sq-search-unit__source-select :deep(.n-base-selection-label){
  height: 32px;
  padding: 0;
}
/* 选中文字与占位文字统一水平居中：左右内边距不对称(右侧多留)，让文字视觉重心与右侧箭头整体平衡 */
.sq-search-unit__source-select :deep(.n-base-selection-input),
.sq-search-unit__source-select :deep(.n-base-selection-overlay){
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 26px 0 10px;
}
.sq-search-unit__source-select :deep(.n-base-selection-placeholder__inner){
  font-size: 13px;
  cursor: pointer;
}

/* ===== 音源下拉面板：与搜索胶囊同语言的圆角卡片 ===== */
.sq-search-unit :deep(.n-base-select-menu){
  padding: 5px;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 14px;
  box-shadow:
    0 2px 6px color-mix(in srgb, currentColor 4%, transparent),
    0 16px 36px -12px color-mix(in srgb, currentColor 18%, transparent);
}
.sq-search-unit :deep(.n-base-select-option){
  min-height: 36px;
  padding: 0 12px;
}
.sq-search-unit :deep(.n-base-select-option::before){
  left: 3px;
  right: 3px;
  top: 1px;
  bottom: 1px;
  border-radius: 9px;
}
.sq-search-unit :deep(.n-base-select-option__content){
  font-size: 13px;
  z-index: 1;
}
.sq-search-unit :deep(.n-base-select-option--selected){
  font-weight: 600;
}
.sq-search-unit :deep(.n-base-select-option--pending)::before,
.sq-search-unit :deep(.n-base-select-option--selected--pending)::before{
  background-color: color-mix(in srgb, currentColor 8%, transparent);
}
.sq-search-unit :deep(.n-base-select-menu__empty),
.sq-search-unit :deep(.n-base-select-menu__loading){
  padding: 14px;
}

/* 音源与输入区之间的竖向分隔线 */
.sq-search-unit__divider{
  flex: 0 0 auto;
  width: 1px;
  height: 22px;
  margin: 0 12px 0 10px;
  background: color-mix(in srgb, currentColor 14%, transparent);
}

/* 输入区：同样去边框融入胶囊 */
.sq-search-unit__input{
  flex: 1 1 auto;
  min-width: 0;
}
.sq-search-unit__input :deep(.n-input),
.sq-search-unit__input :deep(.n-base-selection){
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
.sq-search-unit__input :deep(.n-input__state-border),
.sq-search-unit__input :deep(.n-input__border){
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
/* 输入时默认的绿色聚焦边框设为透明，保留胶囊自身 focus 光环即可 */
.sq-search-unit__input :deep(.n-input--focus),
.sq-search-unit__input :deep(.n-input--focus .n-input__state-border),
.sq-search-unit__input :deep(.n-input:hover .n-input__state-border){
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

/* 渐变搜索按钮 */
.sq-search-unit__btn{
  flex: 0 0 auto;
  min-width: 112px;
  height: 42px;
  margin-left: 10px;
  border: none !important;
  color: #fff !important;
  font-weight: 600;
  background: linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%) !important;
  box-shadow: 0 6px 16px rgba(91, 140, 255, 0.35);
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
}
.sq-search-unit__btn:hover{
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 8px 22px rgba(91, 140, 255, 0.45);
}
.sq-search-unit__btn:active{
  transform: translateY(0) scale(0.97);
}

/* 结果态顶部搜索条容器 */
.sq-resultbar{
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 2px 0 18px;
  /* 结果态首次挂载时整行（类型图标按钮+输入条）向上滑入 */
  animation: sqBarRise 0.55s cubic-bezier(0.22, 0.8, 0.28, 1) backwards;
}
.sq-resultbar .sq-search-unit{
  width: min(860px, 100%);
}
.sq-resultbar .sq-search-unit__bar{
  height: 50px;
  padding: 5px 6px 5px 14px;
}
.sq-resultbar .sq-search-unit__source-select{
  width: 124px;
}

/* hero 底部辅助文案 */
.sq-hero__tips{
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 13px;
  opacity: 0.55;
}
.sq-hero__tip-dot{
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

/* 入场动画（仅 transform/opacity，无重排开销） */
@keyframes sqHeroRise{
  from{
    opacity: 0;
    transform: translateY(16px);
  }
  to{
    opacity: 1;
    transform: translateY(0);
  }
}

/* 结果态顶部类型图标按钮+输入条整行向上滑入 */
@keyframes sqBarRise{
  from{
    opacity: 0;
    transform: translateY(28px);
  }
  to{
    opacity: 1;
    transform: translateY(0);
  }
}

/* 结果态类型切换：内容区按方向横移（右进=前进，左进=回退） */
.sq-slide-right-enter-active,
.sq-slide-left-enter-active{
  transition: transform 0.32s cubic-bezier(0.22, 0.8, 0.28, 1), opacity 0.28s ease;
}
.sq-slide-right-leave-active,
.sq-slide-left-leave-active{
  transition: transform 0.18s ease, opacity 0.16s ease;
}
.sq-slide-right-enter-from{
  opacity: 0;
  transform: translateX(56px);
}
.sq-slide-right-leave-to{
  opacity: 0;
  transform: translateX(-56px);
}
.sq-slide-left-enter-from{
  opacity: 0;
  transform: translateX(-56px);
}
.sq-slide-left-leave-to{
  opacity: 0;
  transform: translateX(56px);
}

@media (prefers-reduced-motion: reduce){
  .sq-hero__inner{
    animation: none;
  }
}

/* 移动端：胶囊搜索条紧凑排布，空态仍垂直居中 */
@media (max-width: 768px){
  .sq-hero{
    min-height: calc(100vh - 210px);
    padding: 28px 14px 48px;
  }
  .sq-hero__brand{
    margin-bottom: 24px;
  }
  .sq-hero__title{
    font-size: 38px;
    letter-spacing: 2px;
  }
  .sq-hero__slogan{
    font-size: 13px;
    padding: 0 12px;
  }
  .sq-search-unit{
    width: 100%;
  }
  /* 移动端：类型图标按钮缩小，省出输入区宽度 */
  .sq-search-unit__types{
    gap: 1px;
    margin-right: 4px;
    padding-right: 4px;
  }
  .sq-search-unit__typebtn{
    width: 28px;
    height: 28px;
  }
  .sq-search-unit__bar{
    height: 50px;
    padding: 5px 5px 5px 8px;
  }
  .sq-search-unit__source-select{
    width: 110px;
  }
  .sq-search-unit__divider{
    margin: 0 6px 0 4px;
  }
  .sq-search-unit__btn{
    min-width: 0;
    padding: 0 18px;
    margin-left: 6px;
  }
  .sq-resultbar{
    margin-bottom: 12px;
  }
  .sq-resultbar .sq-search-unit__bar{
    height: 48px;
  }
}
</style>