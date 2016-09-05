var fs = require('fs');
var xlsx = require("node-xlsx");
var util = require('./util');

//获取原始数据TXT文件的所有data
var rawData = util.getRawData('./top.txt');

var Bid = fs.readFileSync('./bids.js', 'utf8');
var bids = Bid.split(",");

//匹配result.js中对应uid的name(bids.js中bid对应的父点名称)
var bids_name = util.getBidsName(rawData, bids);

var Result = fs.readFileSync('./result.js', 'utf8');
var results = Result.split("\n");

//匹配result.js中对应barinfo_free数据
var barinfo_free = util.getBarInfoFree(results);

//匹配result.js中对应barinfo_free数据
var barinfo_fetter = util.getBarInfoFetter(results);

//console.log(barinfo_fetter)

const data = [bids, bids_name, barinfo_free, barinfo_fetter];
var buffer = xlsx.build([{name: "result", data: data}]); // Returns a buffer 
fs.writeFileSync('export.xlsx', buffer, 'binary');
