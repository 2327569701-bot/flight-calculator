/* Data-driven SVG diagrams. Models use the same completed calculation snapshot as the result card. */
(function (root) {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const radians = degrees => degrees / 180 * Math.PI;
  const format = (value, digits = 1) => {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1e7 || (value !== 0 && Math.abs(value) < .01)) return value.toExponential(1);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
  };
  const amount = (value, unit = '', digits = 1) => `${format(value, digits)}${unit ? ' ' + unit : ''}`;
  const metric = (label, value, unit = '', computed = false) => ({ label, value: typeof value === 'number' ? amount(value, unit) : value, computed });
  const titles = { g1: '下滑剖面', g2: '下滑剖面', v1: '下降矢量', t1: '下降规划', t2: '距 TOD 时间轴', r1: '航程关系', vapp1: '进近速度仪表', vapp2: '风分量矢量', vapp3: 'VREF 参考仪表' };
  const types = { g1: 'descent', g2: 'descent', v1: 'vertical', t1: 'descent', t2: 'timeline', r1: 'journey', vapp1: 'gauge', vapp2: 'wind', vapp3: 'gauge' };

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
    const rise = 12 + 116 * angle / (angle + 2);
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
    const endY = y + 24 + 98 * angle / (angle + 3);
    const arrowY = 102 + 69 * (rate / (rate + 1000));
    let svg = grid();
    svg += `<path class="diagram-area" d="M${x} ${y}H${right}V${endY}Z"/>`;
    svg += line(x, y, right, y, 'diagram-vector', 'marker-end="url(#diagram-arrow)"');
    svg += line(right, y, right, arrowY, 'diagram-vector diagram-secondary-vector', 'marker-end="url(#diagram-arrow-soft)"');
    svg += `<path class="diagram-route" data-geometry="slope" d="M${x} ${y}L${right} ${endY}" pathLength="1"/>`;
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
    const end = m.ready ? 55 + clamp(motion.minutes / max, 0, 1) * 330 : 320;
    let svg = grid();
    svg += line(55, 105, 395, 105, 'diagram-track');
    svg += `<path class="diagram-route" data-geometry="timeline" d="M55 105H${end}" pathLength="1"/>`;
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
    const x = m.ready ? 63 + 318 * clamp(motion.minutes / maxTime, 0, 1) : 338;
    const y = m.ready ? 182 - 132 * clamp(motion.distance / maxDistance, 0, 1) : 65;
    let svg = grid();
    svg += `<path class="diagram-area" d="M63 182L${x} ${y}V182Z"/>`;
    svg += line(63, 29, 63, 182, 'diagram-dimension') + line(63, 182, 403, 182, 'diagram-dimension');
    svg += `<path class="diagram-route" data-geometry="journey" d="M63 182L${x} ${y}" pathLength="1"/>`;
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
    const fraction = m.ready ? clamp(motion.speed / max, 0, 1) : .5;
    const end = point(fraction);
    if (m.ready && fraction > 0) svg += `<path class="diagram-gauge-fill" d="M126 161A94 94 0 0 1 ${end.x} ${end.y}"/>`;
    for (let i = 0; i <= 20; i++) {
      const outer = point(i / 20, i % 5 === 0 ? 111 : 107), inner = point(i / 20, 101);
      svg += line(inner.x, inner.y, outer.x, outer.y, 'diagram-tick');
      if (i % 5 === 0) { const label = point(i / 20, 128); svg += text(label.x, label.y + 4, m.ready ? format(max / 20 * i, 0) : '—', '', 'middle'); }
    }
    if (m.ready && m.reference !== null) {
      const ref = point(clamp(m.reference / max, 0, 1));
      svg += `<circle cx="${ref.x}" cy="${ref.y}" r="5" class="diagram-reference-dot"><title>VREF ${escape(amount(m.reference, 'kts'))}</title></circle>`;
    }
    const needle = point(fraction, 68);
    svg += line(220, 161, needle.x, needle.y, 'diagram-needle', 'data-geometry="needle"') + dot(220, 161);
    svg += text(220, 199, (m.gaugeLabel || (m.cardId === 'vapp1' ? 'VAPP' : 'VREF')) + ' · ' + (m.ready ? amount(m.speed, 'kts') : '—'), 'diagram-gauge-value', 'middle');
    svg += text(220, 227, m.cardId === 'vapp1' ? '○ VREF 参考点   /   指针：VAPP' : '指针：当前重量与襟翼对应的 VREF', 'diagram-small', 'middle');
    return svg;
  }
  function wind(m, motion) {
    const centerX = 220, centerY = 120, radius = 77;
    const angle = radians(m.ready ? motion.angle : 30);
    const max = niceMax(m.ready ? m.windSpeed : 20);
    const length = m.ready ? radius * clamp(motion.windSpeed / max, 0, 1) : 55;
    const x = centerX + Math.sin(angle) * length, y = centerY - Math.cos(angle) * length;
    let svg = `<circle cx="220" cy="120" r="77" class="diagram-compass"/><circle cx="220" cy="120" r="39" class="diagram-compass diagram-compass-inner"/>`;
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
  const drawers = { descent, vertical, timeline, journey, gauge, wind };
  function svg(m, motion = m) {
    const description = `${m.title}，${m.status}。${m.metrics.map(item => item.label + ' ' + item.value).join('，')}。${m.caption}`;
    return `<svg class="profile-svg dynamic-profile${m.ready ? ' is-ready' : ' is-empty'}" viewBox="0 0 440 242" role="img" aria-label="${escape(description)}" data-diagram="${m.cardId}"><defs><linearGradient id="diagram-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity=".025"/></linearGradient><marker id="diagram-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="m1 1 6 3-6 3" fill="none" stroke="var(--blue)" stroke-width="1.5"/></marker><marker id="diagram-arrow-soft" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="m1 1 6 3-6 3" fill="none" stroke="var(--diagram-teal)" stroke-width="1.5"/></marker></defs>${(drawers[m.kind] || descent)(m, motion)}</svg>`;
  }
  const animations = new WeakMap();
  const numericFields = ['angle', 'rate', 'minutes', 'distance', 'speed', 'windSpeed'];
  function render(container, next, animate = false) {
    const previous = animations.get(container);
    if (previous?.frame) cancelAnimationFrame(previous.frame);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const before = previous?.lastValid;
    // Keep the last valid geometry only for tweening; edited/invalid states never display old data.
    const from = before?.ready && before.cardId === next.cardId ? before : null;
    const record = { lastValid: next.ready ? next : before, frame: 0 };
    animations.set(container, record);
    container.dataset.state = next.ready ? 'ready' : 'empty';
    container.innerHTML = `<div class="profile-heading"><span>${escape(next.title)}</span><small class="diagram-sync${next.ready ? ' synced' : ''}">${escape(next.status)}</small></div><div class="diagram-canvas">${svg(next)}</div><div class="diagram-metrics">${(next.metrics.length ? next.metrics : [metric('参数', '—'), metric('读数', '—'), metric('结果', '—')]).map(item => `<div${item.computed ? ' class="is-computed"' : ''}><span>${escape(item.label)}</span><strong title="${escape(item.value)}">${escape(item.value)}</strong></div>`).join('')}</div><p class="diagram-caption">${escape(next.caption)}</p>`;
    const canvas = container.querySelector('.diagram-canvas');
    if (!animate || !next.ready || reducedMotion.matches) return;
    if (!from) {
      canvas.classList.add('diagram-reveal');
      return;
    }
    let start;
    const step = now => {
      if (!container.isConnected || animations.get(container) !== record) return;
      start ??= now;
      const progress = reducedMotion.matches ? 1 : Math.min((now - start) / 550, 1);
      const eased = 1 - (1 - progress) ** 3;
      const motion = { ...next };
      numericFields.forEach(key => {
        if (Number.isFinite(from[key]) && Number.isFinite(next[key])) motion[key] = from[key] * (1 - eased) + next[key] * eased;
      });
      canvas.innerHTML = svg(next, motion);
      if (progress < 1) record.frame = requestAnimationFrame(step);
    };
    record.frame = requestAnimationFrame(step);
  }
  const api = { model, svg, render, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FlightDiagrams = api;
})(globalThis);
