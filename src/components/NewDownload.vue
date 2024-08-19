<script setup>
import {CheckmarkCircleOutline,WarningOutline,EllipsisHorizontalCircle} from "@vicons/ionicons5";
import TopWitge from "./TopWitge.vue";
import { NButton, NTag,  useMessage,NSpace } from 'naive-ui'
import {h, ref,inject } from 'vue'


import {
  againTask,
  delErrorTask,
  delSuccessTask,
  delWaitingTask,
  getDownloadInfo,
  postDownloadInfo,
  refreshTask,
  selectOption,
  delDownloadInfo,
  refreshStatus
} from "../utils/api.js";






//页面设置
let columns = [
  {
    title: '更多',
    type: "expand",
    width: 30,
    expandable: (rowData) => rowData.status === "error",
    renderExpand: (rowData) => {
      return `错误信息：${rowData.downloadMsg}`;
    }
  },
  {
    title: '音乐名称',
    key: 'downloadMusicname',
    width: 100,
    ellipsis: true,
    align: 'left'
  },
  {
    title: '歌手',
    key: 'downloadArtistname',
    width: 100,
    ellipsis: true,
    align: 'left'
  },
  {
    title: '专辑',
    key: 'downloadAlbumname',
    width: 100,
    ellipsis: true,
  }
  ,{
    title: '数据来源',
    key: 'downloadType',
    width: 50,
    ellipsis: true,
  }
  ,{
    title: '添加时间',
    key: 'downloadTime',
    width: 50,
    ellipsis: true,
  }
  ,{
    title: '下载类型',
    key: 'downloadBrType',
    width: 50,
    ellipsis: true,
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
    key: 'status',
    width: 50,
    ellipsis: true,
    render(row) {
      if (row.status==="waiting"){
        return h(NButton, {
          type: 'info',
          size: 'small',
          strong : true,
          disabled : true,
        }, () => h('span', {}, '等待下载'))
      }else if (row.status==="loading"){
        return h(NButton, {
          type: 'info',
          size: 'small',
          strong : true,
          disabled : true,
        }, () => h('span', {}, '下载中'))
      }else if (row.status==="success"){
        return h(NButton, {
          type: 'success',
          size: 'small',
          strong : true,
          disabled : true,
        }, () => h('span', {}, '下载成功'))
      }else if (row.status==="error"){
        return h(NButton, {
          type: 'error',
          size: 'small',
          strong : true,
          disabled : true,
        }, () => h('span', {}, '下载失败'))
      }
    }
  }
  ,{
    title: '操作',
    key: 'action',
    width: 100,
    align: 'left',
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
        })

        }
      }, () => h('span', {}, '重新下载'))

      if (row.status==="waiting"){
          return delbutton
      }else if (row.status==="loading"){
        return [
          delbutton
        ]
      }else if (row.status==="success"){
        return delbutton
      }else if (row.status==="error"){
        return     h(NSpace,{
          style: {
            // marginLeft: '10px'
          }
        }, [
            delbutton,
            refreshnutton
        ])
      }
    }
  }
]

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

  /**
   * 初始化搜索类型选项
   */
  selectOption().then(value => {
    console.log(value)
    nextTick(()=>{
      select_download_type_options.value.push(...value.data.data)
      getDownloadData()
    })


  })

})

let getDownloadData = ()=>{
  postDownloadInfo(keyword_music_value.value,keyword_artis_value.value,keyword_album_value.value,download_type_value.value,false,download_status_value.value,download_time_value.value[0],download_time_value.value[1],pageSizes.value,page_index.value).then(value=>{
    item_total.value = value.data.data.total
    page_data.value = value.data.data.records;
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
let againTask_b =()=>{
  window.$dialog.warning({
    title: '警告',
    content: '确定执行此操作？',
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
  <TopWitge/>

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
            :update-value-on-close="true"
            :on-update-formatted-value="(value)=>{
             download_time_value.value = value
          }"
        />
      </n-form-item>
      <n-form-item :span="1" >
          <n-button attr-type="button" @click="getDownloadData">
            搜索
          </n-button>
      </n-form-item>
      <n-form-item :span="1" >
        <n-button attr-type="button" @click="show_advanced = !show_advanced">
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
            <n-button @click="refreshTask_b">重新下载错误</n-button>
          </template>
          错误的任务将全部重新下载
        </n-tooltip>
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
