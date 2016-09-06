var fs = require('fs');
var xlsx = require("node-xlsx");
var q = require('q');
var rp = require('request-promise');
var _ = require('underscore');

var util = {};


//读取top.txt文本存储所有的原始数据，并按照格式存储到Data数组
util.getRawData = function(dataPath) {
    var data = fs.readFileSync(dataPath, 'utf-8');
    var datas = data.split("\n");

    var Data = [];
    for (var i = 0; i < datas.length; i++) {
        var list = datas[i].split(/\s+/);

        for (var m = 0; m < list.length; m++) {
            Data.push({
                'parent': list[0],
                'parent_bid': list[1],
                'sub_type': list[2],
                'sub': list[3],
                'sub_bid': list[4]
            })
        }
    }
    return Data;
}

//读excel表格“建议上线景点”，先判断“是否AOI面状数据”是否为1，如果是，取出名字，取前number条
util.getSuggestName = function(path, number) {
    var list = xlsx.parse(path);

    for (var i = 0; i < list.length; i++) {
        if (list[i].name == "建议上线景点") {
            var suggest_name = [];
            var len = 0;
            if(!number){
                number = list[i].data.length;
            }
            for (var m = 0; m < list[i].data.length; m++) {
                if (len < number && list[i].data[m][5] == 1 ){
                    len++;
                    suggest_name.push(list[i].data[m][1]);
                }
            }
        }
    }
    return suggest_name;
}

//从原始数据TXT文件中，找出名字对应的父点id，返回数组
util.getSuggestNameBid = function(suggest_name, rawData) {
    var suggest_uid = [];

    for (var m = 0; m < suggest_name.length; m++) {
        for (var i = 0; i < rawData.length; i++) {
            if (suggest_name[m] == rawData[i].parent) {
                suggest_uid.push(rawData[i].parent_bid);
                break;
            }
        }
    }
    return suggest_uid;
}

//读取对应关系TXT文本导出80个bid
util.getTXTBids = function() {
    var data = fs.readFileSync('./relation.txt', 'utf-8');
    var datas = data.split("\n");

    var bids = [];

    for (var i = 1; i < datas.length; i++) {
        var bid = datas[i].split(";");

        if ((bid[1] != "") && (bid[1] != "0")) {
            bids.push(bid[1]);
        }
    }

    return bids;
}


//合并两个bid的数组，返回合并后的数组集合
util.combineBids = function(arr1, arr2) {
    //不要直接使用var arr = arr1，这样arr只是arr1的一个引用，两者的修改会互相影响.或者使用slice()复制，var arr = arr1.slice(0)
    var arr = arr1.concat();

    for (var i = 0; i < arr2.length; i++) {
        arr.indexOf(arr2[i]) === -1 ? arr.push(arr2[i]) : 0;
    }

    return arr;
}


//匹配bids.js中bid对应的父点名称
util.getBidsName = function(rawData, bids) {
    var bids_name = [];

    for (var i = 0; i < rawData.length; i++) {
        for (var m = 0; m < bids.length; m++) {
            if (bids[m] == rawData[i].parent_bid) {
                bids_name[m] = rawData[i].parent;
            }
        }
    }
    return bids_name;
}

//根据excel建议上线景点顺序，顺序输出景点名称映射关系
util.sortSuggestName = function(path) {
    var list = xlsx.parse(path);
    var map = {};
    for (var i = 0; i < list.length; i++) {
        if (list[i].name == "建议上线景点") {
            for (var m = 1; m < list[i].data.length; m++) {
                map[list[i].data[m][1]] = m;
            }
        }
    }
    return map;
}


//根据bids去top.txt中查找对应子点类型，并写入js，返回最终可以在原始数据中查找到的全部bids
//最终得到了全部bid的barinfo_free数据
util.getBarinfo_free = function(bids, dataPath) {
    var RawData = this.getRawData(dataPath);
    var RawObj = [];
    var sort_map = this.sortSuggestName("./test.xlsx");

    for (var i = 0; i < RawData.length; i++) {
        if (bids.indexOf(RawData[i].parent_bid) != -1) {
            RawData[i].no = sort_map[RawData[i].parent];
            RawObj.push(RawData[i]);
        }
    }

    RawObj.sort(function(a, b) {
        return a.no - b.no;
    });

    var EightObj = JSON.parse(fs.readFileSync('./eight.js'));
    var Result = "";

    var uid = [];
    var resultItem = {};

    for (var n = 0; n < RawObj.length; n++) {
        for (var i = 0; i < EightObj.data.length; i++) {
            for (var m = 0; m < EightObj.data[i].sub_name.length; m++) {
                if (RawObj[n].sub_type == EightObj.data[i].sub_name[m]) {

                    //在结果列表中还没有添加过该id，表示开始读取新的id
                    if (uid.indexOf(RawObj[n].parent_bid) == -1) {
                        uid.push(RawObj[n].parent_bid);

                        if (resultItem.uid) {
                            //把前一个id的列表存入Result
                            resultItem.barinfo_free = this.sortType(resultItem.barinfo_free);
                            Result += JSON.stringify(resultItem) + '\n';;
                        }

                        //创建新的id的列表
                        resultItem = {};
                        resultItem['uid'] = RawObj[n].parent_bid;
                        resultItem['barinfo_free'] = [];

                        resultItem['barinfo_free'].push({
                            'icon_id': EightObj.data[i].icon,
                            'default_show': 0,
                            'icon_url': "",
                            'operation_icon_url': "",
                            'name': EightObj.data[i].type,
                            'action_type': "search",
                            'action': "qt=set&keyword=" + EightObj.data[i].type + "&uid=" + resultItem['uid']
                        })
                        resultItem['barinfo_fetter'] = [];
                    }
                    //结果列表中已经有该id，则应该先在resultItem中查找是否已存入该类型，没有存入再添加进去
                    else {
                        var ifHas = false;
                        for (var a = 0; a < resultItem.barinfo_free.length; a++) {
                            if (EightObj.data[i].type == resultItem.barinfo_free[a].name) {
                                ifHas = true;
                            }
                        }
                        if (!ifHas) {
                            resultItem['barinfo_free'].push({
                                'icon_id': EightObj.data[i].icon,
                                'default_show': 0,
                                'icon_url': "",
                                'operation_icon_url': "",
                                'name': EightObj.data[i].type,
                                'action_type': "search",
                                'action': "qt=set&keyword=" + EightObj.data[i].type + "&uid=" + resultItem['uid']
                            })
                            resultItem['barinfo_fetter'] = [];
                        }

                    }


                }
            }
        }
    }

    if (resultItem.uid) {
        resultItem.barinfo_free = this.sortType(resultItem.barinfo_free);
        Result += JSON.stringify(resultItem) + '\n';
    }

    fs.writeFileSync('./result.js', Result);

    return uid;
}

//按照指定的顺序对八大类排序
util.sortType = function(arr) {
    var map = {
        "卫生间": 1,
        "出入口": 2,
        "餐饮": 3,
        "商店": 4,
        "售票处": 5,
        "ATM": 6,
        "住宿": 7,
        "停车场": 8
    }
    for (var i = 0; i < arr.length; i++) {
        arr[i].temp_index = map[arr[i].name];
    }
    arr.sort(function(a, b) {
        return a.temp_index - b.temp_index;
    });
    for (var i = 0; i < arr.length; i++) {
        delete arr[i]["temp_index"];
    }
    return arr;
}


util.writeRoute = function(bids, callback) {
    //读取刚刚生成的result.js，only含有barinfo_free，barinfo_fetter为空
    var Final = fs.readFileSync('./result.js', 'utf8');
    var finalItem = Final.split("\n");

    for (var i = 0; i < finalItem.length; i++) {
        if (!_.isEmpty(finalItem[i]))
            finalItem[i] = JSON.parse(finalItem[i]);
    }

    var arr = [],
        uids_arr = [],
        routeguide_arr = [],
        me = this,
        parms = '{"from":"scenery_function_bar","uid":"__uid__"}',
        luxian_url = "baidumap://map/component?comName=scenery&target=scenery_route_guide_page&needLocation=yes&src_from=scenery_function_bar&param=";

    for (var i = 0; i < bids.length; i++) {
        arr.push(this.bid2Uid(bids[i]));
    }

    q.allSettled(arr).then(function(result) {
        result.forEach(function(uid) {
            uids_arr.push(_.values(uid.value.data).pop());
        })
        return uids_arr;
    }).then(function(result0) {
        result0.forEach(function(element1) {
            routeguide_arr.push(me.routeguide(element1));
        })

        q.allSettled(routeguide_arr).then(function(result2) {
                result2.forEach(function(ele1, idx) {

                    if (ele1.value && ele1.value.data && ele1.value.data.route_brief) {
                        for (var m = 0; m < finalItem.length; m++) {
                            if (finalItem[m].uid == bids[idx]) {
                                finalItem[m].barinfo_fetter.push({
                                    'icon_id': 9,
                                    'default_show': 0,
                                    'icon_url': "",
                                    'operation_icon_url': "",
                                    'name': "线路",
                                    'action_type': "openapi",
                                    'action': luxian_url + escape(parms.replace(/__uid__/ig, finalItem[m].uid))
                                })
                            }
                        }
                    }
                })
            })
            .then(function() {
                var Result = "";
                for (var i = 0; i < finalItem.length; i++) {
                    Result += JSON.stringify(finalItem[i]) + '\n';
                }
                fs.writeFileSync('./result.js', Result);

                callback(null, null);
            })
    })
}

util.writeAudio = function(bids, callback) {
    //读取刚刚生成的result.js，only含有barinfo_fetter
    var Final = fs.readFileSync('./result.js', 'utf8');
    var finalItem = Final.split("\n");

    for (var i = 0; i < finalItem.length; i++) {
        if (!_.isEmpty(finalItem[i]))
            finalItem[i] = JSON.parse(finalItem[i]);
    }

    var arr = [],
        uids_arr = [],
        audioguide_arr = [],
        me = this,
        parms = '{"from":"scenery_function_bar","uid":"__uid__"}',
        daolan_url = "baidumap://map/component?comName=scenery&target=scenery_voice_guide_page&needLocation=yes&src_from=scenery_function_bar&param=";

    for (var i = 0; i < bids.length; i++) {
        arr.push(this.bid2Uid(bids[i]));
    }

    q.allSettled(arr).then(function(result) {
        result.forEach(function(uid) {
            uids_arr.push(_.values(uid.value.data).pop());

        })
        return uids_arr;
    }).then(function(result0) {
        result0.forEach(function(element0) {
            audioguide_arr.push(me.audioguide(element0));
        })

        q.allSettled(audioguide_arr).then(function(result1) {
                result1.forEach(function(element0, idx) {
                    if (element0.value.data && element0.value.data.length) {
                        for (var m = 0; m < finalItem.length; m++) {
                            if (finalItem[m].uid == bids[idx]) {
                                finalItem[m].barinfo_fetter.push({
                                    'icon_id': 10,
                                    'default_show': 0,
                                    'icon_url': "",
                                    'operation_icon_url': "",
                                    'name': "语音",
                                    'action_type': "openapi",
                                    'action': daolan_url + escape(parms.replace(/__uid__/ig, finalItem[m].uid))
                                })
                            }
                        }
                    }
                })
            })
            .then(function() {
                var Result = "";
                for (var i = 0; i < finalItem.length; i++) {
                    Result += JSON.stringify(finalItem[i]) + '\n';
                }
                fs.writeFileSync('./result.js', Result);

                callback(null, null);
            })
    })

}



util.writeInter = function(bids, callback) {
    var Final = fs.readFileSync('./result.js', 'utf8');
    var finalItem = Final.split("\n");

    for (var i = 0; i < finalItem.length; i++) {
        if (!_.isEmpty(finalItem[i])) {
            finalItem[i] = JSON.parse(finalItem[i]);
        }
    }

    var arr = [],
        uids_arr = [],
        hasinter_arr = [],
        me = this,
        parms = 'panotype=inter&from_source=share&pid=__PID__&panoid=__PID__&iid=__IID__',
        quanjing_url = "baidumap://map/component?target=street_scape_page&comName=streetscape&";

    for (var i = 0; i < bids.length; i++) {
        arr.push(this.bid2Uid(bids[i]));
    }

    q.allSettled(arr).then(function(result) {
            result.forEach(function(uid) {
                uids_arr.push(_.values(uid.value.data).pop());

            });
            return uids_arr;
        })
        .then(function(res2) {
            res2.forEach(function(element2) {
                hasinter_arr.push(me.hasinter(element2));
            })
            q.allSettled(hasinter_arr).then(function(result3) {
                    result3.forEach(function(ele, idx) {
                        if (ele.value.content[0].poiinfo && ele.value.content[0].poiinfo.hasinter && ele.value.content[0].poiinfo.hasinter == 1) {
                            for (var m = 0; m < finalItem.length; m++) {
                                if (finalItem[m].uid == bids[idx]) {
                                    finalItem[m].barinfo_fetter.push({
                                        'icon_id': 11,
                                        'default_show': 0,
                                        'icon_url': "",
                                        'operation_icon_url': "",
                                        'name': "全景",
                                        'action_type': "openapi",
                                        'action': quanjing_url + (parms.replace(/__PID__/ig, ele.value.content[0].poiinfo.interstartpid).replace(/__IID__/ig, ele.value.content[0].poiinfo.IID))
                                    })

                                    var temp_fetter = JSON.stringify(finalItem[m].barinfo_fetter).replace(new RegExp(finalItem[m].uid, 'g'), ele.value.content[0].poiinfo.UID);
                                    finalItem[m].barinfo_fetter = JSON.parse(temp_fetter);

                                }
                            }
                        }
                    })

                })
                .then(function() {
                    var Result = "";
                    for (var i = 0; i < finalItem.length; i++) {
                        Result += JSON.stringify(finalItem[i]) + '\n';
                    }
                    fs.writeFileSync('./result.js', Result);

                    callback(null, null);
                })
        })

}


//请求“bid加密”接口
util.bid2Uid = function(bid) {
    var defer = q.defer();
    var options = {
        uri: "http://cp01-changchunbo.epc.baidu.com:8184/tedproduct",
        qs: {
            "qt": "req_bid2uid"
        },
        method: 'POST',
        form: {
            'bids': bid
        },
        json: true
    };

    rp(options).then(function(data) {
        defer.resolve(data);
    }).catch(function(err) {
        console.log("error in bid2uid", err);
        defer.reject(err);
    });

    return defer.promise;
}

//请求“语音”接口
util.audioguide = function(uid) {
    var defer = q.defer();
    var options = {
        uri: "http://cp01-changchunbo.epc.baidu.com:8183/scope",
        qs: {
            "qt": "scope_audioguide",
            "uid": uid,
            "ver": 1
        },
        method: 'GET',
        json: true
    };

    rp(options).then(function(data) {
        defer.resolve(data);
    }).catch(function(err) {
        console.log("error in audioguide", err);
        defer.reject(err);
    });

    return defer.promise;
}

//请求“路线”接口
util.routeguide = function(uid) {
    var defer = q.defer();
    //    var timestamp = new Date().getTime();
    var options = {
        uri: "http://client.map.baidu.com/scope",
        qs: {
            "qt": "scope_detail",
            "v": "1.0",
            "request_from": "android",
            "from": "webview",
            "resid": "01",
            "cid": "131",
            "uid": uid,
            "os": "Android19",
            "sv": "9.3.1",
            "channel": "1008617b",
            "cuid": "09E6DFA676426BCE487FE915A2566CC8%7C146454420529368",
            "mb": "HM%20NOTE%201LTE"
                //     "t": timestamp
        },
        method: 'GET',
        json: true
    };

    rp(options).then(function(data) {
        defer.resolve(data);
    }).catch(function(err) {
        console.log("error in routeguide", err);
        defer.reject(err);
    });

    return defer.promise;
}

//请求“全景”接口
util.hasinter = function(uid) {
    var defer = q.defer();

    var options = {
        uri: "http://pcsv0.map.bdimg.com/",
        qs: {
            "udt": "20160330",
            "qt": "poi",
            "uid": uid
        },
        method: 'GET',
        json: true
    };

    rp(options).then(function(data) {
        defer.resolve(data);
    }).catch(function(err) {
        console.log("error in hasinter", err);
        defer.reject(err);
    });

    return defer.promise;
}




//返回result中每一条数据的“barinfo_free”字段的name信息
util.getBarInfoFree = function(results) {
    var barinfo_free = [];
    for (var i = 0; i < results.length; i++) {
        results[i] = JSON.parse(results[i]);
        barinfo_free.push("");

        for (var m = 0; m < results[i].barinfo_free.length; m++) {
            barinfo_free[i] = barinfo_free[i] + results[i].barinfo_free[m].name + " ";
        }
    }
    return barinfo_free;
}

//返回result中每一条数据的“barinfo_fetter”字段的name信息
util.getBarInfoFetter = function(results) {
    var barinfo_fetter = [];
    for (var i = 0; i < results.length; i++) {

        //JSON.parse(results[i]);
        barinfo_fetter.push("");

        if (results[i].barinfo_fetter.length) {
            for (var m = 0; m < results[i].barinfo_fetter.length; m++) {
                barinfo_fetter[i] = barinfo_fetter[i] + results[i].barinfo_fetter[m].name + " ";
            }
        }

    }
    return barinfo_fetter;
}



module.exports = util;