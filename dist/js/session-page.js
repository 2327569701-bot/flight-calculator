/* Flight-session UI. ChartFox and weather never receive local profile data. */
'use strict';

(function (root, factory) {
  const api = factory(root.FlightSession);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SessionPage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (FlightSession) {
  const WEB_PROFILES = '_flight_calc_profiles_v4';
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const HISTORY_KEYS = ['id', 'section', 'card', 'title', 'mode', 'inputs', 'result', 'signature'];
  function validHistory(history) {
    return history.length <= 50 && history.every(entry => entry && typeof entry === 'object' &&
      HISTORY_KEYS.every(key => typeof entry[key] === 'string' && entry[key].length <= 4000) &&
      typeof entry.t === 'number' && Number.isFinite(entry.t) &&
      (entry.sourceVersion === undefined || Number.isInteger(entry.sourceVersion)));
  }
  const fields = [
    { key: 'departure', label: '出发机场 ICAO', placeholder: 'ZSPD', kind: 'text' },
    { key: 'arrival', label: '目的机场 ICAO', placeholder: 'ZBAA', kind: 'text' },
    { key: 'runway', label: '跑道', placeholder: '36L', kind: 'text' },
    { key: 'aircraft', label: '机型 / 备注', placeholder: 'A320', kind: 'text' },
    { key: 'qnhHpa', label: 'QNH', unit: 'hPa' },
    { key: 'fieldElevFt', label: '机场标高', type: 'altitude' },
    { key: 'oatC', label: '外界温度', unit: '°C' },
    { key: 'groundSpeedKt', label: '地速', type: 'speed' },
    { key: 'currentAltFt', label: '当前高度', type: 'altitude' },
    { key: 'targetAltFt', label: '目标高度', type: 'altitude' },
    { key: 'iasKt', label: '指示空速', type: 'speed' },
    { key: 'vrefKt', label: '适用手册给出的 VREF', unit: 'kt' },
    { key: 'windDirTrue', label: '风向（真北）', unit: '°' },
    { key: 'runwayDirTrue', label: '跑道方向（真北）', unit: '°' },
    { key: 'windSpeedKt', label: '风速', unit: 'kt' },
    { key: 'gustKt', label: '阵风', unit: 'kt' }
  ];
  let session = FlightSession.defaults();
  function init(storage) { session = FlightSession.load(storage); }
  function getSession() { return FlightSession.normalize(session); }
  function save(storage) {
    try { session = FlightSession.save(session, storage); return true; } catch { return false; }
  }
  function fieldValue(field, units) {
    const value = session[field.key];
    if (value === null || value === undefined) return '';
    if (field.type) return String(Number(units.fromStd(field.type, value).toFixed(3)));
    return String(value);
  }
  function markup(field, units, escape) {
    const key = field.key;
    const unit = field.type ? units.getLabel(field.type) : field.unit || '';
    const source = session.fieldSources[key] ? `<small class="session-source">${escape(session.fieldSources[key])}</small>` : '';
    const input = field.kind === 'text'
      ? `<input id="session-${key}" name="${key}" type="text" maxlength="40" placeholder="${field.placeholder}" value="${escape(fieldValue(field, units))}">`
      : `<div class="input-wrap"><input id="session-${key}" name="${key}" type="number" step="any" inputmode="decimal" value="${escape(fieldValue(field, units))}"><span class="input-unit">${escape(unit)}</span></div>`;
    return `<label class="session-field" for="session-${key}"><span>${field.label}</span>${input}${source}</label>`;
  }
  function summary(escape, units) {
    const pa = FlightSession.pressureAltitudeFt(session);
    const delta = FlightSession.heightDifferenceFt(session);
    const angle = FlightSession.relativeWindAngle(session);
    const metric = (title, value, unit, note) => `<div class="session-metric"><span>${title}</span><strong>${value}</strong><small>${unit}${note ? ' · ' + note : ''}</small></div>`;
    return metric('压力高度', pa === null ? '—' : Math.round(units.fromStd('altitude', pa)), units.getLabel('altitude'), '估算') +
      metric('待下降高度', delta === null ? '—' : Math.round(units.fromStd('altitude', delta)), units.getLabel('altitude'), '当前减目标') +
      metric('相对跑道风向', angle === null ? '—' : Math.round(angle), '°', '真北对真北');
  }
  const actions = [
    ['a1', '压力高度'], ['a2', '密度高度'], ['a3', '真实空速'],
    ['t1', 'TOD 距离'], ['t2', 'TOD 时机'], ['v1', '垂直速度'],
    ['vapp2', '风分量'], ['vapp1', 'VAPP']
  ];
  function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function webProfiles() {
    try {
      const value = JSON.parse(localStorage.getItem(WEB_PROFILES));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  const desktop = () => !!globalThis.__TAURI__?.core?.invoke;
  async function listProfiles() {
    if (desktop()) return await globalThis.__TAURI__.core.invoke('list_aircraft_presets');
    return Object.keys(webProfiles()).map(name => ({ name, key: name }));
  }
  async function saveProfile(name, config) {
    if (desktop()) return globalThis.__TAURI__.core.invoke('save_aircraft_preset', { name, config });
    const profiles = webProfiles(); profiles[name] = { name, config, saved_at: new Date().toISOString() };
    localStorage.setItem(WEB_PROFILES, JSON.stringify(profiles));
  }
  async function loadProfile(name) {
    if (desktop()) return globalThis.__TAURI__.core.invoke('load_preset', { presetType: 'aircraft', name });
    return webProfiles()[name];
  }
  async function deleteProfile(name) {
    if (desktop()) return globalThis.__TAURI__.core.invoke('delete_preset', { presetType: 'aircraft', name });
    const profiles = webProfiles(); delete profiles[name];
    localStorage.setItem(WEB_PROFILES, JSON.stringify(profiles));
  }
  async function render(host, options) {
    const { units, escape, icon, toast, openCard, onUnitsChanged } = options;
    const projects = FlightSession.projections(session, units);
    const weather = session.weatherRaw
      ? `<div class="session-weather"><strong>最近气象报文</strong><time>${escape(session.weatherTime)}</time><p>${escape(session.weatherRaw)}</p></div>`
      : '';
    host.innerHTML = `
      <div class="page-heading"><div><span class="eyebrow">FLIGHT WORKSPACE</span><h1>本次飞行</h1><p class="page-description">输入一次，按需带入各个计算器。所有数值都可以在计算页修改。</p></div><div class="section-symbol">${icon('grid')}</div></div>
      <div class="session-layout">
        <form class="panel session-form" id="sessionForm" novalidate>
          <div class="panel-heading">${icon('sliders')}<h2>飞行参数</h2><span class="panel-kicker">SESSION</span></div>
          <div class="session-fields">${fields.map((field, index) => {
            const groups = { 0: '航线与机型', 4: '机场与天气', 8: '飞行参数', 12: '风与跑道' };
            return (groups[index] ? `<h3 class="session-group">${groups[index]}</h3>` : '') + markup(field, units, escape);
          }).join('')}</div>
          <p class="session-note">风向与跑道方向都填写真北方位；跑道号通常代表磁向，不能直接当作真北方位。自动气象值会标出来源。</p>
          <div class="session-actions"><button class="button button-primary" type="submit">保存本次飞行</button><button class="button button-secondary" type="button" id="sessionMetar">读取目的地 METAR</button></div>
          <p id="sessionStatus" class="session-status" role="status"></p>
          ${weather}
        </form>
        <div class="session-side">
          <section class="panel session-results"><h2>会话概览</h2><div class="session-metrics">${summary(escape, units)}</div></section>
          <section class="panel session-tools"><h2>带入计算器</h2><p>选择已具备输入条件的计算方式。</p><div class="session-tool-grid">${actions.map(([id, name]) => `<button type="button" data-session-card="${id}" ${projects[id] ? '' : 'disabled'}>${name}${icon('arrow')}</button>`).join('')}</div></section>
          <section class="panel session-profiles"><h2>机型档案与备份</h2><p>档案保存机型、VREF、IAS 和单位，不含 ChartFox 登录数据。</p><div class="session-profile-row"><input id="profileName" maxlength="40" placeholder="档案名称"><button type="button" class="button button-secondary" id="saveProfile">保存档案</button></div><div class="session-profile-row"><select id="profileSelect" aria-label="已保存档案"><option value="">选择档案</option></select><button type="button" class="button button-secondary" id="loadProfile">载入</button><button type="button" class="text-button" id="deleteProfile">删除</button></div><div class="session-actions"><button type="button" class="text-button" id="exportSession">导出会话</button><button type="button" class="text-button" id="importSession">导入会话</button><button type="button" class="text-button" id="exportBackup">完整备份</button><button type="button" class="text-button" id="importBackup">导入备份</button><input id="importSessionFile" type="file" accept=".json,application/json" hidden><input id="importBackupFile" type="file" accept=".json,application/json" hidden></div></section>
        </div>
      </div>`;
    const form = host.querySelector('#sessionForm');
    const status = host.querySelector('#sessionStatus');
    function readForm() {
      const next = { ...session, fieldSources: { ...session.fieldSources } };
      for (const field of fields) {
        const element = form.elements[field.key];
        const raw = element.value.trim();
        if (field.kind === 'text') {
          next[field.key] = raw.toUpperCase();
        } else {
          const value = raw === '' ? null : Number(raw);
          const standard = value === null ? null : field.type ? units.toStd(field.type, value) : value;
          if (standard !== null && (!Number.isFinite(standard) || standard < FlightSession.LIMITS[field.key][0] || standard > FlightSession.LIMITS[field.key][1])) {
            element.setAttribute('aria-invalid', 'true');
            element.focus();
            throw new Error(`${field.label}超出有效范围`);
          }
          next[field.key] = standard;
          if (next[field.key] !== session[field.key]) delete next.fieldSources[field.key];
          element.removeAttribute('aria-invalid');
        }
      }
      if (next.departure && !/^[A-Z]{4}$/.test(next.departure)) throw new Error('出发机场须为四位 ICAO 代码');
      if (next.arrival && !/^[A-Z]{4}$/.test(next.arrival)) throw new Error('目的机场须为四位 ICAO 代码');
      return FlightSession.normalize(next);
    }
    function commit() {
      session = readForm();
      if (!save()) throw new Error('无法保存本地会话');
      status.textContent = '已保存到本机';
      return session;
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      try { commit(); render(host, options); } catch (error) { status.textContent = error.message; }
    });
    host.querySelectorAll('[data-session-card]').forEach(button => button.addEventListener('click', () => {
      try {
        commit();
        const draft = FlightSession.projections(session, units)[button.dataset.sessionCard];
        if (draft) openCard(button.dataset.sessionCard, draft);
      } catch (error) { status.textContent = error.message; }
    }));
    host.querySelector('#sessionMetar').addEventListener('click', async event => {
      const button = event.currentTarget;
      try {
        commit();
        if (!/^[A-Z]{4}$/.test(session.arrival)) throw new Error('先填写四位目的机场 ICAO 代码');
        if (!desktop()) throw new Error('网页版请手动填写天气；桌面版支持 METAR');
        if (session.weatherStation === session.arrival && Date.now() - Date.parse(session.weatherFetchedAt) < 10 * 60_000) {
          status.textContent = '十分钟内已读取该机场 METAR；请稍后刷新';
          return;
        }
        button.disabled = true; status.textContent = '正在读取 METAR…';
        const observation = await globalThis.__TAURI__.core.invoke('fetch_metar', { station: session.arrival });
        session = FlightSession.applyMetar(session, observation);
        save(); render(host, options); toast('已载入 METAR，请核对报文与数值');
      } catch (error) { status.textContent = String(error.message || error); }
      finally { button.disabled = false; }
    });
    const select = host.querySelector('#profileSelect');
    try {
      const profiles = await listProfiles();
      if (!host.querySelector('#sessionForm')) return;
      for (const profile of profiles) {
        const option = document.createElement('option');
        option.value = profile.key || profile.name; option.textContent = profile.name;
        select.appendChild(option);
      }
    } catch { toast('档案列表暂不可用'); }
    if (!host.querySelector('#sessionForm')) return;
    host.querySelector('#saveProfile').addEventListener('click', async () => {
      try {
        commit();
        const name = host.querySelector('#profileName').value.trim();
        if (!name || name.length > 40) throw new Error('请填写 1–40 字的档案名');
        await saveProfile(name, { version: 1, aircraft: session.aircraft, vrefKt: session.vrefKt, iasKt: session.iasKt, units: units.current });
        toast('机型档案已保存'); render(host, options);
      } catch (error) { status.textContent = String(error.message || error); }
    });
    host.querySelector('#loadProfile').addEventListener('click', async () => {
      try {
        if (!select.value) throw new Error('请先选择档案');
        const record = await loadProfile(select.value);
        const config = record?.config;
        if (!config || config.version !== 1) throw new Error('档案格式不受支持');
        session = FlightSession.normalize({ ...session, aircraft: config.aircraft, vrefKt: config.vrefKt, iasKt: config.iasKt });
        save();
        if (config.units && Object.keys(units.OPTIONS).every(type => units.OPTIONS[type].some(option => option.value === config.units[type]))) {
          units.current = config.units; units.save(); onUnitsChanged();
        }
        render(host, options); toast('已载入机型档案');
      } catch (error) { status.textContent = String(error.message || error); }
    });
    host.querySelector('#deleteProfile').addEventListener('click', async () => {
      try {
        if (!select.value) throw new Error('请先选择档案');
        await deleteProfile(select.value); render(host, options); toast('档案已删除');
      } catch (error) { status.textContent = String(error.message || error); }
    });
    host.querySelector('#exportSession').addEventListener('click', () => download('flight-session-v4.json', FlightSession.exportJSON(session)));
    const file = host.querySelector('#importSessionFile');
    host.querySelector('#importSession').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      try {
        if (!file.files?.[0]) return;
        if (file.files[0].size > MAX_IMPORT_BYTES) throw new Error('会话文件超过 2 MB');
        session = FlightSession.importJSON(await file.files[0].text());
        save(); render(host, options); toast('会话已导入');
      } catch (error) { status.textContent = String(error.message || error); }
    });
    host.querySelector('#exportBackup').addEventListener('click', async () => {
      try {
        commit();
        const profiles = desktop() ? await globalThis.__TAURI__.core.invoke('export_all')
          : { format: 'flight-calculator-profiles', version: 1, aircraft: Object.values(webProfiles()), units: [] };
        const history = JSON.parse(localStorage.getItem('_flight_calc_history') || '[]');
        const backup = { format: 'flight-calculator-v4-backup', version: 1,
          session: FlightSession.normalize(session), units: units.current, profiles,
          history: Array.isArray(history) ? history.slice(0, 50) : [] };
        download('flight-calculator-v4-backup.json', JSON.stringify(backup, null, 2));
      } catch (error) { status.textContent = String(error.message || error); }
    });
    const backupFile = host.querySelector('#importBackupFile');
    host.querySelector('#importBackup').addEventListener('click', () => backupFile.click());
    backupFile.addEventListener('change', async () => {
      try {
        if (!backupFile.files?.[0]) return;
        if (backupFile.files[0].size > MAX_IMPORT_BYTES) throw new Error('备份文件超过 2 MB');
        const backup = JSON.parse(await backupFile.files[0].text());
        if (backup.format !== 'flight-calculator-v4-backup' || backup.version !== 1 ||
            !backup.session || backup.session.version !== 1 ||
            !backup.profiles || backup.profiles.format !== 'flight-calculator-profiles' ||
            backup.profiles.version !== 1 || !Array.isArray(backup.history) ||
            !validHistory(backup.history)) throw new Error('备份格式不受支持');
        if (backup.units && !Object.keys(units.OPTIONS).every(type => units.OPTIONS[type].some(option => option.value === backup.units[type]))) throw new Error('备份中的单位设置无效');
        if (desktop()) await globalThis.__TAURI__.core.invoke('import_all', { data: backup.profiles });
        else {
          const profiles = webProfiles();
          for (const profile of backup.profiles.aircraft || []) {
            if (profile && typeof profile.name === 'string' && profile.name.length <= 40 && profile.config) profiles[profile.name] = profile;
          }
          localStorage.setItem(WEB_PROFILES, JSON.stringify(profiles));
        }
        session = FlightSession.normalize(backup.session); save();
        if (backup.units) { units.current = backup.units; units.save(); onUnitsChanged(); }
        localStorage.setItem('_flight_calc_history', JSON.stringify(backup.history.slice(0, 50)));
        render(host, options); toast('完整备份已导入');
      } catch (error) { status.textContent = String(error.message || error); }
    });
  }
  return { init, render, getSession };
});
