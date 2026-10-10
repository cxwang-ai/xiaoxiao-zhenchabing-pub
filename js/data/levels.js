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
      // 作者要求页面精简显示；完整版本名称保留在 product 字段，供文档与创作说明引用。
      value: '自然资源部标准地图服务系统 · 中国地图 1:2200万 16开',
      product: '中国地图 1:2200万 16开 无邻国 线划一（南海诸岛以附图表示）',
      unit: '', label: '底图来源', source: '自然资源部标准地图服务系统（bzdt.ch.mnr.gov.cn）',
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
      history: { id: 'daduhe-history', title: '激流史料卡', text: '1935年5月24日夜，红军先遣队红1团冒雨急行到达安顺场，歼敌两个连，缴获木船一艘，控制了南岸渡口。', source: '国防部网站《走进四川省石棉县——同舟共济驶向新航程》http://www.mod.gov.cn/gfbw/gfjy_index/16486496.html', status: 'verified' },
      exploration: {
        demoFlow: param([180, 200, 240, 320, 440, 600, 720, 680, 500, 360, 260, 200], 'm³/s', '演示月平均流量，非实测'),
        continuity: datum('平均流速 = 流量 ÷ 过水断面面积', '', '连续性方程', 'model'),
        fords: [
          { id: 'wide', label: '宽而浅', width: param(60, 'm', '断面宽度'), depth: param(2, 'm', '平均水深') },
          { id: 'narrow', label: '窄而深', width: param(20, 'm', '断面宽度'), depth: param(4, 'm', '平均水深') },
          { id: 'middle', label: '中等断面', width: param(35, 'm', '断面宽度'), depth: param(3, 'm', '平均水深') }
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
        text: '当红军翻越到五倒拐时，天空霎时变得十分昏暗，一阵阵大风，夹杂着密密匝匝的雪片，吹打在战士们的脸上，如刀似割。为了不掉队，战士们手拉着手，你帮我、我帮你，实在走不动的战士，就拽着马尾跟着走。',
        source: '雅安市人民政府《中央红军长征在雅安：中央红军翻越夹金山》https://www.yaan.gov.cn/xinwen/show/086b7626-2447-4186-bda7-a54c849f22bf.html', status: 'verified'
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
        percentageScale: datum(100, '%', '相对海平面百分比', 'model')
      }

    },
    {
      id: 'caodi', name: '草地', kind: '沼泽', available: true,
      position: { x: { value: 42.1, unit: '%', label: '关卡点位置：日干乔大沼泽（红原县瓦切镇北部，草地代表性点位）', source: '地点：新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm。草地为大范围区域，此为代表点。经纬度 102.7210°E, 33.4620°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' }, y: { value: 59.2, unit: '%', label: '关卡点位置：日干乔大沼泽（红原县瓦切镇北部，草地代表性点位）', source: '地点：新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm。草地为大范围区域，此为代表点。经纬度 102.7210°E, 33.4620°N 按地名定位，用6个省会参照点换算到底图', status: 'verified' } },
      introduction: pending('草地位置与行军简介'),
      distance: pending('行军路线距离', 'km'), duration: pending('历史用时', '小时'),
      dailyTemperature: pending('真实日内气温：填写 {x:小时,y:气温} 数组', '°C'),
      localWetland: pending('具体地区的沼泽分布、泥炭厚度与气候资料'),
      history: { id: 'caodi-history', title: '草地史料卡', text: '草地天气，一日三变，雨雪风雹来去无常，昼夜温差极大。据红原县史志办工作人员介绍，红军过草地时正值雨季，年降水量的90%在此期间注入地表，使本来就行军不易的草原积水成沼，连绵成片。', source: '新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm', status: 'verified' },
      exploration: {
        demoTemperature: param([{ x: 0, y: 2 }, { x: 4, y: 0 }, { x: 8, y: 6 }, { x: 12, y: 16 }, { x: 16, y: 12 }, { x: 20, y: 5 }, { x: 24, y: 2 }], '°C', '演示日内气温'),
        clues: [
          { id: 'hummock', label: '浅草 · 草墩', probability: param(0.12, '', '隐患概率'), explanation: '草墩高出积水，通常比水面和松软低地更适合试探落脚；根系支撑并不保证下方坚实。' },
          { id: 'dark', label: '深草 · 颜色异常', probability: param(0.42, '', '隐患概率'), explanation: '颜色异常只能提示植被或湿度差异，不能单独判断承载力；本游戏把它设为较高风险线索。' },
          { id: 'water', label: '积水 · 反光', probability: param(0.75, '', '隐患概率'), explanation: '积水会遮住松软底层与深度，难以观察落脚处；游戏中积水线索风险更高。' }
        ],
        formation: datum('长期积水使土壤缺氧，有机质分解变慢，可逐渐积累泥炭；这是通用原理，示意图不是当地实测剖面。', '', '沼泽形成原理', 'model')
      }

    }
  ];
  XZ.data.levels[0].exploration.continuity.source = 'USGS, Streamgaging Basics：https://www.usgs.gov/mission-areas/water-resources/science/streamgaging-basics';
  XZ.data.levels[2].exploration.formation.source = 'US EPA, Classification and Types of Wetlands：https://www.epa.gov/wetlands/classification-and-types-wetlands';

  ['lapseRate', 'altitudeInterval'].forEach(function (key) {
    XZ.data.levels[1].exploration[key].source = '气温垂直递减近似；本作采用0.6 °C/100 m，教材版本与页码待作者补充；NASA 大气模型说明 https://www.grc.nasa.gov/www/k-12/airplane/atmosmet.html';
  });
  ['pressureCoefficient', 'pressureExponent', 'percentageScale'].forEach(function (key) {
    XZ.data.levels[1].exploration[key].source = 'NOAA / NASA / USAF《U.S. Standard Atmosphere, 1976》https://ntrs.nasa.gov/citations/19770009539';
  });

  // A1 连环画仅复述现有核验字段；未核实的行军细节继续占位。
  function panel(text, field, reference) {
    return { caption: { value: text, unit: '', label: '占位旁白', source: reference.source, status: reference.status }, field: field };
  }
  var river = XZ.data.levels[0], mountain = XZ.data.levels[1], grass = XZ.data.levels[2];
  // 2026-10-09 按作者要求补全史料卡（官方页面原文照录，已逐字比对）与连环画第 3 格：旁白只复述下列官方页面原文，原文句子已逐字比对。
  function sourced(text, page, quote) {
    return { caption: { value: text, unit: '', label: '旁白', source: page + '；原文：“' + quote + '”', status: 'verified' }, field: null };
  }
  var PAGE_MOD = '国防部网站《走进四川省石棉县——同舟共济驶向新航程》http://www.mod.gov.cn/gfbw/gfjy_index/16486496.html';
  var PAGE_YAAN = '雅安市人民政府《中央红军长征在雅安：中央红军翻越夹金山》https://www.yaan.gov.cn/xinwen/show/086b7626-2447-4186-bda7-a54c849f22bf.html';
  var PAGE_XINHUA = '新华网《昔日长征艰险地 开出藏地“幸福花”》http://www.xinhuanet.com/politics/2016-09/16/c_129284050.htm';
  river.comic = [
    panel('1935 年 5 月，红军先遣队到达安顺场。', 'arrivalMonth', river.arrivalMonth),
    panel('本关的地点是安顺场红军强渡大渡河遗址。', 'position.x', river.position.x),
    sourced('5 月 25 日，17 名勇士组成渡河突击队，在激流中奋勇渡过大渡河。', PAGE_MOD, '25日，17名勇士组成渡河突击队……在激流中前进，奋勇渡过大渡河')
  ];
  mountain.comic = [
    panel('本关标注的翻越点是夹金山王母寨垭口。', 'position.x', mountain.position.x),
    panel('王母寨垭口海拔 4114 m。', 'summitAltitude', mountain.summitAltitude),
    sourced('翻山途中大风夹着雪片，还下起冰雹；战士们手拉着手，你帮我、我帮你。', PAGE_YAAN, '一阵阵大风，夹杂着密密匝匝的雪片……为了不掉队，战士们手拉着手，你帮我、我帮你……鸡蛋大小的冰雹从天上呼啸而降')
  ];
  grass.comic = [
    panel('日干乔大沼泽是本关选取的草地代表性地点。', 'position.x', grass.position.x),
    panel('日干乔大沼泽位于红原县瓦切镇北部。', 'position.y', grass.position.y),
    sourced('红军过草地时正值雨季，草地天气一日三变，昼夜温差极大。', PAGE_XINHUA, '草地天气，一日三变，雨雪风雹来去无常，昼夜温差极大……红军过草地时正值雨季')
  ];
  // 每格专属木刻仅是艺术演绎；图片描述不改动旁白与核验字段。
  function comicArt(level, alternatives) {
    level.comic.forEach(function (frame, index) {
      frame.art = 'assets/img/comic/' + level.id + '-' + (index + 1) + '.svg';
      frame.alt = alternatives[index];
    });
  }
  comicArt(river, [
    '雨夜中，一小队背影沿大渡河岸山路前行，斜雨掠过暗夜，远处可见安顺场老街低矮屋顶。',
    '安顺场渡口的石阶伸入河边，岸边系着木船；木骨石墙碉楼旁有写着“安顺场”的木牌。',
    '两岸峭壁之间，木船载着多名无面部剪影，前倾划桨穿过大渡河翻卷的白浪。'
  ]);
  comicArt(mountain, [
    '两座雪峰之间是王母寨垭口，之字形山路通向垭口小石碑，山下三名背影仰望。',
    '雪山示意剖面左侧有海拔刻度尺，垭口标注“4114 m”；下降温度计和稀疏空气点阵提示越高越冷、空气越稀薄。',
    '昏暗天空下，五名剪影手拉着手迎风前倾登坡，斜向雪片和圆粒冰雹掠过山路。'
  ]);
  comicArt(grass, [
    '日干乔高原湿地天空开阔，低矮地平线和远处平缓山影前，成片水洼反光与草墩交错。',
    '斜俯视草甸间蜿蜒的沼泽水道，一角有标“N”的指北针，路边木牌写着“瓦切镇北”，没有地图轮廓。',
    '左半画面是乌云雨昼，右半是星空弯月和低温图标；一队剪影踏着草墩横穿两半，表现雨季天气变化与昼夜温差。'
  ]);
  // A3：位置按断面宽度归一化；时间伸缩、划速与耐久均不代表真实渡河。
  river.arcade = {
    game: 'daduhe', title: '激流渡船', status: 'param', source: 'A3 玩法设计，非实测河道或历史用时',
    flowProfile: param('6 u (1 − u)', '', '横向抛物线流速分布，u = 离此岸距离 / 河宽，积分均值为 1', 'model'),
    countdown: param(3, 's', '准备倒计时'), tutorialSeconds: param(4, 's', '每趟教学保护时长'),
    nominalSeconds: param(24, 's', '标准节奏参考时长；物理时间伸缩 = 河宽 / (标准划速 × 此时长)'),
    startProgress: param(0.025, '', '出发离岸比例'), startX: param(0, 'm', '出发下游坐标'),
    landingMin: param(-0.15, '倍河宽', '登陆区上游边界'), landingMax: param(0.59, '倍河宽', '登陆区下游失败边界'),
    bankMinX: param(-0.65, '倍河宽', '上游世界边界'), boatRadius: param(0.018, '倍河宽', '船碰撞半径'),
    maxHeading: param(1.45, 'rad', '左右转向范围，始终保留渡河分量'),
    hullMax: param(100, '', '船体耐久上限'), repairThreshold: param(55, '', '自动修船阈值'), repairAmount: param(35, '', '每次修船恢复'),
    repairLimit: param(3, '次', '携带修船上限'), supplyUnit: param(6, '', '每次使用修船扣物资'),
    invulnerableSeconds: param(2, 's', '碰撞无敌时间'), reverseFactor: param(0.55, '', '倒划冲量比例'),
    vortexRadius: param(0.075, '倍河宽', '漩涡作用半径'), vortexPull: param(2, 'm/s', '漩涡最大向心速度'),
    vortexSpin: param(0.10, 'rad/s', '漩涡船头旋转速度'),
    vortices: param([{x:0.40,y:0.56}], '倍河宽', '漩涡位置'),
    rocks: param([{x:-0.24,y:0.48,r:0.035},{x:0.41,y:0.80,r:0.028}], '倍河宽', '礁石位置与半径'),
    logs: param([{x:-0.38,y:0.40,r:0.022},{x:0.10,y:0.69,r:0.022}], '倍河宽', '顺流漂木初始位置'),
    logWrap: param(0.70, '倍河宽', '漂木下游循环边界'),
    chestCount: param(3, '', '宝箱数量上限'), chestSeed: param(2026, '', '种子'),
    chestCandidates: param([{x:0.002,y:0.09},{x:0.012,y:0.125},{x:0.12,y:0.945}], '倍河宽', '岸边安全缓流宝箱候选点'),
    chestJitter: param(0.004, '倍河宽', '安全范围内的种子位置扰动'), chestRadius: param(0.026, '倍河宽', '宝箱拾取半径'),
    quizRewardLimit: param(3, '次', '累计答对奖励次数上限'), boostSeconds: param(12, 's', '额外划桨力持续上限'), boostFactor: param(1.2, '', '短时划速倍率'),
    milestoneDuration: param(3, 's', '里程碑提示持续'), highTime: param(155, 's', '三星时限'), highCollisions: param(1, '次', '三星碰撞上限'),
    highDeviation: param(0.22, '倍河宽', '三星登陆中心偏差上限'), midTime: param(200, 's', '二星时限'), midCollisions: param(4, '次', '二星碰撞上限'),
    secondsPerDay: param(180, 's', '游戏耗时换算天数'),
    difficulties: {
      easy: { travelSupplies: param(8, '', '行进基础补给，按现有物资携带'), rowSpeed: param(21, 'm/s', '轻松最佳节奏平均划速'), turnSpeed: param(0.55, 'rad/s', '转向速度'),
        collisionLoss: param(12, '', '碰撞扣耐久'), vortexFactor: param(0.3, '', '漩涡力度'), timeLimit: param(260, 's', '轻松总超时') },
      standard: { travelSupplies: param(12, '', '行进基础补给，按现有物资携带'), rowSpeed: param(15, 'm/s', '标准最佳节奏平均划速'), turnSpeed: param(0.55, 'rad/s', '转向速度'),
        collisionLoss: param(40, '', '碰撞扣耐久'), vortexFactor: param(1, '', '漩涡力度'), timeLimit: param(210, 's', '标准总超时') }
    }
  };
  // A2 示意路线不是实测剖面；全部物理、天气、消耗及评分数值可在此调参。
  mountain.destination = { value: '达维', unit: '', label: '夹金山北麓终点地名', status: 'verified',
    source: '雅安市人民政府《中央红军翻越夹金山》https://www.yaan.gov.cn/mob/article.html?id=086b7626-2447-4186-bda7-a54c849f22bf' };
  mountain.provisions = { value: '干粮、干辣椒', unit: '', label: '史料记载的过山物品', status: 'verified', source: mountain.destination.source };
  mountain.arcade = {
    game: 'jiajinshan', status: 'param', source: 'A2 玩法设计；非真实路线、天气或生理测量',
    title: '雪山攀登', countdown: param(3, 's', '准备倒计时'),
    startX: param(40, 'px', '山脚起点'), summitX: param(6400, 'px', '垭口横坐标'),
    finishX: param(7200, 'px', '达维木牌横坐标'), worldWidth: param(7400, 'px', '路线长度'),
    demoBaseAltitude: param(2400, 'm', '演示山脚海拔，非实测'), endAltitude: param(2600, 'm', '演示达维海拔，非实测'),
    ground: param(360, 'px', '山脚地面高度'), altitudePixels: param(0.24, 'px/m', '剖面海拔比例'),
    terraceWidth: param(200, 'px', '坡道分段长度'), stepRise: param(5, 'px', '坡道间小台阶'),
    tutorialX: param(900, 'px', '平缓教学段终点'), tutorialAltitude: param(2600, 'm', '教学段终点示意海拔'),
    tutorialSeconds: param(12, 's', '教学提示与保护时长'), tutorialOxygenFloor: param(55, '', '教学段最低氧气'), highAltitude: param(3000, 'm', '耗氧加快海拔'),
    highDeficitScale: param(800, 'm', '高海拔额外耗氧尺度'), recoveryAltitudeScale: param(2000, 'm', '高海拔恢复减速尺度'), stepHeight: param(18, 'px', '自动跨越小台阶高度'),
    playerWidth: param(18, 'px', '剪影碰撞宽度'), playerHeight: param(32, 'px', '剪影碰撞高度'),
    gravity: param(1000, 'px/s²', '游戏重力'), jumpSpeed: param(450, 'px/s', '起跳速度'),
    jumpCut: param(2.4, '', '松开跳跃后上升重力倍数'), coyoteTime: param(0.12, 's', '离地宽容时间'),
    jumpBuffer: param(0.14, 's', '落地前跳跃缓冲'), acceleration: param(850, 'px/s²', '普通路面加速'),
    friction: param(12, '1/s', '雪地减速'), iceAcceleration: param(160, 'px/s²', '冰面加速'), iceFriction: param(0.65, '1/s', '冰面减速'),
    fallDepth: param(240, 'px', '深谷失败深度'),
    gaps: param([{x:1550,w:28},{x:2700,w:30},{x:3500,w:100},{x:4200,w:28},{x:4280,w:28},{x:5600,w:80}], 'px', '深谷位置与宽度'),
    obstacles: param([{x:1100,w:26,h:28},{x:2300,w:24,h:30},{x:4650,w:24,h:28},{x:6900,w:24,h:24}], 'px', '岩块位置与尺寸'),
    ice: param([{x:3100,w:700},{x:5400,w:550},{x:6700,w:300}], 'px', '冰面区间'),
    checkpointAltitudes: param([3000,3500,4114], 'm', '检查点目标海拔；随起点和垭口范围调整'),
    resetOxygen: param(80, '', '回检查点氧气'), resetWarmth: param(75, '', '回检查点体温'),
    meterMax: param(100, '', '氧气与体温条上限'), oxygenDeficitScale: param(25, '%', '缺氧消耗比例尺度'),
    coldReference: param(10, '°C', '寒冷消耗比较温度'), exhaustedRecovery: param(2, '', '足够起跳之外的恢复余量'),
    lowEnergy: param(35, '', '低体力困难阈值'), lowEnergySpeed: param(0.82, '', '低体力速度比例'),
    foodRestore: param(6, '', '干粮恢复体力'), chiliRestore: param(25, '', '干辣椒体温效果，游戏假设'),
    foodThreshold: param(0.55, '', '自动使用携带干粮的体力比例'), chiliThreshold: param(35, '', '自动使用携带干辣椒的体温'),
    supplyUnit: param(6, '', '每份携带物品物资费用'), stockLimit: param(6, '', '开局携带总份数上限'),
    pickups: param([{x:350,kind:'food'},{x:750,kind:'chili'}], 'px', '路边拾取点；拾取即生效'),
    chestCount: param(3, '', '宝箱数'), chestSeed: param(2026, '', '默认关卡种子'), chestSize: param(22, 'px', '宝箱大小'),
    chestCandidates: param([{x:500},{x:1000},{x:2400},{x:3900},{x:5100},{x:6800}], 'px', '可步行抵达的安全宝箱候选点'),
    quizReward: param(12, '', '问答奖励效果'), quizRewardLimit: param(30, '', '问答累计奖励上限'),
    milestoneDuration: param(2.8, 's', '里程碑提示持续时间'),
    gustWarning: param(1.2, 's', '阵风预警时间'), gustDuration: param(2, 's', '阵风持续时间'),
    gustInterval: param(16, 's', '山脚阵风间隔'), gustPeakInterval: param(7, 's', '垭口阵风间隔'),
    weatherJitter: param(0.3, '', '天气周期随机变化比例'), snowBase: param(0.12, '', '山脚落雪强度'), snowPeak: param(0.8, '', '垭口落雪强度'),
    hailZone: param({x:5800,w:550}, 'px', '短时冰雹区间'), hailInterval: param(0.7, 's', '冰雹落物间隔'),
    hailPool: param(8, '', '复用冰雹物体数量'), hailSpread: param(230, 'px', '冰雹生成范围'),
    hailHeight: param(180, 'px', '冰雹起始高度'), hailSpeed: param(170, 'px/s', '冰雹落速'), hailSize: param(7, 'px', '冰雹碰撞尺寸'),
    hailWarmth: param(7, '', '碰到冰雹扣体温'), hailGrace: param(0.8, 's', '冰雹碰撞保护时间'),
    secondsPerDay: param(90, 's/天', '游戏用时换算天数'), highTime: param(180, 's', '三星用时上限'), midTime: param(240, 's', '二星用时上限'),
    highRetries: param(0, '', '三星回检查点次数上限'), midRetries: param(2, '', '二星回检查点次数上限'),
    difficulties: {
      easy: { travelSupplies: param(8, '', '行进基础补给，按现有物资携带'), speed: param(62, 'px/s', '轻松稳步行走速度'), sprintSpeed: param(132, 'px/s', '轻松冲刺速度'), exhaustedSpeed: param(38, 'px/s', '缺氧速度'),
        oxygenDrain: param(1.1, '/s', '冲刺基础氧气消耗'), jumpOxygen: param(3, '', '起跳基础氧气消耗'), oxygenRecovery: param(14, '/s', '站立或行走基础恢复'),
        warmthDrain: param(0.12, '/s', '基础体温下降'), coldDrain: param(0.015, '/s/°C', '低温额外下降'), energyDrain: param(0.1, '/s', '行进体力消耗'),
        gustStrength: param(35, 'px/s²', '阵风水平推力'), checkpointLoss: param(5, '', '回检查点扣体力'), timeLimit: param(270, 's', '轻松超时') },
      standard: { travelSupplies: param(12, '', '行进基础补给，按现有物资携带'), speed: param(54, 'px/s', '标准稳步行走速度'), sprintSpeed: param(140, 'px/s', '标准冲刺速度'), exhaustedSpeed: param(32, 'px/s', '缺氧速度'),
        oxygenDrain: param(1.65, '/s', '冲刺基础氧气消耗'), jumpOxygen: param(4, '', '起跳基础氧气消耗'), oxygenRecovery: param(12, '/s', '站立或行走基础恢复'),
        warmthDrain: param(0.2, '/s', '基础体温下降'), coldDrain: param(0.025, '/s/°C', '低温额外下降'), energyDrain: param(0.16, '/s', '行进体力消耗'),
        gustStrength: param(42, 'px/s²', '阵风水平推力'), checkpointLoss: param(9, '', '回检查点扣体力'), timeLimit: param(240, 's', '标准超时') }
    }
  };
  // A4：示意网格、一天时间映射与救援耗时均为游戏参数，非历史测量。
  grass.arcade = {
    game: 'caodi', title: '沼泽行军', status: 'param', source: 'A6.3 玩法设计；非实测路线、天气或生理数据',
    countdown: param(3, 's', '准备倒计时'), chestSeed: param(2026, '', '地图与宝箱种子'),
    columns: param(9, '格', '地图宽'), rows: param(20, '格', '地图长'), hummockShare: param(0.88, '', '草墩线索比例'),
    tutorialRows: param(10, '行', '南缘安全教学段'), tutorialSeconds: param(20, 's', '教学提示时长'),
    confirmedStepFactor: param(0.8, '', '探杆确认安全后快步耗时比例'),
    vision: param(2, '格', '可观察半径（切比雪夫距离）'), tweenSeconds: param(0.22, 's', '每步移动补间'),
    startHour: param(15, '时', '下午出发'), daySeconds: param(140, 's', '游戏140秒映射24小时'),
    coldThreshold: param(10, '°C', '寒冷消耗起点'), coldDrain: param(0.012, '/s/°C', '低于起点每度增加消耗'),
    weatherEvery: param(24, 's', '种子天气周期'), weatherChance: param(0.65, '', '每周期阵雨或冰雹概率'), weatherSeconds: param(5, 's', '阵雨冰雹持续'),
    rescueTap: param(0.20, '', '每次新按键救援进度；专用救援键也支持持续按住'),
    rescueHoldSeconds: param(1, 's', '持续按住救援键的完整救援耗时'),
    rescueStepFactor: param(0.35, '', '沿已确认脚印回救的移动耗时比例'),
    followerIncidentEvery: param(2, '次', '每两次踩陷引发一次队尾险情'),
    followerLag: param(2, '步', '队尾险情延迟脚印数'), nightVision: param(1, '格', '夜雾可观察半径'),
    probeCost: param(1, '', '每次探杆物资'), probeLimit: param(48, '次', '携带探杆次数上限'),
    rationCost: param(6, '', '使用开局干粮扣物资'), rationLimit: param(2, '份', '干粮携带上限'), entryRations: param(1, '份', '开局最多一份干粮'),
    rationThreshold: param(0.45, '', '低于体力上限比例自动吃干粮'), rationEnergy: param(16, '', '每份干粮恢复'),
    chestCount: param(3, '', '只放verified题的宝箱上限'), probeReward: param(4, '次', '答对探杆奖励'), quizRewardLimit: param(3, '次', '累计奖励宝箱上限'),
    milestoneDuration: param(5, 's', '史料提示持续'), highTime: param(115, 's', '三星用时上限'), highTraps: param(1, '次', '三星陷入上限'),
    highEnergy: param(0.7, '', '三星剩余体力比例'), midTime: param(155, 's', '二星用时上限'), midTraps: param(8, '次', '二星陷入上限'),
    secondsPerDay: param(140, 's', '结算天数换算'),
    difficulties: {
      easy: { travelSupplies: param(8, '', '行进基础补给，按现有物资携带'), stepSeconds: param(1.85, 's/格', '按住连续移动间隔'), idleDrain: param(0.035, '/s', '基础体力消耗'), stepDrain: param(0.12, '/格', '行走消耗'),
        rescueDrain: param(0.45, '/s', '主动救援消耗'), rescueSeconds: param(7, 's', '救援倒计时，游戏设定'), coldFactor: param(0.7, '', '寒冷消耗比例'), weatherSlow: param(1.2, '', '天气移动耗时倍率'), timeLimit: param(220, 's', '失败时限') },
      standard: { travelSupplies: param(12, '', '行进基础补给，按现有物资携带'), stepSeconds: param(2.3, 's/格', '按住连续移动间隔'), idleDrain: param(0.055, '/s', '基础体力消耗'), stepDrain: param(0.16, '/格', '行走消耗'),
        rescueDrain: param(0.65, '/s', '主动救援消耗'), rescueSeconds: param(4, 's', '救援倒计时，游戏设定'), coldFactor: param(1.5, '', '寒冷消耗比例'), weatherSlow: param(1.35, '', '天气移动耗时倍率'), timeLimit: param(220, 's', '失败时限') }
    }
  };
  // A6.1：以下均为玩法参数，不改动核实史料或科学模型。
  XZ.data.game.challenge = {
    lives: { easy: param(5, '条', '轻松生命'), standard: param(3, '条', '标准生命') },
    grace: param(2, 's', '失误后短暂无敌'), noticeSeconds: param(3, 's', '失误提示'),
    energyLoss: param(7, '', '每次失误的结算体力消耗'), supplyLoss: param(2, '', '每次失误额外补给消耗'),
    oxygenBase: param(0.35, '', '零体力时氧气上限比例'), oxygenEnergy: param(0.65, '', '体力对氧气上限的贡献'),
    recoveryEnergy: param(0.65, '', '失误后耐力恢复比例')
  };
  [river, mountain, grass].forEach(function (level, i) {
    level.arcade.scoring = {
      goal: param(1200, '分', '完成度奖励'), life: param(200, '分/条', '剩余生命奖励'),
      mistake: param(160, '分/次', '失误扣分'), reserve: param(2, '分/体力', '剩余耐力奖励'),
      time: param(5, '分/s', '用时奖励'), budget: param([190,180,170][i], 's', '用时奖励预算'),
      stars: param([[0,1850,2250],[0,1900,2405],[0,1900,2300]][i], '分', '一至三星阈值')
    };
  });
  grass.arcade.scoring.goal = param(3200, '分', '最多四人带出奖励，主要分数');
  grass.arcade.scoring.probe = param(45, '分/处', '探杆确认隐患奖励');
  grass.arcade.scoring.probeCap = param(8, '处', '探杆隐患计分上限，防止反复绕路刷分');
  grass.arcade.scoring.stars = param([0,3850,4550], '分', '草地一至三星阈值');
  mountain.arcade.scoring.warmth = param(2, '分/体温', '雪山剩余体温奖励');
  mountain.arcade.thinIce = param([{x:3538,w:34},{x:5620,w:40}], 'px', '宽沟中薄冰桥；冲刺可直接跃过');
  mountain.arcade.thinCrack = param(0.8, 's', '薄冰裂纹时间');
  mountain.arcade.thinCollapse = param(1.5, 's', '薄冰坍塌时间');
  mountain.arcade.jumpOxygenFloor = param(0.62, '', '低氧跳跃速度比例下限');
  mountain.arcade.avalancheStart = param(5200, 'px', '雪崩段前检查点');
  mountain.arcade.avalancheEnd = param(6350, 'px', '雪崩止步岩脊');
  mountain.arcade.avalancheLead = param(300, 'px', '雪崩初始距离');
  mountain.arcade.avalancheWarning = param(2, 's', '雪崩启动预警');
  mountain.arcade.avalancheJitter = param(0.25, '', '雪崩速度种子扰动');
  mountain.arcade.avalancheSpeedMargin = param(1, 'px/s', '雪崩至少比走路快');
  mountain.arcade.avalancheSpeed = {easy: param(69, 'px/s', '轻松追逐速度'), standard: param(80, 'px/s', '标准追逐速度')};
  mountain.arcade.shake = param(1.5, 'px', '雪崩轻微震动幅度，可减少动态效果');

  // A6.2 保底均为游戏参数；不变更核实数据。
  [river, mountain, grass].forEach(function (level, i) {
    level.arcade.resourceFloor = {
      energy: param([40,75,45][i], '', '可游玩耐力上限保底'),
      supplies: param([18,24,12][i], '', '三次失败补给后的入场物资'),
      exitEnergy: param(10, '', '通关结算体力保底，避免战役断路'),
      resourcePenalty: param(300, '分', '低资源评分扣分上限'),
      supplementPenalty: param(300, '分', '主动补给扣分')
    };
  });
  XZ.data.game.challenge.supplementFailures = param(3, '次', '连续失败后开放补给');
  mountain.arcade.avalancheVisibleRange = param(900, 'px', '离屏雪崩警示增强范围');
  mountain.arcade.minimumStock = param(2, '份', '保底干粮与干辣椒各一份');
  grass.arcade.minimumProbes = param(8, '次', '免费保底探杆');
  grass.arcade.minimumRations = param(1, '份', '免费保底干粮');
  river.arcade.minimumRepairs = param(1, '次', '免费保底修船');
  river.arcade.title = '激流渡船 · 节奏划桨';
  river.arcade.tripOptions = param([1,2,3], '趟', '开局可选趟数');
  river.arcade.defaultTrips = param(1, '趟', '默认趟数');
  river.arcade.peoplePerTrip = param(3, '人/趟', '每趟虚构队员人数，非史实人数');
  river.arcade.flowMultipliers = param({1:[0.8],2:[0.8,1.4],3:[0.8,1.1,1.4]}, '', '按所选趟数编排上涨系数，游戏设定');
  river.arcade.obstacleStages = param({1:[0],2:[0,2],3:[0,1,2]}, '', '教学、普通、最终障碍阶段');
  river.arcade.scoringByTrips = param({
    1:{budget:40,time:15,stars:[0,2150,2450]},
    2:{budget:80,time:7.5,stars:[0,2100,2410]},
    3:{budget:120,time:5,stars:[0,2050,2370]}
  }, '', '按趟数归一的用时预算、每秒奖励与星级阈值');
  river.arcade.transitionSeconds = param(1.5, 's', '自动返航过场');
  river.arcade.tripTimeLimit = param(65, 's', '单趟失败时限');
  river.arcade.rhythm = {
    min: param(0.45, 's', '最佳节奏下界'), max: param(0.75, 's', '最佳节奏上界'),
    interval: param(0.6, 's', '参考节奏'), drag: param(2, '1/s', '船速衰减'),
    weak: param(0.25, '', '非最佳节奏基础效率'), fatigueGain: param(0.22, '', '抢桨疲劳增量'),
    fatigueRecovery: param(0.12, '/s', '疲劳自然恢复'), fatigueLoss: param(0.8, '', '满疲劳冲量损失'),
    strokeCost: param(0.035, '', '每桨耐力消耗')
  };
  river.arcade.difficulties.easy.hasteCost = param(0.04, '', '轻松抢桨额外耐力消耗');
  river.arcade.difficulties.standard.hasteCost = param(0.30, '', '标准抢桨额外耐力消耗');
  river.arcade.hasteNoticeSeconds = param(1, 's', '抢桨即时提示时长');
  river.arcade.extraRocks = param([{x:0.12,y:0.38,r:0.031},{x:0.22,y:0.63,r:0.035}], '倍河宽', '逐趟增加礁石');
  river.arcade.extraVortices = param([{x:0.15,y:0.48},{x:0.25,y:0.72}], '倍河宽', '逐趟增加移动漩涡');
  river.arcade.obstacleJitter = param(0.12, '倍河宽', '种子障碍横向扰动');
  river.arcade.vortexMotion = param(0.07, '倍河宽', '移动漩涡摆幅');
  river.arcade.vortexPeriod = param(9, 's', '移动漩涡周期');
  river.arcade.scoring.budget.value = 120;
  river.arcade.scoring.goal.value = 1500;
  river.arcade.scoring.stars.value = [0,2050,2370];

  // A6.4：只调整玩法 param；水流仍由流量 × 上涨系数 ÷ 断面计算。
  river.arcade.returnSeconds = param(1.5, 's', '冲出登陆区后回划宽限');
  river.arcade.autoInterval = param(0.7, 's', '轻松按住自动划桨间隔');
  river.arcade.autoImpulse = param(0.8, '', '轻松自动桨相对最佳节奏冲量');
  river.arcade.tutorialRocks = param(1, '个', '首趟只保留一块礁石');
  river.arcade.difficulties.easy.landingMax = param(0.85, '倍河宽', '轻松登陆下游边界');
  river.arcade.difficulties.easy.collisionEnergy = param(1, '', '碰撞耗体力');
  river.arcade.difficulties.standard.collisionEnergy = param(3, '', '碰撞耗体力');

  mountain.arcade.coyoteTime.value = 0.28;
  mountain.arcade.jumpSpeed.value = 500;
  mountain.arcade.jumpCut.value = 1.8;
  mountain.arcade.gaps.value[2].w = 60;
  mountain.arcade.gaps.value[5].w = 48;

}());
