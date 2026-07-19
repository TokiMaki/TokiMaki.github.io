import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as damageMetricModule from '../src/dnfHellTool/enchantDealerDamageMetric.js';

const { createEnchantDealerDamageMetric } = damageMetricModule;

const DEPENDENCY_NAMES = ['elementEffectKeyByName'];
const PUBLIC_OUTPUTS = [
  'getDealerPrimaryStatKey',
  'getDamageBaseline',
  'getEquipmentScoreEffectiveStat',
  'getSelectedStatEffect',
  'estimateDamagePercent',
  'estimateDamageMultiplier',
  'regionAttackFlat',
  'elementDamagePerElement',
];
const MOVED_CONSTANTS = [
  'ENCHANT_DAMAGE_BASELINE',
  'REGION_STAT_FLAT_A',
  'REGION_STAT_FLAT_B',
  'REGION_STAT_SCALE',
  'REGION_STAT_OFFSET',
  'REGION_ATTACK_FLAT',
  'ELEMENT_DAMAGE_PER_ELEMENT',
  'ELEMENT_BASE_DAMAGE_PERCENT',
];
const MOVED_FUNCTIONS = [
  'getDealerPrimaryStatKey',
  'getDamageBaseline',
  'getEquipmentScoreEffectiveStat',
  'getSelectedStatEffect',
  'estimateDamagePercent',
  'estimateDamageMultiplier',
];
const ELEMENT_EFFECT_KEY_BY_NAME = {
  fire: 'elementFire',
  water: 'elementWater',
  light: 'elementLight',
  dark: 'elementDark',
};

function createMetric(overrides = {}) {
  return createEnchantDealerDamageMetric({
    elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
    ...overrides,
  });
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function assertClose(actual, expected, tolerance = 1e-12) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `expected ${actual} to be within ${tolerance * scale} of ${expected}`,
  );
}

function normalizeSource(source) {
  return source.replace(/\r\n/g, '\n');
}



function testFactoryContractAliasesOutputOrderAndPrivacy() {
  assert.deepEqual(Object.keys(damageMetricModule), ['createEnchantDealerDamageMetric']);
  const dependencyReads = [];
  const dependencies = new Proxy({
    elementEffectKeyByName: {
      dark: 'elementDark',
      fire: 'elementFire',
      water: 'elementWater',
      light: 'elementLight',
    },
  }, {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const metric = createEnchantDealerDamageMetric(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(metric), PUBLIC_OUTPUTS);
  MOVED_FUNCTIONS.forEach((name) => assert.equal(typeof metric[name], 'function'));
  assert.equal(metric.regionAttackFlat, 31215);
  assert.equal(metric.elementDamagePerElement, 0.45);
  for (const privateName of MOVED_CONSTANTS) {
    assert.equal(privateName in metric, false);
    assert.equal(privateName in damageMetricModule, false);
  }

  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantDealerDamageMetric.js', import.meta.url));
  const moduleSource = normalizeSource(readFileSync(modulePath, 'utf8'));
  assert.match(
    moduleSource,
    /const \{\n    elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,\n  \} = deps;/,
  );
  assert.deepEqual(
    Object.keys(metric.getDamageBaseline({ elementValues: { dark: 1, fire: 2, water: 3, light: 4 } }).elementValues),
    ['dark', 'fire', 'water', 'light'],
    'the aliased dependency controls elementValues key order',
  );
}

function testPrimaryStatAndDamageBaselineFallbacksOrderAndReferences() {
  const customElementOrder = {
    dark: 'elementDark',
    fire: 'elementFire',
    water: 'elementWater',
    light: 'elementLight',
  };
  const {
    getDealerPrimaryStatKey,
    getDamageBaseline,
  } = createMetric({ elementEffectKeyByName: customElementOrder });

  assert.equal(getDealerPrimaryStatKey({ statName: '힘' }), 'str');
  assert.equal(getDealerPrimaryStatKey({ statName: '지능' }), 'int');
  assert.equal(getDealerPrimaryStatKey({ statName: '체력' }), '');
  assert.equal(getDealerPrimaryStatKey(), '');

  assert.deepEqual(getDamageBaseline(), {
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: '',
    elementNames: [],
    elementValues: { dark: 0, fire: 0, water: 0, light: 0 },
    elementDamage: 153.5,
    attack: 4000,
    attackSource: '',
    finalDamage: 0,
    attackIncrease: 0,
    attackAmplification: 0,
  });

  const custom = deepFreeze({
    stat: '7001',
    statName: '지능',
    baseStat: '901',
    element: '351',
    elementName: 'light',
    elementNames: ['water', '', null, 'fire'],
    elementValues: { dark: '11', fire: 12, water: '13', light: null },
    elementDamage: 0,
    attack: '5001',
    attackSource: ' independent ',
    finalDamage: '12',
    attackIncrease: '23',
    attackAmplification: '7',
  });
  const snapshot = clone(custom);
  const result = getDamageBaseline(custom);
  assert.deepEqual(result, {
    stat: 7001,
    statName: '지능',
    baseStat: 901,
    element: 351,
    elementName: 'water',
    elementNames: ['water', 'fire'],
    elementValues: { dark: 11, fire: 12, water: 13, light: 0 },
    elementDamage: 0,
    attack: 5001,
    attackSource: 'independent',
    finalDamage: 12,
    attackIncrease: 23,
    attackAmplification: 7,
  });
  assert.deepEqual(custom, snapshot);
  assert.notStrictEqual(result, custom);
  assert.notStrictEqual(result.elementNames, custom.elementNames);
  assert.notStrictEqual(result.elementValues, custom.elementValues);

  assert.deepEqual(getDamageBaseline({
    stat: 0,
    statName: 'unknown',
    baseStat: Number.NaN,
    element: '',
    elementName: 'dark',
    elementValues: { dark: 'bad' },
    elementDamage: 'bad',
    attack: 0,
    finalDamage: undefined,
    attackIncrease: 'bad',
    attackAmplification: null,
  }), {
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: 'dark',
    elementNames: ['dark'],
    elementValues: { dark: Number.NaN, fire: 0, water: 0, light: 0 },
    elementDamage: 153.5,
    attack: 4000,
    attackSource: '',
    finalDamage: 0,
    attackIncrease: 0,
    attackAmplification: 0,
  });
}

function testEffectiveStatTruncationAndSelectedStatBranches() {
  const {
    getEquipmentScoreEffectiveStat,
    getSelectedStatEffect,
  } = createMetric();
  for (const [stat, baseStat] of [
    [6500, 800],
    [800.25, 800],
    [-1000.5, 1000.25],
  ]) {
    assert.equal(
      getEquipmentScoreEffectiveStat(stat, baseStat),
      stat + 168350 + 297900 + Math.trunc(3.08 * (stat - baseStat) + 2886),
    );
  }
  assert.equal(getSelectedStatEffect({ allStat: 0, str: 999 }, { statName: '힘' }), 0);
  assert.equal(getSelectedStatEffect({ allStat: 10, int: 999 }, { statName: '지능' }), 10);
  assert.equal(getSelectedStatEffect({ allStat: Number.NaN, int: '25' }, { statName: '지능' }), 25);
  assert.equal(getSelectedStatEffect({ str: '30', int: 50 }, { statName: '힘' }), 30);
  assert.equal(getSelectedStatEffect({ str: 30, int: '50' }, { statName: '지능' }), 50);
  assert.equal(getSelectedStatEffect({ int: 50 }), 0);
}

function testDamageMultiplierSentinelsProductPercentRatioAndImmutability() {
  const {
    getDamageBaseline,
    getEquipmentScoreEffectiveStat,
    getSelectedStatEffect,
    estimateDamageMultiplier,
    estimateDamagePercent,
  } = createMetric();
  const baseline = deepFreeze({
    stat: 7000,
    statName: '지능',
    baseStat: 900,
    element: 350,
    elementDamage: 162.5,
    attack: 4500,
    finalDamage: 12,
    attackIncrease: 23,
    attackAmplification: 7,
  });
  const base = getDamageBaseline(baseline);
  const sentinels = {
    finalDamage: { finalDamage: 9 },
    attackIncrease: { attackIncrease: 11 },
    attackAmplification: { attackAmplification: 5 },
    element: { elementAll: 13 },
    attack: { attack: 777 },
    stat: { int: 321 },
    skillDamage: { skillDamageMultiplier: 1.17 },
  };
  const expected = {
    finalDamage: (1 + (base.finalDamage + 9) / 100) / (1 + base.finalDamage / 100),
    attackIncrease: (1 + (base.attackIncrease + 11) / 100) / (1 + base.attackIncrease / 100),
    attackAmplification: (1 + (base.attackAmplification + 5) / 100) / (1 + base.attackAmplification / 100),
    element: (1 + (base.elementDamage + 13 * 0.45) / 100) / (1 + base.elementDamage / 100),
    attack: (base.attack + 31215 + 777) / (base.attack + 31215),
    stat: (
      1 + getEquipmentScoreEffectiveStat(base.stat + getSelectedStatEffect(sentinels.stat, base), base.baseStat) / 250
    ) / (1 + getEquipmentScoreEffectiveStat(base.stat, base.baseStat) / 250),
    skillDamage: 1.17,
  };
  assert.equal(estimateDamageMultiplier({}, baseline), 1);
  Object.keys(sentinels).forEach((key) => {
    assertClose(estimateDamageMultiplier(sentinels[key], baseline), expected[key]);
  });
  assert.equal(estimateDamageMultiplier({ skillDamageMultiplier: 0 }, baseline), 1);
  assert.equal(estimateDamageMultiplier({ skillDamageMultiplier: Number.NaN }, baseline), 1);

  const combined = deepFreeze(Object.assign({}, ...Object.values(sentinels)));
  const baselineSnapshot = clone(baseline);
  const combinedSnapshot = clone(combined);
  const combinedExpected = Object.values(expected).reduce((product, value) => product * value, 1);
  assertClose(estimateDamageMultiplier(combined, baseline), combinedExpected);
  assertClose(
    estimateDamagePercent(combined, baseline),
    (estimateDamageMultiplier(combined, baseline) / estimateDamageMultiplier({}, baseline) - 1) * 100,
  );
  assert.ok(Number.isNaN(
    estimateDamagePercent({ finalDamage: 10 }, { ...baseline, finalDamage: -100 }),
  ), 'percent retains the ratio against the empty-effect multiplier');
  assert.deepEqual(baseline, baselineSnapshot);
  assert.deepEqual(combined, combinedSnapshot);
}

function createStubModuleSource(importNames) {
  const lines = [];
  for (const name of importNames) {
    if (name.startsWith('createEnchant')) {
      lines.push(`export function ${name}() {`);
      lines.push('  return new Proxy({}, { get() { return () => undefined; } });');
      lines.push('}');
    } else if (/^[A-Z0-9_]+$/.test(name)) {
      const value = name === 'UPGRADE_SLOT_LABELS' ? '{}'
        : name.includes('COLOR_STOPS') ? '[]'
          : '0';
      lines.push(`export const ${name} = ${value};`);
    } else {
      lines.push(`export function ${name}() { return []; }`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function testViewImportAssemblyAndTdzSmoke() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantDealerDamageMetric.js', import.meta.url));
  const view = normalizeSource(readFileSync(viewPath, 'utf8'));

  assert.match(
    view,
    /import \{ createEnchantDealerDamageMetric \} from '\.\/enchantDealerDamageMetric\.js';/,
  );
  const factoryIndex = view.indexOf('} = createEnchantDealerDamageMetric({');
  assert.ok(factoryIndex >= 0, 'dealer damage metric factory is assembled');
  const factoryBlock = view.slice(
    view.lastIndexOf('const {', factoryIndex),
    view.indexOf('});', factoryIndex) + 3,
  );
  PUBLIC_OUTPUTS.forEach((name) => {
    assert.match(factoryBlock, new RegExp(`\\b${name}\\b`));
  });
  assert.match(factoryBlock, /regionAttackFlat:\s*REGION_ATTACK_FLAT/);
  assert.match(factoryBlock, /elementDamagePerElement:\s*ELEMENT_DAMAGE_PER_ELEMENT/);
  assert.match(factoryBlock, /elementEffectKeyByName:\s*ELEMENT_EFFECT_KEY_BY_NAME/);

  const smokeRoot = mkdtempSync(join(tmpdir(), 'enchant-dealer-damage-metric-'));
  try {
    const smokeSourceDir = join(smokeRoot, 'src', 'dnfHellTool');
    mkdirSync(smokeSourceDir, { recursive: true });
    writeFileSync(join(smokeRoot, 'package.json'), '{"type":"module"}\n');
    copyFileSync(viewPath, join(smokeSourceDir, 'enchantView.js'));
    copyFileSync(modulePath, join(smokeSourceDir, 'enchantDealerDamageMetric.js'));
    const importPattern = /import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';/g;
    for (const match of view.matchAll(importPattern)) {
      const specifier = match[2];
      if (specifier === './enchantDealerDamageMetric.js') continue;
      const names = match[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.split(/\s+as\s+/)[0]);
      const targetPath = resolve(smokeSourceDir, specifier);
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, createStubModuleSource(names));
    }
    const imported = await import(`${pathToFileURL(join(smokeSourceDir, 'enchantView.js')).href}?tdz=${Date.now()}`);
    assert.equal(typeof imported.installEnchantView, 'function');
  } finally {
    rmSync(smokeRoot, { recursive: true, force: true });
  }
}

const tests = [
  testFactoryContractAliasesOutputOrderAndPrivacy,
  testPrimaryStatAndDamageBaselineFallbacksOrderAndReferences,
  testEffectiveStatTruncationAndSelectedStatBranches,
  testDamageMultiplierSentinelsProductPercentRatioAndImmutability,
  testViewImportAssemblyAndTdzSmoke,
];

let failures = 0;
for (const test of tests) {
  try {
    await test();
    console.log(`ok - ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${test.name}`);
    console.error(error?.stack || error);
  }
}

if (failures) process.exitCode = 1;
else console.log('enchant dealer damage metric: ok');
