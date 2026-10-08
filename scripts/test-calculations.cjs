const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const FlightSession = require('../js/flight-session.js');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/calculator-data.js'), 'utf8'), context);
const { UnitSystem: units, Calcs, CALCULATOR_SECTIONS } = context;
units.setPreset('mixed');

test('ground speed and descent angle give vertical speed through tangent', () => {
  const expected = Math.round(120 * 6076 / 60 * Math.tan(3 * Math.PI / 180));
  assert.equal(Calcs.verticalSpeed(120, 3).val, String(expected));
  units.setPreset('metric');
  const metric = Calcs.verticalSpeed(222.24, 3);
  assert.equal(metric.unit, 'm/s');
  assert.ok(Math.abs(Number(metric.val) - expected / 196.85) < .1);
  units.setPreset('mixed');
});

test('descent calculations reject reversed or singular geometry', () => {
  assert.equal(Calcs.todDistance(-1000, 3).ok, false);
  assert.equal(Calcs.todDistance(1000, 90).ok, false);
  assert.equal(Calcs.verticalSpeed(120, 90).ok, false);
  assert.equal(Calcs.todTiming(-10, 120).ok, false);
});

test('VAPP uses only a manual correction; unsupported VREF estimate is absent', () => {
  assert.equal(Calcs.vapp(135, 5).val, 140);
  assert.equal(Calcs.vapp(135, -5).ok, false);
  assert.equal(CALCULATOR_SECTIONS.flatMap(section => section.cards).some(card => card.id === 'vapp3'), false);
});

test('calm wind is valid and tailwind is labeled correctly', () => {
  assert.equal(Calcs.windComp(0, 0).ok, true);
  const tailwind = Calcs.windComp(20, 180);
  assert.equal(tailwind.ok, true);
  assert.match(tailwind.unit, /^顺风/);
  assert.equal(Calcs.windComp(20, 270).ok, false);
});

test('session preserves standard units across display presets', () => {
  const session = FlightSession.normalize({
    ...FlightSession.defaults(), currentAltFt: 12000, targetAltFt: 3000,
    qnhHpa: 1000, fieldElevFt: 500, oatC: 20, groundSpeedKt: 120, iasKt: 140
  });
  const mixed = FlightSession.projections(session, units);
  assert.equal(mixed.t1.alt3, 9000);
  assert.equal(mixed.a1.felev, 500);
  units.setPreset('metric');
  const metric = FlightSession.projections(session, units);
  assert.ok(Math.abs(metric.t1.alt3 - 2743.2) < .01);
  assert.ok(Math.abs(metric.a1.felev - 152.4) < .01);
  assert.ok(Math.abs(metric.v1.gs1 - 222.24) < .01);
  units.setPreset('mixed');
  assert.equal(FlightSession.pressureAltitudeFt(session), 500 + 13.25 * 29.53);
});

test('relative wind uses true bearings on both sides of north', () => {
  assert.equal(FlightSession.relativeWindAngle({ windDirTrue: 10, runwayDirTrue: 350 }), 20);
  assert.equal(FlightSession.relativeWindAngle({ windDirTrue: 350, runwayDirTrue: 10 }), -20);
  assert.equal(FlightSession.relativeWindAngle({ windDirTrue: null, runwayDirTrue: 10 }), null);
});

test('METAR import checks freshness and records the origin of each value', () => {
  const now = Date.parse('2026-10-08T14:15:00Z');
  const obs = { icaoId: 'KSFO', reportTime: '2026-10-08T14:00:00Z',
    rawOb: 'METAR KSFO 081400Z 29008KT 10SM 13/12 A2988', altim: 1011.9,
    temp: 12.8, wdir: 290, wspd: 8, elev: 2 };
  const session = FlightSession.applyMetar(FlightSession.defaults(), obs, now);
  assert.equal(session.qnhHpa, 1011.9);
  assert.equal(session.windDirTrue, 290);
  assert.ok(session.fieldSources.qnhHpa.includes('KSFO'));
  assert.throws(() => FlightSession.applyMetar(session, obs, now + 2 * 60 * 60_000), /90 分钟/);
});

test('versioned session backup round-trips and rejects an unknown format', () => {
  const session = FlightSession.normalize({ ...FlightSession.defaults(), aircraft: 'A320', vrefKt: 135 });
  assert.equal(FlightSession.importJSON(FlightSession.exportJSON(session)).vrefKt, 135);
  assert.throws(() => FlightSession.importJSON('{}'), /备份格式/);
  assert.equal(FlightSession.normalize({ ...session, qnhHpa: 2000 }).qnhHpa, null);
});
