var fs = require('fs');
var xlsx = require("node-xlsx");
var util = require('./util');

//获取原始数据TXT文件的所有data
var rawData = util.getRawData('./data/top.txt');

var Bid = fs.readFileSync('./data/bids.js', 'utf8');
var bids = Bid.split(",");

//匹配result.js中对应uid的name(bids.js中bid对应的父点名称)
var bids_name = util.getBidsName(rawData, bids);

var Result = fs.readFileSync('./data/result.js', 'utf8');
var results = Result.split("\n");

//匹配result.js中对应barinfo_free数据
var barinfo_free = util.getBarInfoFree(results);

//匹配result.js中对应barinfo_free数据
var barinfo_fetter = util.getBarInfoFetter(results);

var results = [];
for(var i = 0; i < bids.length; i++){
	var result = [];
	result[0] = bids[i];
	result[1] = bids_name[i];
	result[2] = barinfo_free[i];
	result[3] = barinfo_fetter[i];
	results.push(result);
}

//var data = [bids, bids_name, barinfo_free, barinfo_fetter];
var data = results;

var buffer = xlsx.build([{name: "result", data: data}]); // Returns a buffer 
fs.writeFileSync('./data/export.xlsx', buffer, 'binary');
