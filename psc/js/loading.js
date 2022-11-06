//在页面未加载完毕之前显示的loading Html自定义内容
var _LoadingHtml = '<div id="loadingDiv" style="position:absolute;left:0;width:100%;top:0;background:#eaecfa;opacity:1;filter:alpha(opacity=80);z-index:10000;"><div id="loader" class="loader">少女折寿中...</div></div>';
window.addEventListener('load', function() {
    document.getElementById('loadingDiv').style.height=document.documentElement.clientHeight+'px';
    document.getElementById('loader').style.top=document.documentElement.clientHeight/2+'px';
})
window.addEventListener('resize', function() {
    document.getElementById('loadingDiv').style.height=document.documentElement.clientHeight+'px';
    document.getElementById('loader').style.top=document.documentElement.clientHeight/2+'px';
})
//呈现loading效果
document.write(_LoadingHtml);
//监听加载状态改变
document.onreadystatechange = completeLoading;

//加载状态为complete时移除loading效果
function completeLoading() {
    if (document.readyState == "complete") {
        var loadingMask = document.getElementById('loadingDiv');
        loadingMask.parentNode.removeChild(loadingMask);
    }
}