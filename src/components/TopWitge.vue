<script setup>
import {getversion, logout} from "../utils/api.js";
import {ref} from "vue";

let clockTheam = inject('changetheme')

let logout_b= ()=>{
  logout().then(value=>{
    window.$message.success(value.data.msg)
  })
}
let is_show_old_download = ref(false);
let version = ref("x.x.x");
let getShowOldDownload=()=>{
  //找到configKey是music.show.play的数据
  let setinfodata = window.localStorage.getItem("setinfo");
  let setinfo = ref(JSON.parse(setinfodata));
  for (let setinfoElement of setinfo.value) {
    if (setinfoElement["configKey"] == "system.show.old.download"&&setinfoElement["configValue"] == "true") {
      console.log("showOldDownload",setinfoElement["configValue"])
      return true;
    }
  }
  return false;
}
/**
 * 初始化
 */
onBeforeMount(()=>{
  is_show_old_download.value = getShowOldDownload();
  getversion().then(value=>{
    version.value = value.data.data;
  })
})

</script>

<template>
  <div>
    <div class="header">
      <div class="box">
      <h2>&nbsp;&nbsp;&nbsp;SqMusicTool</h2>
        <p>
          <n-gradient-text :size="12" type="success">
            &nbsp;{{version}}
          </n-gradient-text>
        </p>

      </div>
      <div class="box">
          <router-link active-class="active" to="/search">
            <n-button  size="large" quaternary>
              搜索
            </n-button>
          </router-link>
        <router-link  active-class="active" :to="is_show_old_download?'/newDownload':'/download'">
          <n-button  size="large" quaternary>
            下载
          </n-button>
        </router-link>
          <router-link active-class="active" to="/parsertext">
            <n-button  size="large" quaternary>
              解析文本
            </n-button>
          </router-link>
          <router-link active-class="active" to="/parserPlaylist">
            <n-button  size="large" quaternary>
              解析歌单
            </n-button>
          </router-link>
      </div>
      <div class="box">
        <router-link active-class="active" to="/set">
          <n-button  size="large" quaternary>
            设置
          </n-button>
        </router-link>
        <n-button @click="clockTheam" quaternary>
          切换主题
        </n-button>
        <n-button @click="logout_b">退出</n-button>
      </div>
    </div>

  </div>

</template>

<style scoped>
.header{
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;

}
.box{
  display: flex;
  align-items: center;
  flex-direction:row;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
}

img{
  width: 40px;
  height: 40px;
}

nav {
  display: flex;
  align-items: center;
  margin: 10px 90px;
  font:16px Arial, Helvetica, sans-serif;
}


nav a:hover {
  opacity: 1;
}

.active {
  //color: #608bd2;
  pointer-events: none;
  opacity: 1;
}

/*搜索框*/

.text{
  height: 22px;
  font-size: 14px;
  //border: 1px solid #ccc;
  padding: 3px 16px;
  border-bottom-left-radius: 20px;
  border-top-left-radius: 20px;
}
.text:focus{
  outline: none;
  //border-color: rgba(82, 168, 236, 0.8);
  //box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.075), 0 0 8px rgba(82, 168, 236, 0.6);
}
.button{
  width: 60px;
  height: 30px;
  font-size: 14px;
  margin-right: 35px;
  //border: 1px solid #608bd2;
  //background-color: #608bd2;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
}

.contents{
  display: flex;
  justify-content: center;
}
.content{
  display: flex;
  width: 1400px;
  height: 1400px;
  /*background-color: #f0f2f3;*/
}
a{
  text-decoration: none;

  color:#000000;

  font-family:sans-serif;

  font-size: 12px;

}
</style>
