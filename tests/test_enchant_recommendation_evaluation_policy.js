import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as policyModule from '../src/dnfHellTool/enchantRecommendationEvaluationPolicy.js';

const { createEnchantRecommendationEvaluationPolicy } = policyModule;

const DEPENDENCY_NAMES = [
  'getRecommendationGold',
  'materialEnchantMaterialOrder',
];

const PUBLIC_OUTPUTS = [
  'getCostPerPointOnePercent',
  'isMaterialAcquisition',
  'isFreeActionRecommendation',
  'isMaterialEnchantAcquisition',
  'compareMaterialEnchantOrder',
  'getRoundedMetricKey',
  'isPreferredDuplicateRecommendation',
  'removeInefficientLowerTierEnchants',
];

const PRIVATE_FUNCTIONS = [
  'getMaterialEnchantMaterialRank',
  'getMaterialEnchantSlotRank',
  'getComparableRecommendationGold',
  'getEnchantTierRank',
  'getEnchantEfficiencyValue',
];

const MATERIAL_ORDER = ['은화', '비단', '잔해', '소명'];

function createPolicy(overrides = {}) {
  return createEnchantRecommendationEvaluationPolicy({
    getRecommendationGold: (row = {}, includeMaterialCosts = false) => (
      includeMaterialCosts
        ? Number(row.goldWithMaterials ?? row.expectedGold ?? 0)
        : Number(row.expectedGold ?? row.auction?.minUnitPrice ?? 0)
    ),
    materialEnchantMaterialOrder: MATERIAL_ORDER,
    ...overrides,
  });
}

function normalizeSource(source) {
  return source.replace(/\r\n/g, '\n');
}



function testFactoryContractDependencyOrderAliasesAndPrivacy() {
  assert.deepEqual(Object.keys(policyModule), ['createEnchantRecommendationEvaluationPolicy']);
  const dependencyReads = [];
  const dependencies = new Proxy({
    getRecommendationGold: () => 1,
    materialEnchantMaterialOrder: ['소명', '은화'],
  }, {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const policy = createEnchantRecommendationEvaluationPolicy(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(policy), PUBLIC_OUTPUTS);
  PUBLIC_OUTPUTS.forEach((name) => assert.equal(typeof policy[name], 'function'));
  for (const privateName of [...PRIVATE_FUNCTIONS, 'MATERIAL_ENCHANT_SLOT_ORDER']) {
    assert.equal(privateName in policy, false);
    assert.equal(privateName in policyModule, false);
  }

  const summon = {
    acquisition: { label: '재료', materialLabel: '소명의 흔적' },
    slot: '무기',
    incrementalDamagePercent: 1,
  };
  const silver = {
    acquisition: { label: '재료', materialLabel: '은화 상자' },
    slot: '무기',
    incrementalDamagePercent: 1,
  };
  assert.ok(policy.compareMaterialEnchantOrder(summon, silver) < 0, 'aliased material order is used');

  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationEvaluationPolicy.js', import.meta.url));
  const moduleSource = normalizeSource(readFileSync(modulePath, 'utf8'));
  assert.match(
    moduleSource,
    /const \{\n    getRecommendationGold,\n    materialEnchantMaterialOrder: MATERIAL_ENCHANT_MATERIAL_ORDER,\n  \} = deps;/,
  );
}

function testCostPerPointOnePercentAndMaterialFlagForwarding() {
  const calls = [];
  const policy = createPolicy({
    getRecommendationGold(row, includeMaterialCosts) {
      calls.push({ row, includeMaterialCosts });
      return row.price;
    },
  });
  const positive = { price: 2000, incrementalDamagePercent: 4 };
  assert.equal(policy.getCostPerPointOnePercent(positive, true), 50);
  assert.strictEqual(calls[0].row, positive);
  assert.equal(calls[0].includeMaterialCosts, true);
  assert.equal(policy.getCostPerPointOnePercent({ price: Number.NaN, incrementalDamagePercent: 1 }), 0);
  assert.equal(policy.getCostPerPointOnePercent({ price: 0, incrementalDamagePercent: 1 }), 0);
  assert.equal(policy.getCostPerPointOnePercent({ price: 100, incrementalDamagePercent: 0 }), 0);
  assert.equal(policy.getCostPerPointOnePercent({ price: 100, incrementalDamagePercent: Infinity }), 0);
}

function testAcquisitionClassifications() {
  const policy = createPolicy();
  assert.equal(policy.isMaterialAcquisition({ acquisition: { label: '교환 재료' } }), true);
  assert.equal(policy.isMaterialAcquisition({ acquisition: { label: '' } }), false);
  assert.equal(policy.isMaterialAcquisition(null), false);
  assert.equal(policy.isFreeActionRecommendation({ freeAction: true }), true);
  assert.equal(policy.isFreeActionRecommendation({ freeAction: 0 }), false);
  assert.equal(policy.isMaterialEnchantAcquisition({
    sourceType: 'enchant',
    acquisition: { label: '교환 재료' },
  }), true);
  assert.equal(policy.isMaterialEnchantAcquisition({
    sourceType: 'title',
    acquisition: { label: '교환 재료' },
  }), false);
}

function testMaterialEnchantOrderingAndAliases() {
  const { compareMaterialEnchantOrder } = createPolicy();
  const row = (materialLabel, slot, incrementalDamagePercent = 1) => ({
    acquisition: { label: '재료', materialLabel },
    slot,
    incrementalDamagePercent,
  });
  const materialRows = [
    row('소명 주머니', '무기'),
    row('잔해 상자', '무기'),
    row('비단 꾸러미', '무기'),
    row('은화 상자', '무기'),
  ].sort(compareMaterialEnchantOrder);
  assert.deepEqual(
    materialRows.map((entry) => entry.acquisition.materialLabel),
    ['은화 상자', '비단 꾸러미', '잔해 상자', '소명 주머니'],
  );

  assert.equal(compareMaterialEnchantOrder(row('은화', '어깨'), row('은화', '머리어깨')), 0);
  assert.equal(compareMaterialEnchantOrder(row('은화', '보조'), row('은화', '보조장비')), 0);
  assert.ok(compareMaterialEnchantOrder(row('알 수 없음', '무기'), row('소명', '무기')) > 0);
  assert.ok(compareMaterialEnchantOrder(row('은화', '알 수 없음'), row('은화', '귀걸이')) > 0);
  assert.ok(compareMaterialEnchantOrder(row('은화', '무기', 2), row('은화', '무기', 1)) < 0);
  assert.ok(compareMaterialEnchantOrder(row('은화', '무기', 1), row('은화', '무기', 2)) > 0);
}

function testRoundedMetricKey() {
  const { getRoundedMetricKey } = createPolicy();
  assert.equal(getRoundedMetricKey(1.23456789), '1.234568');
  assert.equal(getRoundedMetricKey('2.5'), '2.500000');
  assert.equal(getRoundedMetricKey(-0.0000006), '-0.000001');
  assert.equal(getRoundedMetricKey(0), '0.000000');
  assert.equal(getRoundedMetricKey(Infinity), '0.000000');
  assert.equal(getRoundedMetricKey(Number.NaN), '0.000000');
  assert.equal(getRoundedMetricKey(undefined), '0.000000');
}

function testDuplicatePreferencePolicy() {
  const calls = [];
  const policy = createPolicy({
    getRecommendationGold(row, includeMaterialCosts) {
      calls.push({ row, includeMaterialCosts });
      return includeMaterialCosts ? row.withMaterials : row.withoutMaterials;
    },
  });
  const materialCheap = {
    acquisition: { label: '재료' },
    withoutMaterials: 999999,
    withMaterials: 999999,
  };
  const materialExpensive = {
    acquisition: { label: '재료' },
    withoutMaterials: 999999999,
    withMaterials: 999999999,
  };
  const normal = { withoutMaterials: 100, withMaterials: 1000 };
  assert.equal(policy.isPreferredDuplicateRecommendation(normal, null), true);
  assert.equal(policy.isPreferredDuplicateRecommendation(materialCheap, normal), true);
  assert.equal(policy.isPreferredDuplicateRecommendation(normal, materialCheap), false);
  assert.equal(policy.isPreferredDuplicateRecommendation(materialCheap, materialExpensive), false, 'first material row is retained');

  const free = { freeAction: true, withoutMaterials: 9999, withMaterials: 9999 };
  assert.equal(policy.isPreferredDuplicateRecommendation(free, normal), true, 'free action compares as zero gold');
  assert.equal(policy.isPreferredDuplicateRecommendation(
    { withoutMaterials: 98.999, withMaterials: 100 },
    { withoutMaterials: 100, withMaterials: 200 },
    false,
  ), true);
  assert.equal(policy.isPreferredDuplicateRecommendation(
    { withoutMaterials: 99, withMaterials: 100 },
    { withoutMaterials: 100, withMaterials: 200 },
    false,
  ), false, 'exactly one gold difference does not replace');
  assert.equal(policy.isPreferredDuplicateRecommendation(
    { withoutMaterials: 500, withMaterials: 100 },
    { withoutMaterials: 100, withMaterials: 200 },
    true,
  ), true, 'includeMaterialCosts is forwarded to the price dependency');
  assert.equal(calls.at(-1).includeMaterialCosts, true);
  assert.equal(policy.isPreferredDuplicateRecommendation(
    { withoutMaterials: 0, withMaterials: 0 },
    { withoutMaterials: Number.NaN, withMaterials: Number.NaN },
  ), false, 'two incomparable prices retain the first row');
}

function testDealerAndBufferTierEfficiencyPruning() {
  const { removeInefficientLowerTierEnchants } = createPolicy();
  const low = { sourceType: 'enchant', slot: '무기', tier: '가성비', costPerPointOnePercent: 200 };
  const middle = { sourceType: 'enchant', slot: '무기', tier: '준종결', costPerPointOnePercent: 100 };
  const high = { sourceType: 'enchant', slot: '무기', tier: '종결', costPerPointOnePercent: 90 };
  const otherSlot = { sourceType: 'enchant', slot: '상의', tier: '가성비', costPerPointOnePercent: 500 };
  const otherSlotHigh = { sourceType: 'enchant', slot: '하의', tier: '종결', costPerPointOnePercent: 1 };
  const unknownTier = { sourceType: 'enchant', slot: '무기', tier: '특수', costPerPointOnePercent: 1 };
  const otherSource = { sourceType: 'title', slot: '칭호', tier: '가성비', costPerPointOnePercent: 999 };
  const rows = [low, middle, high, otherSlot, otherSlotHigh, unknownTier, otherSource];
  const originalOrder = rows.slice();
  const dealerResult = removeInefficientLowerTierEnchants(rows, false);
  assert.deepEqual(rows, originalOrder, 'original array order and membership are unchanged');
  assert.notStrictEqual(dealerResult, rows);
  assert.deepEqual(dealerResult, [high, otherSlot, otherSlotHigh, unknownTier, otherSource]);
  dealerResult.forEach((entry) => assert.ok(rows.includes(entry), 'retained rows preserve object references'));

  const materialLow = {
    sourceType: 'enchant', slot: '벨트', tier: '종결', acquisition: { label: '재료' },
    costPerPointOnePercent: 300,
  };
  const paidMiddle = {
    sourceType: 'enchant', slot: '벨트', tier: '준종결', costPerPointOnePercent: 100,
  };
  assert.deepEqual(
    removeInefficientLowerTierEnchants([materialLow, paidMiddle], false),
    [paidMiddle],
    'material enchant uses tier rank zero',
  );

  const epsilonLow = {
    sourceType: 'enchant', slot: '신발', tier: '가성비', costPerPointOnePercent: 100,
  };
  const epsilonHigh = {
    sourceType: 'enchant', slot: '신발', tier: '준종결', costPerPointOnePercent: 99.9999995,
  };
  const epsilonRows = [epsilonLow, epsilonHigh];
  assert.strictEqual(
    removeInefficientLowerTierEnchants(epsilonRows, false),
    epsilonRows,
    '0.000001 comparison tolerance is preserved',
  );

  const bufferLow = {
    sourceType: 'enchant', slot: '목걸이', tier: '가성비',
    costPerPointOnePercent: 1, buffCostPerHundredPoints: 500,
  };
  const bufferHigh = {
    sourceType: 'enchant', slot: '목걸이', tier: '준종결',
    costPerPointOnePercent: 9999, buffCostPerHundredPoints: 200,
  };
  assert.deepEqual(
    removeInefficientLowerTierEnchants([bufferLow, bufferHigh], true),
    [bufferHigh],
    'buffer pruning uses buffCostPerHundredPoints',
  );
  assert.strictEqual(removeInefficientLowerTierEnchants([otherSource], false)[0], otherSource);
}

function testViewImportAndPolicyAssemblyContract() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const view = normalizeSource(readFileSync(viewPath, 'utf8'));

  assert.match(
    view,
    /import \{ createEnchantRecommendationEvaluationPolicy \} from '\.\/enchantRecommendationEvaluationPolicy\.js';/,
  );
  const factoryIndex = view.indexOf('} = createEnchantRecommendationEvaluationPolicy({');
  assert.ok(factoryIndex >= 0, 'recommendation evaluation policy factory is assembled');
  const factoryBlock = view.slice(
    view.lastIndexOf('const {', factoryIndex),
    view.indexOf('});', factoryIndex) + 3,
  );
  PUBLIC_OUTPUTS.forEach((name) => {
    assert.match(factoryBlock, new RegExp(`\\b${name}\\b`));
  });
  assert.match(factoryBlock, /\bgetRecommendationGold\b/);
  assert.match(
    factoryBlock,
    /materialEnchantMaterialOrder:\s*MATERIAL_ENCHANT_MATERIAL_ORDER/,
  );
}

const tests = [
  testFactoryContractDependencyOrderAliasesAndPrivacy,
  testCostPerPointOnePercentAndMaterialFlagForwarding,
  testAcquisitionClassifications,
  testMaterialEnchantOrderingAndAliases,
  testRoundedMetricKey,
  testDuplicatePreferencePolicy,
  testDealerAndBufferTierEfficiencyPruning,
  testViewImportAndPolicyAssemblyContract,
];

let failures = 0;
for (const test of tests) {
  try {
    test();
    console.log(`ok - ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${test.name}`);
    console.error(error?.stack || error);
  }
}

if (failures > 0) process.exitCode = 1;
else console.log('enchant recommendation evaluation policy: ok');
