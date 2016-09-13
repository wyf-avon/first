# scenic-bar

## util.js 为工具类，可在此类中继续添加功能函数

## 基于index2.js用法：
   node index2.js
   注意原始文件格式，从左到右依次为：父点名称，父点id，子点类型
   如果原始数据过多，目前需要分批次调用线路语音和全景接口，看到"--结束--"字样，即生成成功

## 基于目前的main.js的项目用法：

   执行node main.js，在console中看到"--结束--"字样，项目根目录下生成的result.js即为最终生成文件

   main.js 前5步骤是为了读取并处理原始数据，生成最终需要的bid，第6步根据bid生成barinfo_free数据并写入result.js，第7步根据bid请求“线路”“语音”“全景”接口，生成barinfo_fetter数据并写入result.js

   确保项目路径下含有relation.txt,test.xlsx,top.txt这三个原始文件

   在生成result.js后，可以执行node writeExcel.js将生成对应的excel文件“export.xlsx”，包含数据bids, bids_name, barinfo_free, barinfo_fetter