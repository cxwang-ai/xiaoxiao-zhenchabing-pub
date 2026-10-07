(function () {
  'use strict';
  window.XZ = window.XZ || {};
  var XZ = window.XZ;
  XZ.data = {};

  // 未核验事实保留占位；指定的待核实抵达月必须显著标注。游戏参数不代表真实行军数据。
  function datum(value, unit, label, status) {
    return { value: value, unit: unit, label: label, source: '', status: status };
  }
  function param(value, unit, label, status) { return datum(value, unit, label, status || 'param'); }
  function pending(label, unit) { return datum(null, unit || '', label, 'pending'); }

  // 已核实的翻越点同时供规则与示意剖面引用，避免两份海拔各自漂移。
  var verifiedCrossingAltitude = { value: 4114, unit: 'm', label: '夹金山王母寨垭口海拔（红军翻越点，非主峰）', source: '雅安市人民政府《中央红军长征在雅安：中央红军翻越夹金山》https://www.yaan.gov.cn/xinwen/show/086b7626-2447-4186-bda7-a54c849f22bf.html；《翻过夹金山，又见夹金山》https://www.yaan.gov.cn/mob/article.html?id=5c006392-b999-46b6-af3d-82dfb7aab6a6', status: 'verified' };

  XZ.data.map = {
    image: 'assets/map/china.jpg', width: 3092, height: 2365,
    reviewNumber: { value: 'GS(2016)2884号', unit: '', label: '审图号', source: '图面标注', status: 'verified' },
    source: {
      value: '自然资源部标准地图服务系统 · 中国地图 1:2200万 16开 无邻国 线划一（南海诸岛以附图表示）',
      unit: '', label: '底图来源', source: '自然资源部标准地图服务系统（bzdt.ch.mnr.gov.cn），作者下载原图',
      status: 'verified', downloaded: '2026-10-07'
    }
  };

  XZ.data.game = {
    initial: {
      energy: param(100, '', '初始体力'),
      supplies: param(100, '', '初始物资'),
      days: param(0, '天', '初始天数')
    },
    maxResource: param(100, '', '资源上限'),
    starMax: param(3, '星', '星级上限'),
    reflection: datum('【待填写：请由作者撰写“长征精神与今天”的连接文字】', '', '长征精神与今天', 'pending')
  };

  XZ.data.levels = [
    {
      id: 'daduhe', name: '大渡河', kind: '激流', available: true,
      position: { x: { value: 40.9, unit: '%', label: '关卡点位置：安顺场红军强渡大渡河遗址（石棉县）', source: '地点：国防部网站《走进四川省石棉县》http://www.mod.gov.cn/gfbw/gfjy_index/16486496.html；雅安市人民政府文物保护范围通知 https://www.yaan.gov.cn/htm/openview.htm?id=20141125114959-755237-00-000。经纬度 102.2843°E, 29.2745°N 按遗址地名定位，用6个省会参照点换算到底图（拟合误差<8像素/3092）', status: 'verified' }, y: { value: 69.7, unit: '%', label: '关卡点位置：安顺场红军强渡大渡河遗址（石棉县）', source: '地点：国防部网站《走进四川省石棉县》http://www.mod.gov.cn/gfbw/gfjy_index/16486496.html；雅安市人民政府文物保护范围通知 https://www.yaan.gov.cn/htm/openview.htm?id=20141125114959-755237-00-000。经纬度 102.2843°E, 29.2745°N 按遗址地名定位，用6个省会参照点换算到底图（拟合误差<8像素/3092）', status: 'verified' } },
      introduction: pending('大渡河位置与行军简介'),
      distance: pending('行军路线距离', 'km'), duration: pending('历史用时', '小时'),
      monthlyFlow: pending('真实月平均流量：填写完整的十二个月数组', 'm³/s'),
      arrivalMonth: { value: 5, unit: '月', label: '抵达大渡河（安顺场）的月份：1935年5月', source: '国防部网站《走进四川省石棉县》：“1935年5月24日夜，红军先遣队红1团冒雨急行到达安顺场” http://www.mod.gov.cn/gfbw/gfjy_index/16486496.html', status: 'verified' },
      history: { id: 'daduhe-history', title: '激流史料卡', text: '【待填写：请从核验后的史料摘录原文，并注明书名与页码】', source: '', status: 'pending' },
      exploration: {
        demoFlow: param([180, 200, 240, 320, 440, 600, 720, 680, 500, 360, 260, 200], 'm³/s', '演示月平均流量，非实测'),
        continuity: datum('平均流速 = 流量 ÷ 过水断面面积', '', '连续性方程', 'model'),
        fords: [
          { id: 'wide', label: '宽而浅', width: param(60, 'm', '断面宽度'), depth: param(2, 'm', '平均水深'), cost: param(4, '', '地点准备物资') },
          { id: 'narrow', label: '窄而深', width: param(20, 'm', '断面宽度'), depth: param(4, 'm', '平均水深'), cost: param(0, '', '地点准备物资') },
          { id: 'middle', label: '中等断面', width: param(35, 'm', '断面宽度'), depth: param(3, 'm', '平均水深'), cost: param(2, '', '地点准备物资') }
        ]
      },
      rules: {
        baseLoss: param(6, '', '基础体力消耗'), velocityCoefficient: param(4, '', '每单位流速的体力系数'),
        waitSupplies: param(3, '', '每天等待物资'), crossingDays: param(1, '天', '基础用时'),
        monthDays: param(30, '天', '月内插值时长，非真实历法'),
        scoutReduction: param(0.7, '', '侦察最多降低的风险比例'), scoutTime: param(2.5, '天', '侦察收益递减时间尺度'),
        highLoss: param(22, '', '三星消耗上限'), midLoss: param(38, '', '二星消耗上限'), highDays: param(3, '天', '三星用时上限'),
        dimensions: [
          { id: 'wait', title: '等待并侦察（耗时耗物资，降低落脚风险）', options: [
            { id: 'now', label: '立即出发', value: param(0, '天', '等待天数') },
            { id: 'short', label: '等待两天', value: param(2, '天', '等待天数') },
            { id: 'long', label: '等待四天', value: param(4, '天', '等待天数') }
          ] },
          { id: 'period', title: '时段', options: [
            { id: 'day', label: '白天：视野较好，等候多一天', factor: param(1, '', '能见度风险系数'), days: param(1, '天', '等候时段用时'), cost: param(2, '', '等候时段物资') },
            { id: 'night', label: '夜间：省去等候，视野较差', factor: param(1.35, '', '能见度风险系数'), days: param(0, '天', '等候时段用时'), cost: param(0, '', '等候时段物资') }
          ] },
          { id: 'preparation', title: '通用准备（艺术演绎）', options: [
            { id: 'light', label: '基础准备', factor: param(1.4, '', '风险系数'), cost: param(8, '', '准备物资') },
            { id: 'balanced', label: '适中准备', factor: param(0.9, '', '风险系数'), cost: param(20, '', '准备物资') },
            { id: 'full', label: '充分准备', factor: param(0.6, '', '风险系数'), cost: param(38, '', '准备物资') }
          ] }
        ]
      }
    },
    {
      id: 'jiajinshan', name: '夹金山', kind: '雪山', available: true,
      position: { x: { value: 41.8, unit: '%', label: '关卡点位置：夹金山王母寨垭口（红军翻越点）', source: '地点：雅安市人民政府《中央红军长征在雅安：中央红军翻越夹金山》https://www.yaan.gov.cn/xinwen/show/086b7626-2447-4186-bda7-a54c849f22bf.html。经纬度 102.6828°E, 30.8606°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' }, y: { value: 65.8, unit: '%', label: '关卡点位置：夹金山王母寨垭口（红军翻越点）', source: '地点：雅安市人民政府《中央红军长征在雅安：中央红军翻越夹金山》https://www.yaan.gov.cn/xinwen/show/086b7626-2447-4186-bda7-a54c849f22bf.html。经纬度 102.6828°E, 30.8606°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' } },
      introduction: datum('【待填写：夹金山天险的位置与行军简介，请核验资料并注明出处】', '', '关卡简介', 'pending'),
      distance: pending('行军路线距离', 'km'), duration: pending('历史行军用时', '小时'),
      baseTemperature: pending('山脚温度', '°C'), baseAltitude: pending('山脚海拔', 'm'),
      summitAltitude: verifiedCrossingAltitude,
      weather: pending('一天中山顶天气风险资料'),
      history: {
        id: 'jiajinshan-history', title: '雪山史料卡',
        text: '【待填写：请从《红军长征记》等资料摘录原文，并注明页码】',
        source: '', status: 'pending'
      },
      exploration: {
        altitudeMin: param(0, 'm', '海拔滑块下限'), altitudeMax: param(4500, 'm', '海拔滑块上限'),
        altitudeStep: param(100, 'm', '海拔滑块步长'), altitudeStart: param(2500, 'm', '初始探索海拔'),
        demoTemperature: param(15, '°C', '演示山脚温度'), demoAltitude: param(0, 'm', '演示山脚海拔'),
        demoSummitAltitude: param(4500, 'm', '演示翻越点海拔（真实值无效时回退）'),
        lapseRate: datum(0.6, '°C / 100 m', '气温垂直递减率', 'model'),
        altitudeInterval: datum(100, 'm', '气温公式海拔单位', 'model'),
        pressureCoefficient: datum(2.25577e-5, '', '标准大气模型系数', 'model'),
        pressureExponent: datum(5.25588, '', '标准大气模型指数', 'model'),
        percentageScale: datum(100, '%', '相对海平面百分比', 'model'),
        timeMin: param(0, '时', '时间滑块下限'), timeMax: param(23, '时', '时间滑块上限'),
        timeStep: param(1, '小时', '时间滑块步长'), timeStart: param(9, '时', '初始探索时段'),
        riskMax: param(100, '', '游戏风险指数上限'),
        // 风险曲线是可调游戏假设，不是历史天气观测数据。
        weatherCurve: param([
          { x: 0, y: 45 }, { x: 4, y: 60 }, { x: 9, y: 20 },
          { x: 12, y: 35 }, { x: 15, y: 80 }, { x: 18, y: 65 }, { x: 23, y: 50 }
        ], '', '时段风险演示曲线'),
        terrain: param([
          { x: 0, y: 0 }, { x: 1, y: 800 }, { x: 2, y: 1900 },
          { x: 3, y: 3000 }, { x: 4, y: verifiedCrossingAltitude.value }, { x: 5, y: 3400 }, { x: 6, y: 1600 }
        ], '', '地形剖面示意点（非真实路线）')
      },
      rules: {
        baseLoss: param(6, '', '基础行进消耗'), riskCoefficient: param(0.15, '', '风险指数体力系数'),
        earliestDeparture: param(4, '时', '游戏出发窗口起点'), hoursPerDay: param(24, '小时', '出发等待按天取整单位'),
        coldReference: param(12, '°C', '低温比较基准'),
        highLoss: param(28, '', '三星体力消耗上限'), midLoss: param(46, '', '二星体力消耗上限'), highDays: param(2, '天', '三星用时上限'),
        dimensions: [
          { id: 'departure', title: '出发时段', options: [
            { id: 'dawn', label: '凌晨：省等候，另备干粮', hour: param(4, '时', '出发时刻'), cost: param(6, '', '出发前干粮需求') },
            { id: 'morning', label: '上午：演示风险较低，需等候', hour: param(9, '时', '出发时刻'), cost: param(3, '', '出发前干粮需求') },
            { id: 'afternoon', label: '午后：休整省干粮，演示风险较高', hour: param(15, '时', '出发时刻'), cost: param(0, '', '出发前干粮需求') }
          ] },
          { id: 'warmth', title: '保暖准备', options: [
            { id: 'light', label: '轻装', factor: param(1, '', '低温消耗系数'), cost: param(6, '', '准备物资') },
            { id: 'balanced', label: '适中', factor: param(0.44, '', '低温消耗系数'), cost: param(18, '', '准备物资') },
            { id: 'full', label: '充分', factor: param(0.11, '', '低温消耗系数'), cost: param(32, '', '准备物资') }
          ] },
          { id: 'pace', title: '行进节奏', options: [
            { id: 'fast', label: '快速冲顶', factor: param(0.64, '', '缺氧消耗系数'), cost: param(6, '', '干粮物资'), days: param(1, '天', '用时') },
            { id: 'steady', label: '匀速', factor: param(0.11, '', '缺氧消耗系数'), cost: param(6, '', '干粮物资'), days: param(2, '天', '用时') },
            { id: 'stopping', label: '走走停停', factor: param(0.045, '', '缺氧消耗系数'), cost: param(6, '', '干粮物资'), days: param(3, '天', '用时') }
          ] }
        ]
      }
    },
    {
      id: 'caodi', name: '草地', kind: '沼泽', available: true,
      position: { x: { value: 42.1, unit: '%', label: '关卡点位置：日干乔大沼泽（红原县瓦切镇北部，草地代表性点位）', source: '地点：新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm。草地为大范围区域，此为代表点。经纬度 102.7210°E, 33.4620°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' }, y: { value: 59.2, unit: '%', label: '关卡点位置：日干乔大沼泽（红原县瓦切镇北部，草地代表性点位）', source: '地点：新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm。草地为大范围区域，此为代表点。经纬度 102.7210°E, 33.4620°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' } },
      introduction: pending('草地位置与行军简介'),
      distance: pending('行军路线距离', 'km'), duration: pending('历史用时', '小时'),
      dailyTemperature: pending('真实日内气温：填写 {x:小时,y:气温} 数组', '°C'),
      localWetland: pending('具体地区的沼泽分布、泥炭厚度与气候资料'),
      history: { id: 'caodi-history', title: '草地史料卡', text: '【待填写：请从核验后的史料摘录原文，并注明书名与页码】', source: '', status: 'pending' },
      exploration: {
        demoTemperature: param([{ x: 0, y: 2 }, { x: 4, y: 0 }, { x: 8, y: 6 }, { x: 12, y: 16 }, { x: 16, y: 12 }, { x: 20, y: 5 }, { x: 24, y: 2 }], '°C', '演示日内气温'),
        clues: [
          { id: 'hummock', label: '浅草 · 草墩', probability: param(0.12, '', '隐患概率'), explanation: '草墩高出积水，通常比水面和松软低地更适合试探落脚；根系支撑并不保证下方坚实。' },
          { id: 'dark', label: '深草 · 颜色异常', probability: param(0.42, '', '隐患概率'), explanation: '颜色异常只能提示植被或湿度差异，不能单独判断承载力；本游戏把它设为较高风险线索。' },
          { id: 'water', label: '积水 · 反光', probability: param(0.75, '', '隐患概率'), explanation: '积水会遮住松软底层与深度，难以观察落脚处；游戏中积水线索风险更高。' }
        ],
        formation: datum('长期积水使土壤缺氧，有机质分解变慢，可逐渐积累泥炭；这是通用原理，示意图不是当地实测剖面。', '', '沼泽形成原理', 'model')
      },
      rules: {
        size: param(5, '', '网格边长'), defaultSeed: param(2026, '', '首张地图种子'), retrySeedStep: param(1, '', '重试种子增量'),
        stepSupplies: param(2, '', '每步物资'), stepEnergy: param(0.5, '', '每步体力'), hazardLoss: param(16, '', '沼泽体力消耗'),
        probeSupplies: param(1, '', '每格探杆试探物资'),
        travelDays: param(2, '天', '草地用时'), highSteps: param(10, '', '三星步数上限'), midHazards: param(2, '', '二星踩险上限'),
        preparations: [
          { id: 'light', label: '基础补给', cost: param(6, '', '准备物资'), climateFactor: param(0.6, '', '温差消耗系数') },
          { id: 'balanced', label: '适中补给', cost: param(14, '', '准备物资'), climateFactor: param(0.35, '', '温差消耗系数') },
          { id: 'full', label: '充分补给', cost: param(26, '', '准备物资'), climateFactor: param(0.15, '', '温差消耗系数') }
        ]
      }
    }
  ];
  XZ.data.levels[0].exploration.continuity.source = 'USGS, Streamgaging Basics：https://www.usgs.gov/mission-areas/water-resources/science/streamgaging-basics';
  XZ.data.levels[2].exploration.formation.source = 'US EPA, Classification and Types of Wetlands：https://www.epa.gov/wetlands/classification-and-types-wetlands';
}());
