// Calculator definitions, unit conversions and pure formulas. UI lives in workspace.js.
'use strict';

var MANUAL_CONTENT = '<h4>VAPP (进近速度)</h4><p>VAPP 是飞行员在最后进近时使用的目标速度，通常等于 VREF 加上风修正和阵风修正。</p><p><strong>公式：</strong>VAPP = VREF + 风修正 + 阵风修正</p><h4>风修正规则</h4><table><tr><th>风向</th><th>修正方式</th><th>限制</th></tr><tr><td>顶风</td><td>减速 = 风速除以2</td><td>最大 20 kts</td></tr><tr><td>顺风</td><td>加速 = 风速</td><td>最大 10 kts</td></tr><tr><td>侧风</td><td>不加不减</td><td>-</td></tr></table><h4>阵风修正</h4><p>阵风修正直接加上阵风值，不设上限。</p><h4>VREF 参考值 (B737-800)</h4><table><tr><th>襟翼</th><th>参考重量 VREF</th></tr><tr><td>Flap 15</td><td>~137 kts</td></tr><tr><td>Flap 25</td><td>~131 kts</td></tr><tr><td>Flap 30</td><td>~128 kts</td></tr><tr><td>Flap 40</td><td>~122 kts</td></tr></table><p><em>注：VREF 随重量变化，每 10,000 lbs 约变化 5 kts。</em></p>';

var PDF_SHORTCUTS = {
  VAPP: 'VAPP (进近速度) = VREF + 风修正 + 阵风修正\n\n风修正规则:\n- 顶风: -风速/2 (最大20kts)\n- 顺风: +风速 (最大10kts)\n- 侧风: 无修正',
  VREF: 'VREF 参考值 (B737-800, 140000lbs):\n\nFlap 15: ~137 kts\nFlap 25: ~131 kts\nFlap 30: ~128 kts\nFlap 40: ~122 kts\n\n注: 每10000lbs约变化5kts',
  LIMIT: '速度限制:\n- VMO: 340 kts / 0.82 M\n- MMO: 0.82 M / 340 kts\n- 起落架收放: 270 kts\n- 襟翼放出: 250 kts',
  WEIGHT: '重量限制:\n- 最大起飞: 79,015 kg\n- 最大着陆: 66,361 kg\n- 最大无燃油: 62,369 kg\n- 基准重量VREF: 140,000 lbs',
  FLAP: '襟翼速度限制:\n- Flap 1: 210 kts\n- Flap 5-40: 250 kts'
};

var PDF_URL = '1.FCOM_EN_B737-800_波音 (2020.04.19).pdf';

var UnitSystem = {
  STANDARD: { distance: 'NM', speed: 'kt', altitude: 'ft', verticalSpeed: 'ft/min', weight: 'kg' },
  PRESETS: {
    metric: { id: 'metric', name: '公制', distance: 'km', speed: 'km/h', altitude: 'm', verticalSpeed: 'm/s', weight: 'kg' },
    imperial: { id: 'imperial', name: '英制', distance: 'NM', speed: 'kt', altitude: 'ft', verticalSpeed: 'ft/min', weight: 'lb' },
    mixed: { id: 'mixed', name: '混合', distance: 'NM', speed: 'kt', altitude: 'ft', verticalSpeed: 'ft/min', weight: 'kg' }
  },
  OPTIONS: {
    distance: [
      { value: 'NM', label: 'NM', toStd: function (v) { return v; }, fromStd: function (v) { return v; } },
      { value: 'km', label: 'km', toStd: function (v) { return v / 1.852; }, fromStd: function (v) { return v * 1.852; } },
      { value: 'mi', label: 'mi', toStd: function (v) { return v * 1.15078; }, fromStd: function (v) { return v / 1.15078; } }
    ],
    speed: [
      { value: 'kt', label: 'kt', toStd: function (v) { return v; }, fromStd: function (v) { return v; } },
      { value: 'km/h', label: 'km/h', toStd: function (v) { return v / 1.852; }, fromStd: function (v) { return v * 1.852; } }
    ],
    altitude: [
      { value: 'ft', label: 'ft', toStd: function (v) { return v; }, fromStd: function (v) { return v; } },
      { value: 'm', label: 'm', toStd: function (v) { return v * 3.28084; }, fromStd: function (v) { return v / 3.28084; } }
    ],
    verticalSpeed: [
      { value: 'ft/min', label: 'ft/min', toStd: function (v) { return v; }, fromStd: function (v) { return v; } },
      { value: 'm/s', label: 'm/s', toStd: function (v) { return v * 196.85; }, fromStd: function (v) { return v / 196.85; } }
    ],
    weight: [
      { value: 'kg', label: 'kg', toStd: function (v) { return v; }, fromStd: function (v) { return v; } },
      { value: 'lb', label: 'lb', toStd: function (v) { return v / 2.20462; }, fromStd: function (v) { return v * 2.20462; } }
    ]
  },
  current: null,
  STORAGE_KEY: '_flight_calc_units',
  init: function (mode) {
    mode = mode || 'mixed';
    var saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try { this.current = JSON.parse(saved); return; } catch (e) { /* fall through to preset */ }
    }
    this.current = JSON.parse(JSON.stringify(this.PRESETS[mode]));
  },
  toStd: function (type, value) {
    if (value === null || value === undefined || isNaN(value)) return value;
    var unit = this.current[type] || this.STANDARD[type];
    var opts = this.OPTIONS[type] || [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === unit) return opts[i].toStd(value);
    }
    return value;
  },
  fromStd: function (type, value) {
    if (value === null || value === undefined || isNaN(value)) return value;
    var unit = this.current[type] || this.STANDARD[type];
    var opts = this.OPTIONS[type] || [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === unit) return opts[i].fromStd(value);
    }
    return value;
  },
  getLabel: function (type) { return this.current[type] || this.STANDARD[type] || type; },
  getOptions: function (type) { return this.OPTIONS[type] || []; },
  getPresets: function () { return [this.PRESETS.metric, this.PRESETS.imperial, this.PRESETS.mixed]; },
  setPreset: function (id) {
    if (this.PRESETS[id]) this.current = JSON.parse(JSON.stringify(this.PRESETS[id]));
  },
  setUnit: function (type, value) {
    if (!this.current) this.init('custom');
    this.current[type] = value;
    this.current.id = 'custom';
  },
  save: function () {
    if (this.current) localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.current));
  }
};

var Calcs = {
  glideAngle: function (alt, dist) {
    if (!alt) return { ok: false, msg: '请输入高度差' };
    if (!dist || dist <= 0) return { ok: false, msg: '距离必须大于零' };
    var altFt = UnitSystem.toStd('altitude', alt);
    var distNm = UnitSystem.toStd('distance', dist);
    var angle = Math.atan2(altFt, distNm * 6076) * 180 / Math.PI;
    var advice = angle < 2.5 ? '建议增加下滑角至 3°' : angle > 5 ? '警告: 过陡!' : '符合标准进近';
    return { ok: true, val: angle.toFixed(1) + '°', advice: advice };
  },

  glideDistance: function (alt, angle) {
    if (!alt || alt < 0) return { ok: false, msg: '请输入有效高度差' };
    if (!angle || angle <= 0) return { ok: false, msg: '下滑角必须大于零' };
    var altFt = UnitSystem.toStd('altitude', alt);
    var dist = (altFt / Math.tan(angle * Math.PI / 180)) / 6076;
    var userDist = UnitSystem.fromStd('distance', dist);
    var unit = UnitSystem.getLabel('distance');
    return { ok: true, val: userDist.toFixed(1), unit: unit, advice: '需要 ' + userDist.toFixed(1) + ' ' + unit };
  },

  verticalSpeed: function (gs, angle) {
    if (!gs || gs <= 0) return { ok: false, msg: '地速必须大于零' };
    if (!angle || angle <= 0) return { ok: false, msg: '下滑角必须大于零' };
    var gsKt = UnitSystem.toStd('speed', gs);
    var vsFtMin = gsKt * (6076 / 60) * Math.sin(angle * Math.PI / 180);
    // Convert the standard ft/min result into the selected vertical-speed unit.
    var disp = UnitSystem.fromStd('verticalSpeed', Math.abs(vsFtMin));
    var unit = UnitSystem.getLabel('verticalSpeed');
    var text = unit === 'm/s' ? disp.toFixed(1) : String(Math.round(disp));
    return { ok: true, val: text, unit: unit, advice: '下降率 ' + text + ' ' + unit };
  },

  todDistance: function (alt, angle) {
    if (!alt) return { ok: false, msg: '请输入高度差' };
    angle = angle || 3;
    var altFt = UnitSystem.toStd('altitude', alt);
    var dist = (altFt / Math.tan(angle * Math.PI / 180)) / 6076;
    var userDist = UnitSystem.fromStd('distance', dist);
    var unit = UnitSystem.getLabel('distance');
    return { ok: true, val: userDist.toFixed(1), unit: unit, advice: '在 ' + userDist.toFixed(1) + ' ' + unit + ' 处开始下降' };
  },

  todTiming: function (dist, gs) {
    if (!dist) return { ok: false, msg: '请输入TOD距离' };
    if (!gs || gs <= 0) return { ok: false, msg: '地速必须大于零' };
    var distNm = UnitSystem.toStd('distance', dist);
    var gsKt = UnitSystem.toStd('speed', gs);
    var mins = (distNm / gsKt) * 60;
    var m = Math.floor(mins), s = Math.round((mins - m) * 60);
    var time = s === 0 ? m + ' 分钟' : m + ' 分 ' + s + ' 秒';
    return { ok: true, val: time, advice: '从现在起 ' + time + ' 后开始下降' };
  },

  triangle: function (speed, dist, time) {
    var provided = [speed, dist, time].filter(function (v) { return v && v > 0; }).length;
    if (provided < 2) return { ok: false, msg: '请至少输入两个值' };
    if (!speed || speed <= 0) {
      var d = UnitSystem.toStd('distance', dist);
      var kt = (d / time) * 60;
      var us = UnitSystem.fromStd('speed', kt);
      var su = UnitSystem.getLabel('speed');
      var st = us.toFixed(1);
      return { ok: true, val: st, unit: su, advice: '速度 ' + st + ' ' + su };
    }
    if (!dist || dist <= 0) {
      var s = UnitSystem.toStd('speed', speed);
      var nm = (s * time) / 60;
      var ud = UnitSystem.fromStd('distance', nm);
      var du = UnitSystem.getLabel('distance');
      var dt = ud.toFixed(1);
      return { ok: true, val: dt, unit: du, advice: '距离 ' + dt + ' ' + du };
    }
    var s2 = UnitSystem.toStd('speed', speed);
    var d2 = UnitSystem.toStd('distance', dist);
    var t = ((d2 / s2) * 60).toFixed(0);
    return { ok: true, val: t + ' 分', advice: '时间 ' + t + ' 分钟' };
  },

  vapp: function (vref, wind, dir, gust) {
    if (!vref || vref <= 0) return { ok: false, msg: '请输入有效的VREF值' };
    if (!dir) return { ok: false, msg: '请选择风向' };
    var corr = 0, desc = '';
    if (dir === 'headwind') {
      corr = Math.min(Math.round(wind / 2), 20);
      desc = '顶风修正: -' + corr + ' kts';
    } else if (dir === 'tailwind') {
      corr = Math.min(wind, 10);
      desc = '顺风修正: +' + corr + ' kts';
    } else {
      desc = '侧风修正: 无';
    }
    var g = gust > 0 ? gust : 0;
    var value = vref - corr + g;
    var detail = desc + (g ? ' | 阵风: +' + g + ' kts' : '');
    return { ok: true, val: value, unit: 'kts', advice: '进近速度 VAPP = ' + value + ' kts', detail: detail };
  },

  windComp: function (speed, angle) {
    if (!speed || speed < 0) return { ok: false, msg: '请输入有效的风速' };
    if (angle === null || angle === undefined) return { ok: false, msg: '请输入风向角' };
    var rad = Math.abs(angle) * Math.PI / 180;
    var hw = Math.round(Math.cos(rad) * speed);
    var xw = Math.round(Math.sin(rad) * speed);
    var isHead = angle >= -90 && angle <= 90;
    var advice = isHead
      ? '顶风: ' + Math.abs(hw) + ' kts, 侧风: ' + xw + ' kts'
      : '顺风: ' + Math.abs(hw) + ' kts, 侧风: ' + xw + ' kts';
    return { ok: true, val: Math.abs(hw) + ' / ' + xw, unit: '顶风 / 侧风 (kts)', advice: advice };
  },

  vrefCalc: function (weight, flap) {
    if (!weight || weight <= 0) return { ok: false, msg: '请输入有效的重量' };
    var base = { '15': 137, '25': 131, '30': 128, '40': 122 };
    var weightLbs = UnitSystem.toStd('weight', weight);
    var v = (base[flap] || 130) + Math.round((weightLbs - 140000) / 10000 * 5);
    return { ok: true, val: v, unit: 'kts', advice: '基于 ' + weightLbs.toLocaleString() + ' lbs 和襟翼 ' + flap + '，VREF = ' + v + ' kts' };
  },

  // --- V3 atmosphere & airspeed ---
  pressureAltitude: function (qnh, qnhUnit, elev) {
    if (qnh === null || qnh === undefined || !Number.isFinite(qnh) || qnh <= 0) return { ok: false, msg: '请输入有效的修正海压 QNH' };
    if (elev === null || elev === undefined || !Number.isFinite(elev)) return { ok: false, msg: '请输入机场标高' };
    var elevFt = UnitSystem.toStd('altitude', elev);
    var paFt = qnhUnit === 'inhg'
      ? elevFt + (29.92 - qnh) * 1000
      : elevFt + (1013.25 - qnh) * 29.53;
    var user = UnitSystem.fromStd('altitude', paFt);
    var unit = UnitSystem.getLabel('altitude');
    var v = Math.round(user);
    var qtext = qnh + ' ' + (qnhUnit === 'inhg' ? 'inHg' : 'hPa');
    return { ok: true, val: String(v), unit: unit, advice: '在 QNH ' + qtext + ' 下，压力高度 = ' + v + ' ' + unit };
  },

  densityAltitude: function (pa, oat) {
    if (pa === null || pa === undefined || !Number.isFinite(pa)) return { ok: false, msg: '请输入压力高度' };
    if (oat === null || oat === undefined || !Number.isFinite(oat)) return { ok: false, msg: '请输入外界温度 OAT' };
    var paFt = UnitSystem.toStd('altitude', pa);
    var isa = 15 - 2 * paFt / 1000;
    var dev = oat - isa;
    var daFt = paFt + 118.8 * dev;
    var user = UnitSystem.fromStd('altitude', daFt);
    var unit = UnitSystem.getLabel('altitude');
    var v = Math.round(user);
    var sign = dev >= 0 ? '+' : '';
    var detail = 'ISA ' + isa.toFixed(1) + '°C · 偏差 ' + sign + dev.toFixed(1) + '°C';
    return { ok: true, val: String(v), unit: unit, advice: '密度高度 = ' + v + ' ' + unit, detail: detail };
  },

  trueAirspeed: function (ias, pa) {
    if (ias === null || ias === undefined || !Number.isFinite(ias) || ias <= 0) return { ok: false, msg: '请输入指示空速 IAS' };
    if (pa === null || pa === undefined || !Number.isFinite(pa)) return { ok: false, msg: '请输入压力高度' };
    var iasKt = UnitSystem.toStd('speed', ias);
    var paFt = UnitSystem.toStd('altitude', pa);
    var tasKt = iasKt * (1 + 0.02 * paFt / 1000);
    var user = UnitSystem.fromStd('speed', tasKt);
    var unit = UnitSystem.getLabel('speed');
    var v = Math.round(user);
    return { ok: true, val: String(v), unit: unit, advice: '真实空速 TAS ≈ ' + v + ' ' + unit, detail: '每千英尺 +2% 经验修正，忽略压缩性' };
  }
};

var CALCULATOR_SECTIONS = [
  {
    id: 'glide', name: '下滑角', cards: [
      {
        id: 'g1', title: '下滑角计算', sub: '高度差 + 距离',
        inputs: [
          { id: 'alt1', label: '高度差', type: 'altitude' },
          { id: 'dist1', label: '水平距离', type: 'distance' }
        ],
        btn: '计算下滑角', fn: function (d) { return Calcs.glideAngle(d.alt1, d.dist1); }
      },
      {
        id: 'g2', title: '反向计算', sub: '下滑角 + 高度差',
        inputs: [
          { id: 'alt2', label: '目标高度差', type: 'altitude' },
          { id: 'angle1', label: '下滑角', type: 'number' }
        ],
        btn: '计算距离', fn: function (d) { return Calcs.glideDistance(d.alt2, d.angle1); }
      }
    ]
  },
  {
    id: 'vs', name: '垂直速度', cards: [
      {
        id: 'v1', title: '垂直速度计算', sub: '地速 + 下滑角',
        inputs: [
          { id: 'gs1', label: '地速', type: 'speed' },
          { id: 'angle2', label: '下滑角', type: 'number' }
        ],
        btn: '计算垂直速度', fn: function (d) { return Calcs.verticalSpeed(d.gs1, d.angle2); }
      }
    ]
  },
  {
    id: 'tod', name: 'TOD', cards: [
      {
        id: 't1', title: 'TOD 距离', sub: '高度差 + 下降角',
        inputs: [
          { id: 'alt3', label: '高度差', type: 'altitude' },
          { id: 'angle3', label: '下降角', type: 'number', def: 3 }
        ],
        btn: '计算 TOD 距离', fn: function (d) { return Calcs.todDistance(d.alt3, d.angle3); }
      },
      {
        id: 't2', title: 'TOD 时机', sub: 'TOD 距离 + 地速',
        inputs: [
          { id: 'dist2', label: 'TOD 距离', type: 'distance' },
          { id: 'gs2', label: '地速', type: 'speed' }
        ],
        btn: '计算下降时机', fn: function (d) { return Calcs.todTiming(d.dist2, d.gs2); }
      }
    ]
  },
  {
    id: 'tri', name: '三角', cards: [
      {
        id: 'r1', title: '三角计算', sub: '速度/距离/时间',
        inputs: [
          { id: 'spd', label: '速度', type: 'speed' },
          { id: 'dst', label: '距离', type: 'distance' },
          { id: 'tme', label: '时间 (min)', type: 'number' }
        ],
        btn: '计算', fn: function (d) { return Calcs.triangle(d.spd, d.dst, d.tme); }
      }
    ]
  },
  {
    id: 'atmo', name: '大气·空速', cards: [
      {
        id: 'a1', title: '压力高度', sub: 'QNH + 机场标高',
        inputs: [
          { id: 'qnh', label: '修正海压 QNH', type: 'number', unit: 'hPa', def: 1013 },
          { id: 'qnhu', label: 'QNH 单位', type: 'select', controlsUnit: 'qnh', opts: ['hPa', 'inHg'], vals: ['hpa', 'inhg'] },
          { id: 'felev', label: '机场标高', type: 'altitude' }
        ],
        btn: '计算压力高度', fn: function (d) { return Calcs.pressureAltitude(d.qnh, d.qnhu, d.felev); }
      },
      {
        id: 'a2', title: '密度高度', sub: '压力高度 + 外界温度',
        inputs: [
          { id: 'palta', label: '压力高度', type: 'altitude' },
          { id: 'oat', label: '外界温度 OAT (°C)', type: 'number' }
        ],
        btn: '计算密度高度', fn: function (d) { return Calcs.densityAltitude(d.palta, d.oat); }
      },
      {
        id: 'a3', title: '真实空速', sub: '指示空速 + 压力高度',
        inputs: [
          { id: 'ias', label: '指示空速 IAS', type: 'speed' },
          { id: 'paltas', label: '压力高度', type: 'altitude' }
        ],
        btn: '计算真实空速', fn: function (d) { return Calcs.trueAirspeed(d.ias, d.paltas); }
      }
    ]
  },
  {
    id: 'vapp', name: 'VAPP', manual: true, cards: [
      {
        id: 'vapp1', title: 'VAPP 计算', sub: 'VREF + 风修正',
        inputs: [
          { id: 'vref', label: 'VREF (kts)', type: 'number' },
          { id: 'wind', label: '风速 (kts)', type: 'number' },
          { id: 'wdir', label: '风向', type: 'select', opts: ['', '顶风', '顺风', '侧风'], vals: ['', 'headwind', 'tailwind', 'crosswind'] },
          { id: 'gust', label: '阵风 (kts)', type: 'number', def: 0 }
        ],
        btn: '计算 VAPP', fn: function (d) { return Calcs.vapp(d.vref, d.wind, d.wdir, d.gust); }
      },
      {
        id: 'vapp2', title: '风分量计算', sub: '顶风/顺风/侧风',
        inputs: [
          { id: 'winds', label: '总风速 (kts)', type: 'number' },
          { id: 'wangle', label: '风向角', type: 'number' }
        ],
        btn: '计算分量', fn: function (d) { return Calcs.windComp(d.winds, d.wangle); }
      },
      {
        id: 'vapp3', title: 'VREF 参考值', sub: '重量 + 襟翼',
        inputs: [
          { id: 'wght', label: '飞机重量', type: 'weight' },
          { id: 'flap', label: '襟翼', type: 'select', opts: ['Flap 15', 'Flap 25', 'Flap 30', 'Flap 40'], vals: ['15', '25', '30', '40'] }
        ],
        btn: '计算 VREF', fn: function (d) { return Calcs.vrefCalc(d.wght, d.flap); }
      }
    ]
  },
  {
    id: 'manual', name: '手册', cards: [
      {
        id: 'manual1', title: 'FCOM 手册', sub: '波音737-800飞行手册',
        inputs: [], btn: '打开手册', fn: function () { return { ok: true, openPdf: true }; }
      }
    ]
  }
];
