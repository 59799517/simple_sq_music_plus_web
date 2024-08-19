import request from "./request.js";
import qs from "qs";

const baseUrl = 'http://127.0.0.1:8099'
// const baseUrl = ''
//
// const baseUrl = '/sqmusic-api'

/**
 * 登录
 * @param username 用户名
 * @param password 密码
 * @returns {*}
 */
export function login(username,password) {
    return request({
        url: baseUrl + "/login" ,
        method: "post",
        data:{"username":username,"password":password}
    });
}


/**
 * 登出 退出
 * @returns {*}
 */

export function logout() {
    return request({
        url: baseUrl + "/logout" ,
        method: "post"
    });
}


/**
 * 检查是否登录或者token是否超时
 * @returns {*}
 */
export function isLogin() {
    return request({
        url: baseUrl + "/isLogin" ,
        method: "post"
    });
}

/**
 * 获取全部设置
 * @returns {*}
 */
export function getAllSet() {
    return request({
        url: baseUrl + "/set/getSetList/" ,
        method: "get"
    });
}

/**
 * 修改设置
 * @param configKey 设置唯一标识
 * @param configValue 需要修改的值
 * @returns {*}
 */
export function modifySet(configKey,configValue) {
    return request({
        url: baseUrl + "/set/modify" ,
        method: "post",
        data:{"configKey":configKey,"configValue":configValue}
    });
}


/**
 * 获取搜索条件（插件类型）
 * @returns {*}
 */
export function selectOption() {
    return request({
        url: baseUrl + "/set/selectOption",
        method: "get"
    });
}

/**
 * 搜索歌曲专辑等整体搜索
 * @param plugType 插件类型  kw，qq，mg等
 * @param searType 详见判断
 * @param keyword 关键字
 * @param pageSize 页码最多不超30否则有问题
 * @param pageIndex 当前页
 * @returns {*}
 */
export function selectmusic(plugType,searType = "music",keyword,pageSize=20,pageIndex=1) {
    console.log(plugType,searType ,keyword,pageSize,pageIndex)
    if (searType === "music"){
        return request({
            url: baseUrl + "/searchMusic/"+plugType+"/"+keyword+"/"+pageSize+"/"+pageIndex,
            method: "get"
        });
    }else if (searType === "album"){
        return request({
            url: baseUrl + "/searchAlbum/"+plugType+"/"+keyword+"/"+pageSize+"/"+pageIndex,
            method: "get"
        });
    }else if (searType === "artist"){
        return request({
            url: baseUrl + "/searchArtist/"+plugType+"/"+keyword+"/"+pageSize+"/"+pageIndex,
            method: "get"
        });
    }else if (searType === "artistAllSong"){
        return request({
            url: baseUrl + "/searchArtist/"+plugType+"/"+keyword+"/"+pageSize+"/"+pageIndex,
            method: "get"
        });
    }
}

/**
 * 下载单曲
 * @param id
 * @param plugType 插件名称
 * @param br 2000是 flac
 * @returns {*}
 */
export function musicDownload(id="0",plugType="kw",br=2000) {
    return request({
        url: baseUrl + "/musicDownload",
        method: "post",
        data:{"id":id,"plugType":plugType,"br":br}
    });
}
/**
 * 获取单曲播放链接
 * @param id
 * @param plugType 插件名称
 * @param br 2000是 flac
 * @returns {*}
 */
export function getPlayUrL(id="0",plugType="kw") {
    return request({
        url: baseUrl + "/musicUrl/"+plugType+"/"+id,
        method: "get",
    });
}

/**
 * 根据歌手id下载全部专辑歌曲
 * @param id
 * @param plugType
 * @param br
 * @returns {*}
 * @constructor
 */
export function ArtistDownload(id="0",plugType="kw",br=2000) {
    return request({
        url: baseUrl + "/ArtistDownload",
        method: "post",
        data:{"id":id,"plugType":plugType,"br":br}
    });
}


/**
 * 根据专辑id下载全部专辑
 * @param id
 * @param plugType
 * @param br
 * @returns {*}
 * @constructor
 */
export function AlbumDownload(id="0",plugType="kw",br=2000) {
    return request({
        url: baseUrl + "/AlbumDownload",
        method: "post",
        data:{"id":id,"plugType":plugType,"br":br}
    });
}

/**
 * 根据歌手id下载全部歌曲（部分无专辑信息的）
 * @param id
 * @param plugType
 * @param br
 * @returns {*}
 * @constructor
 */
export function ArtistSongList(id="0",plugType="kw",br=2000) {
    return request({
        url: baseUrl + "/ArtistSongList",
        method: "post",
        data:{"id":id,"plugType":plugType,"br":br}
    });
}







/**
 * 获取下载信息
 * @param type 类型
 * @param pageSize 每页条数
 * @param pageIndex 页码
 * @returns {*}
 *
 *
 *    waiting("待下载","waiting"),
 *     loading("正在进行","loading"),
 *
 *     success("成功","success"),
 *
 *     error("错误","error");
 */
export function getDownloadInfo(type,pageSize=20,pageIndex=1) {
    return request({
        url: baseUrl + "/downloadInfo/getDownloadInfo/"+type+"/"+pageSize+"/"+pageIndex,
        method: "get"
    });
}

/**
 * 单个删除
 * @param id
 * @returns {*}
 */
export  function delDownloadInfo(id) {
    return request({
        url: baseUrl + "/downloadInfo/deleteDownloadInfo/",
        method: "post",
        data:{"id":id}
    });
}

/**
 * 重新下载
 * @param id
 * @returns {*}
 */
export  function refreshStatus(id) {
    return request({
        url: baseUrl + "/downloadInfo/refresh/status",
        method: "post",
        data:{"id":id}
    });
}



/**
 *
 * @param downloadMusicname
 * @param downloadArtistname
 * @param downloadAlbumname
 * @param downloadType
 * @param audioBook
 * @param status
 * @param downloadTimeStart
 * @param downloadTimeEnd
 * @param pageSize
 * @param pageIndex
 * @returns {*}
 */
export function postDownloadInfo(downloadMusicname,downloadArtistname,downloadAlbumname,downloadType,audioBook,status,downloadTimeStart,downloadTimeEnd,pageSize=20,pageIndex=1) {
    return request({
        url: baseUrl + "/downloadInfo/getDownloadInfo/search",
        method: "post",
        data: {"downloadMusicname":downloadMusicname,
            "downloadArtistname":downloadArtistname,
            "downloadAlbumname":downloadAlbumname,
            "downloadType":downloadType,
            "audioBook":audioBook,
            "status":status,
            "downloadTimeStart":downloadTimeStart,
            "downloadTimeEnd":downloadTimeEnd,
            "pageSize":pageSize,
            "pageIndex":pageIndex
            }
    });
}




/**
 * 删除全部任务（清空全部恩物）
 * @returns {*}
 */
export function delAllTask() {
    return request({
        url: baseUrl + "/downloadInfo/delAllTask",
        method: "get"
    });
}

/**
 * 删除错误任务
 * @returns {*}
 */
export function delErrorTask() {
    return request({
        url: baseUrl + "/downloadInfo/delErrorTask",
        method: "get"
    });
}

/**
 * 删除成功任务
 * @returns {*}
 */
export function delSuccessTask() {
    return request({
        url: baseUrl + "/downloadInfo/delSuccessTask",
        method: "get"
    });
}

/**
 * 删除待下任务
 * @returns {*}
 */
export function delWaitingTask() {
    return request({
        url: baseUrl + "/downloadInfo/delWaitingTask",
        method: "get"
    });
}

/**
 * 错误任务重新下载
 * @returns {*}
 */
export function againTask() {
    return request({
        url: baseUrl + "/downloadInfo/againTask",
        method: "get"
    });
}

/**
 * 卡任务的时候用（刷新正在运行的任务）
 * @returns {*}
 */
export function refreshTask() {
    return request({
        url: baseUrl + "/downloadInfo/refreshTask",
        method: "get"
    });
}


/**
 * 文本解析下载
 * @param text
 * @returns {*}
 */
export function downloadParser(text) {
    return request({
        url: baseUrl + "/downloadParser",
        method: "post",
        data: {"text":text,"br":"2000","plugType":"kw"}
    });
}


/**
 *
 * @param url
 * @param isAudioBook
 * @param bookName
 * @param artist
 * @returns {*}
 */
export function parserUrlAndDownload(url,isAudioBook,bookName,artist) {
    return request({
        url: baseUrl + "/parserUrlAndDownload",
        method: "post",
        data: {"url":url,"isAudioBook":isAudioBook,"bookName":bookName,"artist":artist,"br":"2000","plugType":"kw"}
    });


}


/**
 * 获取后端版本号
 * @returns {*}
 */
export function getversion() {
    return request({
        url: baseUrl + "/set/version",
        method: "get"
    });
}
