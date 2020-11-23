/*
  *** 用法 ****
var robot = require('@/robots/robots.js');

//  
param = { dir, file, arguments  onMessage:(){}, menuOnly}

 
//强制停止机器人
robot.start(param); 
robot.showMenu();
robot.stop();
robot.exec(function(){...});

*/
var ROBOT = {};
(function() {
    // #ifndef APP-PLUS
    return;
    //#endif 
    var robot;
    robot = global.robot = uni.requireNativePlugin('Robot');
    robot.init(plus.runtime.appid, (msg) => {
        console.log("[init] -> " + msg);
        if (msg != 'fail') {
            return; //good
        }
        uni.showModal({
            title: '提示',
            content: 'App认证失败',
        });
    });
    ROBOT = {
        robot: robot,
        isready: false,
        permission: () => {},
        start: () => {},
        stop: () => {},
    };
})();; //
/**
 * @param {Object} {
 *  file: '相对static/robots/路径' || {uri: '本地下载绝对路径'}
 * }
 */
ROBOT.start = function(obj) {
    var that = this;
    // #ifndef APP-PLUS
    return; //非手机环境
    // #endif
    //准备脚本资源
    this.prepareResorce(obj, (params) => {
        that.params = params;
        
        console.log('readyCall ....');
        // console.log( JSON.stringify(params));  请关闭 传入的vue对象后，再打印
        //
        that.robot.setJsDir(params.dir);
        that.robot.setJsFile(params.file);
        that.robot.setJsArguments(JSON.stringify(params.arguments));
        that.robot.setJsCallback(function(data) {
            var rlt = that.vueCallback(data);
            that.robot.backVueData(rlt);
            return rlt;
        });
        that.robot.startMenu();
        if (params.startAtMenu == true) {
            var nothing_; //not start
        } else {
            that.robot.start();
        }
        
        return that;
    })
}
//准备脚本资源
ROBOT.prepareResorce = function(obj, readyCall) {
    if (obj.arguments == undefined) {
        obj.arguments = {};
    }
    if (obj.file == undefined) {
        console.log('请设置机器人脚本');
        return;
    }

    obj.arguments.__vue_keys = keys4back(obj.vue);
    var jsfile = obj.file;
    var dir;
    if (jsfile.toLowerCase().startsWith('http')) { //----- 1.URL
        this._downloadFile(obj, function(tmpjsfile) {
            obj.dir = path.dirname(tmpjsfile);
            obj.file = tmpjsfile;
            readyCall(obj);
        });
    } else {
        if (jsfile.startsWith('/')) { //----- 2. 绝对路径
            var p = jsfile.lastIndexOf('/');
            obj.dir = jsfile.substr(0, p);
            //obj.file = tmpjsfile;  //还是执行自己
        } else { //----- 3.相对路径
            var _entry = jsfile;
            if (jsfile.endsWith('.js')) {
                _entry = _entry.substr(0, _entry.length - 3);
            }
            obj.dir = plus.io.convertLocalFileSystemURL('static/robots/');
            obj.file = 'index.js';
            obj.arguments._entry = _entry;
        }
        readyCall(obj);
    }
}
/**
 * 直接使用远程链接启动脚本（无缓存模式）
 * @param {url：'远程链接'} obj 
 */
ROBOT._downloadFile = function(obj, callback) {
    uni.downloadFile({
        url: obj.file,
        success: (res) => {
            if (res.statusCode === 200) {
                callback(res.tempFilePath);
            }
        }
    });
}
ROBOT.showMenu = function(obj) {
    obj.startAtMenu = true; //只显示菜单，不执行
    obj.arguments.startAtMenu = true;
    this.start(obj);
    uni.showToast({
        icon: 'none',
        title: '请从悬浮机器人处启动',
        duration: 2000
    });
}
ROBOT.exec = function(fun) {
    var code = fun.toString();
    if (typeof(fun) == 'function') {
        code = "(" + code + ")();"
    }
    code += "; var __f__=function(tag, msg, file){ console.log(msg)}";
    console.log(code);
    this.robot.exec(code);
}
ROBOT.permission = function() {
    console.log(" robot.permission: ");
    var b = this.robot.permission();
}
ROBOT.stop = function() {
    // #ifndef APP-PLUS
    return; //非手机环境
    //#endif
    if (this.robot == null) {
        return;
    }
    this.robot.stop();
}
String.prototype.replaceAll = function(s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2);
}
ROBOT.vueCallback = function(data) {
    //console.log(JSON.stringify(data));
    var obj = this.params;
    var js;
    try {
        js = JSON.parse(data);
    } catch (e) {
        return;
    }
    var error = js.error;
    if (error != undefined && error.indexOf('permission') > -1) {
        //---that.permission();
        js.status = "error"
        //data = JSON.stringify(js)
        return;
    }
    if (!js.__prop) {
        if (obj.onMessage != undefined) {
            return obj.onMessage(js);
        }
    }
    if (js.__prop) { //属性访问，函数调用
        if (js.__type == 'function') { //直接调用
            var new_args = [];
            var args = (js.__arguments);
            for (var k in args) {
                new_args.push(args[k]);
            }
            return obj.vue[js.__prop].apply(null, new_args);
        } else if (js.__type == 'set') {
            //console.log(js.__arguments);
            try {
                return obj.vue[js.__prop] = js.__arguments["0"];
            } catch (e) {
                return obj.vue[js.__prop] = js.__arguments
            }
        } else if (js.__type == 'get') {
            return obj.vue[js.__prop];
        }
    }
}

function keys4back(obj) {
    var list = {};
    for (var key in obj) {
        var type = typeof(obj[key]);
        if (type == 'object') {
            // expode(obj[k], tab+"  ");
        }
        if (!key.startsWith("_") && !key.startsWith("$")) {
            if (type == 'function') {
                list[key] = type;
            } else {
                list[key] = type;
            }
        }
    }
    return list;
}
module.exports = ROBOT;