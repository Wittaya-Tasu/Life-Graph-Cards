const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../promyan_wt_tuksa9.5.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const source = scripts.at(-1);
const ctx = vm.createContext({ console, window: { addEventListener() {} }, document: { addEventListener() {} } });
vm.runInContext(source, ctx);
test('all inline scripts parse', () => scripts.forEach(s => new vm.Script(s)));
test('V9.5 removes the topic UI, state and API entirely', () => {
  assert.match(html, /V9\.5/);
  assert.doesNotMatch(html, /seven-topic|SevenTopic|SEVEN_TOPIC/);
  assert.match(html, /function calculateSevenGroupStrength/);
});
test('nine-base golden case 7-5-1', () => {
  const result = ctx.calculateNineBaseCore(107, 205, 301);
  assert.equal(JSON.stringify(result.base8), '[6,4,2,7,5,3,1]');
  assert.equal(JSON.stringify(result.base9), '[6,1,3,5,7,2,4]');
  assert.equal(JSON.stringify(result.base4), '[13,9,12,8,11,14,17]');
});
test('all 1,008 day/month/zodiac inputs preserve numeric invariants', () => {
  for (let d=101; d<=107; d++) for (let m=201; m<=212; m++) for (let y=301; y<=312; y++) {
    const r = ctx.calculateNineBaseCore(d,m,y);
    for (const base of [1,2,3,5,6,7,8,9]) {
      assert.equal([...r['base'+base]].sort().join(','), '1,2,3,4,5,6,7');
    }
    r.base4.forEach((n,i) => assert.equal(n,r.base1[i]+r.base2[i]+r.base3[i]));
  }
});
test('invalid seeds rejected', () => assert.throws(() => ctx.calculateNineBaseCore(999,201,301)));
test('form associations and keyboard support exist', () => {
  for(const id of ['sel-date','sel-day','sel-month','sel-year','birth-be-year','sel-age-mode','sel-zodiac-row','sel-taksa','sel-timeline']) {
    assert.match(html, new RegExp('for="'+id+'"'));
  }
  assert.match(html, /event\.key === 'Enter'/);
  assert.match(html, /role="meter"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /restoreFocusKey\(focusKey\)/);
  assert.doesNotMatch(html, /onerror="this.src=/);
});
