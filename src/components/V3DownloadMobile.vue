<script setup>
import { NButton, NTag, useMessage, NSpace, NList, NListItem, NThing, NCard, NDivider, NCollapse, NCollapseItem, NTooltip } from 'naive-ui'
import { h, ref, computed, onBeforeMount } from 'vue'
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
  getPlugBrTypeList,
  advancedTask
} from "../utils/api.js";

const stconfigInfoStore = configInfoStore()

// 页面数据
let pageSizes = ref(10)
let page_index = ref(1);
let item_total = ref(1);
let page_data = ref([]);

// 搜索关键字
let keyword_music_value = ref("")
let keyword_artis_value = ref("")
let keyword_album_value = ref("")
let download_type_value = ref("")
let download_status_value = ref("")

// 时间范围
let download_time_start_value = ''
let download_time_end_value = ''

// 加载状态
let show_spin = ref(false)

// 是否显示高级功能
let show_advanced = ref(false)

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

// 下载类型选项
let select_download_type_options = ref([
  {
    label: "全部",
    value: ""
  }
])

let shortcuts = {
  昨天: () => new Date().getTime() - 24 * 60 * 60 * 1000,
  近2小时: () => {
    const cur = new Date().getTime();
    return [cur - 2 * 60 * 60 * 1000, cur];
  }
}

// 初始化
onBeforeMount(() => {
  select_download_type_options.value.push(...stconfigInfoStore.getOption)
  getDownloadData()
})

let getDownloadData = () => {
  window.$loadingBar.start()
  show_spin.value = true;
  postDownloadInfo(
    keyword_music_value.value,
    keyword_artis_value.value,
    keyword_album_value.value,
    download_type_value.value,
    download_status_value.value,
    download_time_start_value,
    download_time_end_value,
    pageSizes.value,
    page_index.value
  ).then(value => {
    show_spin.value = false;
    item_total.value = value.data.data.total
    page_data.value = value.data.data.records;
    window.$loadingBar.finish()
  })
}

// 按钮功能
let delErrorTask_b = () => {
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delErrorTask().then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    },
    onNegativeClick: () => { }
  })
}

let delSuccessTask_b = () => {
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delSuccessTask().then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    },
    onNegativeClick: () => { }
  })
}

let delWaitingTask_b = () => {
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delWaitingTask().then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    },
    onNegativeClick: () => { }
  })
}

let refreshTask_b = () => {
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      refreshTask().then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    },
    onNegativeClick: () => { }
  })
}

let againTask_b = () => {
  window.$dialog.warning({
    title: '警告',
    content: '确定重新下载所有错误任务？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      againTask().then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    },
    onNegativeClick: () => { }
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
      advancedTask(buildAdvancedRequestBody()).then(value => {
        if (value.data.code === 200) {
          window.$message.success(value.data.msg || '操作成功')
        } else {
          window.$message.error(value.data.msg || '操作失败')
        }
        getDownloadData()
      })
    },
    onNegativeClick: () => { }
  })
}

let pageUpdata = (number) => {
  page_index.value = number
  getDownloadData();
}

let pageSizeUpdata = (number) => {
  pageSizes.value = number
  getDownloadData();
}

// 下拉选择
let update_download_type = (value, option) => {
  download_type_value.value = value
}

let update_download_status = (value, option) => {
  download_status_value.value = value
}

// 删除下载信息
let handleDelete = (id) => {
  window.$dialog.warning({
    title: '警告',
    content: '确定删除此条记录？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      delDownloadInfo(id).then(value => {
        if (value.data.code === 200) {
          window.$message.success("操作成功")
          getDownloadData()
        } else {
          window.$message.error("操作失败：" + value.data.msg)
        }
      })
    }
  })
}

// 重新下载
let handleRefresh = (id) => {
  refreshStatus(id).then(value => {
    if (value.data.code === 200) {
      window.$message.success("操作成功")
      getDownloadData()
    } else {
      window.$message.error("操作失败：" + value.data.msg)
    }
  })
}

// 获取状态标签
let getStatusTag = (status) => {
  switch (status) {
    case "waiting":
      return h(NTag, {
        type: 'info',
        style: { marginRight: '5px' }
      }, () => '等待下载')
    case "loading":
      return h(NTag, {
        type: 'info',
        style: { marginRight: '5px' }
      }, () => '下载中')
    case "success":
      return h(NTag, {
        type: 'success',
        style: { marginRight: '5px' }
      }, () => '下载成功')
    case "retry":
      return h(NTag, {
        type: 'warning',
        style: { marginRight: '5px' }
      }, () => '等待重试')
    case "error":
      return h(NTag, {
        type: 'error',
        style: { marginRight: '5px' }
      }, () => '下载失败')
    case "supplement":
      return h(NTag, {
        type: 'error',
        style: { marginRight: '5px' }
      }, () => '补充下载中')
    case "supplement_success":
      return h(NTag, {
        type: 'success',
        style: { marginRight: '5px' }
      }, () => '补充成功')
    default:
      return h(NTag, { type: 'default' }, () => status)
  }
}

// 获取音频书籍标签
let getAudioBookTag = (isAudioBook) => {
  return h(NTag, {
    type: isAudioBook === 1 ? 'success' : 'default',
    style: { marginRight: '5px' }
  }, () => isAudioBook === 1 ? '是' : '否')
}

// 获取下载类型标签
let getDownloadTypeTag = (type) => {
  return h(NTag, {
    type: 'success',
    style: { marginRight: '5px' }
  }, () => type)
}
</script>

<template>
  <n-spin :show="show_spin">
    <n-card title="下载管理" style="margin: 10px;">
      <!-- 搜索表单 -->
      <n-form @submit.prevent="getDownloadData">
        <n-form-item label="歌名">
          <n-input v-model:value="keyword_music_value" clearable placeholder="输入歌名" />
        </n-form-item>
        <n-form-item label="歌手">
          <n-input v-model:value="keyword_artis_value" clearable placeholder="歌手名称" />
        </n-form-item>
        <n-form-item label="专辑">
          <n-input v-model:value="keyword_album_value" clearable placeholder="专辑名称" />
        </n-form-item>
        <n-form-item label="数据来源">
          <n-select v-model:value="download_type_value" placeholder="选择数据来源" clearable
            :options="select_download_type_options" @update:value="update_download_type" />
        </n-form-item>
        <n-form-item label="下载状态">
          <n-select v-model:value="download_status_value" placeholder="选择下载状态" clearable
            :options="select_download_status_options" @update:value="update_download_status" />
        </n-form-item>
        <n-form-item label="下载时间">
          <n-date-picker :input-readonly="true" type="datetimerange" :shortcuts="shortcuts" :clearable="true"
            :update-value-on-close="true" :on-update-formatted-value="(value) => {
              download_time_start_value = value[0]
              download_time_end_value = value[1]
            }" />
        </n-form-item>
        <n-form-item>
          <n-button attr-type="button" @click="getDownloadData" type="primary" block>
            搜索
          </n-button>
        </n-form-item>
      </n-form>

      <!-- 高级功能 -->
      <n-button @click="toggleAdvanced" style="margin-bottom: 10px;" block>
        {{ show_advanced ? '收起高级功能' : '展开高级功能' }}
      </n-button>

      <n-collapse v-if="show_advanced" style="margin-bottom: 10px;">
        <n-collapse-item title="待下载高级操作" name="1">
          <n-button @click="delWaitingTask_b" style="margin-bottom: 5px;" block>删除待下载</n-button>
        </n-collapse-item>
        <n-collapse-item title="下载中高级操作" name="2">
          <n-button @click="refreshTask_b" style="margin-bottom: 5px;" block>重新下载</n-button>
        </n-collapse-item>
        <n-collapse-item title="下载成功高级操作" name="3">
          <n-button @click="delSuccessTask_b" style="margin-bottom: 5px;" block>删除完成</n-button>
        </n-collapse-item>
        <n-collapse-item title="下载错误高级操作" name="4">
          <n-button @click="delErrorTask_b" style="margin-bottom: 5px;" block>删除错误</n-button>
          <n-button @click="againTask_b" block>重新下载错误</n-button>
        </n-collapse-item>
        <n-collapse-item title="自定义条件删除/重试" name="5">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <span style="font-weight: bold;">操作类型</span>
              <n-radio-group v-model:value="advanced_op_type" name="advancedOp">
                <n-radio-button value="delete">删除</n-radio-button>
                <n-radio-button value="rewrite">重新下载</n-radio-button>
              </n-radio-group>
            </div>
            <n-divider style="margin: 2px 0" />
            <div
                v-for="(condition, index) in advanced_conditions"
                :key="condition.id"
                style="display: flex; flex-direction: column; gap: 8px; border: 1px dashed rgba(128,128,128,.35); border-radius: 6px; padding: 8px;"
            >
              <n-select
                  :value="condition.field"
                  :options="advanced_field_options"
                  placeholder="选择条件字段"
                  @update:value="(field) => updateAdvancedConditionField(condition, field)"
              />
              <n-date-picker
                  v-if="condition.field==='createTime' || condition.field==='updateTime'"
                  :input-readonly="true"
                  type="datetimerange"
                  format="yyyy-MM-dd HH:mm:ss"
                  :update-value-on-close="true"
                  clearable
                  @update:formatted-value="(value)=> { condition.value = value }"
              />
              <n-select
                  v-else-if="condition.field==='plugName'"
                  :value="condition.value"
                  clearable
                  placeholder="选择数据来源"
                  :options="advanced_plug_options"
                  @update:value="(value) => updateAdvancedPlugNameValue(condition, value)"
              />
              <n-select
                  v-else-if="condition.field==='brType'"
                  v-model:value="condition.value"
                  clearable
                  placeholder="选择码率类型"
                  :options="advanced_br_options"
              />
              <n-select
                  v-else-if="condition.field==='status'"
                  v-model:value="condition.value"
                  clearable
                  placeholder="选择下载状态"
                  :options="advanced_status_options"
              />
              <n-input
                  v-else
                  v-model:value="condition.value"
                  clearable
                  placeholder="输入匹配内容"
              />
              <n-button type="error" quaternary block @click="removeAdvancedCondition(index)">
                删除条件
              </n-button>
            </div>
            <n-button block @click="addAdvancedCondition()">添加条件</n-button>
            <n-button
                type="warning"
                block
                :disabled="!advanced_can_execute"
                @click="executeAdvancedTask"
            >
              执行{{ advanced_op_type === 'delete' ? '删除' : advanced_op_type === 'rewrite' ? '重新下载' : '操作' }}
            </n-button>
            <span style="font-size: 12px; opacity: .6;">
              未选择操作类型或未填写条件时按钮置灰；多条件为"并且"关系；时间格式 yyyy-MM-dd HH:mm:ss。
            </span>
          </div>
        </n-collapse-item>
      </n-collapse>

      <n-divider />

      <!-- 下载列表 -->
      <n-list style="margin-bottom: 10px;">
        <n-list-item v-for="item in page_data" :key="item.id">
          <n-thing>
            <template #header>
              {{ item.downloadMusicname || '未知歌曲' }}
            </template>
            <template #description>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <div>
                  <span style="font-weight: bold;">歌手：</span>
                  <span>{{ item.downloadArtistname || '未知歌手' }}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">专辑：</span>
                  <span>{{ item.downloadAlbumname || '未知专辑' }}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">数据来源：</span>
                  <span>{{ item.downloadPlugName || '未知来源' }}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">是否书籍：</span>
                  <component :is="getAudioBookTag(item.audioBook)" />
                </div>
                <div>
                  <span style="font-weight: bold;">码率类型：</span>
                  <component :is="getDownloadTypeTag(item.downloadBrType)" />
                </div>
                <div>
                  <span style="font-weight: bold;">状态：</span>
                  <component :is="getStatusTag(item.downloadStatus)" />
                </div>
                <div v-if="item.downloadRetryNum !== undefined && item.downloadRetryNum !== null && item.downloadRetryNum !== ''">
                  <span style="font-weight: bold;">当前重试次数：</span>
                  <span>{{ item.downloadRetryNum }}</span>
                </div>
                <div v-if="item.downloadRetryTime !== undefined && item.downloadRetryTime !== null && item.downloadRetryTime !== ''">
                  <span style="font-weight: bold;">下次执行时间：</span>
                  <span>{{ item.downloadRetryTime }}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">下载时间：</span>
                  <span>{{ item.downloadTime || '未知时间' }}</span>
                </div>
                <div v-if="item.downloadUpdateTime">
                  <span style="font-weight: bold;">更新时间：</span>
                  <span>{{ item.downloadUpdateTime }}</span>
                </div>
                <div v-if="item.downloadMsg">
                  <span style="font-weight: bold;">下载消息：</span>
                  <span>{{ item.downloadMsg }}</span>
                </div>
              </div>
            </template>
          </n-thing>
          
          <template #suffix>
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <n-button @click="handleDelete(item.id)" size="small" type="error">
                删除
              </n-button>
              <n-button v-if="(item.downloadStatus === 'error' || item.downloadStatus === 'supplement_success') && item.id !== 0 && item.downloadBrType != null && item.downloadBrType !== ''" @click="handleRefresh(item.id)" size="small" type="info"
                style="margin-top: 5px;">
                重新下载
              </n-button>
            </div>
          </template>
        </n-list-item>
      </n-list>

      <!-- 分页 -->
      <div style="margin-top: 15px;">
        <n-pagination 
          v-model:page="page_index" 
          :item-count="item_total" 
          :page-size="pageSizes"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker 
          show-quick-jumper
          @update:page="pageUpdata" 
          @update:page-size="pageSizeUpdata"
        >
          <template #prefix="{ itemCount }">
            共 {{ itemCount }} 项
          </template>
        </n-pagination>
      </div>
    </n-card>

    <n-back-top :right="20" :bottom="20" />
  </n-spin>
</template>

<style scoped>
.page {
  display: flex;
  place-items: center;
  flex-direction: row;
  justify-content: center;
}

.operat {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}

.from {
  display: flex;
  align-items: center;
  flex-direction: row;
  align-content: center;
  justify-content: space-around;
  flex-wrap: wrap;
}

.box {
  display: flex;
  align-items: center;
  flex-direction: row;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
}

/* 移动端分页优化 */
:deep(.n-pagination) {
  flex-wrap: wrap;
  gap: 5px;
}

:deep(.n-pagination .n-pagination-item) {
  min-width: 30px;
  padding: 0 5px;
}

@media (max-width: 768px) {
  :deep(.n-pagination .n-pagination-prefix) {
    font-size: 12px;
  }
  
  :deep(.n-pagination .n-pagination-quick-jumper) {
    font-size: 12px;
  }
  
  :deep(.n-pagination .n-pagination-quick-jumper input) {
    width: 50px;
    padding: 0 5px;
  }
}
</style>