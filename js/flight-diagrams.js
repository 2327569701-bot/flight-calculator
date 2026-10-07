/* Data-driven SVG diagrams. Models use the same completed calculation snapshot as the result card. */
(function (root) {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const radians = degrees => degrees / 180 * Math.PI;
  const numberFormatters = [0, 1].map(maximumFractionDigits => new Intl.NumberFormat('en-US', { maximumFractionDigits }));
  const format = (value, digits = 1) => {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1e7 || (value !== 0 && Math.abs(value) < .01)) return value.toExponential(1);
    return (numberFormatters[digits] || new Intl.NumberFormat('en-US', { maximumFractionDigits: digits })).format(value);
  };
  const amount = (value, unit = '', digits = 1) => `${format(value, digits)}${unit ? ' ' + unit : ''}`;
  const metric = (label, value, unit = '', computed = false) => ({ label, value: typeof value === 'number' ? amount(value, unit) : value, computed });
  const titles = { g1: '下滑剖面', g2: '下滑剖面', v1: '下降矢量', t1: '下降规划', t2: '距 TOD 时间轴', r1: '航程关系', vapp1: '进近速度仪表', vapp2: '风分量矢量', vapp3: 'VREF 参考仪表', a1: '压力高度标尺', a2: '密度高度标尺', a3: '真实空速仪表' };
  const types = { g1: 'descent', g2: 'descent', v1: 'vertical', t1: 'descent', t2: 'timeline', r1: 'journey', vapp1: 'gauge', vapp2: 'wind', vapp3: 'gauge', a1: 'altscale', a2: 'altscale', a3: 'gauge' };

  function model(cardId, result, units) {
    const m = { cardId, kind: types[cardId], title: titles[cardId], ready: false, status: result ? '请检查输入' : '等待计算', metrics: [], caption: '计算后，图形与标注将随结果更新。' };
    if (!result?.ok || !result.inputs) return m;
    const d = result.inputs;
    const n = Number.parseFloat(result.val);
    const label = type => units.getLabel(type);
    const altitude = label('altitude'), distance = label('distance'), speed = label('speed');
    if (Object.values(d).some(value => typeof value === 'number' && !Number.isFinite(value))) return m;
    m.ready = true; m.status = '结果已同步';
    if (['g1', 'g2', 't1'].includes(cardId)) {
      m.altitude = cardId === 'g1' ? d.alt1 : cardId === 'g2' ? d.alt2 : d.alt3;
      m.distance = cardId === 'g1' ? d.dist1 : n;
      m.angle = cardId === 'g1' ? Math.atan2(units.toStd('altitude', d.alt1), units.toStd('distance', d.dist1) * 6076) * 180 / Math.PI : cardId === 'g2' ? d.angle1 : (d.angle3 || 3);
      m.angleText = cardId === 'g1' ? String(result.val) : amount(m.angle, '°');
      m.altitudeText = amount(m.altitude, altitude);
      m.distanceText = amount(m.distance, distance);
      m.metrics = [metric('高度差', m.altitude, altitude), metric(cardId === 't1' ? '下降距离' : '水平距离', m.distance, distance, cardId !== 'g1'), metric('下滑角', m.angleText, '', cardId === 'g1')];
      m.caption = '剖面按示意比例绘制 · 实际角度与距离以标注为准。';
      if (m.altitude <= 0 || m.distance < 0 || !Number.isFinite(m.distance) || !(m.angle > 0 && m.angle < 90)) m.ready = false;
    } else if (cardId === 'v1') {
      m.angle = d.angle2; m.rate = Math.abs(n); m.speed = d.gs1;
      m.angleText = amount(m.angle, '°');
      m.rateText = amount(m.rate, result.unit);
      m.speedText = amount(m.speed, speed);
      m.metrics = [metric('地速', m.speed, speed), metric('下滑角', m.angle, '°'), metric('下降率', m.rate, result.unit, true)];
      m.caption = '箭头展示下降方向与读数，长度为示意比例。';
      if (!(m.angle > 0 && m.angle < 90) || !Number.isFinite(m.rate) || !(m.speed > 0)) m.ready = false;
    } else if (cardId === 't2') {
      m.minutes = units.toStd('distance', d.dist2) / units.toStd('speed', d.gs2) * 60;
      m.distanceText = amount(d.dist2, distance);
      m.timeText = String(result.val);
      m.metrics = [metric('剩余航程', d.dist2, distance), metric('地速', d.gs2, speed), metric('距开始下降', m.timeText, '', true)];
      m.caption = '根据当前输入的恒定地速估算，非实时倒计时。';
      if (!(m.minutes > 0) || !Number.isFinite(m.minutes)) m.ready = false;
    } else if (cardId === 'r1') {
      const solved = !(d.spd > 0) ? 'speed' : !(d.dst > 0) ? 'distance' : 'time';
      m.speed = solved === 'speed' ? n : d.spd;
      m.distance = solved === 'distance' ? n : d.dst;
      m.minutes = solved === 'time' ? n : d.tme;
      m.distanceUnit = solved === 'distance' ? result.unit : distance;
      m.metrics = [metric('速度', m.speed, solved === 'speed' ? result.unit : speed, solved === 'speed'), metric('距离', m.distance, m.distanceUnit, solved === 'distance'), metric('时间', m.minutes, 'min', solved === 'time')];
      m.caption = '横轴为时间，纵轴为距离；高亮项是本次求解结果。';
      if (![m.speed, m.distance, m.minutes].every(v => Number.isFinite(v) && v >= 0)) m.ready = false;
    } else if (cardId === 'vapp2') {
      m.windSpeed = d.winds; m.angle = d.wangle;
      const components = String(result.val).split('/').map(Number);
      m.headwind = Math.abs(components[0]); m.crosswind = Math.abs(components[1]);
      m.longitudinal = Math.cos(radians(m.angle)) >= 0 ? '顶风' : '顺风';
      m.metrics = [metric('来风角', m.angle, '°'), metric(m.longitudinal, m.headwind, 'kts', true), metric('侧风', m.crosswind, 'kts', true)];
      m.caption = '机头朝上；蓝色矢量指向来风方向，虚线为分量投影。';
      if (!(m.windSpeed > 0) || ![m.angle, m.headwind, m.crosswind].every(Number.isFinite)) m.ready = false;
    } else if (cardId === 'a1' || cardId === 'a2') {
      if (cardId === 'a1') {
        m.base = d.felev; m.result = n;
        m.baseLabel = '机场标高'; m.resultLabel = '压力高度';
        const pressureUnit = d.qnhu === 'inhg' ? 'inHg' : 'hPa';
        m.noteText = `QNH ${format(d.qnh)} ${pressureUnit}`;
        m.metrics = [metric('机场标高', d.felev, altitude), metric('QNH', `${format(d.qnh)} ${pressureUnit}`), metric('压力高度', n, altitude, true)];
        m.caption = '压力高度是把气压调到标准面 1013.25 hPa（29.92 inHg）后的高度；低气压日会高于机场标高。';
        if (![d.felev, n, d.qnh].every(Number.isFinite) || d.qnh <= 0) m.ready = false;
      } else {
        m.base = d.palta; m.result = n;
        m.baseLabel = '压力高度'; m.resultLabel = '密度高度';
        const paFt = units.toStd('altitude', d.palta);
        const isa = 15 - 2 * paFt / 1000;
        const dev = d.oat - isa;
        m.hot = dev > 0;
        const devText = (dev >= 0 ? '+' : '') + dev.toFixed(1);
        m.noteText = `OAT ${format(d.oat)}°C · ISA偏差 ${devText}°C`;
        m.metrics = [metric('压力高度', d.palta, altitude), metric('OAT / ISA偏差', `${format(d.oat)}°C / ${devText}°C`), metric('密度高度', n, altitude, true)];
        m.caption = '密度高度反映空气密度；高温或高海拔会使它高于压力高度，飞机性能随之下降。';
        if (![d.palta, n, d.oat].every(Number.isFinite)) m.ready = false;
      }
      m.unit = altitude;
    } else if (cardId === 'a3') {
      m.speed = n; m.reference = d.ias; m.speedUnit = speed; m.referenceLabel = 'IAS'; m.gaugeLabel = 'TAS';
      m.metrics = [metric('指示空速', d.ias, speed), metric('压力高度', d.paltas, altitude), metric('真实空速', n, speed, true)];
      m.caption = '每升高 1000 ft 约增加 2%；为经验估算，忽略高速压缩性。';
      if (!Number.isFinite(m.speed) || m.speed < 0 || !(d.ias > 0)) m.ready = false;
    } else {
      m.speed = n; m.reference = cardId === 'vapp1' ? d.vref : null;
      m.gaugeLabel = cardId === 'vapp1' ? 'VAPP' : 'VREF';
      m.metrics = cardId === 'vapp1' ? [metric('VREF', d.vref, 'kts'), metric('风速 / 阵风', `${format(d.wind || 0)} / ${format(d.gust || 0)} kts`), metric('VAPP', n, 'kts', true)] : [metric('飞机重量', d.wght, label('weight')), metric('襟翼', 'Flap ' + d.flap), metric('VREF', n, 'kts', true)];
      m.caption = '刻度随数值自适应，仅显示读数，不代表速度限制。';
      if (!Number.isFinite(m.speed) || m.speed < 0) m.ready = false;
    }
    if (!m.ready) { m.status = '无法绘制'; m.caption = '当前结果超出图形可表示的范围，请检查参数。'; m.metrics = []; }
    return m;
  }

  function text(x, y, value, className = '', anchor = 'start') {
    return `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}">${escape(value)}</text>`;
  }
  const line = (x1, y1, x2, y2, cls = '', extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`;
  const dot = (x, y, cls = 'diagram-dot') => `<circle cx="${x}" cy="${y}" r="4" class="${cls}"/>`;
  const plane = (x, y, angle = 0) => `<g class="diagram-plane" transform="translate(${x} ${y}) rotate(${angle})"><path d="M16 0C16-1 14-2 11-2H3L-5-13h-4l4 11h-7l-4-4h-3l3 6-3 6h3l4-4h7l-4 11h4L3 2h8c3 0 5-1 5-2Z"/></g>`;
  const grid = () => [45, 85, 125, 165].map(y => line(44, y, 414, y, 'diagram-grid')).join('') + [72, 132, 192, 252, 312, 372].map(x => line(x, 27, x, 185, 'diagram-grid')).join('');
  function stations(x1, y1, x2, y2) {
    return [1, 2, 3].map(i => {
      const x = x1 + (x2 - x1) * i / 4, y = y1 + (y2 - y1) * i / 4;
      return `<circle cx="${x}" cy="${y}" r="2.5" class="diagram-station"/>`;
    }).join('');
  }
  function horizontalDimension(x1, x2, y, label) {
    return line(x1, y, x2, y, 'diagram-dimension') + line(x1, y - 4, x1, y + 4, 'diagram-dimension') + line(x2, y - 4, x2, y + 4, 'diagram-dimension') + text((x1 + x2) / 2, y + 19, label, 'diagram-dimension-text', 'middle');
  }
  function niceMax(value) {
    if (value === Infinity) return Number.MAX_VALUE;
    if (!(value > 0)) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const ratio = value / power;
    return Math.min(Number.MAX_VALUE, ([1, 2, 4, 5, 8, 10].find(step => step >= ratio) || 10) * power);
  }
  function descent(m, motion) {
    const startX = m.cardId === 't1' ? 132 : 84, endX = 392, baseY = 176;
    const angle = m.ready ? motion.angle : 3;
    // A monotonic schematic scale keeps shallow and steep approaches distinguishable.
    const rise = m.ready ? 12 + 116 * angle / (angle + 2) : 0;
    const startY = baseY - rise;
    const screenAngle = Math.atan2(rise, endX - startX) * 180 / Math.PI;
    const slope = `M${startX} ${startY}L${endX} ${baseY}`;
    let svg = grid();
    svg += `<path class="diagram-area" d="${slope}H${startX}Z"/>`;
    svg += line(43, baseY + 9, 415, baseY + 9, 'diagram-ground');
    svg += `<rect x="374" y="181" width="38" height="8" rx="2" class="diagram-runway"/>` + line(377, 185, 409, 185, 'diagram-runway-mark');
    svg += line(startX, startY, startX, baseY, 'diagram-guide');
    if (m.cardId === 't1') {
      svg += line(38, startY, startX, startY, 'diagram-cruise');
      svg += text(40, startY - 17, '巡航');
      svg += dot(startX, startY) + text(startX + 10, startY - 16, 'TOD · 开始下降', 'diagram-label');
      svg += plane(62, startY, 0);
    } else {
      svg += text(startX, startY - 25, '当前位置', 'diagram-small');
      svg += plane(startX, startY, screenAngle);
    }
    svg += `<path class="diagram-route" data-geometry="slope" d="${slope}" pathLength="1"/>`;
    svg += stations(startX, startY, endX, baseY);
    svg += [1, 2, 3, 4].map(i => line(392 - i * 14, 185, 398 - i * 14, 185, 'diagram-approach-light')).join('');
    svg += dot(endX, baseY) + text(402, 166, '目标', 'diagram-small', 'end');
    svg += line(startX - 24, startY, startX - 24, baseY, 'diagram-dimension');
    svg += line(startX - 28, startY, startX - 20, startY, 'diagram-dimension') + line(startX - 28, baseY, startX - 20, baseY, 'diagram-dimension');
    svg += `<text class="diagram-dimension-text" transform="translate(${startX - 34} ${(startY + baseY) / 2}) rotate(-90)" text-anchor="middle">${escape(m.ready ? m.altitudeText : '高度差 —')}</text>`;
    const arcEndX = endX - 44 * Math.cos(radians(screenAngle));
    const arcEndY = baseY - 44 * Math.sin(radians(screenAngle));
    svg += `<path class="diagram-angle-arc" d="M${endX - 44} ${baseY}A44 44 0 0 1 ${arcEndX} ${arcEndY}"/>`;
    svg += text(endX - 60, baseY - 8, m.ready ? m.angleText : 'θ', 'diagram-angle', 'end');
    svg += horizontalDimension(startX, endX, 206, m.ready ? m.distanceText : '水平距离 —');
    return svg;
  }
  function vertical(m, motion) {
    const angle = m.ready ? motion.angle : 3;
    const rate = m.ready ? motion.rate : 0;
    const x = 80, y = 59, right = 327;
    const endY = m.ready ? y + 24 + 98 * angle / (angle + 3) : y;
    const arrowY = m.ready ? 102 + 69 * (rate / (rate + 1000)) : y;
    let svg = grid();
    svg += `<path class="diagram-area" d="M${x} ${y}H${right}V${endY}Z"/>`;
    svg += line(x, y, right, y, 'diagram-vector', 'marker-end="url(#diagram-arrow)"');
    svg += line(right, y, right, arrowY, 'diagram-vector diagram-secondary-vector', 'marker-end="url(#diagram-arrow-soft)"');
    svg += `<path class="diagram-route" data-geometry="slope" d="M${x} ${y}L${right} ${endY}" pathLength="1"/>`;
    svg += stations(x, y, right, endY);
    svg += line(right, arrowY, right, endY, 'diagram-guide') + plane(x, y, Math.atan2(endY - y, right - x) * 180 / Math.PI) + dot(right, endY);
    svg += text(202, 38, m.ready ? '地速 ' + m.speedText : '地速 —', 'diagram-label', 'middle');
    svg += text(404, 103, '下降率', 'diagram-small', 'end');
    svg += text(404, 122, m.ready ? m.rateText : '—', 'diagram-label', 'end');
    svg += text(143, 96, m.ready ? m.angleText : 'θ', 'diagram-angle');
    svg += text(230, 217, '水平前进  +  垂直下降', 'diagram-small', 'middle');
    return svg;
  }
  function timeline(m, motion) {
    const minutes = m.ready ? m.minutes : 0;
    const max = niceMax(minutes * 1.15);
    const end = m.ready ? 55 + clamp(motion.minutes / max, 0, 1) * 330 : 55;
    let svg = grid();
    svg += line(55, 105, 395, 105, 'diagram-track');
    svg += `<path class="diagram-route" data-geometry="timeline" d="M55 105H${end}" pathLength="1"/>`;
    svg += stations(55, 105, end, 105);
    svg += `<path d="M${end} 105l28 30" class="diagram-guide"/>`;
    svg += plane(55, 105) + dot(end, 105);
    svg += text(55, 77, '当前位置', 'diagram-small');
    svg += text(end, 70, 'TOD', 'diagram-label', 'middle');
    svg += text(end, 147, '开始下降', 'diagram-small', 'middle');
    svg += text(220, 33, m.ready ? '剩余 ' + m.distanceText : '剩余航程 —', 'diagram-label', 'middle');
    svg += line(55, 184, 385, 184, 'diagram-dimension');
    for (let i = 0; i <= 4; i++) {
      const x = 55 + 330 * i / 4;
      svg += line(x, 180, x, 188, 'diagram-dimension') + text(x, 205, m.ready ? format(max / 4 * i) : (i === 0 ? '0' : '—'), '', 'middle');
    }
    svg += text(411, 227, '时间 / min', 'diagram-small', 'end');
    return svg;
  }
  function journey(m, motion) {
    const maxTime = niceMax(m.ready ? m.minutes * 1.15 : 60), maxDistance = niceMax(m.ready ? m.distance * 1.15 : 100);
    const x = m.ready ? 63 + 318 * clamp(motion.minutes / maxTime, 0, 1) : 63;
    const y = m.ready ? 182 - 132 * clamp(motion.distance / maxDistance, 0, 1) : 182;
    let svg = grid();
    svg += `<path class="diagram-area" d="M63 182L${x} ${y}V182Z"/>`;
    svg += line(63, 29, 63, 182, 'diagram-dimension') + line(63, 182, 403, 182, 'diagram-dimension');
    svg += `<path class="diagram-route" data-geometry="journey" d="M63 182L${x} ${y}" pathLength="1"/>`;
    svg += stations(63, 182, x, y);
    svg += line(x, y, x, 182, 'diagram-guide') + line(63, y, x, y, 'diagram-guide') + dot(x, y);
    for (let i = 0; i <= 4; i++) {
      const tickX = 63 + 318 * i / 4, tickY = 182 - 132 * i / 4;
      svg += text(tickX, 203, m.ready ? format(maxTime / 4 * i) : '—', '', 'middle');
      svg += text(51, tickY + 3, m.ready ? format(maxDistance / 4 * i) : '—', '', 'end');
    }
    svg += text(63, 16, '距离 / ' + (m.distanceUnit || '—'), 'diagram-small');
    svg += text(405, 226, '时间 / min', 'diagram-small', 'end');
    svg += text(Math.min(x + 8, 400), y - 13, '抵达', 'diagram-label', x > 335 ? 'end' : 'start');
    return svg;
  }
  function gauge(m, motion) {
    const max = niceMax(Math.max(m.ready ? m.speed : 160, m.reference || 0) * 1.25);
    const point = (fraction, radius = 94) => ({ x: 220 - Math.cos(Math.PI * fraction) * radius, y: 161 - Math.sin(Math.PI * fraction) * radius });
    let svg = `<path class="diagram-gauge-track" d="M126 161A94 94 0 0 1 314 161"/>`;
    svg += '<path class="diagram-gauge-rim" d="M139 161A81 81 0 0 1 301 161"/><circle class="diagram-instrument-hub" cx="220" cy="161" r="12"/>';
    const fraction = m.ready ? clamp(motion.speed / max, 0, 1) : 0;
    svg += `<path class="diagram-gauge-fill" d="M126 161A94 94 0 0 1 314 161" pathLength="1" stroke-dasharray="${fraction} 1" style="opacity: ${fraction > 0 ? .6 : 0}"/>`;
    for (let i = 0; i <= 20; i++) {
      const outer = point(i / 20, i % 5 === 0 ? 111 : 107), inner = point(i / 20, 101);
      svg += line(inner.x, inner.y, outer.x, outer.y, 'diagram-tick', `style="--tick-lit: ${m.ready && i / 20 <= fraction ? 1 : 0}"`);
      if (i % 5 === 0) { const label = point(i / 20, 128); svg += text(label.x, label.y + 4, m.ready ? format(max / 20 * i, 0) : '—', '', 'middle'); }
    }
    const hasReference = m.ready && Number.isFinite(m.reference);
    const referenceAngle = hasReference ? clamp(m.reference / max, 0, 1) * 180 : 0;
    svg += `<circle cx="126" cy="161" r="5" transform="rotate(${referenceAngle} 220 161)" opacity="${hasReference ? 1 : 0}" class="diagram-reference-dot"><title>${hasReference ? (m.referenceLabel || 'VREF') + ' ' + escape(amount(m.reference, m.speedUnit || 'kts')) : ''}</title></circle>`;
    svg += line(220, 161, 152, 161, 'diagram-needle', `data-geometry="needle" transform="rotate(${fraction * 180} 220 161)"`) + dot(220, 161);
    svg += text(220, 199, (m.gaugeLabel || (m.cardId === 'vapp1' ? 'VAPP' : 'VREF')) + ' · ' + (m.ready ? amount(m.speed, m.speedUnit || 'kts') : '—'), 'diagram-gauge-value', 'middle');
    svg += text(220, 227, m.cardId === 'vapp1' ? '○ VREF 参考点   /   指针：VAPP' : m.cardId === 'a3' ? '○ IAS 参考点   /   指针：TAS' : '指针：当前重量与襟翼对应的 VREF', 'diagram-small', 'middle');
    return svg;
  }
  function wind(m, motion) {
    const centerX = 220, centerY = 120, radius = 77;
    const angle = radians(m.ready ? motion.angle : 30);
    const max = niceMax(m.ready ? m.windSpeed : 20);
    const length = m.ready ? radius * clamp(motion.windSpeed / max, 0, 1) : 0;
    const x = centerX + Math.sin(angle) * length, y = centerY - Math.cos(angle) * length;
    let svg = `<circle cx="220" cy="120" r="77" class="diagram-compass"/><circle cx="220" cy="120" r="39" class="diagram-compass diagram-compass-inner"/>`;
    for (let i = 0; i < 36; i++) {
      const a = radians(i * 10), inner = i % 9 === 0 ? 79 : 82;
      svg += line(220 + Math.sin(a) * inner, 120 - Math.cos(a) * inner, 220 + Math.sin(a) * 87, 120 - Math.cos(a) * 87, 'diagram-compass-tick');
    }
    svg += line(128, centerY, 312, centerY, 'diagram-guide') + line(centerX, 29, centerX, 211, 'diagram-guide');
    svg += text(centerX, 22, '机头 / 顶风', 'diagram-small', 'middle') + text(centerX, 232, '顺风', 'diagram-small', 'middle');
    svg += text(117, 124, '左侧', 'diagram-small', 'end') + text(324, 124, '右侧', 'diagram-small');
    svg += line(centerX, y, x, y, 'diagram-projection') + line(x, centerY, x, y, 'diagram-projection');
    svg += line(centerX, centerY, centerX, y, 'diagram-component') + line(centerX, centerY, x, centerY, 'diagram-component');
    svg += line(centerX, centerY, x, y, 'diagram-wind-vector', 'data-geometry="wind" marker-end="url(#diagram-arrow)"');
    svg += plane(centerX, centerY, -90);
    svg += text(411, 33, m.ready ? amount(m.windSpeed, 'kts') : '风速 —', 'diagram-label', 'end');
    svg += text(411, 51, m.ready ? '来向 ' + amount(m.angle, '°') : '来向 —', 'diagram-small', 'end');
    svg += text(27, 220, m.ready ? '外圈 ' + amount(max, 'kts') : '比例尺 —', 'diagram-small');
    return svg;
  }
  function altscale(m) {
    const base = m.ready ? m.base : 0, result = m.ready ? m.result : 0;
    let lo = Math.min(base, result, 0), hi = Math.max(base, result);
    if (!(hi - lo > 0)) hi = lo + 1;
    const span = niceMax((hi - lo) * 1.18);
    const X = 150, topY = 52, botY = 186;
    const yOf = v => botY - (v - lo) / span * (botY - topY);
    const yb = yOf(base), yr = yOf(result);
    let svg = grid();
    svg += text(40, 34, m.ready ? m.noteText : '—', 'diagram-label');
    svg += line(X, topY - 8, X, botY + 2, 'diagram-dimension');
    for (let i = 0; i <= 4; i++) {
      const val = lo + span * i / 4, y = yOf(val);
      svg += line(X - 5, y, X + 5, y, 'diagram-dimension') + text(X - 12, y + 3, format(val, 0), 'diagram-small', 'end');
    }
    svg += line(X, yb, 296, yb, 'diagram-guide');
    svg += dot(X, yb) + text(302, yb + 4, m.ready ? m.baseLabel : '—', 'diagram-small');
    const dotClass = m.hot ? 'diagram-dot-hot' : 'diagram-dot';
    const lineClass = m.hot ? 'diagram-hot-line' : 'diagram-cruise';
    svg += `<path class="diagram-route${m.hot ? ' diagram-hot-line' : ''}" data-geometry="altitude" d="M${X} ${yb}L${X} ${yr}" pathLength="1"/>`;
    svg += line(X, yr, 296, yr, lineClass);
    svg += `<circle cx="${X}" cy="${yr}" r="5" class="${dotClass}"/>` + text(302, yr + 4, m.ready ? m.resultLabel : '—', 'diagram-label');
    svg += text(X - 4, botY + 24, '高度 / ' + (m.unit || ''), 'diagram-small', 'end');
    return svg;
  }
  const drawers = { descent, vertical, timeline, journey, gauge, wind, altscale };
  function svg(m, motion = m) {
    const description = `${m.title}，${m.status}。${m.metrics.map(item => item.label + ' ' + item.value).join('，')}。${m.caption}`;
    return `<svg class="profile-svg dynamic-profile${m.ready ? ' is-ready' : ' is-empty'}" style="--diagram-ink: ${m.ready ? 1 : .25}; --diagram-shade: ${m.ready ? 1 : .4}" viewBox="0 0 440 242" role="img" aria-label="${escape(description)}" data-diagram="${m.cardId}"><defs><linearGradient id="diagram-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity=".025"/></linearGradient><marker id="diagram-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="m1 1 6 3-6 3" fill="none" stroke="var(--blue)" stroke-width="1.5"/></marker><marker id="diagram-arrow-soft" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="m1 1 6 3-6 3" fill="none" stroke="var(--diagram-teal)" stroke-width="1.5"/></marker></defs>${(drawers[m.kind] || descent)(m, motion)}</svg>`;
  }
  const animations = new WeakMap();
  const ambientContainers = new Set();
  let motionPreference, visibilityObserver;
  const numberPattern = /-?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?/gi;
  const animatedAttributes = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'd', 'transform', 'opacity', 'style', 'stroke-dasharray']);

  // Use rendered coordinates so adaptive axis changes cannot cause a jump.
  // An interrupted animation starts from the geometry currently on screen.
  function attributeTween(from, to, previous) {
    if (from === null || from === to || from.replace(numberPattern, '#') !== to.replace(numberPattern, '#')) return null;
    const a = (from.match(numberPattern) || []).map(Number);
    const b = (to.match(numberPattern) || []).map(Number);
    if (!a.length || a.length !== b.length || ![...a, ...b].every(Number.isFinite)) return null;
    return {
      positions: a, goals: b,
      velocities: a.map((_, i) => previous?.velocities[i] || 0),
      // SVG geometry does not need sub-pixel strings with 15 decimal places.
      value: () => { let i = 0; return to.replace(numberPattern, () => String(Number(a[i++].toFixed(4)))); }
    };
  }
  function effectMarkup() {
    return `<svg class="diagram-effects" viewBox="0 0 440 242" aria-hidden="true"><path class="diagram-route-scan" pathLength="1" stroke-dasharray="0 1" opacity="0"/><g class="diagram-target-rings"><circle r="8"/><circle r="16"/></g>${[0, 1, 2].map(() => '<g class="diagram-tracer"><path class="diagram-trail"/><circle class="diagram-tracer-glow" r="6"/><circle class="diagram-tracer-core" r="2"/></g>').join('')}</svg>`;
  }
  function collectEffects(container, kind) {
    return {
      route: container.querySelector(kind === 'gauge' ? '.diagram-gauge-fill' : '[data-geometry]'),
      scan: container.querySelector('.diagram-route-scan'),
      rings: [...container.querySelector('.diagram-target-rings').children],
      tracers: [...container.querySelectorAll('.diagram-tracer')].map(node => ({ node, trail: node.querySelector('path'), dots: [...node.querySelectorAll('circle')] })),
      routeLength: null,
      scanPath: null
    };
  }
  function stopAmbient(record) {
    if (record?.effectFrame) cancelAnimationFrame(record.effectFrame);
    if (record) { record.effectFrame = 0; record.effectTime = null; }
  }
  function startAmbient(container) {
    const record = animations.get(container);
    if (!record || !record.effects || record.effectFrame || !container.isConnected || document.hidden || record.inView === false || motionPreference.matches || (!record.ready && !record.frame) || (record.paused && !record.frame)) return;
    const step = now => {
      record.effectFrame = 0;
      if (animations.get(container) !== record || !container.isConnected) { ambientContainers.delete(container); return; }
      if (document.hidden || record.inView === false || motionPreference.matches) { record.effectTime = null; return; }
      const dt = record.effectTime === null ? 0 : Math.min(50, now - record.effectTime);
      record.effectTime = now;
      if (!record.paused) record.phase = (record.phase + dt / 4200) % 1;
      if (!record.paused) record.reveal = Math.min(1, record.reveal + dt / 1800);
      const { route, scan, rings, tracers } = record.effects;
      const total = record.frame ? route.getTotalLength() : (record.effects.routeLength ??= route.getTotalLength());
      const fraction = record.kind === 'gauge' ? Number(route.getAttribute('stroke-dasharray').split(' ')[0]) : 1;
      const point = t => route.getPointAtLength(total * fraction * clamp(t, 0, 1));
      // Reuse the source path instead of sampling 17 points into a new path each frame.
      const path = route.tagName.toLowerCase() === 'line'
        ? `M${route.getAttribute('x1')} ${route.getAttribute('y1')}L${route.getAttribute('x2')} ${route.getAttribute('y2')}`
        : route.getAttribute('d');
      if (path !== record.effects.scanPath) { scan.setAttribute('d', path); record.effects.scanPath = path; }
      if (record.reveal < 1) {
        const p = record.reveal;
        const extent = p * p * p * (p * (p * 6 - 15) + 10);
        scan.setAttribute('stroke-dasharray', `${extent * fraction} 1`);
      }
      scan.setAttribute('opacity', String(Math.sin(Math.PI * record.reveal) * .65));
      const end = point(1);
      rings[0].parentNode.setAttribute('transform', `translate(${end.x} ${end.y})`);
      rings.forEach((ring, i) => {
        const p = (record.phase * 2 + i * .5) % 1;
        ring.setAttribute('r', String(5 + p * 16));
        ring.setAttribute('opacity', String(Math.sin(Math.PI * p) ** 2 * .45));
      });
      tracers.forEach((tracer, i) => {
        const progress = (record.phase + i / 3) % 1;
        const t = record.kind === 'wind' ? 1 - progress : progress;
        const p = point(t), tail = point(t + (record.kind === 'wind' ? .045 : -.045));
        tracer.node.setAttribute('opacity', String(Math.sin(Math.PI * progress) ** 2));
        tracer.trail.setAttribute('d', `M${tail.x} ${tail.y}L${p.x} ${p.y}`);
        tracer.dots.forEach(dot => { dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); });
      });
      if ((record.ready && !record.paused) || record.frame) record.effectFrame = requestAnimationFrame(step);
      else record.effectTime = null;
    };
    record.effectFrame = requestAnimationFrame(step);
  }
  function setupMotion(container) {
    if (!motionPreference) {
      motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => ambientContainers.forEach(el => {
        const record = animations.get(el);
        if (!record) return;
        updatePlayback(el, record);
        if (motionPreference.matches) record.details?.forEach(animation => animation.cancel());
        if (document.hidden || motionPreference.matches) stopAmbient(record);
        else startAmbient(el);
      });
      motionPreference.addEventListener('change', update);
      document.addEventListener('visibilitychange', update);
      visibilityObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        const record = animations.get(entry.target);
        if (!record) return;
        record.inView = entry.isIntersecting;
        if (record.inView) startAmbient(entry.target); else stopAmbient(record);
      }));
    }
    ambientContainers.forEach(el => { if (!el.isConnected) { stopAmbient(animations.get(el)); visibilityObserver.unobserve(el); ambientContainers.delete(el); } });
    if (!ambientContainers.has(container)) { ambientContainers.add(container); visibilityObserver.observe(container); }
  }
  function render(container, next, animate = false) {
    setupMotion(container);
    const previous = animations.get(container);
    if (previous?.frame) cancelAnimationFrame(previous.frame);
    stopAmbient(previous);
    previous?.details?.forEach(animation => animation.cancel());
    const reducedMotion = motionPreference;
    const sameCard = previous?.cardId === next.cardId;
    const record = { cardId: next.cardId, kind: next.kind, ready: next.ready, model: next, frame: 0, channels: new Map(), phase: previous?.phase || 0, reveal: 1, paused: previous?.paused || false, inView: previous?.inView, effectFrame: 0, effectTime: null, effects: null };
    animations.set(container, record);
    container.dataset.state = next.ready ? 'ready' : 'empty';
    delete container.dataset.animating;
    // Preserve the canvas and SVG nodes across calculate, edit and reset.
    if (!sameCard) {
      container.innerHTML = `<div class="profile-heading"></div><div class="diagram-canvas"><div class="diagram-drawing"></div>${effectMarkup()}<span class="diagram-frame" aria-hidden="true"></span></div><div class="diagram-playback"><span class="diagram-motion-label"><i></i>动态示意</span><div><button type="button" class="diagram-pause" aria-pressed="false">暂停动效</button><button type="button" class="diagram-replay">↻ 重播</button></div></div><div class="diagram-metrics"></div><p class="diagram-caption"></p>`;
      container.querySelector('.diagram-pause').addEventListener('click', () => {
        const active = animations.get(container);
        active.paused = !active.paused;
        updatePlayback(container, active);
        if (active.paused) stopAmbient(active); else startAmbient(container);
      });
      container.querySelector('.diagram-replay').addEventListener('click', () => {
        const active = animations.get(container);
        active.paused = false;
        active.phase = 0;
        render(container, active.model, true);
      });
    }
    container.querySelector('.profile-heading').innerHTML = `<span>${escape(next.title)}</span><small class="diagram-sync${next.ready ? ' synced' : ''}">${escape(next.status)}</small>`;
    container.querySelector('.diagram-metrics').innerHTML = (next.metrics.length ? next.metrics : [metric('参数', '—'), metric('读数', '—'), metric('结果', '—')]).map(item => `<div${item.computed ? ' class="is-computed"' : ''}><span>${escape(item.label)}</span><strong title="${escape(item.value)}">${escape(item.value)}</strong></div>`).join('');
    container.querySelector('.diagram-caption').textContent = next.caption;
    updatePlayback(container, record);
    const canvas = container.querySelector('.diagram-drawing');
    const template = document.createElement('template');
    template.innerHTML = svg(next);
    const target = template.content.firstElementChild;
    const current = canvas.firstElementChild;
    if (!current || !sameCard) {
      canvas.replaceChildren(target);
      record.effects = collectEffects(container, record.kind);
      startAmbient(container);
      return;
    }
    record.effects = previous.effects;
    record.effects.routeLength = null;
    record.effects.scanPath = null;
    const tweens = [];
    const sourceNodes = [current, ...current.querySelectorAll('*')];
    const targetNodes = [target, ...target.querySelectorAll('*')];
    const shouldAnimate = animate && !reducedMotion.matches;
    // Drawers keep the same SVG structure, including hidden gauge markers.
    targetNodes.forEach((node, index) => {
      const source = sourceNodes[index];
      for (const { name, value } of node.attributes) {
        const key = `${index}:${name}`;
        const tween = shouldAnimate && animatedAttributes.has(name) ? attributeTween(source.getAttribute(name), value, previous?.channels.get(key)) : null;
        if (tween) { tweens.push({ source, name, value, tween }); record.channels.set(key, tween); }
        else if (source.getAttribute(name) !== value) source.setAttribute(name, value);
      }
      // Labels immediately describe the current result while its geometry settles.
      if (!node.children.length && source.textContent !== node.textContent) source.textContent = node.textContent;
    });
    if (shouldAnimate && next.ready) animateDetails(container, record);
    if (!tweens.length) { startAmbient(container); return; }
    container.dataset.animating = 'true';
    let last = performance.now(), elapsed = 0;
    // Give the 0→1 reveal room to breathe while keeping a soft, bounce-free landing.
    const omega = next.ready ? 8 : 9.5;
    const step = now => {
      if (!container.isConnected || animations.get(container) !== record) return;
      const dt = Math.max(0, Math.min((now - last) / 1000, .05));
      last = now; elapsed += dt;
      let settled = true;
      // Analytic critically damped springs retain velocity when retargeted.
      // They are independent of display refresh rate and do not bounce past results.
      for (const { source, name, tween } of tweens) {
        tween.positions.forEach((position, i) => {
          const offset = position - tween.goals[i], velocity = tween.velocities[i];
          const c = velocity + omega * offset, decay = Math.exp(-omega * dt);
          tween.positions[i] = tween.goals[i] + (offset + c * dt) * decay;
          tween.velocities[i] = (velocity - omega * c * dt) * decay;
          if (Math.abs(tween.positions[i] - tween.goals[i]) > .001 || Math.abs(tween.velocities[i]) > .01) settled = false;
        });
        source.setAttribute(name, tween.value());
      }
      if (!reducedMotion.matches && !settled && elapsed < 2.4) record.frame = requestAnimationFrame(step);
      else {
        for (const { source, name, value } of tweens) source.setAttribute(name, value);
        record.channels.clear(); record.frame = 0; delete container.dataset.animating;
      }
    };
    record.frame = requestAnimationFrame(step);
    startAmbient(container);
  }
  function updatePlayback(container, record) {
    const pause = container.querySelector('.diagram-pause');
    pause.textContent = record.paused ? '继续流动' : '暂停流动';
    pause.setAttribute('aria-pressed', String(record.paused));
    pause.disabled = !record.ready || motionPreference.matches;
    container.querySelector('.diagram-replay').disabled = !record.ready || motionPreference.matches;
    container.querySelector('.diagram-motion-label').lastChild.textContent = motionPreference.matches ? '静态示意' : record.paused ? '示意已暂停' : '动态示意';
    container.dataset.paused = String(record.paused);
  }
  function animateDetails(container, record) {
    record.details = [];
    const groups = [container.querySelectorAll('.diagram-label, .diagram-angle, .diagram-gauge-value'), container.querySelectorAll('.diagram-metrics > div')];
    groups.forEach((nodes, group) => nodes.forEach((node, i) => {
      record.details.push(node.animate([{ opacity: .2, translate: `0 ${group ? 6 : 3}px` }, { opacity: 1, translate: '0 0' }], { duration: 850, delay: 80 + i * 55 + group * 60, fill: 'backwards', easing: 'cubic-bezier(.45, 0, .15, 1)' }));
    }));
    record.details.push(container.querySelector('.diagram-frame').animate([{ opacity: .8 }, { opacity: .25 }], { duration: 1100, easing: 'cubic-bezier(.45, 0, .15, 1)' }));
    record.reveal = 0;
  }
  const api = { model, svg, render, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FlightDiagrams = api;
})(globalThis);
