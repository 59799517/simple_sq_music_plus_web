<script setup>
import { NButton, NTag,  useMessage,NSpace,NModal,NDataTable } from 'naive-ui'
import {h, ref, computed, inject } from 'vue'
import configInfoStore from "../stores/config";


import {
  againTask,
  delErrorTask,
  delSuccessTask,
  delWaitingTask,
  postDownloadInfo,
  refreshTask,
  delDownloadInfo,
  refreshStatus,
  errorTaskRetry,
  getPlugBrTypeList,
  advancedTask
} from "../utils/api.js";


const stconfigInfoStore =configInfoStore()

// 统一的下载状态渲染：clickable=false 用于错误重试子任务弹窗（error/supplement 系列按钮禁用点击）
let renderStatusCell = (row, clickable = true) => {
  let type = ''
  let text = ''
  let needClick = false
  if (row.downloadStatus === 'waiting') {
    type = 'info'; text = '等待下载'
  } else if (row.downloadStatus === 'loading') {
    type = 'info'; text = '下载中'
  } else if (row.downloadStatus === 'success') {
    type = 'success'; text = '下载成功'
  } else if (row.downloadStatus === 'error') {
    type = 'error'; text = '下载失败'; needClick = true
  } else if (row.downloadStatus === 'supplement') {
    type = 'error'; text = '补充下载中'; needClick = true
  } else if (row.downloadStatus === 'supplement_success') {
    type = 'success'; text = '补充成功'; needClick = true
  } else if (row.downloadStatus === 'retry') {
    type = 'warning'; text = '等待重试'
  } else {
    return undefined
  }
  return h(NButton, {
    type,
    size: 'small',
    strong: true,
    disabled: !clickable && needClick,
    onClick: clickable && needClick ? () => handleErrorClick(row) : undefined
  }, () => h('span', {}, text))
}


//页面设置
let columns = [
  {
    title: '音乐名称',
    key: 'downloadMusicname',
    width: 100,
    ellipsis: {
      tooltip: true
    },
    align: 'left'
  },
  {
    title: '歌手',
    key: 'downloadArtistname',
    width: 100,
    ellipsis: {
      tooltip: true
    },
    align: 'left'
  },
  {
    title: '专辑',
    key: 'downloadAlbumname',
    width: 100,
    ellipsis: {
      tooltip: true
    },
  }
  ,{
    title: '数据来源',
    key: 'downloadPlugName',
    width: 50,
    ellipsis: {
      tooltip: true
    },
  }
  ,{
    title: '是否书籍类型',
    key: 'audioBook',
    width: 50,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(NTag, {
        closable: false,
        type: 'success',
        disabled : true,
        bordered : false,
        strong : true
      }, () => h('span', {}, row.audioBook===1 ? '是' : '否'))
    }
  }
  ,{
    title: '下载时间',
    key: 'downloadTime',
    width: 100,
    ellipsis: {
      tooltip: true
    },
  }
  ,{
    title: '更新时间',
    key: 'downloadUpdateTime',
    width: 100,
    ellipsis: true,
  }
  ,{
    title: '下载消息',
    key: 'downloadMsg',
    width: 50,
    ellipsis: {
      tooltip: true
    },
  }
  ,{
    title: '码率类型',
    key: 'downloadBrType',
    width: 50,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return h(NTag, {
        closable: false,
        type: 'success',
        disabled : true,
        bordered : false,
        strong : true
      }, () => h('span', {}, row.downloadBrType))
    }
  }
  ,{
    title: '状态',
    key: 'downloadStatus',
    width: 50,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      return renderStatusCell(row, true)
    }
  }
  ,{
    title: '当前重试次数',
    key: 'downloadRetryNum',
    width: 60,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      if (row.downloadRetryNum === undefined || row.downloadRetryNum === null || row.downloadRetryNum === '') {
        return ''
      }
      return h(NTag, {
        closable: false,
        type: 'warning',
        disabled: true,
        bordered: false,
        strong: true
      }, () => h('span', {}, String(row.downloadRetryNum)))
    }
  }
  ,{
    title: '下次执行时间',
    key: 'downloadRetryTime',
    width: 110,
    ellipsis: {
      tooltip: true
    },
    render(row) {
      if (row.downloadRetryTime === undefined || row.downloadRetryTime === null || row.downloadRetryTime === '') {
        return ''
      }
      return h('span', {}, row.downloadRetryTime)
    }
  }
  ,{
    title: '操作',
    key: 'action',
    width: 50,
    align: 'left',
    ellipsis: {
      tooltip: true
    },
    render(row) {

    let delbutton   = h(NButton, {
        type: 'error',
        size: 'small',
      quaternary: true,
        strong : true,
        onClick: () => {
          delDownloadInfo(row.id).then(value=>{
            if (value.data.code===200){
              window.$message.success("操作成功")
            }else{
              window.$message.error("操作失败："+value.data.msg)
            }
            getDownloadData()

          })
        },
      }, () => h('span', {}, '删除'))

    let refreshnutton =
       h(NButton, {
        type: 'info',
        size: 'small',
         quaternary: true,
        strong : true,
        onClick: () => {
         refreshStatus(row.id).then(value=>{
          if (value.data.code===200){
            window.$message.success("操作成功")
          }else{
            window.$message.error("操作失败："+value.data.msg)
          }
           getDownloadData()

         })

        }
      }, () => h('span', {}, '重新下载'))

      if (row.downloadStatus==="waiting" || row.downloadStatus==="retry"){
          return delbutton
      }else if (row.downloadStatus==="loading"){
        return [
          delbutton
        ]
      }else if (row.downloadStatus==="success"){
        return delbutton
      }else if (row.downloadStatus==="error" || row.downloadStatus==="supplement_success"){
        if (row.id === 0 || row.downloadBrType === null || row.downloadBrType === undefined || row.downloadBrType === '') {
          return delbutton
        }
        return     h(NSpace,{
          style: {
            // marginLeft: '10px'
          }
        }, [
            delbutton,
            refreshnutton
        ])
      }else if (row.downloadStatus==="supplement"){
        return delbutton
      }
    }
  }
]

// 错误重试子任务弹窗
let showErrorRetryModal = ref(false)
let errorRetryData = ref([])
// 错误行点击处理（外层整行 + 状态按钮共用）
let handleErrorClick = (row) => {
  errorTaskRetry(row.id).then(value=>{
    if (value.data.code===200){
      errorRetryData.value = value.data.data || []
      showErrorRetryModal.value = true
    }else{
      window.$message.error("查询失败："+value.data.msg)
    }
  })
}
// 行属性：error 状态行添加点击事件和手型光标
let handleRowProps = (row) => {
  if (row.downloadStatus === 'error' || row.downloadStatus === 'supplement' || row.downloadStatus === 'supplement_success') {
    return {
      style: { cursor: 'pointer' },
      onClick: (event) => {
        // 点击操作按钮时不触发弹窗（阻止事件冒泡导致的误触发）
        if (event.target.closest('button')) return
        handleErrorClick(row)
      }
    }
  }
  return {}
}
// 弹窗表格列（复制主表格列，但移除最后一列"操作"，且状态列全部禁用点击）
let errorRetryColumns = columns.slice(0, -1).map(col => {
  if (col.key === 'downloadStatus') {
    return {
      ...col,
      render(row) {
        return renderStatusCell(row, false)
      }
    }
  }
  // 弹窗内适度放宽"码率类型"，避免标签内容被截断，同时为右侧状态列留足空间
  if (col.key === 'downloadBrType') {
    return {
      ...col,
      width: 90,
      ellipsis: false
    }
  }
  return col
})
// 弹窗表格横向可滚动总宽 = 各列宽之和 + 余量（保证列不被容器压缩）
let errorRetryTableScrollWidth = errorRetryColumns.reduce((sum, col) => sum + (Number(col.width) || Number(col.minWidth) || 160), 0) + 60

//是否显示高级功能
let show_advanced = ref(false)

let pageSizes=ref(10)
let page_index = ref(1);
let item_total = ref(1);
let page_data = ref([]);

// 搜索歌名关键字
let keyword_music_value = ref("")
//歌手
let keyword_artis_value = ref("")
//专辑
let keyword_album_value = ref("")
//下载类型
let download_type_value = ref("")

//下载状态
let download_status_value = ref("")

//时间【开始，结束】
let download_time_value = ref([])

let download_time_start_value = ''
let download_time_end_value = ''

// 加载状态
let show_spin = ref(false)




// 下载状态列表
let select_download_status_options = ref([
  {
    label: "全部",
    value: ""
  },
  {
    label: "等待下载",
    value: "waiting"
  },
  {
    label: "等待重试",
    value: "retry"
  },
  {
    label: "下载中",
    value: "loading"
  },
  {
    label: "下载成功",
    value: "success"
  },
  {
    label: "下载失败",
    value: "error"
  },
  {
    label: "补充下载中",
    value: "supplement"
  },
  {
    label: "补充成功",
    value: "supplement_success"
  }
])


// 下载下拉列表
let select_download_type_options = ref([
  {
    label: "全部",
    value: ""
  }
])



let shortcuts =  {
      昨天: () => (/* @__PURE__ */ new Date()).getTime() - 24 * 60 * 60 * 1e3,
      近2小时: () => {
        const cur = (/* @__PURE__ */ new Date()).getTime();
        return [cur - 2 * 60 * 60 * 1e3, cur];
      }
}
// 初始化
onBeforeMount(()=>{
  select_download_type_options.value.push(...stconfigInfoStore.getOption)
  getDownloadData()
})

let getDownloadData = ()=>{
  window.$loadingBar.start()
  show_spin.value=true;
  postDownloadInfo(
      keyword_music_value.value,
      keyword_artis_value.value,
      keyword_album_value.value,
      download_type_value.value,
      download_status_value.value,
      download_time_start_value,
      download_time_end_value,
      pageSizes.value,
      page_index.value).then(value=>{
    show_spin.value=false;
    item_total.value = value.data.data.total
    page_data.value = value.data.data.records;
    window.$loadingBar.finish()
  })
}




// 按钮功能
let delErrorTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delErrorTask().then(value=>{
        if (value.data.code===200){
          window.$message.success("操作成功")
        }else{
          window.$message.error("操作失败："+value.data.msg)
        }
      })
    },
    onNegativeClick: () => {

    }
  })
}
let delSuccessTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delSuccessTask().then(value=>{
        if (value.data.code===200){
          window.$message.success("操作成功")
        }else{
          window.$message.error("操作失败："+value.data.msg)
        }
      })
    },
    onNegativeClick: () => {

    }
  })
}
let delWaitingTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delWaitingTask().then(value=>{
        if (value.data.code===200){
          window.$message.success("操作成功")
        }else{
          window.$message.error("操作失败："+value.data.msg)
        }
      })
    },
    onNegativeClick: () => {

    }
  })
}

let refreshTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      refreshTask().then(value=>{
        if (value.data.code===200){
          window.$message.success("操作成功")
        }else{
          window.$message.error("操作失败："+value.data.msg)
        }
      })
    },
    onNegativeClick: () => {

    }
  })
}

let againTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定重新下载所有错误任务？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      againTask().then(value=>{
        if (value.data.code===200){
          window.$message.success("操作成功")
        }else{
          window.$message.error("操作失败："+value.data.msg)
        }
      })
    },
    onNegativeClick: () => {

    }
  })
}

// ==================== 高级功能：自定义条件删除/重试 ====================
// 操作类型（必传）：delete=删除, rewrite=重新下载
let advanced_op_type = ref("")
// 条件行列表
let advanced_condition_seq = 0
let advanced_conditions = ref([])
// 字段类型下拉
let advanced_field_options = [
  { label: '下载时间', value: 'createTime' },
  { label: '数据来源', value: 'plugName' },
  { label: '码率类型', value: 'brType' },
  { label: '歌曲名称', value: 'musicname' },
  { label: '歌手名称', value: 'artistname' },
  { label: '专辑名称', value: 'albumname' },
  { label: '下载状态', value: 'status' },
  { label: '最后更新时间', value: 'updateTime' }
]
// 字段 -> 请求参数映射
let advanced_field_param_map = {
  createTime: { start: 'downloadCreateTimeStart', end: 'downloadCreateTimeEnd' },
  plugName:   { eq: 'downloadPlugName' },
  brType:     { eq: 'downloadBrType' },
  musicname:  { eq: 'downloadMusicname' },
  artistname: { eq: 'downloadArtistname' },
  albumname:  { eq: 'downloadAlbumname' },
  status:     { eq: 'downloadStatus' },
  updateTime: { start: 'downloadUpdateTimeStart', end: 'downloadUpdateTimeEnd' }
}
// 码率类型接口数据（原样保存，含 plugName 用于联动过滤）
let br_type_list = ref([])
let advanced_br_loaded = false

// 数据来源下拉（复用当前页面数据来源）
let advanced_plug_options = computed(() => stconfigInfoStore.getOption)
// 状态下拉（去掉"全部"）
let advanced_status_options = computed(() => select_download_status_options.value.filter(item => item.value !== ''))
// 码率下拉：若任一条件行选了数据来源且有值，则按返回项 plugName 相等过滤
let advanced_br_options = computed(() => {
  let plug = ''
  const pc = advanced_conditions.value.find(c => c.field === 'plugName' && c.value !== '' && c.value !== null && c.value !== undefined)
  if (pc) plug = pc.value
  const seen = new Set()
  const list = []
  br_type_list.value.forEach(item => {
    if (plug && item.plugName !== plug) return
    if (seen.has(item.id)) return
    seen.add(item.id)
    list.push({ label: item.id, value: item.id })
  })
  return list
})

// 高级功能展开时懒加载码率类型
let toggleAdvanced = () => {
  show_advanced.value = !show_advanced.value
  if (show_advanced.value && !advanced_br_loaded) {
    advanced_br_loaded = true
    getPlugBrTypeList().then(value => {
      if (value.data.code === 200) {
        br_type_list.value = value.data.data || []
      } else {
        window.$message.error("获取码率类型失败：" + value.data.msg)
      }
    }).catch(() => {})
  }
}

// 时间范围条件判定
let isTimeRangeField = (field) => field === 'createTime' || field === 'updateTime'
// 条件是否已填写
let isAdvancedConditionFilled = (c) => {
  if (isTimeRangeField(c.field)) {
    return Array.isArray(c.value) && c.value[0] && c.value[1]
  }
  return c.value !== '' && c.value !== null && c.value !== undefined
}
// 是否可执行：必须选择操作类型，且至少一个有效条件
let advanced_can_execute = computed(() => {
  return advanced_op_type.value !== '' && advanced_conditions.value.some(isAdvancedConditionFilled)
})
// 添加条件
let addAdvancedCondition = (field) => {
  const f = field || 'plugName'
  advanced_conditions.value.push({
    id: ++advanced_condition_seq,
    field: f,
    value: isTimeRangeField(f) ? null : ''
  })
}
// 删除条件
let removeAdvancedCondition = (index) => {
  advanced_conditions.value.splice(index, 1)
}
// 修改条件字段时重置值（避免控件类型不匹配）
let updateAdvancedConditionField = (c, field) => {
  c.field = field
  c.value = isTimeRangeField(field) ? null : ''
}
// 码率值所属的插件名
let getBrTypePlugName = (brType) => {
  const item = br_type_list.value.find(it => it.id === brType)
  return item ? item.plugName : ''
}
// 修改"数据来源"条件值：若已有码率条件且其所属插件与所选来源不一致，则清空该码率
let updateAdvancedPlugNameValue = (c, value) => {
  c.value = value
  if (value === '' || value === null || value === undefined) return
  advanced_conditions.value.forEach(cc => {
    if (cc === c || cc.field !== 'brType' || !cc.value) return
    if (getBrTypePlugName(cc.value) !== value) {
      cc.value = ''
    }
  })
}
// 组装请求体：只传已填写的条件字段
let buildAdvancedRequestBody = () => {
  const body = { operationType: advanced_op_type.value }
  advanced_conditions.value.forEach(c => {
    if (!isAdvancedConditionFilled(c)) return
    const map = advanced_field_param_map[c.field]
    if (map.start) {
      body[map.start] = c.value[0]
      body[map.end] = c.value[1]
    } else {
      body[map.eq] = c.value
    }
  })
  return body
}
// 执行高级操作
let executeAdvancedTask = () => {
  const opType = advanced_op_type.value
  if (!opType) {
    window.$message.warning("请先选择操作类型")
    return
  }
  if (!advanced_can_execute.value) {
    window.$message.warning("请至少填写一个条件")
    return
  }
  const opText = opType === 'delete' ? '删除' : '重新下载'
  // 条件摘要
  const lines = []
  advanced_conditions.value.forEach(c => {
    if (!isAdvancedConditionFilled(c)) return
    const opt = advanced_field_options.find(item => item.value === c.field)
    const label = opt ? opt.label : c.field
    if (isTimeRangeField(c.field)) {
      lines.push(`- ${label}：${c.value[0]} ~ ${c.value[1]}`)
    } else {
      lines.push(`- ${label}：${c.value}`)
    }
  })
  window.$dialog.warning({
    title: '警告',
    content: () => h('div', { style: 'white-space: pre-line' }, `确定执行"${opText}"操作吗？\n匹配条件：\n${lines.join('\n')}`),
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      advancedTask(buildAdvancedRequestBody()).then(value=>{
        if (value.data.code===200){
          window.$message.success(value.data.msg || '操作成功')
        }else{
          window.$message.error(value.data.msg || '操作失败')
        }
        getDownloadData()
      })
    },
    onNegativeClick: () => {

    }
  })
}

let pageUpdata=(number)=>{
  page_index.value=number
  getDownloadData();
}
let pageSizeUpdata=(number)=>{
  pageSizes.value = number
  getDownloadData();
}

// 下拉选择
let update_download_type=(value, option)=>{
  download_type_value.value = value
}

let update_download_status=(value, option)=>{
  download_status_value.value = value
}
</script>

<template>
  <n-spin :show="show_spin">
  <n-form  @keyup.enter.native="getDownloadData"   >
      <n-flex justify="space-between" inline="inline">
    <n-form-item label="歌名" >
      <n-input v-model:value="keyword_music_value" clearable placeholder="输入歌名" />
    </n-form-item>
    <n-form-item  label="歌手" >
      <n-input v-model:value="keyword_artis_value" clearable placeholder="歌手名称" />
    </n-form-item>
    <n-form-item  label="专辑" >
        <n-input v-model:value="keyword_album_value" clearable placeholder="专辑名称" />
      </n-form-item>
    <n-form-item   label="数据来源" >
    <n-select
        v-model:value="download_type_value"
        placeholder=""
        clearable
        style="min-width: 100px"
        :options="select_download_type_options"
        @update:value="update_download_type"
    />
  </n-form-item >
    <n-form-item  label="下载状态" >
    <n-select
        v-model:value="download_status_value"
        placeholder=""
        clearable
        style="min-width: 100px"

        :options="select_download_status_options"
        @update:value="update_download_status"
    />
  </n-form-item >
    <n-form-item label="下载时间">
        <n-date-picker
            :input-readonly	 ="true"
            type="datetimerange"
            :shortcuts="shortcuts"
            :clearable="true"
            :update-value-on-close="true"
            :on-update-formatted-value="(value)=>{
             download_time_value.value = value
             download_time_start_value = value[0]
             download_time_end_value = value[1]
          }"
        />
      </n-form-item>
      <n-form-item :span="1" >
          <n-button attr-type="button" @click="getDownloadData">
            搜索
          </n-button>
      </n-form-item>
      <n-form-item :span="1" >
        <n-button attr-type="button" @click="toggleAdvanced">
          高级功能
        </n-button>
      </n-form-item>
      </n-flex>
  </n-form>

  <n-collapse default-expanded-names="1"  :style="display=show_advanced?'display':'display:none'"	  accordion>
    <n-collapse-item title="待下载高级操作" name="1">
      <div class="">
        <n-tooltip :show-arrow="false" trigger="hover">
          <template #trigger>
            <n-button @click="delWaitingTask_b">删除待下载</n-button>
          </template>
          清空全部待下载
        </n-tooltip>
      </div>
    </n-collapse-item>
    <n-collapse-item title="下载中高级操作" name="2">
      <div class="">
        <n-tooltip :show-arrow="false" trigger="hover">
          <template #trigger>
            <n-button @click="refreshTask_b">重新下载</n-button>
          </template>
          长时间卡在待下在中不执行的可以使用此功能不过用的地方应该不多
        </n-tooltip>
      </div>
    </n-collapse-item>
    <n-collapse-item title="下载成功高级操作" name="3">
      <div class="">
        <n-tooltip :show-arrow="false" trigger="hover">
          <template #trigger>
            <n-button @click="delSuccessTask_b">删除完成</n-button>
          </template>
          清空全部完成任务
        </n-tooltip>
      </div>
    </n-collapse-item>
    <n-collapse-item title="下载错误高级操作" name="4">
      <div class="">
        <n-tooltip :show-arrow="false" trigger="hover">
          <template #trigger>
            <n-button @click="delErrorTask_b">删除错误</n-button>
          </template>
          清空全部错误任务
        </n-tooltip>
        <n-tooltip :show-arrow="false" trigger="hover">
          <template #trigger>
            <n-button @click="againTask_b">重新下载错误</n-button>
          </template>
          错误的任务将全部重新下载
        </n-tooltip>
      </div>
    </n-collapse-item>
    <n-collapse-item title="自定义条件删除/重试" name="5">
      <div class="">
        <n-flex vertical :size="12" style="width: 100%">
          <n-flex align="center" :wrap="true">
            <span style="white-space: nowrap">操作类型：</span>
            <n-radio-group v-model:value="advanced_op_type" name="advancedOp">
              <n-radio-button value="delete">删除</n-radio-button>
              <n-radio-button value="rewrite">重新下载</n-radio-button>
            </n-radio-group>
          </n-flex>
          <n-flex
              v-for="(condition, index) in advanced_conditions"
              :key="condition.id"
              align="center"
              :wrap="true"
          >
            <n-select
                :value="condition.field"
                style="width: 140px"
                :options="advanced_field_options"
                @update:value="(field) => updateAdvancedConditionField(condition, field)"
            />
            <n-date-picker
                v-if="condition.field==='createTime' || condition.field==='updateTime'"
                :input-readonly="true"
                type="datetimerange"
                format="yyyy-MM-dd HH:mm:ss"
                :update-value-on-close="true"
                clearable
                style="width: 360px"
                @update:formatted-value="(value)=> { condition.value = value }"
            />
            <n-select
                v-else-if="condition.field==='plugName'"
                :value="condition.value"
                clearable
                placeholder="选择数据来源"
                style="width: 150px"
                :options="advanced_plug_options"
                @update:value="(value) => updateAdvancedPlugNameValue(condition, value)"
            />
            <n-select
                v-else-if="condition.field==='brType'"
                v-model:value="condition.value"
                clearable
                placeholder="选择码率类型"
                style="width: 150px"
                :options="advanced_br_options"
            />
            <n-select
                v-else-if="condition.field==='status'"
                v-model:value="condition.value"
                clearable
                placeholder="选择下载状态"
                style="width: 150px"
                :options="advanced_status_options"
            />
            <n-input
                v-else
                v-model:value="condition.value"
                clearable
                style="width: 220px"
                placeholder="输入匹配内容"
            />
            <n-button type="error" quaternary size="small" @click="removeAdvancedCondition(index)">
              删除条件
            </n-button>
          </n-flex>
          <n-flex align="center" :wrap="true">
            <n-button @click="addAdvancedCondition()">添加条件</n-button>
            <n-button
                type="warning"
                :disabled="!advanced_can_execute"
                @click="executeAdvancedTask"
            >
              执行{{ advanced_op_type === 'delete' ? '删除' : advanced_op_type === 'rewrite' ? '重新下载' : '操作' }}
            </n-button>
          </n-flex>
          <span style="font-size: 12px; opacity: 0.6">
            提示：未选择操作类型或未填写条件时按钮置灰；多个条件之间为"并且"关系；时间格式 yyyy-MM-dd HH:mm:ss。
          </span>
        </n-flex>
      </div>
    </n-collapse-item>
  </n-collapse>
  <n-divider />



  <div class="box">
    <!--   新的table展示     -->
    <n-data-table
        :columns="columns"
        :data="page_data"
        size="large"
        minWidth = 1000
        :row-props="handleRowProps"
    />
    <br>
    <n-card title="">
      <n-space vertical class="box">
        <n-pagination
            v-model:page="page_index"
            :item-count="item_total"
            size="large"
            :page-sizes="[10,20,50,100]"
            show-quick-jumper
            show-size-picker
            @update:page="pageUpdata"
            @update:page-size="pageSizeUpdata"
        >
          <template #goto >
            跳转
          </template>
          <template #suffix>
            页
          </template>

        </n-pagination>
      </n-space>
    </n-card>
    <n-back-top :right="100" :visibility-height="100" />
  </div>
  <n-modal v-model:show="showErrorRetryModal" preset="card" title="错误重试子任务" style="width: min(2200px, 98vw)">
    <n-data-table
        :columns="errorRetryColumns"
        :data="errorRetryData"
        size="large"
        :scroll-x="errorRetryTableScrollWidth"
        :max-height="'65vh'"
    />
  </n-modal>
  </n-spin>
</template>

<style scoped>
.page{
   display: flex;
  place-items: center;
  flex-direction: row;
  justify-content: center ;
}
.operat{
  display: flex;
  flex-direction: row;
  justify-content: space-around ;
}
.from{
  display: flex;
  align-items: center;
  flex-direction:row;
  align-content: center;
  justify-content:  space-around;
  flex-wrap: wrap;
}
.box{
  display: flex;
  align-items: center;
  flex-direction:row;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
