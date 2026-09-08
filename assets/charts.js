(function () {
  'use strict';
  var rootStyle = getComputedStyle(document.documentElement);
  function css(name) { return rootStyle.getPropertyValue(name).trim(); }
  var accent = css('--accent'), accent2 = css('--accent2'), ink = css('--ink'), muted = css('--muted'), rule = css('--rule'), bg2 = css('--bg2');
  var font = 'Noto Sans CJK SC, WenQuanYi Micro Hei, Microsoft YaHei, sans-serif';
  var instances = [];
  var data = {
    history: {years: ['2023年','2024年','2025年'], profit: [211.19419571,320.50602437,517.77327785], cash: [368.60066015,488.60346839,754.29516296]},
    mix: [{name:'黄金',value:41.7},{name:'铜',value:33.8},{name:'锂',value:3.4},{name:'其他及剩余',value:21.1}],
    copper: {names:['巨龙','卡莫阿（权益）','塞紫金','塞紫铜','科卢韦齐','其他矿山合计'], change:[4.1256,-5.4564,-0.2931,-0.1604,0.4218,-1.8821]},
    target: {names:['矿产铜','矿产金','锂（LCE）'], actual:[534407,46.702,43596], annual:[1200000,105,120000]},
    cash: {names:['2025H1','2026H1'], operating:[288.29856948,554.71692934], capital:[101.53422110,129.42927636]}
  };
  function make(id, option) {
    var container = document.getElementById(id);
    if (!container) return;
    if (typeof echarts === 'undefined') { container.textContent = '图表资源未加载，请保留完整资源目录；数值可查看正文表格。'; return; }
    var chart = echarts.init(container, null, {renderer:'svg'});
    chart.setOption(Object.assign({animation:false, color:[accent,accent2,muted,accent+'99'], backgroundColor:bg2, textStyle:{fontFamily:font,color:ink}, aria:{enabled:true}, tooltip:{trigger:'axis',appendToBody:true}, legend:{textStyle:{color:muted,fontFamily:font},top:0}},option));
    instances.push(chart);
    window.addEventListener('resize', function () { chart.resize(); });
  }
  function xCategory(names) {return {type:'category',data:names,axisLine:{lineStyle:{color:rule}},axisTick:{show:false},axisLabel:{color:muted,fontFamily:font}};}
  function valueAxis(name) {return {type:'value',name:name,nameTextStyle:{color:muted,fontFamily:font},axisLabel:{color:muted},splitLine:{lineStyle:{color:rule}}};}
  function label() {return {show:true,position:'top',color:ink,fontFamily:font,formatter:function (p) {return Number(p.value).toFixed(1);}};}
  make('chart-mix', {
    tooltip:{trigger:'item',appendToBody:true,formatter:function(p){return p.name+'：'+p.value.toFixed(1)+'%';}},
    legend:{bottom:0,top:'auto',textStyle:{color:muted,fontFamily:font}},
    series:[{type:'pie',radius:['38%','63%'],center:['50%','45%'],avoidLabelOverlap:true,
      label:{formatter:'{b}\n{c}%',color:ink,fontFamily:font},labelLine:{lineStyle:{color:muted}},
      itemStyle:{borderColor:bg2,borderWidth:3},data:data.mix}]
  });
  make('chart-history', {grid:{left:50,right:20,top:55,bottom:40,containLabel:true},xAxis:xCategory(data.history.years),yAxis:valueAxis('亿元'),series:[
    {name:'归母净利润',type:'bar',barMaxWidth:42,data:data.history.profit,label:label()},
    {name:'集团经营现金流',type:'bar',barMaxWidth:42,data:data.history.cash,label:label()}
  ]});
  make('chart-copper', {legend:{show:false},grid:{left:15,right:52,top:28,bottom:20,containLabel:true},
    xAxis:valueAxis('万吨'),yAxis:{type:'category',inverse:true,data:data.copper.names,axisTick:{show:false},axisLine:{show:false},axisLabel:{color:muted,fontFamily:font,fontSize:12}},
    tooltip:{trigger:'axis',appendToBody:true,valueFormatter:function(value){return Number(value).toFixed(4)+' 万吨';}},
    series:[{type:'bar',barMaxWidth:26,data:data.copper.change.map(function(v){return {value:v,itemStyle:{color:v>=0?accent2:accent}};}),
      label:{show:true,position:'right',color:ink,fontFamily:font,formatter:function(p){return (p.value>0?'+':'')+Number(p.value).toFixed(2);}}}]
  });
  var done=data.target.actual.map(function(v,i){return v/data.target.annual[i]*100;});
  make('chart-target',{grid:{left:12,right:20,top:55,bottom:20,containLabel:true},xAxis:Object.assign(valueAxis('%'),{max:100}),
    yAxis:{type:'category',inverse:true,data:data.target.names,axisTick:{show:false},axisLine:{show:false},axisLabel:{color:muted,fontFamily:font}},
    tooltip:{trigger:'axis',appendToBody:true,valueFormatter:function(v){return Number(v).toFixed(2)+'%';}},
    series:[{name:'H1实际完成',type:'bar',stack:'年度目标',barMaxWidth:32,data:done,itemStyle:{color:accent2},label:{show:true,position:'inside',color:bg2,fontFamily:font,formatter:function(p){return Number(p.value).toFixed(2)+'%';}}},
      {name:'目标剩余（非预测）',type:'bar',stack:'年度目标',barMaxWidth:32,data:done.map(function(v){return 100-v;}),itemStyle:{color:rule},label:{show:true,position:'inside',color:ink,fontFamily:font,formatter:function(p){return Number(p.value).toFixed(2)+'%';}}}]
  });
  make('chart-cash',{grid:{left:50,right:20,top:70,bottom:35,containLabel:true},xAxis:xCategory(data.cash.names),yAxis:valueAxis('亿元'),series:[
    {name:'经营现金流',type:'bar',barMaxWidth:36,data:data.cash.operating,label:label()},
    {name:'购建长期资产现金',type:'bar',barMaxWidth:36,data:data.cash.capital,label:label()},
    {name:'两者差额（非归母自由现金流）',type:'bar',barMaxWidth:36,data:data.cash.operating.map(function(v,i){return v-data.cash.capital[i];}),label:label()}
  ]});
  var button=document.getElementById('print-report');
  if(button) button.addEventListener('click',function(){window.print();});
  window.addEventListener('beforeprint',function(){instances.forEach(function(c){c.resize();});});
  window.addEventListener('afterprint',function(){instances.forEach(function(c){c.resize();});});
})();
