<script setup>
import {CheckmarkCircleOutline,WarningOutline,EllipsisHorizontalCircle} from "@vicons/ionicons5";
import TopWitge from "./TopWitge.vue";
import { NButton, NTag, useMessage } from 'naive-ui'
import { h } from 'vue'

import {againTask, delErrorTask, delSuccessTask, delWaitingTask, getDownloadInfo, refreshTask} from "../utils/api.js";






let pageSizes=ref(20)

let waiting_index = ref(1);
let loading_index = ref(1);
let error_index = ref(1);
let success_index = ref(1);


let waiting_total = ref(1);
let loading_total = ref(1);
let error_total = ref(1);
let success_total = ref(1);

let waiting_data = ref([]);
let loading_data  = ref([]);
let error_data  = ref([]);
let success_data  = ref([]);

// 初始化
onBeforeMount(()=>{
  getDownloadInfo('waiting',pageSizes.value,waiting_index.value).then(value=>{
    waiting_total.value = value.data.data.total
    waiting_data.value = value.data.data.records;
  })
  getDownloadInfo('loading',pageSizes.value,loading_index.value).then(value=>{
    loading_total.value = value.data.data.total
    loading_data.value = value.data.data.records;
  })
  getDownloadInfo('success',pageSizes.value,success_index.value).then(value=>{
    success_total.value = value.data.data.total
    success_data.value = value.data.data.records;
  })
  getDownloadInfo('error',pageSizes.value,error_index.value).then(value=>{
    error_total.value = value.data.data.total
    error_data.value = value.data.data.records;
  })
})

//页面点击回调
let waiting_pageUpdata=(type)=>{
  if (type==='next'){
    waiting_index.value++
  }else{
    waiting_index.value--
  }
  getDownloadInfo('waiting',pageSizes.value,waiting_index.value).then(value=>{
    waiting_total.value = value.data.data.total
    waiting_data.value = value.data.data.records;
  })
}
let loading_pageUpdata=(type)=>{


  if (type==='next'){
    loading_index.value++
  }else{
    loading_index.value--
  }
  getDownloadInfo('loading',pageSizes.value,loading_index.value).then(value=>{
    loading_total.value = value.data.data.total
    loading_data.value = value.data.data.records;
  })
}
let success_pageUpdata=(type)=>{

  if (type==='next'){
    success_index.value++
  }else{
    success_index.value--
  }
  getDownloadInfo('success',pageSizes.value,success_index.value).then(value=>{
    success_total.value = value.data.data.total
    success_data.value = value.data.data.records;
  })
}
let error_pageUpdata=(type)=>{
  if (type==='next'){
    error_index.value++
  }else{
    error_index.value--
  }
  getDownloadInfo('error',pageSizes.value,error_index.value).then(value=>{
    error_total.value = value.data.data.total
    error_data.value = value.data.data.records;
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

</script>

<template>
  <TopWitge/>
    <n-tabs type="line" animated default-value="waiting" justify-content="space-evenly" >
      <n-tab-pane name="waiting" tab="待下载">
        <div class="operat">
          <n-tooltip :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button @click="delWaitingTask_b">删除待下载</n-button>
            </template>
            清空全部待下载
          </n-tooltip>
        </div>
        <n-list>
          <n-list-item v-for="item in  waiting_data">
            <n-thing :title="item.downloadMusicname+' - '+item.downloadArtistname+'('+item.downloadAlbumname+')'"   />
            <template #suffix>
              <n-icon size="40" color="#0e7a0d">
                <EllipsisHorizontalCircle />
              </n-icon>
            </template>
          </n-list-item>
        </n-list>




        <div class="page">
          <n-button @click="waiting_pageUpdata('prev')">
            上一页
          </n-button>
          <n-h5> {{waiting_index}}/{{(Math.ceil(waiting_total/pageSizes))}}</n-h5>
          <n-button @click="waiting_pageUpdata('next')">
            下一页
          </n-button>
        </div>
      </n-tab-pane>
      <n-tab-pane name="loading" tab="下载中">
        <div class="operat">
          <n-tooltip :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button @click="refreshTask_b">重新下载</n-button>
            </template>
            长时间卡在待下在中不执行的可以使用此功能不过用的地方应该不多
          </n-tooltip>
        </div>
        <n-list>
          <n-list-item v-for="item in  loading_data">
            <n-thing :title="item.downloadMusicname+' - '+item.downloadArtistname+'('+item.downloadAlbumname+')'"   />
            <template #suffix>
              <n-spin size="medium" />
            </template>
          </n-list-item>
        </n-list>
        <div class="page">
          <n-button @click="loading_pageUpdata('prev')">
            上一页
          </n-button>
          <n-h5> {{loading_index}}/{{(Math.ceil(loading_total/pageSizes))}}</n-h5>
          <n-button @click="loading_pageUpdata('next')">
            下一页
          </n-button>
        </div>
      </n-tab-pane>
      <n-tab-pane name="error" tab="错误">
        <div class="operat">
          <n-tooltip :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button @click="delErrorTask_b">删除错误</n-button>
            </template>
            清空全部错误任务
          </n-tooltip>
          <n-tooltip :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button @click="refreshTask_b">重新下载</n-button>
            </template>
            错误的任务将全部重新下载
          </n-tooltip>
        </div>
        <n-list>
          <n-list-item v-for="item in  error_data">
            <n-thing :title="item.downloadMusicname+' - '+item.downloadArtistname+'('+item.downloadAlbumname+')'"  />
            <template #suffix>
              <n-icon size="40" color="#0e7a0d">
                <WarningOutline />
              </n-icon>
            </template>
          </n-list-item>
        </n-list>
        <div class="page">
          <n-button @click="error_pageUpdata('prev')">
            上一页
          </n-button>
          <n-h5> {{error_index}}/{{(Math.ceil(error_total/pageSizes))}}</n-h5>
          <n-button @click="error_pageUpdata('next')">
            下一页
          </n-button>
        </div>

      </n-tab-pane>
      <n-tab-pane name="success" tab="已完成">
        <div class="operat">
          <n-tooltip :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button @click="delSuccessTask_b">删除完成</n-button>
            </template>
            清空全部完成任务
          </n-tooltip>
        </div>
        <n-list>
          <n-list-item v-for="item in  success_data">
            <n-thing :title="item.downloadMusicname+' - '+item.downloadArtistname+'('+item.downloadAlbumname+')'"   />
            <template #suffix>
              <n-icon size="40" color="#0e7a0d">
                <CheckmarkCircleOutline />
              </n-icon>
            </template>
          </n-list-item>
        </n-list>
        <div class="page">
          <n-button @click="success_pageUpdata('prev')">
            上一页
          </n-button>
          <n-h5> {{success_index}}/{{(Math.ceil(success_total/pageSizes))}}</n-h5>
          <n-button @click="success_pageUpdata('next')">
            下一页
          </n-button>
        </div>

      </n-tab-pane>
    </n-tabs>

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
</style>
