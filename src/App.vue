<script setup>
import HelloWorld from './components/HelloWorld.vue'
import Home from './components/Home.vue'

import { darkTheme,NMessageProvider, zhCN, dateZhCN  } from "naive-ui";
import { provide } from 'vue'
import MessageApi from "./components/message-api.vue";

let theme=ref(darkTheme);
let name=ref('dark');
const changetheme = () => {

  if (name.value === 'dark') {
    theme.value = null;
    name.value='';
  }else{
    theme.value =darkTheme;
    name.value='dark';
  }
};
provide("changetheme",changetheme);
</script>

<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <n-dialog-provider>
    <n-message-provider placement="bottom">
      <MessageApi />
    </n-message-provider>
    </n-dialog-provider>
    <n-global-style />
    <router-view></router-view>
  </n-config-provider>

</template>

<style scoped>

</style>
