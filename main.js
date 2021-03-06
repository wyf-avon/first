var fs = require('fs');
var xlsx = require("node-xlsx");
var util = require('./util');
var _ = require('underscore');
var async = require('async');
var q = require('q');

//1.获取原始数据TXT文件的所有data
var rawData = util.getRawData('./data/data.txt');

//2.读excel表格“建议上线景点”，先判断“是否AOI面状数据”是否为1，如果是，取出名字，取前600条
var suggest_name = util.getSuggestName("./data/test.xlsx", 600);

//3.从原始数据TXT文件中，找出这600个名字对应的父点bid
var suggest_name_bid = util.getSuggestNameBid(suggest_name, rawData);

//4.读取relation.txt导出80个bid
var txt_bid = util.getTXTBids();

//5.将suggest_name_bid和txt_bid合并
var combine_bids = util.combineBids(suggest_name_bid, txt_bid);

//6.根据combine_bids去top.txt中查找对应子点类型，并写入js,返回最终可以在原始数据中查找到的全部bids
var bids = util.getBarinfo_free(combine_bids, './data/data.txt', "./data/test.xlsx");
console.log("==八大类finish==")

fs.writeFileSync('./data/bids.js', bids);

// var Bid = fs.readFileSync('./data/bids.js','utf8');
// var bids = Bid.split(",");

//7.根据6.返回的bids去请求对应三个接口，每次同步请求并写入result.js结果中
async.series([
        function(callback) {
            console.log("--线路start--");
            util.writeRoute(bids, function(error, data) {
                callback(error, data);
            });
        },
        function(callback) {
            console.log("--语音start--");
            util.writeAudio(bids, function(error, data) {
                callback(error, data);
            });
        },
        function(callback) {
            console.log("--全景start--");
            util.writeInter(bids, function(error, data) {
                callback(error, data);
            });
        }
    ],
    function(error, result) {
        if (error) {
            console.log("error: ", error, "msg: ", result);
        } else {
            console.log("--结束--");
        }
    }
);
