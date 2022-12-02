var scrollBar = document.getElementById("scrollBar");
var bar = scrollBar.children[0];
var mask = scrollBar.children[1];
var demo = document.getElementById("demo");
var imgop = document.getElementById("imgop");
bar.onmousedown = function(event){
    var event = event || window.event;
    var leftVal = event.clientX - this.offsetLeft;
    // 拖动放到down的里面
    var that = this;
    document.onmousemove = function(event){
        var event = event || window.event;
        that.style.left = event.clientX - leftVal-4+"px";
        // 限制条件
        var val = parseInt(that.style.left);
        if(val < 0){
            that.style.left = '-4px';
        }else if(val > 150){
            that.style.left = "146px";
        }
        // 移动的距离为遮罩的宽度
        mask.style.width = that.style.left;
        // 显示百分比
        let num = parseInt(parseInt(that.style.left) / 150 * 9.9);
        demo.innerHTML=num;
        imgop.src='/source/list/'+num+'.webp';
        // 清除拖动 --- 防止鼠标已经弹起时还在拖动
        window.getSelection ? window.getSelection().removeAllRanges():document.selection.empty();
    }
    // 鼠标抬起停止拖动
    document.onmouseup = function(){
        document.onmousemove = null;
    }
}