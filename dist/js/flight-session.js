/* A versioned flight session. All stored measurements use ft, kt, hPa and °C. */
'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FlightSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KEY = '_flight_calc_session_v4';
  const VERSION = 1;
  const LIMITS = {
    qnhHpa: [800, 1100], fieldElevFt: [-1500, 20000], oatC: [-90, 65],
    groundSpeedKt: [0, 1000], currentAltFt: [-1500, 65000], targetAltFt: [-1500, 65000],
    iasKt: [0, 700], vrefKt: [0, 400], windDirTrue: [0, 360],
    runwayDirTrue: [0, 360], windSpeedKt: [0, 250], gustKt: [0, 250]
  };
  const TEXT = ['departure', 'arrival', 'runway', 'aircraft'];
  const defaults = () => ({
    version: VERSION, departure: '', arrival: '', runway: '', aircraft: '',
    qnhHpa: null, fieldElevFt: null, oatC: null, groundSpeedKt: null,
    currentAltFt: null, targetAltFt: null, iasKt: null, vrefKt: null,
    windDirTrue: null, runwayDirTrue: null, windSpeedKt: null, gustKt: null,
    fieldSources: {}, weatherRaw: '', weatherTime: '', weatherFetchedAt: '', weatherStation: '', updatedAt: ''
  });
  function normalize(input) {
    if (!input || typeof input !== 'object' || input.version !== VERSION) return defaults();
    const out = defaults();
    for (const key of TEXT) out[key] = typeof input[key] === 'string' ? input[key].trim().slice(0, 40) : '';
    for (const [key, [min, max]] of Object.entries(LIMITS)) {
      const value = input[key];
      out[key] = typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
    }
    out.fieldSources = {};
    if (input.fieldSources && typeof input.fieldSources === 'object') {
      for (const key of Object.keys(LIMITS)) {
        if (typeof input.fieldSources[key] === 'string') out.fieldSources[key] = input.fieldSources[key].slice(0, 80);
      }
    }
    for (const key of ['weatherRaw', 'weatherTime', 'weatherFetchedAt', 'weatherStation', 'updatedAt']) {
      out[key] = typeof input[key] === 'string' ? input[key].slice(0, key === 'weatherRaw' ? 600 : 80) : '';
    }
    return out;
  }
  function load(storage = globalThis.localStorage) {
    try { return normalize(JSON.parse(storage.getItem(KEY))); } catch { return defaults(); }
  }
  function save(session, storage = globalThis.localStorage) {
    const normalized = normalize({ ...session, version: VERSION, updatedAt: new Date().toISOString() });
    storage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  }
  const has = value => typeof value === 'number' && Number.isFinite(value);
  const display = (value, type, units) => has(value) ? Number(units.fromStd(type, value).toFixed(3)) : null;
  function pressureAltitudeFt(session) {
    return has(session.qnhHpa) && has(session.fieldElevFt)
      ? session.fieldElevFt + (1013.25 - session.qnhHpa) * 29.53 : null;
  }
  function heightDifferenceFt(session) {
    return has(session.currentAltFt) && has(session.targetAltFt) && session.currentAltFt > session.targetAltFt
      ? session.currentAltFt - session.targetAltFt : null;
  }
  function relativeWindAngle(session) {
    if (!has(session.windDirTrue) || !has(session.runwayDirTrue)) return null;
    return ((session.windDirTrue - session.runwayDirTrue + 540) % 360) - 180;
  }
  function projections(session, units) {
    const s = normalize(session);
    const result = {};
    const pa = pressureAltitudeFt(s);
    const delta = heightDifferenceFt(s);
    if (has(s.qnhHpa) && has(s.fieldElevFt)) result.a1 = {
      qnh: s.qnhHpa, qnhu: 'hpa', felev: display(s.fieldElevFt, 'altitude', units)
    };
    if (has(pa) && has(s.oatC)) result.a2 = { palta: display(pa, 'altitude', units), oat: s.oatC };
    if (has(pa) && has(s.iasKt)) result.a3 = {
      ias: display(s.iasKt, 'speed', units), paltas: display(pa, 'altitude', units)
    };
    if (has(delta)) {
      result.t1 = { alt3: display(delta, 'altitude', units), angle3: 3 };
      if (has(s.groundSpeedKt) && s.groundSpeedKt > 0) {
        const distanceNm = delta / Math.tan(3 * Math.PI / 180) / 6076;
        result.t2 = { dist2: display(distanceNm, 'distance', units), gs2: display(s.groundSpeedKt, 'speed', units) };
      }
    }
    if (has(s.groundSpeedKt) && s.groundSpeedKt > 0) result.v1 = {
      gs1: display(s.groundSpeedKt, 'speed', units), angle2: 3
    };
    if (has(s.vrefKt) && s.vrefKt > 0) result.vapp1 = { vref: s.vrefKt, correction: 0 };
    const angle = relativeWindAngle(s);
    if (has(angle) && has(s.windSpeedKt)) result.vapp2 = { winds: s.windSpeedKt, wangle: angle };
    return result;
  }
  function applyMetar(session, observation, now = Date.now()) {
    if (!observation || Array.isArray(observation) || typeof observation !== 'object') throw new Error('METAR 数据无效');
    const station = String(observation.icaoId || '').toUpperCase();
    if (!/^[A-Z]{4}$/.test(station)) throw new Error('METAR 机场代码无效');
    const time = Date.parse(observation.reportTime || '');
    if (!Number.isFinite(time) || time > now + 10 * 60_000 || now - time > 90 * 60_000) throw new Error('METAR 超过 90 分钟或时间无效');
    const next = normalize(session);
    const values = {
      qnhHpa: observation.altim, fieldElevFt: has(observation.elev) ? observation.elev * 3.28084 : null,
      oatC: observation.temp, windDirTrue: observation.wdir, windSpeedKt: observation.wspd,
      gustKt: observation.wgst
    };
    for (const [key, value] of Object.entries(values)) {
      const [min, max] = LIMITS[key];
      if (has(value) && value >= min && value <= max) {
        next[key] = value;
        next.fieldSources[key] = `METAR ${station} · ${observation.reportTime}`;
      }
    }
    next.weatherRaw = String(observation.rawOb || '').slice(0, 600);
    next.weatherTime = observation.reportTime;
    next.weatherFetchedAt = new Date(now).toISOString();
    next.weatherStation = station;
    return next;
  }
  function exportJSON(session) {
    return JSON.stringify({ format: 'flight-calculator-session', version: VERSION, session: normalize(session) }, null, 2);
  }
  function importJSON(source) {
    const data = JSON.parse(source);
    if (!data || data.format !== 'flight-calculator-session' || data.version !== VERSION || !data.session || data.session.version !== VERSION) {
      throw new Error('不支持的会话备份格式');
    }
    return normalize(data.session);
  }
  return { KEY, VERSION, LIMITS, defaults, normalize, load, save, pressureAltitudeFt,
    heightDifferenceFt, relativeWindAngle, projections, applyMetar, exportJSON, importJSON };
});
