import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createEnchantRecommendationControls } from '../src/dnfHellTool/enchantRecommendationControls.js';

const INCLUDE_KEY = 'include-filter';
const KNOWN_KEY = 'include-known-filter';
const DEFAULT_INCLUDE_KEYS = [
  '마법부여:가성비',
  '마법부여:준종결',
  '마법부여:종결',
  '오라/칭호/크리쳐:일반',
  '오라/칭호/크리쳐:플래티넘',
  '오라/칭호/크리쳐:오라',
  '오라/칭호/크리쳐:칭호',
  '오라/칭호/크리쳐:크리쳐',
  '오라/칭호/크리쳐:아티팩트',
  '버프강화:칭호',
  '버프강화:크리쳐',
  '버프강화:짙편린',
  '버프강화:아바타',
  '아바타:엠블렘',
  '아바타:플래티넘 엠블렘',
  '강화/증폭:강화',
  '강화/증폭:증폭',
  '장비:조율',
  '장비:유일',
  '서약:조율',
  '서약:초월/정가',
  '흑아:흑아',
];
const SLOT_ORDER = [
  '무기',
  '상의',
  '하의',
  '머리어깨',
  '벨트',
  '신발',
  '팔찌',
  '목걸이',
  '반지',
  '보조장비',
  '귀걸이',
  '마법석',
  '크리쳐',
  '칭호',
  '벞강 칭호',
  '아바타',
  '모자 아바타',
  '머리 아바타',
  '얼굴 아바타',
  '목가슴 아바타',
  '상의 아바타',
  '하의 아바타',
  '벞강 상의',
  '벞강 하의',
  '무기 아바타',
  '오라 아바타',
  '피부 아바타',
  '장비 조율',
  '서약 조율',
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

class FakeIncludeControls {
  constructor(inputs = []) {
    this._innerHTML = '';
    this.inputs = inputs.map((input) => ({ ...input }));
    this.childElementCount = this.inputs.length ? 1 : 0;
  }

  querySelectorAll(selector) {
    assert.ok([
      'input[data-enchant-tier]',
      'input[data-enchant-tier]:checked',
    ].includes(selector), `unexpected selector: ${selector}`);
    if (selector.endsWith(':checked')) {
      return this.inputs.filter((input) => input.checked);
    }
    return this.inputs;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.inputs = [...value.matchAll(
      /<input type="checkbox" data-enchant-tier="([^"]*)" value="([^"]*)" (checked)? \/>/g,
    )].map((match) => ({
      dataEnchantTier: match[1],
      value: match[2],
      checked: Boolean(match[3]),
    }));
    this.childElementCount = value ? 1 : 0;
  }
}

class FakeSelect {
  constructor(value = 'all') {
    this.value = value;
    this.innerHTML = '';
  }

  get optionValues() {
    return [...this.innerHTML.matchAll(/<option value="([^"]*)">/g)].map((match) => match[1]);
  }
}

class FakeStorage {
  constructor(initial = {}, options = {}) {
    this.values = new Map(Object.entries(initial));
    this.calls = [];
    this.readThrowKeys = new Set(options.readThrowKeys || []);
    this.writeThrowKeys = new Set(options.writeThrowKeys || []);
    this.throwFirstWrite = Boolean(options.throwFirstWrite);
    this.writeCount = 0;
  }

  getItem(key) {
    this.calls.push(['getItem', key]);
    if (this.readThrowKeys.has(key)) throw new Error(`read blocked: ${key}`);
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.calls.push(['setItem', key, value]);
    this.writeCount += 1;
    if (
      this.writeThrowKeys.has(key)
      || (this.throwFirstWrite && this.writeCount === 1)
    ) {
      throw new Error(`write blocked: ${key}`);
    }
    this.values.set(key, value);
  }
}

function createHarness({
  includeControls = new FakeIncludeControls(),
  slotFilter = new FakeSelect(),
  tierFilter = new FakeSelect(),
  storage = new FakeStorage(),
  getIncludeKeysForRow = (row) => row.includeKeys || [],
} = {}) {
  return {
    includeControls,
    slotFilter,
    tierFilter,
    storage,
    controls: createEnchantRecommendationControls({
      escapeHtml,
      slotOrder: SLOT_ORDER,
      getIncludeKeysForRow,
      slotFilter,
      tierFilter,
      includeControls,
      includeFilterStorageKey: INCLUDE_KEY,
      includeKnownFilterStorageKey: KNOWN_KEY,
      storage,
    }),
  };
}

function checkedValues(includeControls) {
  return includeControls.querySelectorAll('input[data-enchant-tier]:checked')
    .map((input) => input.value);
}

function getInput(includeControls, value) {
  return includeControls.querySelectorAll('input[data-enchant-tier]')
    .find((input) => input.value === value);
}

function assertStoredJson(storage, key, expected) {
  assert.deepEqual(JSON.parse(storage.values.get(key)), expected);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test('container 없음은 storage를 읽지 않고 selected 결과가 null이다', () => {
  const storage = new FakeStorage({}, { readThrowKeys: [INCLUDE_KEY, KNOWN_KEY] });
  const controls = createEnchantRecommendationControls({
    escapeHtml,
    slotOrder: SLOT_ORDER,
    getIncludeKeysForRow: () => [],
    slotFilter: null,
    tierFilter: null,
    includeControls: null,
    includeFilterStorageKey: INCLUDE_KEY,
    includeKnownFilterStorageKey: KNOWN_KEY,
    storage,
  });

  controls.renderEnchantIncludeControls();
  assert.equal(controls.getSelectedEnchantIncludeTiers(), null);
  assert.deepEqual(storage.calls, []);
});

test('storage null은 기본 HTML과 기본-disabled 서약 상태를 보존한다', () => {
  const { controls, includeControls, storage } = createHarness();

  assert.deepEqual(storage.calls, []);
  controls.renderEnchantIncludeControls();

  assert.equal(includeControls.innerHTML.length, 7790);
  assert.equal(
    sha256(includeControls.innerHTML),
    '8532a6da96687a2b5a6908182b133ff9ced835dbd650c2b22515306556a35df8',
  );
  assert.equal(includeControls.inputs.length, 22);
  assert.equal(getInput(includeControls, '서약:초월/정가').checked, false);
  assert.equal(checkedValues(includeControls).length, 21);
  assert.deepEqual(storage.calls, [['getItem', INCLUDE_KEY]]);
});

test('storage []은 저장값 우선으로 전체 체크 해제를 유지한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: '[]',
    [KNOWN_KEY]: JSON.stringify(DEFAULT_INCLUDE_KEYS),
  });
  const includeControls = new FakeIncludeControls([
    { value: '마법부여:가성비', checked: true },
    { value: '마법부여:종결', checked: true },
  ]);
  const { controls } = createHarness({ includeControls, storage });

  controls.renderEnchantIncludeControls();

  assert.deepEqual(checkedValues(includeControls), []);
  assert.deepEqual(storage.calls, [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
  ]);
});

test('정상 저장값은 기존 DOM보다 우선하고 매 호출마다 다시 읽는다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:준종결']),
    [KNOWN_KEY]: JSON.stringify(DEFAULT_INCLUDE_KEYS),
  });
  const includeControls = new FakeIncludeControls([
    { value: '마법부여:가성비', checked: true },
    { value: '마법부여:종결', checked: true },
  ]);
  const { controls } = createHarness({ includeControls, storage });

  assert.deepEqual(storage.calls, []);
  controls.renderEnchantIncludeControls();
  assert.deepEqual(checkedValues(includeControls), ['마법부여:준종결']);

  storage.values.set(INCLUDE_KEY, JSON.stringify(['흑아:흑아']));
  controls.renderEnchantIncludeControls();
  assert.deepEqual(checkedValues(includeControls), ['흑아:흑아']);
  assert.deepEqual(storage.calls.map((call) => call.slice(0, 2)), [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
  ]);
});

test('invalid JSON은 DOM 체크 상태를 보존하고 known key를 읽지 않는다', () => {
  const storage = new FakeStorage({ [INCLUDE_KEY]: '{invalid' });
  const includeControls = new FakeIncludeControls([
    { value: '마법부여:가성비', checked: false },
    { value: '마법부여:종결', checked: true },
  ]);
  const { controls } = createHarness({ includeControls, storage });

  controls.renderEnchantIncludeControls(['마법부여:가성비', '마법부여:종결']);

  assert.equal(includeControls.innerHTML.length, 741);
  assert.equal(
    sha256(includeControls.innerHTML),
    'adf99493704bc8bfb1718d510a58d7cb4087446a12d36158a308023453599e15',
  );
  assert.deepEqual(checkedValues(includeControls), ['마법부여:종결']);
  assert.deepEqual(storage.calls, [['getItem', INCLUDE_KEY]]);
});

test('storage read throw는 DOM/default fallback으로 진행한다', () => {
  const storage = new FakeStorage({}, { readThrowKeys: [INCLUDE_KEY] });
  const includeControls = new FakeIncludeControls([
    { value: '마법부여:가성비', checked: false },
    { value: '마법부여:종결', checked: true },
  ]);
  const { controls } = createHarness({ includeControls, storage });

  controls.renderEnchantIncludeControls(['마법부여:가성비', '마법부여:종결']);

  assert.deepEqual(checkedValues(includeControls), ['마법부여:종결']);
  assert.deepEqual(storage.calls, [['getItem', INCLUDE_KEY]]);
});

test('legacy oath migration은 Set delete/add 순서와 저장 배열을 보존한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify([
      '마법부여:가성비',
      '서약:초월',
      'future:unknown',
      '서약:정가',
    ]),
    [KNOWN_KEY]: JSON.stringify(DEFAULT_INCLUDE_KEYS),
  });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assertStoredJson(storage, INCLUDE_KEY, [
    '마법부여:가성비',
    'future:unknown',
    '서약:초월/정가',
  ]);
  assert.equal(getInput(includeControls, '서약:초월/정가').checked, true);
  assert.equal(includeControls.innerHTML.includes('future:unknown'), false);
  assert.deepEqual(storage.calls.map((call) => call.slice(0, 2)), [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
    ['setItem', INCLUDE_KEY],
  ]);
});

test('legacy 유일 제작 체크 상태는 장비 유일로 이동한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비', '유일:제작']),
    [KNOWN_KEY]: JSON.stringify([
      ...DEFAULT_INCLUDE_KEYS.filter((key) => key !== '장비:유일'),
      '유일:제작',
    ]),
  });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assert.equal(getInput(includeControls, '장비:유일').checked, true);
  assert.equal(getInput(includeControls, '유일:제작'), undefined);
  assertStoredJson(storage, INCLUDE_KEY, ['마법부여:가성비', '장비:유일']);
  assertStoredJson(storage, KNOWN_KEY, DEFAULT_INCLUDE_KEYS);
});

test('legacy 유일 제작을 해제했던 사용자는 장비 유일도 해제 상태를 유지한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비']),
    [KNOWN_KEY]: JSON.stringify([
      ...DEFAULT_INCLUDE_KEYS.filter((key) => key !== '장비:유일'),
      '유일:제작',
    ]),
  });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assert.equal(getInput(includeControls, '장비:유일').checked, false);
  assertStoredJson(storage, INCLUDE_KEY, ['마법부여:가성비']);
  assertStoredJson(storage, KNOWN_KEY, DEFAULT_INCLUDE_KEYS);
});

test('legacy fixture HTML 해시를 보존한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비', '서약:초월']),
  });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assert.equal(
    sha256(includeControls.innerHTML),
    'e92e98778a9ab0aeb798dbc91f6e1be92b6e345253e135a7ee767c59269bc8f0',
  );
});

test('신규 일반 key는 자동 체크하고 신규 default-disabled key는 체크하지 않는다', () => {
  const knownWithoutNewKeys = DEFAULT_INCLUDE_KEYS.filter((key) => ![
    '서약:초월/정가',
    '흑아:흑아',
  ].includes(key));
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비']),
    [KNOWN_KEY]: JSON.stringify(knownWithoutNewKeys),
  });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assertStoredJson(storage, INCLUDE_KEY, ['마법부여:가성비', '흑아:흑아']);
  assertStoredJson(storage, KNOWN_KEY, DEFAULT_INCLUDE_KEYS);
  assert.equal(getInput(includeControls, '흑아:흑아').checked, true);
  assert.equal(getInput(includeControls, '서약:초월/정가').checked, false);
  assert.deepEqual(storage.calls.map((call) => call.slice(0, 2)), [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
    ['setItem', INCLUDE_KEY],
    ['setItem', KNOWN_KEY],
  ]);
});

test('첫 setItem 실패 후에도 known setItem을 독립적으로 시도한다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비', '서약:초월']),
  }, { throwFirstWrite: true });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assert.equal(getInput(includeControls, '서약:초월/정가').checked, true);
  assert.deepEqual(storage.calls.map((call) => call.slice(0, 2)), [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
    ['setItem', INCLUDE_KEY],
    ['setItem', KNOWN_KEY],
  ]);
  assertStoredJson(storage, KNOWN_KEY, DEFAULT_INCLUDE_KEYS);
});

test('두 번째 setItem 실패는 현재 렌더 체크 상태를 바꾸지 않는다', () => {
  const storage = new FakeStorage({
    [INCLUDE_KEY]: JSON.stringify(['마법부여:가성비']),
    [KNOWN_KEY]: JSON.stringify(DEFAULT_INCLUDE_KEYS.filter((key) => key !== '흑아:흑아')),
  }, { writeThrowKeys: [KNOWN_KEY] });
  const { controls, includeControls } = createHarness({ storage });

  controls.renderEnchantIncludeControls();

  assert.equal(getInput(includeControls, '흑아:흑아').checked, true);
  assertStoredJson(storage, INCLUDE_KEY, ['마법부여:가성비', '흑아:흑아']);
  assert.deepEqual(storage.calls.map((call) => call.slice(0, 2)), [
    ['getItem', INCLUDE_KEY],
    ['getItem', KNOWN_KEY],
    ['setItem', INCLUDE_KEY],
    ['setItem', KNOWN_KEY],
  ]);
});

test('DOM 축소 후 재등장 key는 현재 DOM/default 규칙으로 복원된다', () => {
  const { controls, includeControls } = createHarness({
    storage: new FakeStorage(),
  });

  controls.renderEnchantIncludeControls();
  getInput(includeControls, '마법부여:종결').checked = false;
  controls.renderEnchantIncludeControls(['마법부여:가성비']);
  assert.equal(getInput(includeControls, '마법부여:종결'), undefined);

  controls.renderEnchantIncludeControls(['마법부여:가성비', '마법부여:종결']);
  assert.equal(getInput(includeControls, '마법부여:종결').checked, true);

  controls.renderEnchantIncludeControls(['마법부여:가성비']);
  controls.renderEnchantIncludeControls(['마법부여:가성비', '서약:초월/정가']);
  assert.equal(getInput(includeControls, '서약:초월/정가').checked, false);
});

test('unknown include key는 표시하지 않고 hierarchical buff avatar parent fallback을 허용한다', () => {
  const { controls, includeControls } = createHarness();

  controls.renderEnchantIncludeControls([
    '마법부여:가성비',
    'future:unknown',
    '버프강화:아바타:플래티넘 엠블렘',
  ]);

  assert.deepEqual(includeControls.inputs.map((input) => input.value), ['마법부여:가성비']);
  assert.equal(includeControls.innerHTML.includes('future:unknown'), false);
  assert.equal(
    controls.isEnchantIncludeKeySelected(
      '버프강화:아바타:플래티넘 엠블렘',
      new Set(['버프강화:아바타']),
    ),
    true,
  );
  assert.equal(
    controls.isEnchantIncludeKeySelected(
      '버프강화:아바타:플래티넘 엠블렘',
      new Set(['버프강화:칭호']),
    ),
    false,
  );
  assert.equal(controls.isEnchantIncludeKeySelected('future:unknown', null), true);
  assert.equal(
    controls.isEnchantIncludeKeySelected('future:unknown', new Set(['future:unknown'])),
    true,
  );
});

test('slot/tier 중복 제거, 공식 순서, unknown stable order, 선택 유지와 all fallback을 보존한다', () => {
  const slotFilter = new FakeSelect('하의');
  const tierFilter = new FakeSelect('종결');
  const { controls } = createHarness({ slotFilter, tierFilter });
  const rows = [
    { slot: '미지B', tier: '미지2', includeKeys: ['future:B'] },
    { slot: '하의', tier: '종결', includeKeys: ['마법부여:종결'] },
    { slot: '미지A', tier: '미지1', includeKeys: ['future:A'] },
    { slot: '무기', tier: '가성비', includeKeys: ['마법부여:가성비'] },
    { slot: '미지B', tier: '미지2', includeKeys: ['future:B'] },
  ];

  controls.renderEnchantFilters(rows);

  assert.deepEqual(slotFilter.optionValues, ['all', '무기', '하의', '미지B', '미지A']);
  assert.deepEqual(tierFilter.optionValues, ['all', '가성비', '종결', '미지2', '미지1']);
  assert.equal(slotFilter.value, '하의');
  assert.equal(tierFilter.value, '종결');

  controls.renderEnchantFilters([{ slot: '무기', tier: '가성비', includeKeys: [] }]);
  assert.equal(slotFilter.value, 'all');
  assert.equal(tierFilter.value, 'all');
});

test('setOptions는 기존과 같이 option 값과 label을 escape하지 않는다', () => {
  const slotFilter = new FakeSelect();
  const tierFilter = new FakeSelect();
  const { controls } = createHarness({ slotFilter, tierFilter });

  controls.renderEnchantFilters([{
    slot: '<b>미지</b>',
    tier: '<i>등급</i>',
    includeKeys: [],
  }]);

  assert.ok(slotFilter.innerHTML.includes(
    '<option value="<b>미지</b>"><b>미지</b></option>',
  ));
  assert.ok(tierFilter.innerHTML.includes(
    '<option value="<i>등급</i>"><i>등급</i></option>',
  ));
});

test('selected include tier는 중복 없이 Set으로 반환하고 전체 해제는 빈 Set이다', () => {
  const { controls, includeControls } = createHarness();
  controls.renderEnchantIncludeControls([
    '마법부여:가성비',
    '마법부여:종결',
  ]);

  getInput(includeControls, '마법부여:가성비').checked = false;
  assert.deepEqual(
    [...controls.getSelectedEnchantIncludeTiers()],
    ['마법부여:종결'],
  );
  getInput(includeControls, '마법부여:종결').checked = false;
  assert.deepEqual([...controls.getSelectedEnchantIncludeTiers()], []);
});

test('reset은 slot/tier만 all로 바꾸고 include DOM과 체크를 건드리지 않는다', () => {
  const slotFilter = new FakeSelect('무기');
  const tierFilter = new FakeSelect('종결');
  const { controls, includeControls } = createHarness({ slotFilter, tierFilter });
  controls.renderEnchantIncludeControls(['마법부여:가성비', '마법부여:종결']);
  getInput(includeControls, '마법부여:가성비').checked = false;
  const beforeHtml = includeControls.innerHTML;
  const beforeChecked = checkedValues(includeControls);

  controls.resetEnchantRecommendationFilters();

  assert.equal(slotFilter.value, 'all');
  assert.equal(tierFilter.value, 'all');
  assert.equal(includeControls.innerHTML, beforeHtml);
  assert.deepEqual(checkedValues(includeControls), beforeChecked);
});

let passed = 0;
for (const { name, run } of tests) {
  try {
    run();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (error) {
    console.error(`not ok ${passed + 1} - ${name}`);
    throw error;
  }
}
console.log(`1..${tests.length}`);
