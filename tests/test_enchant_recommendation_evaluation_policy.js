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

const MOVED_FUNCTIONS = [
  'getCostPerPointOnePercent',
  'isMaterialAcquisition',
  'isFreeActionRecommendation',
  'isMaterialEnchantAcquisition',
  'getMaterialEnchantMaterialRank',
  'getMaterialEnchantSlotRank',
  'compareMaterialEnchantOrder',
  'getRoundedMetricKey',
  'getComparableRecommendationGold',
  'isPreferredDuplicateRecommendation',
  'getEnchantTierRank',
  'getEnchantEfficiencyValue',
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

function getFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} definition exists`);
  const bodyStart = source.indexOf(') {', start) + 2;
  assert.ok(bodyStart >= 2, `${name} body exists`);
  let depth = 0;
  let state = 'code';
  let quote = '';
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (state === 'lineComment') {
      if (character === '\n' || character === '\r') state = 'code';
      continue;
    }
    if (state === 'blockComment') {
      if (character === '*' && next === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (state === 'string') {
      if (character === '\\') index += 1;
      else if (character === quote) state = 'code';
      continue;
    }
    if (state === 'template') {
      if (character === '\\') index += 1;
      else if (character === '`') state = 'code';
      continue;
    }
    if (character === '/' && next === '/') {
      state = 'lineComment';
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      state = 'blockComment';
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      state = 'string';
      quote = character;
      continue;
    }
    if (character === '`') {
      state = 'template';
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function getFactoryDependencyEntries(source, factoryName) {
  const marker = `} = ${factoryName}({`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${factoryName} assembly exists`);
  const bodyStart = start + marker.length;
  const bodyEnd = source.indexOf('\n});', bodyStart);
  assert.ok(bodyEnd >= 0, `${factoryName} assembly closes`);
  return source.slice(bodyStart, bodyEnd)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/,$/, ''));
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

function testSourceAuthorityAssemblyAndExistingFactoryBoundaries() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationEvaluationPolicy.js', import.meta.url));
  const view = normalizeSource(readFileSync(viewPath, 'utf8'));
  const moduleSource = normalizeSource(readFileSync(modulePath, 'utf8'));

  const importText = "import { createEnchantRecommendationEvaluationPolicy } from './enchantRecommendationEvaluationPolicy.js';";
  assert.equal(view.split(importText).length - 1, 1);
  MOVED_FUNCTIONS.forEach((name) => {
    const pattern = new RegExp(`function\\s+${name}\\s*\\(`, 'g');
    assert.equal((view.match(pattern) || []).length, 0, `${name} left enchantView.js`);
    assert.equal((moduleSource.match(pattern) || []).length, 1, `${name} has one module authority`);
  });
  const slotConstant = "const MATERIAL_ENCHANT_SLOT_ORDER = [";
  assert.equal(view.split(slotConstant).length - 1, 0);
  assert.equal(moduleSource.split(slotConstant).length - 1, 1);
  assert.equal(view.split("const MATERIAL_ENCHANT_MATERIAL_ORDER = ['은화', '비단', '잔해', '소명'];").length - 1, 1);
  assert.equal((view.match(/function\s+getEnchantIncludeGroups\s*\(/g) || []).length, 1);

  const expectedAssembly = `const {
  getCostPerPointOnePercent,
  isMaterialAcquisition,
  isFreeActionRecommendation,
  isMaterialEnchantAcquisition,
  compareMaterialEnchantOrder,
  getRoundedMetricKey,
  isPreferredDuplicateRecommendation,
  removeInefficientLowerTierEnchants,
} = createEnchantRecommendationEvaluationPolicy({
  getRecommendationGold,
  materialEnchantMaterialOrder: MATERIAL_ENCHANT_MATERIAL_ORDER,
});`;
  assert.equal(view.split(expectedAssembly).length - 1, 1);

  const damageMetricAssembly = `const {
  getDealerPrimaryStatKey,
  getDamageBaseline,
  getEquipmentScoreEffectiveStat,
  getSelectedStatEffect,
  estimateDamagePercent,
  estimateDamageMultiplier,
  regionAttackFlat: REGION_ATTACK_FLAT,
  elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
} = createEnchantDealerDamageMetric({
  elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
});`;
  const damageMetricAssemblyStart = view.indexOf(damageMetricAssembly);
  const damageMetricAssemblyEnd = damageMetricAssemblyStart + damageMetricAssembly.length;
  const assemblyStart = view.indexOf(expectedAssembly);
  const assemblyEnd = assemblyStart + expectedAssembly.length;
  const includeStart = view.indexOf('function getEnchantIncludeGroups(');
  assert.ok(damageMetricAssemblyStart >= 0 && damageMetricAssemblyEnd < assemblyStart);
  assert.equal(view.slice(damageMetricAssemblyEnd, assemblyStart).trim(), '');
  assert.ok(assemblyEnd < includeStart);
  assert.equal(view.slice(assemblyEnd, includeStart).trim(), '');

  const expectedOathDependencies = [
    'oathDecisionVariantSourceTypes: OATH_DECISION_VARIANT_SOURCE_TYPES',
    'applyUpgradeMaterialPrices',
    'cloneSimulatorValue',
    'getRecommendationGold',
    'mergeUpgradeMaterials',
    'getCostPerPointOnePercent',
    'getRoleRelevantEffects',
    'getOathTuneState',
    'syncOathTuneStageDisplay',
    'getSimulatorExclusiveGroupKey',
    'getSimulatorCandidateSignature',
  ];
  const expectedBufferDependencies = [
    'OATH_DECISION_VARIANT_SOURCE_TYPES',
    'getReinforceSkillLevel',
    'getItemSkillLevelBonus',
    'isMaterialAcquisition',
    'compareMaterialEnchantOrder',
    'getCurrentCreatureArtifactBySlot',
    'adaptOathAcquisitionRecommendation',
    'getTitleBeadOnlyRow',
    'isFreeActionRecommendation',
    'getEffectSignature',
    'addEffects',
    'getRoleRelevantEffects',
    'getBufferSelectedStatEffect',
    'getBufferOathAcquisitionEvaluation',
    'getBufferAvatarEmblemChangesBySocket',
    'getBufferSwitchingAvatarEmblemOverlays',
    'resolveBufferSwitchingAvatarEmblemChanges',
    'getBufferCreatureArtifactBaseRelativeChanges',
    'getBufferCreatureBaseRelativeChanges',
    'getBufferAuraBaseRelativeChanges',
    'getBufferTitleBaseRelativeChanges',
    'getBufferSwitchingCreatureBaseRelativeChanges',
    'getBufferSwitchingTitleBaseRelativeChanges',
    'getBufferSwitchingPlatinumBaseRelativeChanges',
    'getBufferSwitchingAvatarBaseRelativeChanges',
    'getBufferAvatarPlatinumBaseRelativeChanges',
    'mergeBufferChangeMap',
    'getBufferBlackFangBaseRelativeChanges',
    'getBufferUpgradeBaseRelativeChanges',
    'getBufferEquipmentTuneBaseRelativeChanges',
    'getBufferOathTuneBaseRelativeChanges',
    'getBufferEnchantBaseRelativeChanges',
    'resolveBufferNetChanges',
    'getCreatureArtifactType',
    'getBuffSimulatorTargetSlotId',
    'cloneSimulatorValue',
    'getBufferRecommendationScopeSimulator',
    'getBufferAvatarEmblemNetChanges',
    'getRecommendationGold',
    'getRoundedMetricKey',
    'getStableObjectSignature',
    'isPreferredDuplicateRecommendation',
    'removeInefficientLowerTierEnchants',
  ];
  const expectedDealerDependencies = [
    'tuneSourceTypes: TUNE_SOURCE_TYPES',
    'creatureArtifactTypes: CREATURE_ARTIFACT_TYPES',
    'elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME',
    'regionAttackFlat: REGION_ATTACK_FLAT',
    'elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT',
    'estimateDamagePercent',
    'addEffects',
    'subtractEffects',
    'getDamageBaseline',
    'getFinalDamageReplacementMultiplier',
    'estimateDamageMultiplier',
    'getSelectedStatEffect',
    'getEquipmentScoreEffectiveStat',
    'getCurrentCreatureArtifactBySlot',
    'getCreatureArtifactType',
    'isSameTitleBase',
    'getTitleBeadOnlyRow',
    'getCostPerPointOnePercent',
    'getEffectSignature',
    'getRoleRelevantEffects',
    'getRoundedMetricKey',
    'isMaterialAcquisition',
    'isFreeActionRecommendation',
    'isMaterialEnchantAcquisition',
    'compareMaterialEnchantOrder',
    'isPreferredDuplicateRecommendation',
    'removeInefficientLowerTierEnchants',
  ];
  assert.deepEqual(getFactoryDependencyEntries(view, 'createEnchantOathAcquisition'), expectedOathDependencies);
  assert.deepEqual(getFactoryDependencyEntries(view, 'createEnchantBufferRecommendation'), expectedBufferDependencies);
  assert.deepEqual(getFactoryDependencyEntries(view, 'createEnchantDealerRecommendation'), expectedDealerDependencies);

  const policyIndex = view.indexOf('createEnchantRecommendationEvaluationPolicy({');
  const oathIndex = view.indexOf('createEnchantOathAcquisition({');
  const bufferIndex = view.indexOf('createEnchantBufferRecommendation({');
  const dealerIndex = view.indexOf('createEnchantDealerRecommendation({');
  assert.ok(policyIndex < oathIndex);
  assert.ok(oathIndex < bufferIndex);
  assert.ok(bufferIndex < dealerIndex);
}

const tests = [
  testFactoryContractDependencyOrderAliasesAndPrivacy,
  testCostPerPointOnePercentAndMaterialFlagForwarding,
  testAcquisitionClassifications,
  testMaterialEnchantOrderingAndAliases,
  testRoundedMetricKey,
  testDuplicatePreferencePolicy,
  testDealerAndBufferTierEfficiencyPruning,
  testSourceAuthorityAssemblyAndExistingFactoryBoundaries,
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
