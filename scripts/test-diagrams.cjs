const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const diagrams = require('../js/flight-diagrams.js');

// Exercise the visualization against actual calculator outputs, rather than invented UI fixtures.
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/calculator-data.js'), 'utf8'), context);
const { UnitSystem: units, CALCULATOR_SECTIONS: sections } = context;
units.setPreset('mixed');
function calculation(id, inputs) {
  const card = sections.flatMap(s => s.cards).find(card => card.id === id);
  return { ...card.fn(inputs), inputs: { ...inputs } };
}
function build(id, inputs) { return diagrams.model(id, calculation(id, inputs), units); }
const cases = {
  g1: { alt1: 3000, dist1: 10 },
  g2: { alt2: 3000, angle1: 3 },
  v1: { gs1: 140, angle2: 3 },
  t1: { alt3: 30000, angle3: 3 },
  t2: { dist2: 90, gs2: 450 },
  r1: { spd: 120, dst: 60, tme: null },
  vapp1: { vref: 135, wind: 10, wdir: 'headwind', gust: 0 },
  vapp2: { winds: 20, wangle: 30 },
  vapp3: { wght: 60000, flap: '30' },
  a1: { qnh: 1013, qnhu: 'hpa', felev: 1500 },
  a2: { palta: 5000, oat: 25 },
  a3: { ias: 140, paltas: 10000 }
};
for (const [id, input] of Object.entries(cases)) {
  test(`${id}: completed results have labeled, finite SVG geometry; edited/error states have no stale data`, () => {
    const output = build(id, input);
    assert.equal(output.ready, true);
    assert.equal(output.metrics.length, 3);
    assert.ok(output.metrics.some(item => item.computed));
    const svg = diagrams.svg(output);
    assert.match(svg, /role="img" aria-label=/);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    for (const result of [undefined, { ok: false, msg: 'Invalid', inputs: input }]) {
      const empty = diagrams.model(id, result, units);
      assert.equal(empty.ready, false);
      assert.equal(empty.metrics.length, 0);
      assert.doesNotMatch(diagrams.svg(empty), /NaN|Infinity|undefined/);
    }
  });
}
test('all three descent cards respond geometrically to steeper input, even above 3 degrees', () => {
  const pairs = [
    ['g1', { alt1: 3000, dist1: 10 }, { alt1: 6000, dist1: 10 }],
    ['g2', { alt2: 3000, angle1: 4 }, { alt2: 3000, angle1: 6 }],
    ['t1', { alt3: 30000, angle3: 4 }, { alt3: 30000, angle3: 6 }]
  ];
  for (const [id, first, second] of pairs) {
    const path = inputs => diagrams.svg(build(id, inputs)).match(/data-geometry="slope" d="([^"]+)"/)[1];
    assert.notEqual(path(first), path(second));
  }
});
test('TOD time comes from distance and speed, and output text matches the result card', () => {
  const first = build('t2', { dist2: 90, gs2: 450 });
  const second = build('t2', { dist2: 90, gs2: 300 });
  assert.equal(first.minutes, 12);
  assert.equal(second.minutes, 18);
  assert.equal(first.metrics[2].value, '12 分钟');
  assert.notEqual(diagrams.svg(first), diagrams.svg(second));
});
test('glide geometry is invariant under equivalent unit conversions; labels use the selected units', () => {
  const imperial = build('g1', cases.g1);
  units.setPreset('metric');
  const metric = build('g1', { alt1: 3000 / 3.28084, dist1: 18.52 });
  assert.ok(Math.abs(imperial.angle - metric.angle) < 1e-10);
  assert.equal(metric.metrics[0].value, '914.4 m');
  assert.equal(metric.metrics[1].value, '18.5 km');
  units.setPreset('mixed');
});
test('triangle annotates whichever variable was solved, in the same unit as the calculator', () => {
  const speeds = build('r1', { spd: null, dst: 60, tme: 30 });
  const distances = build('r1', { spd: 120, dst: null, tme: 30 });
  assert.equal(speeds.metrics[0].value, '120 kt');
  assert.equal(speeds.metrics[0].computed, true);
  assert.equal(distances.metrics[1].value, '60 NM');
  assert.equal(distances.metrics[1].computed, true);
});
test('wind vectors distinguish left/right and headwind/tailwind quadrants', () => {
  for (const angle of [-150, -90, -30, 0, 30, 90, 150, 180]) {
    const output = build('vapp2', { winds: 20, wangle: angle });
    const svg = diagrams.svg(output);
    const vector = svg.match(/<line x1="220" y1="120" x2="([^"]+)" y2="([^"]+)" class="diagram-wind-vector"/);
    const x = Number(vector[1]), y = Number(vector[2]);
    if (angle < 0) assert.ok(x < 220);
    if (angle > 0 && angle < 180) assert.ok(x > 220);
    if (Math.abs(angle) < 90) assert.ok(y < 120);
    if (Math.abs(angle) > 90) assert.ok(y > 120);
    assert.equal(output.metrics[2].value, Math.abs(Math.round(Math.sin(Math.abs(angle) * Math.PI / 180) * 20)) + ' kts');
  }
});
test('gauge follows computed speed, including zero, without fabricating safety limits', () => {
  const first = build('vapp1', cases.vapp1);
  const second = build('vapp1', { ...cases.vapp1, vref: 165 });
  assert.equal(first.speed, 130);
  assert.equal(second.speed, 160);
  assert.notEqual(diagrams.svg(first), diagrams.svg(second));
  assert.match(first.caption, /不代表速度限制/);
  const zero = diagrams.model('vapp3', { ok: true, val: 0, unit: 'kts', inputs: cases.vapp3 }, units);
  assert.equal(zero.ready, true);
  assert.doesNotMatch(diagrams.svg(zero), /NaN|Infinity/);
});
test('out-of-range geometry and extreme numeric values do not produce invalid SVG', () => {
  for (const angle of [0, 90, 120, -3]) {
    assert.equal(build('g2', { alt2: 3000, angle1: angle }).ready, false);
  }
  const huge = diagrams.model('vapp2', { ok: true, val: '0 / 0', inputs: { winds: 1e308, wangle: 1e308 } }, units);
  assert.doesNotMatch(diagrams.svg(huge), /NaN|Infinity/);
  const tiny = build('g1', { alt1: 1e-8, dist1: 100 });
  assert.doesNotMatch(diagrams.svg(tiny), /NaN|Infinity/);
  const invalid = diagrams.model('g1', { ok: true, val: 'NaN', inputs: { alt1: NaN, dist1: 10 } }, units);
  assert.equal(invalid.ready, false);
});

// ---- V3 atmosphere & airspeed ----
test('pressure altitude: standard day equals field elevation; low QNH raises it; inHg path matches', () => {
  const std = diagrams.model('a1', { ok: true, val: '1500', unit: 'ft', inputs: { qnh: 1013.25, qnhu: 'hpa', felev: 1500 } }, units);
  assert.equal(std.result, 1500);
  const low = build('a1', { qnh: 998, qnhu: 'hpa', felev: 1500 });
  assert.equal(low.result, 1950);
  const inhg = build('a1', { qnh: 29.92, qnhu: 'inhg', felev: 0 });
  assert.equal(inhg.result, 0);
  const inhgLow = build('a1', { qnh: 29.5, qnhu: 'inhg', felev: 1000 });
  assert.equal(inhgLow.result, 1420);
});
test('density altitude: known hot value and ISA deviation; cold day sits below pressure altitude', () => {
  const hot = build('a2', { palta: 5000, oat: 25 });
  assert.equal(hot.result, 7376);
  assert.equal(hot.hot, true);
  assert.match(hot.metrics[1].value, /\+20\.0/);
  // At 5000 ft ISA is 5 C; on a cold day DA drops below PA.
  const cold = build('a2', { palta: 5000, oat: -10 });
  assert.ok(cold.result < 5000);
  assert.equal(cold.hot, false);
});
test('true airspeed: 2% per 1000 ft rule and gauge reference point', () => {
  const tas = build('a3', { ias: 140, paltas: 10000 });
  assert.equal(tas.speed, 168);
  assert.equal(tas.reference, 140);
  assert.equal(tas.gaugeLabel, 'TAS');
  const seaLevel = build('a3', { ias: 100, paltas: 0 });
  assert.equal(seaLevel.speed, 100);
});
test('atmosphere cards reject missing inputs without producing invalid SVG', () => {
  for (const [id, input] of [['a1', { qnh: null, qnhu: 'hpa', felev: null }], ['a2', { palta: null, oat: null }], ['a3', { ias: null, paltas: null }]]) {
    const card = sections.flatMap(s => s.cards).find(c => c.id === id);
    const result = card.fn(input);
    assert.equal(result.ok, false);
    const m = diagrams.model(id, { ...result, inputs: input }, units);
    assert.equal(m.ready, false);
    assert.doesNotMatch(diagrams.svg(m), /NaN|Infinity|undefined/);
  }
});
test('altitude results stay consistent when expressed in metric units', () => {
  units.setPreset('metric');
  // 1500 ft field elevation ~ 457 m; standard QNH keeps PA at the same altitude.
  const metricPA = build('a1', { qnh: 1013.25, qnhu: 'hpa', felev: 457.2 });
  assert.ok(Math.abs(metricPA.result - 457) <= 2);
  assert.equal(metricPA.metrics[0].value.includes('m'), true);
  units.setPreset('mixed');
});

test('VREF weight inputs use the same physical weight in kg and lb', () => {
  units.setPreset('mixed');
  const kg = calculation('vapp3', { wght: 140000 / 2.20462, flap: '30' });
  units.setPreset('imperial');
  const lb = calculation('vapp3', { wght: 140000, flap: '30' });
  assert.equal(kg.val, 128);
  assert.equal(lb.val, 128);
  units.setPreset('mixed');
});
