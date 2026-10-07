/* UI for the desktop and browser entry points. Calculator formulas stay in calculator-data.js. */
'use strict';

const ICONS = {
  plane: '<path d="m21 3-6 18-4-8-8-4 18-6Z"/><path d="m11 13 5-5"/>',
  glide: '<path d="M4 5v14h16M6 7l13 9M15 16h4v-4"/>',
  vs: '<path d="M8 3v18m-4-4 4 4 4-4M16 3v18m-4-14 4-4 4 4"/>',
  tod: '<path d="M3 6h7l9 11M14 17h5v-5M3 21h18"/>',
  tri: '<path d="m4 19 8-14 8 14H4Z"/><path d="M9 19v-4H6"/>',
  vapp: '<path d="M4 17a9 9 0 1 1 16 0M12 13l5-5M4 13h2m12 0h2M12 4v2"/><circle cx="12" cy="13" r="2"/>',
  manual: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  settings: '<path d="m9 3-.5 3-2 1.2L4 6l-2 3 2.5 2v2L2 15l2 3 2.5-1.2 2 1.2.5 3h4l.5-3 2-1.2L18 18l2-3-2.5-2v-2L20 9l-2-3-2.5 1.2-2-1.2-.5-3H9Z"/><circle cx="11" cy="12" r="3"/>',
  sliders: '<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  moon: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3"/><path d="M3.5 4.5V8H7"/><path d="M12 8v4l3 2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 21h16"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="6" y="13" width="12" height="8" rx="1"/><path d="M6 16H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/>'
};
const META = {
  glide: { title: '下滑角计算', short: '下滑角', en: 'DESCENT & APPROACH', tag: 'GLIDE', desc: '把握每一段下降，让进近更从容。', modes: ['计算下滑角', '反算水平距离'], labels: ['所需下滑角', '所需水平距离'], note: '输入高度差与水平距离，估算下滑角；也可以通过目标下滑角反算距离。' },
  vs: { title: '垂直速度', short: '垂直速度', en: 'VERTICAL SPEED', tag: 'V/S', desc: '结合地速与下滑角，规划平稳的下降率。', modes: ['计算垂直速度'], labels: ['目标垂直速度'], note: '使用地速与目标下滑角进行计算。图中的飞行剖面仅用于说明参数关系。' },
  tod: { title: '下降顶点', short: '下降顶点', en: 'TOP OF DESCENT', tag: 'TOD', desc: '提前规划下降距离，把握开始下降的时机。', modes: ['计算 TOD 距离', '计算下降时机'], labels: ['开始下降的距离', '距开始下降的时间'], note: '先根据高度差估算下降距离，再结合地速计算抵达下降顶点所需的时间。' },
  tri: { title: '速度 · 距离 · 时间', short: '三角计算', en: 'SPEED, DISTANCE & TIME', tag: 'SDT', desc: '已知任意两项，轻松求出第三项。', modes: ['三角计算'], labels: ['计算结果'], note: '输入速度、距离、时间中的任意两项，并将需要计算的一项留空。时间以分钟为单位。' },
  atmo: { title: '大气 · 空速', short: '大气·空速', en: 'ATMOSPHERE & AIRSPEED', tag: 'ATMO', desc: '压力高度、密度高度与真实空速，把天气与高度换算清楚。', modes: ['压力高度', '密度高度', '真实空速'], labels: ['压力高度', '密度高度', '真实空速'], note: '压力高度由 QNH 与机场标高求得；密度高度按 ISA 偏差估算（约每 °C 119 ft）；真实空速采用每千英尺约 2% 的经验修正、忽略压缩性，仅供模拟飞行参考。' },
  vapp: { title: '进近速度', short: '进近速度', en: 'APPROACH SPEED', tag: 'VAPP', desc: '集中查看进近速度、风分量与 VREF 参考值。', modes: ['VAPP', '风分量', 'VREF'], labels: ['目标进近速度', '风分量', 'VREF 参考值'], note: '当前计算模型为 B737-800。输入参数后，可结合下方已有手册摘录查看计算说明。' },
  manual: { title: '飞行手册', short: '飞行手册', en: 'FLIGHT LIBRARY', tag: 'FCOM', desc: '常用参考随手可查，专注每一个飞行阶段。' },
  history: { title: '历史记录', short: '历史记录', en: 'CALCULATION HISTORY', tag: 'HIST', desc: '本次飞行算过的内容都在这里，可复制、导出或打印。' }
};
const INPUT_HINTS = {
  alt1: ['例如 3000', '当前位置与目标位置的高度差'], dist1: ['例如 10', '沿地面的水平距离'], alt2: ['例如 3000', '当前位置与目标位置的高度差'],
  angle1: ['例如 3', '输入计划采用的下滑角'], gs1: ['例如 140', '飞机相对地面的速度'], angle2: ['例如 3', '输入计划采用的下滑角'],
  alt3: ['例如 30000', '巡航高度与目标高度之差'], angle3: ['例如 3', '可根据计划调整下降角'], dist2: ['例如 90', '距离下降顶点的剩余航程'],
  gs2: ['例如 450', '用于估算飞行时间的地速'], spd: ['输入速度', ''], dst: ['输入距离', ''], tme: ['输入分钟数', '将需要计算的一项留空'],
  qnh: ['例如 1013', '修正海平面气压（altimeter setting）'], qnhu: ['', '在 hPa 与美制 inHg 之间切换'], felev: ['例如 1500', '机场场面的海拔高度'],
  palta: ['例如 5000', '由 QNH 与标高算出的压力高度'], oat: ['例如 25', '机场或当前高度的外界气温'],
  ias: ['例如 140', '空速表指示速度（校准空速）'], paltas: ['例如 30000', '计划飞行高度对应的压力高度'],
  vref: ['例如 135', ''], wind: ['例如 10', ''], gust: ['例如 0', ''], winds: ['例如 15', ''], wangle: ['例如 30', '相对跑道方向的夹角'], wght: ['输入飞机重量', '']
};
const fixedUnits = { angle1: '°', angle2: '°', angle3: '°', wangle: '°', tme: 'min', oat: '°C', vref: 'kts', wind: 'kts', gust: 'kts', winds: 'kts' };
const state = { section: 'glide', modes: {}, drafts: {}, results: {}, settings: null, pdfUrl: null, pdfName: '' };
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function currentSection() { return CALCULATOR_SECTIONS.find(s => s.id === state.section); }
function currentCard() { return currentSection().cards[state.modes[state.section] || 0]; }
function unitName(config = UnitSystem.current) { return ({ metric: '公制单位', imperial: '英制单位', mixed: '混合单位', custom: '自定义单位' })[config.id] || '自定义单位'; }
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
// ---------- V3 calculation history & export ----------
const HISTORY_KEY = '_flight_calc_history';
const HISTORY_MAX = 50;
function loadHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function persistHistory(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) { /* storage unavailable */ }
}
function formatInputs(card, data) {
  return card.inputs.map(input => {
    const label = input.label.replace(/\s*\((kts|min|°C)\)/g, '');
    if (input.type === 'select') {
      const idx = input.vals.indexOf(data[input.id]);
      const shown = idx >= 0 ? input.opts[idx] : data[input.id];
      return shown ? `${label} ${shown}` : null;
    }
    const v = data[input.id];
    if (v === null || v === undefined || v === '') return null;
    let u = fixedUnits[input.id] || input.unit || UnitSystem.getLabel(input.type);
    // A select marked controlsUnit determines the displayed unit of this number field.
    const controller = card.inputs.find(item => item.type === 'select' && item.controlsUnit === input.id);
    if (controller) {
      const ci = controller.vals.indexOf(data[controller.id]);
      if (ci >= 0) u = controller.opts[ci];
    }
    return `${label} ${v}${u ? ' ' + u : ''}`;
  }).filter(Boolean).join(' · ');
}
function recordHistory(card, data, result) {
  const section = currentSection();
  const mode = state.modes[section.id] || 0;
  const inputsText = formatInputs(card, data);
  const resultText = result.val + (result.unit ? ' ' + result.unit : '');
  const signature = card.id + '|' + JSON.stringify(data) + '|' + result.val;
  const arr = loadHistory();
  if (arr.length && arr[0].signature === signature) arr[0].t = Date.now();
  else arr.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: Date.now(),
    section: section.id,
    card: card.id,
    title: META[section.id].short,
    mode: META[section.id].modes[mode],
    inputs: inputsText,
    result: resultText,
    signature
  });
  persistHistory(arr.slice(0, HISTORY_MAX));
}
function entryPlainText(e) {
  return `【${e.title} · ${e.mode}】${new Date(e.t).toLocaleString()}\n输入：${e.inputs || '—'}\n结果：${e.result}`;
}
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}
function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function historyJSON(arr) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: arr.length,
    entries: arr.map(e => ({ time: new Date(e.t).toISOString(), calculator: e.title, mode: e.mode, inputs: e.inputs, result: e.result }))
  }, null, 2);
}
function csvCell(v) {
  v = String(v == null ? '' : v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function historyCSV(arr) {
  const head = ['时间', '计算器', '模式', '输入', '结果'];
  const rows = arr.map(e => [new Date(e.t).toLocaleString(), e.title, e.mode, e.inputs, e.result].map(csvCell).join(','));
  return '﻿' + head.join(',') + '\n' + rows.join('\r\n');
}
function historyReportHTML(arr) {
  const items = arr.map(e => `<div class="print-entry"><div><strong>${escapeHtml(e.title)} · ${escapeHtml(e.mode)}</strong><span>${new Date(e.t).toLocaleString()}</span></div><div class="print-inputs">${escapeHtml(e.inputs || '—')}</div><div class="print-result">${escapeHtml(e.result)}</div></div>`).join('');
  return `<h2>Flight Calculator · 计算记录</h2><p>导出时间：${new Date().toLocaleString()} · 共 ${arr.length} 条</p>${items}`;
}
function printHistory() {
  const arr = loadHistory();
  if (!arr.length) { toast('没有可打印的记录'); return; }
  const report = $('printReport');
  report.innerHTML = historyReportHTML(arr);
  document.body.dataset.printing = '1';
  const cleanup = () => { document.body.dataset.printing = ''; report.innerHTML = ''; window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 1500); // fallback if afterprint does not fire
}
function renderHistoryPage() {
  const meta = META.history;
  const arr = loadHistory();
  let html = `<div class="page-heading"><div><span class="eyebrow">${meta.en}</span><h1>${meta.title}</h1><p class="page-description">${meta.desc}</p></div><div class="section-symbol">${icon('history')}</div></div>`;
  html += `<div class="history-toolbar panel">
      <button class="button button-secondary" id="histCopyAll">${icon('copy')}全部复制</button>
      <button class="button button-secondary" id="histExportJSON">${icon('download')}导出 JSON</button>
      <button class="button button-secondary" id="histExportCSV">${icon('download')}导出 CSV</button>
      <button class="button button-secondary" id="histPrint">${icon('print')}打印</button>
      <button class="button button-secondary danger" id="histClear">${icon('trash')}清空</button>
    </div>`;
  if (!arr.length) {
    html += `<section class="panel history-empty">${icon('history')}<h2>还没有计算记录</h2><p>完成任意一次计算后，结果会自动保存在这里，方便你回顾、复制或导出。</p></section>`;
  } else {
    html += `<div class="history-list">` + arr.map(e => `<section class="panel history-entry" data-id="${e.id}">
        <div class="history-main">
          <div class="history-head"><strong>${escapeHtml(e.title)}</strong><span class="history-mode">${escapeHtml(e.mode)}</span><span class="history-time">${escapeHtml(new Date(e.t).toLocaleString())}</span></div>
          <div class="history-inputs">${escapeHtml(e.inputs || '—')}</div>
        </div>
        <div class="history-result">${escapeHtml(e.result)}</div>
        <div class="history-actions">
          <button class="icon-button" data-hist="copy" title="复制这条" aria-label="复制这条"><span data-icon="copy"></span></button>
          <button class="icon-button" data-hist="delete" title="删除这条" aria-label="删除这条"><span data-icon="trash"></span></button>
        </div>
      </section>`).join('') + `</div>`;
  }
  $('main').innerHTML = html;
  hydrateIcons($('main'));
  const refresh = () => renderHistoryPage();
  $('histCopyAll')?.addEventListener('click', async () => {
    const text = loadHistory().map(entryPlainText).join('\n\n----------\n\n');
    toast((await copyText(text)) ? '已复制全部记录' : '复制失败，请手动选择文本');
  });
  $('histExportJSON')?.addEventListener('click', () => { downloadFile('flight-calculator-history.json', 'application/json', historyJSON(loadHistory())); toast('已导出 JSON'); });
  $('histExportCSV')?.addEventListener('click', () => { downloadFile('flight-calculator-history.csv', 'text/csv;charset=utf-8', historyCSV(loadHistory())); toast('已导出 CSV'); });
  $('histPrint')?.addEventListener('click', printHistory);
  $('histClear')?.addEventListener('click', () => {
    if (!loadHistory().length) return;
    persistHistory([]); refresh(); toast('历史已清空');
  });
  document.querySelectorAll('.history-entry').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-hist="copy"]').addEventListener('click', async () => {
      const e = loadHistory().find(x => x.id === id);
      toast(e && (await copyText(entryPlainText(e))) ? '已复制该条记录' : '复制失败');
    });
    row.querySelector('[data-hist="delete"]').addEventListener('click', () => {
      persistHistory(loadHistory().filter(x => x.id !== id)); refresh(); toast('已删除该条记录');
    });
  });
}

function renderNav() {
  const items = CALCULATOR_SECTIONS.map((section, i) => `${i === 5 ? '<div class="nav-divider"></div>' : ''}<a class="nav-item${state.section === section.id ? ' active' : ''}" href="#${section.id}" ${state.section === section.id ? 'aria-current="page"' : ''} title="${META[section.id].short}">${icon(section.id)}<span class="nav-label">${META[section.id].short}</span><span class="nav-en">${META[section.id].tag}</span></a>`).join('');
  const historyItem = `<div class="nav-divider"></div><a class="nav-item${state.section === 'history' ? ' active' : ''}" href="#history" ${state.section === 'history' ? 'aria-current="page"' : ''} title="历史记录">${icon('history')}<span class="nav-label">历史记录</span><span class="nav-en">HIST</span></a>`;
  $('nav').innerHTML = items + historyItem;
  $('breadcrumbCurrent').textContent = META[state.section].short;
  $('unitSummary').textContent = unitName();
}
function fieldMarkup(input, card) {
  const id = `${card.id}-${input.id}`;
  const saved = state.drafts[card.id]?.[input.id] ?? input.def ?? '';
  const label = input.label.replace(/\s*\((kts|min)\)/g, '');
  const hint = INPUT_HINTS[input.id] || ['', ''];
  const unit = fixedUnits[input.id] || input.unit || (input.type !== 'select' ? UnitSystem.getLabel(input.type) : '');
  const labelId = `${id}-label`;
  const help = hint[1] ? `<p class="input-help" id="${id}-help">${hint[1]}</p>` : '';
  let control;
  if (input.type === 'select') {
    control = `<select id="${id}" name="${input.id}" class="form-select">${input.opts.map((option, i) => `<option value="${input.vals[i]}"${String(saved) === input.vals[i] ? ' selected' : ''}>${option || '选择风向'}</option>`).join('')}</select>`;
  } else {
    control = `<div class="input-wrap"><input id="${id}" name="${input.id}" type="number" step="any" inputmode="decimal" placeholder="${hint[0]}" value="${escapeHtml(saved)}" ${unit ? `aria-describedby="${id}-unit${hint[1] ? ' ' + id + '-help' : ''}"` : ''}><span class="input-unit" id="${id}-unit">${unit}</span></div>`;
  }
  return `<div class="form-group"><label class="form-label" id="${labelId}" for="${id}">${label}</label>${control}${help}</div>`;
}
function referenceMarkup(open = false) {
  return `<details class="manual-reference"${open ? ' open' : ''}><summary>手册参考 · B737-800 进近速度</summary><div class="manual-content">${MANUAL_CONTENT}</div></details>`;
}
function renderMain() {
  if (state.section === 'history') { renderHistoryPage(); return; }
  const meta = META[state.section];
  const section = currentSection();
  const card = currentCard();
  const mode = state.modes[state.section] || 0;
  let html = `<div class="page-heading"><div><span class="eyebrow">${meta.en}</span><h1>${meta.title}</h1><p class="page-description">${meta.desc}</p></div><div class="section-symbol">${icon(state.section)}</div></div>`;
  if (state.section === 'manual') {
    html += `<section class="panel library-panel"><div class="book-cover"><strong>FCOM</strong>${icon('plane')}<small>FLIGHT CREW<br>OPERATIONS MANUAL</small></div><div class="library-copy"><h2>你的飞行参考资料</h2><p>导入本地 PDF，在工作台中查阅完整手册。项目未附带完整的 FCOM 文件，下方可查看已有参考摘录。</p><button class="button button-primary" id="importPdf">${icon('upload')}导入本地 PDF</button>${state.pdfUrl ? '<button class="button button-secondary" id="reopenPdf">继续阅读</button>' : ''}<div class="library-note">${icon('lock').replace('<svg ', '<svg width="12" height="12" style="vertical-align:middle;margin-right:5px" ')}${state.pdfName ? escapeHtml(state.pdfName) : '文件仅在本机打开，无需上传'}</div></div></section>` + referenceMarkup(true);
    $('main').innerHTML = html;
    $('importPdf').addEventListener('click', () => $('pdfFile').click());
    $('reopenPdf')?.addEventListener('click', () => $('pdfDialog').showModal());
    return;
  }
  html += `<div class="mode-bar"><div class="mode-tabs" role="tablist" aria-label="计算方式">${section.cards.map((c, i) => `<button class="mode-tab" role="tab" id="mode-${c.id}" aria-selected="${i === mode}" aria-controls="calculatorPanel" tabindex="${i === mode ? 0 : -1}" data-mode="${i}">${meta.modes[i]}</button>`).join('')}</div><span class="mode-hint">${icon('sliders')}${UnitSystem.getLabel('altitude')} / ${UnitSystem.getLabel('distance')} / ${UnitSystem.getLabel('speed')}</span></div>`;
  html += `<div id="calculatorPanel" role="tabpanel" aria-labelledby="mode-${card.id}" class="calculator-workspace"><form class="panel input-panel" id="calculatorForm" novalidate><div class="panel-heading">${icon('sliders')}<h2>输入参数</h2><span class="panel-kicker">PARAMETERS</span></div><div class="fields">${card.inputs.map(input => fieldMarkup(input, card)).join('')}</div><div class="form-actions"><button class="button button-primary calculate-button" type="submit">${card.btn}${icon('arrow')}</button><div class="input-caption"><span><kbd>↵</kbd> 回车计算</span><button type="button" class="text-button" id="resetInputs">${icon('reset')}重置输入</button></div></div></form><section class="panel result-panel" aria-label="计算结果"><div class="profile-visual" id="flightDiagram"></div><div class="result-content" id="resultContent" aria-live="polite" aria-atomic="true"></div></section></div>`;
  html += `<aside class="context-strip">${icon('info')}<div><strong>${state.section === 'tri' ? '两个已知条件，一个答案' : '计算小提示'}</strong><p>${meta.note}</p></div><span class="context-tag">${meta.tag}</span></aside>`;
  if (section.manual) html += referenceMarkup();
  $('main').innerHTML = html;
  renderResult();
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => changeMode(Number(button.dataset.mode)));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const total = section.cards.length;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? total - 1 : (mode + (event.key === 'ArrowRight' ? 1 : -1) + total) % total;
      changeMode(next);
    });
  });
  $('calculatorForm').addEventListener('submit', event => { event.preventDefault(); calculate(); });
  $('calculatorForm').addEventListener('input', () => { captureDraft(); delete state.results[card.id]; renderResult(true); });
  $('resetInputs').addEventListener('click', () => {
    delete state.drafts[card.id]; delete state.results[card.id];
    card.inputs.forEach(input => {
      const field = $(`${card.id}-${input.id}`);
      field.value = input.def ?? (input.type === 'select' ? input.vals[0] : '');
      field.removeAttribute('aria-invalid');
    });
    renderResult(true);
    $('calculatorForm').querySelector('input, select')?.focus();
  });
  // A select can drive the unit suffix shown on a related numeric input.
  card.inputs.forEach(input => {
    if (input.type !== 'select' || !input.controlsUnit) return;
    const select = $(`${card.id}-${input.id}`);
    const targetInput = card.inputs.find(item => item.id === input.controlsUnit);
    const unitSpan = targetInput && $(`${card.id}-${targetInput.id}-unit`);
    if (!unitSpan) return;
    const sync = () => { unitSpan.textContent = select.options[select.selectedIndex].textContent; };
    sync();
    select.addEventListener('change', sync);
  });
}
function captureDraft() {
  if (!$('calculatorForm')) return;
  const card = currentCard();
  state.drafts[card.id] = {};
  card.inputs.forEach(input => { state.drafts[card.id][input.id] = $(`${card.id}-${input.id}`).value; });
}
function changeMode(mode) {
  captureDraft(); state.modes[state.section] = mode; renderMain();
  document.querySelector('[role="tab"][aria-selected="true"]').focus();
}
function renderResult(animate = false) {
  const card = currentCard();
  const result = state.results[card.id];
  FlightDiagrams.render($('flightDiagram'), FlightDiagrams.model(card.id, result, UnitSystem), animate);
  const label = META[state.section].labels[state.modes[state.section] || 0];
  let value = '—', unit = '', message = '输入参数后，计算结果将在这里显示。', status = '等待计算', statusClass = '', valueClass = 'empty';
  if (result) {
    if (result.ok) {
      value = String(result.val); unit = result.unit || '';
      if (value.endsWith('°')) { value = value.slice(0, -1); unit = '°'; }
      message = [result.advice, result.detail].filter(Boolean).join(' · ');
      status = '计算完成'; statusClass = 'complete'; valueClass = '';
    } else { message = result.msg; status = '请检查输入'; statusClass = 'error'; }
  }
  $('resultContent').innerHTML = `<div class="result-topline"><span class="result-label">${label}</span><span class="result-status ${statusClass}">${status}</span></div><div class="result-number"><span class="result-value ${valueClass}">${escapeHtml(value)}</span><span class="result-unit">${escapeHtml(unit)}</span></div><div class="result-advice">${icon(result?.ok ? 'check' : 'info')}<span>${escapeHtml(message)}</span></div>`;
}
function calculate() {
  const card = currentCard();
  captureDraft();
  const data = {};
  let invalidField = null;
  card.inputs.forEach(input => {
    const field = $(`${card.id}-${input.id}`);
    field.removeAttribute('aria-invalid');
    if (input.type === 'select') { data[input.id] = field.value; return; }
    const value = field.value === '' ? null : Number(field.value);
    data[input.id] = value;
    if (field.validity.badInput || (value !== null && !Number.isFinite(value))) invalidField = field;
  });
  let result;
  if (invalidField) {
    invalidField.setAttribute('aria-invalid', 'true'); invalidField.focus();
    result = { ok: false, msg: '请输入有效的数字。' };
  } else if (card.id === 'r1' && Object.values(data).filter(v => v !== null && v > 0).length === 3) {
    result = { ok: false, msg: '请只填写两项，将需要计算的一项留空。' };
  } else {
    result = card.fn(data) || { ok: false, msg: '请检查输入参数。' };
  }
  state.results[card.id] = { ...result, inputs: { ...data } };
  if (result.ok) recordHistory(card, data, result);
  renderResult(true);
  if (window.matchMedia('(max-width: 650px)').matches) $('flightDiagram').scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function navigate() {
  const id = location.hash.slice(1);
  if (id === 'main' && $('main').childElementCount) return;
  captureDraft();
  state.section = META[id] ? id : 'glide';
  renderNav(); renderMain();
}
function openSettings() {
  state.settings = JSON.parse(JSON.stringify(UnitSystem.current));
  renderSettings(); $('settingsDialog').showModal();
}
function renderSettings() {
  $('settingsPresets').innerHTML = UnitSystem.getPresets().map(preset => `<button type="button" class="preset-button" aria-pressed="${state.settings.id === preset.id}" data-preset="${preset.id}">${preset.name}</button>`).join('');
  const names = { distance: '距离', speed: '速度', altitude: '高度', verticalSpeed: '垂直速度', weight: '重量' };
  $('settingsUnits').innerHTML = Object.entries(names).map(([type, name]) => `<div class="unit-row"><label for="setting-${type}">${name}</label><select id="setting-${type}" data-unit="${type}">${UnitSystem.getOptions(type).map(option => `<option value="${option.value}"${state.settings[type] === option.value ? ' selected' : ''}>${option.label}</option>`).join('')}</select></div>`).join('');
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    state.settings = JSON.parse(JSON.stringify(UnitSystem.PRESETS[button.dataset.preset])); renderSettings();
    document.querySelector(`[data-preset="${state.settings.id}"]`).focus();
  }));
  document.querySelectorAll('[data-unit]').forEach(select => select.addEventListener('change', () => {
    state.settings[select.dataset.unit] = select.value; state.settings.id = 'custom';
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  }));
}
function applySettings(event) {
  event.preventDefault();
  captureDraft();
  const previous = UnitSystem.current;
  // Convert retained input values to the new units so their physical meaning stays the same.
  CALCULATOR_SECTIONS.forEach(section => section.cards.forEach(card => card.inputs.forEach(input => {
    const value = state.drafts[card.id]?.[input.id];
    if (value === undefined || value === '' || !UnitSystem.OPTIONS[input.type]) return;
    const options = UnitSystem.getOptions(input.type);
    const from = options.find(option => option.value === previous[input.type]);
    const to = options.find(option => option.value === state.settings[input.type]);
    if (from && to && from.value !== to.value) state.drafts[card.id][input.id] = String(Number(to.fromStd(from.toStd(Number(value))).toPrecision(10)));
  })));
  UnitSystem.current = state.settings;
  let saved = true;
  try { UnitSystem.save(); } catch { saved = false; }
  state.results = {};
  $('settingsDialog').close(); renderNav(); renderMain();
  toast(saved ? '单位设置已更新' : '设置已应用，本机存储暂不可用');
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextLabel = theme === 'dark' ? '切换浅色模式' : '切换深色模式';
  $('themeToggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  $('themeToggle').setAttribute('aria-label', nextLabel);
  $('themeToggle').title = nextLabel;
}
function init() {
  try { UnitSystem.init(); } catch { UnitSystem.current = { ...UnitSystem.PRESETS.mixed }; }
  // Recover gracefully from invalid or obsolete locally saved unit selections.
  if (!UnitSystem.current || !Object.keys(UnitSystem.OPTIONS).every(type => UnitSystem.OPTIONS[type].some(option => option.value === UnitSystem.current[type]))) UnitSystem.current = { ...UnitSystem.PRESETS.mixed };
  let theme;
  try { theme = localStorage.getItem('_themeMode'); } catch { /* Use system preference. */ }
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let followsSystem = !['light', 'dark'].includes(theme);
  hydrateIcons();
  applyTheme(followsSystem ? (preference.matches ? 'dark' : 'light') : theme);
  preference.addEventListener('change', event => { if (followsSystem) applyTheme(event.matches ? 'dark' : 'light'); });
  $('themeToggle').addEventListener('click', () => {
    followsSystem = false;
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('_themeMode', next); } catch { /* Theme works without persistence. */ }
  });
  document.querySelectorAll('[data-action="settings"]').forEach(button => button.addEventListener('click', openSettings));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('settingsForm').addEventListener('submit', applySettings);
  $('pdfFile').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast('请选择 PDF 文件'); return; }
    if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    state.pdfUrl = URL.createObjectURL(file); state.pdfName = file.name;
    $('pdfFrame').src = state.pdfUrl;
    $('pdfTitle').textContent = file.name;
    renderMain(); $('pdfDialog').showModal();
    event.target.value = '';
  });
  window.addEventListener('hashchange', navigate);
  navigate();
}
init();
