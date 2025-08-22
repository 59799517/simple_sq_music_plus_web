<script setup>


import {
  getAllSet,
  kgSign,
  kgRefreshToken,
  getKgQrCode,
  modifySet,
  getKgQrCodeStatus,
  getKgWxQrCode,
  getKgWxQrCodeStatus,
  getQQVipQrCode,
  getQQVipQrCodeStatus,
  refreshQQvipCookie
} from "../utils/api.js";
import TopWitge from "./V3TopWitge.vue";






let setinfodata = window.localStorage.getItem("setinfo");
let token  = window.localStorage.getItem("token")??"未获取到";
let setinfo = ref(JSON.parse(setinfodata));
onBeforeMount(()=>{

  // getAllSet().then((value)=>{
  //     console.log("alei：",JSON.stringify(value.data.data))
  //     window.localStorage.setItem("setinfo",JSON.stringify(value.data.data))
  //
  // })
  kgIsLogin = getKgIslogin();
  qqvipIsLogin= getQQIslogin();

})

let show_hide_set = ref(false)

let showModal = ref(false)
let selectValue =ref("")
let selectType =ref("input")
let selectName =ref("")
let selectConfigKey =ref("")
// 酷狗相关
let kgIsLogin = ref(false)
let kgqr = ref("");
let KgIoginInfo = ref("")
let KgSignInfo = ref([])
// QQvip相关
let qqvipIsLogin = ref(false)
let qqqr = ref("");
let qqvipLoginInfo = ref("")




let openDialog = (type,name,oldValue,configKey)=>{
  showModal.value=true
  selectType.value=type
  if(type==="switch"){
      selectValue=ref(oldValue==="true")
  }else{
    selectValue.value=oldValue
  }
  selectName.value=name
  selectConfigKey.value=configKey
}

let  closeDialog = ()=>{
  showModal.value=false
  selectValue.value=''
  selectType.value='input'
  selectName.value=''
  selectConfigKey.value=''
}

let fkgRefreshToken = ()=>{
  kgRefreshToken().then((value)=>{
    if (value.data.code===200){
      window.$message.success("刷新成功")
    }else{
      window.$message.error("刷新失败")
    }
  })
}

let fgetKgQrCodeStatus = ()=>{
  getKgQrCodeStatus().then((value)=>{
    if (value.data.code===200&&value.data.data){
      kgqr.value="";
      window.$message.success("扫码成功")
    }else{
      window.$message.error("未获得扫码结果（长时间未获得请重新获取并扫码）")
    }
  })
}
let fkgSign = ()=>{
  kgSign().then((value)=>{
    if (value.data.code===200){
      window.$message.success("签到成功")
    }else{
      window.$message.error("签到失败")
    }
  })
}
/*
获取酷狗二维码
 */
let getKgQr=()=>{
  getKgQrCode().then((value)=>{
    kgqr.value=value.data.data
  })
}
let fgetKgWxQrCode = ()=>{
  getKgWxQrCode().then((value)=>{
    kgqr.value=value.data.data
  })
}
let fgetKgWxQrCodeStatus = ()=>{
  getKgWxQrCodeStatus().then((value)=>{
    if (value.data.code===200&&value.data.data){
      kgqr.value="";
      window.$message.success("扫码成功")
    }else{
      window.$message.error("未获得扫码结果（长时间未获得请重新获取并扫码）")
    }
  })
}

let setData=()=>{
  showModal.value=false
  modifySet(selectConfigKey.value,selectValue.value).then(cv=>{
    if (cv.data.code===200){
      showModal.value=false
      selectValue.value=''
      selectType.value='input'
      selectName.value=''
      selectConfigKey.value=''
      getAllSet().then((value)=>{
        window.localStorage.setItem("setinfo",JSON.stringify(value.data.data))
        setinfo.value =value.data.data
        getKgIslogin();
        getQQIslogin();
      })
    }else{
      window.$message.error("错误信息："+cv.data.msg)
    }
  })
}
//判断开启了QQvip
let getQQIslogin=()=>{
  for (let setinfoElement of setinfo.value) {
    if (setinfoElement["configKey"] == "plug.qqvip.open"&&setinfoElement["configValue"] == "true") {
      qqvipIsLogin=true;
      return true;
    }
  }
  qqvipIsLogin = false;
  return false
}


// 判断开启了酷狗功能
let getKgIslogin=()=>{
  //setinfo.value 找到指定的配置
  for (let setinfoElement of setinfo.value) {
    if (setinfoElement["configKey"] == "plug.kg.open"&&setinfoElement["configValue"] == "true") {
      kgIsLogin = true;
      return true;
    }
  }
  kgIsLogin = false;
  return false
}
let getKgInfo=()=>{
  getAllSet().then((value)=>{
    window.localStorage.setItem("setinfo",JSON.stringify(value.data.data))
    setinfo.value =value.data.data
    getKgIslogin();
    for (let setinfoElement of setinfo.value) {
      if (setinfoElement["configKey"] == "plug.kg.logininfo") {
        console.log("alei2：",setinfoElement)
        KgIoginInfo = setinfoElement["configValue"];
        KgIoginInfo= JSON.parse(KgIoginInfo);
        KgIoginInfo = JSON.stringify(KgIoginInfo,null,'\t')
        return
      }
    }
  })
}

let getKgSignInfo=()=>{
  getAllSet().then((value)=>{
    window.localStorage.setItem("setinfo",JSON.stringify(value.data.data))
    setinfo.value =value.data.data
    console.log("getKgSignInfo：",123)
    for (let setinfoElement of setinfo.value) {
      console.log(setinfoElement)
      if (setinfoElement["configKey"] == "plug.kg.signIn.total"||
          setinfoElement["configKey"] == "plug.kg.signIn.done"||
          setinfoElement["configKey"] == "plug.kg.signIn.remain"||
          setinfoElement["configKey"] == "plug.kg.signIn.vipHour"
      ) {
        console.log("getKgSignInfo：",setinfoElement)
        KgSignInfo.value.push(setinfoElement)

      }
    }
    if (KgSignInfo.value.length===0){
      window.$message.error("暂无签到信息！可以点击签到")
    }
  })
}


/**
 * 获取QQVIP QQ二维码
 */
let getqqvipqqQr=()=>{
  getQQVipQrCode().then((value)=>{
    qqqr.value = value.data.data
  })
}
/**
 * 获取二维码状态
 */
let getQQVipQrCodeStatusc=()=>{
  getQQVipQrCodeStatus().then((value)=>{
    console.log("获取的状态是：",value)
    if (value.data.code===200){
      window.$message.success("扫码成功（已获取到用户信息）")
      qqqr.value="";
    }else{
      window.$message.error(value.data.msg)
    }
  })
}
let refreshQQvipCookiec=()=>{
  refreshQQvipCookie().then(value => {
    if (value.data.code===200){
      window.$message.success("刷新成功")
    }else{
      window.$message.error(value.data.msg)
    }
  })
}


</script>

<template>
  <TopWitge/>
  <n-card title="设置">
    <n-card title="Toekn和插件（freeMp3关停暂时用不到了）">
      <p>   插件url：↑↑↑↑↑↑↑↑↑↑↑↑（浏览器显示这个复制上 http://xxxxx:xxx 只要这一段即可 /#后边的不要）↑↑↑↑↑↑↑↑↑↑↑↑↑</p>
      <p> 插件使用token：</p>
     <p >{{token}}</p>
      <n-button @click="show_hide_set=!show_hide_set">显示隐藏设置</n-button>

    </n-card>

    <n-card title="QQvip相关设置"  v-if="qqvipIsLogin">
      <p >当前插件已经开启：{{qqvipIsLogin?'已开启插件':'未开启插件'}}</p>
      <p >{{qqvipIsLogin?'每天0,4,8,12,16,20,23的时候自动刷新一次cookies':''}}</p>
      <p>咱未开发微信扫码请手机QQ扫码登录</p>
      <n-button @click="refreshQQvipCookiec">
        刷新当前登录cookie
      </n-button>
      <n-button @click="getqqvipqqQr">
        获取QQ音乐二维码
      </n-button>
      <n-button @click="getQQVipQrCodeStatusc">
        检查二维码状态
      </n-button>
      <n-divider>
      </n-divider>
      <n-image v-if="qqqr" :src="qqqr"></n-image>
    </n-card>

    <n-card title="某狗概念版相关"  v-if="kgIsLogin">
      <p >当前插件已经开启：{{kgIsLogin?'已登录（无需扫码）':'未登录（需要扫码登录）'}}</p>
      <p >{{kgIsLogin?'每天0,3,6,9,12,15,18,21时候自动签到一次':''}}</p>
      <n-button @click="getKgQr">
        获取酷狗二维码（生成的多了有问题）
      </n-button>
      <n-button @click="fgetKgQrCodeStatus">
        获取酷狗二维码扫码状态(扫完后等一小会然后点)
      </n-button>
      <n-divider>
        优先微信或者酷狗概念版手机扫描不行换微信扫码
      </n-divider>
          <n-button @click="fgetKgWxQrCode">
            获取酷狗微信二维码(优先)
          </n-button>
          <n-button @click="fgetKgWxQrCodeStatus">
            获取酷狗微信二维码扫码状态(扫完后等一小会然后点)
          </n-button>
      <n-divider>
      </n-divider>
      <n-image v-if="kgqr" :src="kgqr"></n-image>
      <n-divider>
      </n-divider>
      其他辅助功能：
      <p>不要频繁签到和刷新</p>
      <n-button @click="fkgRefreshToken">
        刷新酷狗登录状态
      </n-button>
      <n-button @click="fkgSign">
        酷狗手动签到
      </n-button>
      <n-button @click="getKgInfo">
        查看当前登录信息
      </n-button>
      <n-button @click="getKgSignInfo">
        查看签到信息
      </n-button>
      <p>
        签到相关信息下方查看没必要勿修改
      </p>
      <n-divider>

      </n-divider>
      <div style="overflow: auto">
        <n-space vertical :size="16">
      <n-code :code="KgIoginInfo">
      </n-code>
        </n-space>
      </div>
      <div style="overflow: auto">
        <n-space vertical :size="16" v-for="(item,index) in KgSignInfo" >
            {{item.configName}}:{{item.configValue}}
        </n-space>
      </div>
    </n-card>


    <n-list v-for="(item, index) in setinfo">
      <n-list-item v-if="show_hide_set || item.configShow=='Y'">
        <n-thing :title="item.configName" :description="item.configValue" />
        <template #suffix>
          <n-button @click="openDialog(item.type,item.configName,item.configValue,item.configKey)"> 修改</n-button>
        </template>
      </n-list-item>
    </n-list>
  </n-card>



  <n-modal v-model:show="showModal">
    <n-card
        style="width: 600px"
        title="设置(谨慎操作)"
        :bordered="false"
        size="huge"
        role="card"
        aria-modal="true"
    >
      <div>
        <n-form-item :label="selectName+':'" >
        <br/>
          <br/>
          <br/>
        <div v-if="selectType==='input'" >
          <n-input v-model:value="selectValue" />
        </div>
        <div v-if="selectType==='switch'" >
          <n-switch v-model:value="selectValue" />
        </div>
        <div v-if="selectType==='number'" >
          <n-input-number v-model:value="selectValue" clearable />
        </div>
        </n-form-item>
      </div>
      <template #action>
        <div style="display: flex;flex-direction: row;justify-content: flex-end">
          <n-button @click="setData">确定</n-button>
          <div style="width: 30px;"></div>
          <n-button @click="closeDialog">取消</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>
<style scoped>

</style>
