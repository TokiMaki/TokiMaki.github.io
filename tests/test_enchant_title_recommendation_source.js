import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as titleSourceModule from '../src/dnfHellTool/enchantTitleRecommendationSource.js';

const { createEnchantTitleRecommendationSource } = titleSourceModule;

const DEPENDENCY_NAMES = [
  'cloneSimulatorValue',
  'addEffects',
  'subtractEffects',
  'getEffectSignature',
];

const PUBLIC_FUNCTIONS = [
  'buildSimulatedTitleTarget',
  'getTitleRows',
  'isSameTitleBase',
  'getTitleBeadOnlyRow',
];

function cloneSimulatorValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function addEffects(...effectRows) {
  const result = {};
  effectRows.forEach((effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
  });
  return result;
}

function subtractEffects(nextEffects = {}, currentEffects = {}) {
  const keys = new Set([...Object.keys(nextEffects), ...Object.keys(currentEffects)]);
  const result = {};
  keys.forEach((key) => {
    const value = Number(nextEffects[key] || 0) - Number(currentEffects[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) {
      result[key] = value;
    }
  });
  return result;
}

function getEffectSignature(effects = {}) {
  return Object.keys(effects || {})
    .sort()
    .map((key) => `${key}:${Number(effects[key] || 0)}`)
    .join('|');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function createDependencies(overrides = {}) {
  return {
    cloneSimulatorValue,
    addEffects,
    subtractEffects,
    getEffectSignature,
    ...overrides,
  };
}

function createTitleSource(overrides = {}) {
  return createEnchantTitleRecommendationSource(createDependencies(overrides));
}

function testFactoryAndPublicContract() {
  assert.deepEqual(Object.keys(titleSourceModule), ['createEnchantTitleRecommendationSource']);
  const dependencyReads = [];
  const dependencies = new Proxy(createDependencies(), {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const source = createEnchantTitleRecommendationSource(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(source), PUBLIC_FUNCTIONS);
  Object.values(source).forEach((value) => assert.equal(typeof value, 'function'));
  assert.equal('getTitleBaseEffectSignature' in source, false);
  assert.equal('getCurrentTitleBeadRows' in source, false);
}

function testGeneralTitleRowMapping() {
  const { getTitleRows } = createTitleSource();
  const effects = { finalDamage: 7, nestedIgnored: 1 };
  const auction = { minUnitPrice: 123456 };
  const priceItem = { itemId: 'price-id', itemName: '가격 아이템', iconUrl: 'price-icon' };
  const titleBead = { itemId: 'bead-id', element: 'fire', auction: { minUnitPrice: 500 } };
  const reinforceSkill = [{ jobName: '공통', skills: [{ name: '스킬', value: 1 }] }];
  const itemBuff = { explain: '설명' };
  const enchantEffects = { elementAll: 20 };
  const groups = [{
    groupName: '그룹 A',
    candidates: [{
      itemId: 'title-id',
      itemName: '실제 칭호명',
      name: '후보명',
      variant: '플래티넘',
      itemRarity: '에픽',
      fame: 42,
      iconUrl: 'title-icon',
      effects,
      itemReinforceSkill: reinforceSkill,
      itemBuff,
      itemExplain: '아이템 설명',
      auction,
      levelTag: 30,
      skillDamagePercent: 12,
      priceItem,
      titleEnchantElement: 'fire',
      enchantEffects,
      purchaseRoute: 'attachedBead',
      purchaseRouteLabel: '보주 발린 칭호',
      titleBead,
    }],
  }];
  const [row] = getTitleRows(groups, null);
  assert.deepEqual(row, {
    sourceType: 'title',
    slot: '칭호',
    tier: '플래티넘',
    itemId: 'title-id',
    itemName: '실제 칭호명',
    titleItemName: '실제 칭호명',
    itemRarity: '에픽',
    fame: 42,
    iconUrl: 'price-icon',
    titleIconUrl: 'title-icon',
    effects,
    titlePackageEffects: effects,
    itemReinforceSkill: reinforceSkill,
    itemBuff,
    itemExplain: '아이템 설명',
    auction,
    candidateName: '후보명',
    groupName: '그룹 A',
    levelTag: 30,
    skillDamagePercent: 12,
    priceItem,
    titleEnchantElement: 'fire',
    enchantEffects,
    purchaseRoute: 'attachedBead',
    purchaseRouteLabel: '보주 발린 칭호',
    titleBead,
  });
  assert.strictEqual(row.effects, effects);
  assert.strictEqual(row.titlePackageEffects, effects);
  assert.strictEqual(row.auction, auction);
  assert.strictEqual(row.priceItem, priceItem);
  assert.strictEqual(row.titleBead, titleBead);

  const [fallback] = getTitleRows([{
    groupName: 'fallback',
    candidates: [{ itemId: 'fallback-id', name: '이름만 있는 칭호' }],
  }], null);
  assert.equal(fallback.itemName, '이름만 있는 칭호');
  assert.equal(fallback.titleItemName, '이름만 있는 칭호');
  assert.equal(fallback.itemRarity, '레어');
  assert.equal(
    fallback.iconUrl,
    'https://img-api.neople.co.kr/df/items/fallback-id',
  );
  assert.equal(
    fallback.titleIconUrl,
    'https://img-api.neople.co.kr/df/items/fallback-id',
  );
}

function testCurrentTitleBeadPriceTieInvalidAndOrder() {
  const { getTitleRows } = createTitleSource();
  const fireHigh = {
    itemId: 'fire-high', itemName: '화속 고가', iconUrl: 'fire-high-icon',
    element: 'fire', effects: { elementAll: 10 }, auction: { minUnitPrice: 300 },
  };
  const fireLow = {
    itemId: 'fire-low', itemName: '화속 최저', iconUrl: 'fire-low-icon',
    element: 'fire', effects: { elementAll: 20, buffPower: 5 }, auction: { minUnitPrice: 100 },
  };
  const fireTie = {
    itemId: 'fire-tie', itemName: '화속 동률 후행', iconUrl: 'fire-tie-icon',
    element: 'fire', effects: { elementAll: 99 }, auction: { minUnitPrice: 100 },
  };
  const waterHigh = {
    itemId: 'water-high', itemName: '수속 고가', iconUrl: 'water-high-icon',
    element: 'water', effects: { elementAll: 15 }, auction: { minUnitPrice: 250 },
  };
  const waterLow = {
    itemId: 'water-low', itemName: '수속 최저', iconUrl: 'water-low-icon',
    element: 'water', effects: { elementAll: 25 }, auction: { minUnitPrice: 80 },
  };
  const candidates = [
    { itemId: 'title-fire-high', name: 'A', titleBead: fireHigh },
    { itemId: 'title-invalid-no-element', name: 'B', titleBead: { itemId: 'bad-a', auction: { minUnitPrice: 1 } } },
    { itemId: 'title-fire-low', name: 'C', titleBead: fireLow },
    { itemId: 'title-invalid-no-id', name: 'D', titleBead: { element: 'dark', auction: { minUnitPrice: 1 } } },
    { itemId: 'title-fire-tie', name: 'E', titleBead: fireTie },
    { itemId: 'title-water-high', name: 'F', titleBead: waterHigh },
    { itemId: 'title-invalid-zero', name: 'G', titleBead: { itemId: 'bad-b', element: 'light', auction: { minUnitPrice: 0 } } },
    { itemId: 'title-invalid-infinite', name: 'H', titleBead: { itemId: 'bad-c', element: 'dark', auction: { minUnitPrice: Number.POSITIVE_INFINITY } } },
    { itemId: 'title-water-low', name: 'I', titleBead: waterLow },
  ];
  const currentTitle = deepFreeze({
    itemId: 'current-title-id',
    itemName: '현재 칭호',
    itemRarity: '레전더리',
    fame: 77,
    iconUrl: 'current-icon',
    effects: { finalDamage: 11, attack: 4, elementAll: 30 },
    enchantEffects: { elementAll: 30 },
    titleEnchantElement: 'dark',
    itemReinforceSkill: [{ jobName: '공통' }],
    itemBuff: { explain: '현재 버프' },
    itemExplain: '현재 설명',
    variant: '플래티넘',
    levelTag: 40,
    skillDamagePercent: 15,
  });
  const rows = getTitleRows([{ groupName: '가격 후보', candidates }], currentTitle);
  const beadRows = rows.slice(candidates.length);
  assert.equal(beadRows.length, 2);
  assert.deepEqual(beadRows.map((row) => row.titleBead.itemId), ['fire-low', 'water-low']);
  assert.deepEqual(beadRows.map((row) => row.titleEnchantElement), ['fire', 'water']);
  assert.strictEqual(beadRows[0].titleBead, fireLow);
  assert.strictEqual(beadRows[0].auction, fireLow.auction);
  assert.strictEqual(beadRows[0].enchantEffects, fireLow.effects);
  assert.strictEqual(beadRows[0].targetTitleEnchantEffects, fireLow.effects);
  assert.strictEqual(beadRows[0].currentTitleEnchantEffects, currentTitle.enchantEffects);
  assert.deepEqual(beadRows[0].effects, {
    finalDamage: 11,
    attack: 4,
    elementAll: 20,
    buffPower: 5,
  });
  assert.deepEqual(beadRows[0].titlePackageEffects, beadRows[0].effects);
  assert.notStrictEqual(beadRows[0].effects, beadRows[0].titlePackageEffects);
  assert.equal(beadRows[0].itemId, 'current-title-id');
  assert.equal(beadRows[0].itemName, '화속 최저');
  assert.equal(beadRows[0].titleItemName, '현재 칭호');
  assert.equal(beadRows[0].groupName, '칭호 보주');
  assert.equal(beadRows[0].purchaseRoute, 'titleBeadOnly');
  assert.equal(beadRows[0].purchaseRouteLabel, '칭호 보주 교체');
  assert.deepEqual(beadRows[0].priceItem, {
    itemId: 'fire-low',
    itemName: '화속 최저',
    iconUrl: 'fire-low-icon',
  });

  assert.deepEqual(getTitleRows([], currentTitle), []);
  assert.equal(getTitleRows([{ candidates }], null).length, candidates.length);
  assert.equal(getTitleRows([{ candidates }], {}).length, candidates.length);
}

function testSameTitleBase() {
  const { isSameTitleBase } = createTitleSource();
  const row = deepFreeze({
    sourceType: 'title',
    tier: '플래티넘',
    levelTag: '30',
    skillDamagePercent: '12',
    effects: { finalDamage: 10, elementAll: 25, attack: 3 },
    enchantEffects: { elementAll: 25 },
  });
  const currentTitle = deepFreeze({
    variant: '플래티넘',
    levelTag: 30,
    skillDamagePercent: 12,
    effects: { attack: 3, finalDamage: 10, elementAll: 40 },
    enchantEffects: { elementAll: 40 },
  });
  assert.equal(isSameTitleBase(row, currentTitle), true);
  assert.equal(isSameTitleBase({ ...row, sourceType: 'aura' }, currentTitle), false);
  assert.equal(isSameTitleBase(row, null), false);
  assert.equal(isSameTitleBase({ ...row, tier: '일반' }, currentTitle), false);
  assert.equal(isSameTitleBase({ ...row, levelTag: 31 }, currentTitle), false);
  assert.equal(isSameTitleBase({ ...row, skillDamagePercent: 13 }, currentTitle), false);
  assert.equal(isSameTitleBase({ ...row, effects: { finalDamage: 11, elementAll: 25, attack: 3 } }, currentTitle), false);

  assert.equal(isSameTitleBase({
    sourceType: 'title', effects: { finalDamage: 1 }, enchantEffects: {},
  }, {
    effects: { finalDamage: 1 }, enchantEffects: {},
  }), true, 'default tier and numeric metadata remain equivalent');
}

function testBeadOnlyIdentityFallbackAndConversion() {
  const { getTitleBeadOnlyRow } = createTitleSource();
  const beadEffects = { elementAll: 35, buffPower: 2 };
  const beadAuction = { minUnitPrice: 98765 };
  const titleBead = {
    itemId: 'bead-id',
    itemName: '교체 보주',
    iconUrl: 'bead-icon',
    effects: beadEffects,
    auction: beadAuction,
  };
  const currentTitle = deepFreeze({
    itemId: 'current-id',
    itemName: '현재 칭호',
    iconUrl: 'current-icon',
    variant: '일반',
    levelTag: 20,
    skillDamagePercent: 8,
    effects: { finalDamage: 9, elementAll: 15 },
    enchantEffects: { elementAll: 15 },
    titleEnchantElement: 'fire',
  });
  const row = deepFreeze({
    sourceType: 'title',
    tier: '일반',
    itemId: 'candidate-title',
    itemName: '후보 칭호',
    titleItemName: '후보 칭호',
    titleIconUrl: 'candidate-icon',
    levelTag: 20,
    skillDamagePercent: 8,
    effects: { finalDamage: 9, elementAll: 35, buffPower: 2 },
    enchantEffects: beadEffects,
    titlePackageEffects: { finalDamage: 9, elementAll: 35, buffPower: 2 },
    titleBead,
    untouched: { nested: true },
  });
  const converted = getTitleBeadOnlyRow(row, currentTitle);
  assert.notStrictEqual(converted, row);
  assert.strictEqual(converted.effects, row.effects);
  assert.strictEqual(converted.titleBead, row.titleBead);
  assert.strictEqual(converted.untouched, row.untouched);
  assert.equal(converted.itemId, 'current-id');
  assert.equal(converted.itemName, '후보 칭호');
  assert.equal(converted.titleItemName, '현재 칭호');
  assert.equal(converted.titleIconUrl, 'current-icon');
  assert.deepEqual(converted.titlePackageEffects, {
    finalDamage: 9,
    elementAll: 35,
    buffPower: 2,
  });
  assert.strictEqual(converted.auction, beadAuction);
  assert.deepEqual(converted.priceItem, {
    itemId: 'bead-id',
    itemName: '교체 보주',
    iconUrl: 'bead-icon',
  });
  assert.equal(converted.currentTitleEnchantElement, 'fire');
  assert.strictEqual(converted.currentTitleEnchantEffects, currentTitle.enchantEffects);
  assert.strictEqual(converted.targetTitleEnchantEffects, beadEffects);
  assert.equal(converted.purchaseRoute, 'titleBeadOnly');
  assert.equal(converted.purchaseRouteLabel, '칭호 보주 교체');

  const differentBase = { ...row, effects: { finalDamage: 10, elementAll: 35 } };
  assert.strictEqual(getTitleBeadOnlyRow(differentBase, currentTitle), differentBase);
  const noAuction = { ...row, titleBead: { ...titleBead, auction: null } };
  assert.strictEqual(getTitleBeadOnlyRow(noAuction, currentTitle), noAuction);
  assert.strictEqual(getTitleBeadOnlyRow(row, null), row);
}

function testBuildSimulatedTitleTargetFallbackAndDeepClone() {
  const { buildSimulatedTitleTarget } = createTitleSource();
  const row = deepFreeze({
    itemId: 'row-id',
    itemName: '가격 이름',
    candidateName: '후보 이름',
    titleItemName: '실제 칭호 이름',
    iconUrl: 'price-icon',
    titleIconUrl: 'title-icon',
    effects: { finalDamage: 1 },
    titlePackageEffects: { finalDamage: 12, nested: { package: true } },
    enchantEffects: { elementAll: 10 },
    targetTitleEnchantEffects: { elementAll: 30, nested: { bead: true } },
    metadata: { nested: { value: 7 } },
    rows: [{ value: 1 }],
  });
  const target = buildSimulatedTitleTarget(row);
  assert.equal(target.itemName, '실제 칭호 이름');
  assert.equal(target.iconUrl, 'title-icon');
  assert.deepEqual(target.effects, row.titlePackageEffects);
  assert.deepEqual(target.enchantEffects, row.targetTitleEnchantEffects);
  assert.notStrictEqual(target, row);
  assert.notStrictEqual(target.metadata, row.metadata);
  assert.notStrictEqual(target.metadata.nested, row.metadata.nested);
  assert.notStrictEqual(target.rows, row.rows);
  assert.notStrictEqual(target.rows[0], row.rows[0]);
  assert.notStrictEqual(target.titlePackageEffects, row.titlePackageEffects);
  assert.notStrictEqual(target.effects, row.titlePackageEffects);
  assert.notStrictEqual(target.effects, target.titlePackageEffects);
  assert.notStrictEqual(target.targetTitleEnchantEffects, row.targetTitleEnchantEffects);
  assert.notStrictEqual(target.enchantEffects, row.targetTitleEnchantEffects);
  assert.notStrictEqual(target.enchantEffects, target.targetTitleEnchantEffects);

  const fallbackRow = deepFreeze({
    candidateName: '후보 fallback',
    itemName: '가격 fallback',
    iconUrl: 'fallback-icon',
    effects: { finalDamage: 3 },
    enchantEffects: { elementAll: 5 },
  });
  const fallback = buildSimulatedTitleTarget(fallbackRow);
  assert.equal(fallback.itemName, '후보 fallback');
  assert.equal(fallback.iconUrl, 'fallback-icon');
  assert.deepEqual(fallback.effects, { finalDamage: 3 });
  assert.deepEqual(fallback.enchantEffects, { elementAll: 5 });
  assert.notStrictEqual(fallback.effects, fallbackRow.effects);
  assert.notStrictEqual(fallback.enchantEffects, fallbackRow.enchantEffects);

  assert.deepEqual(buildSimulatedTitleTarget(), {
    itemName: '',
    iconUrl: '',
    effects: {},
    enchantEffects: {},
  });
}

function testEnchantViewAssemblyAndTdzSmoke() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const source = readFileSync(viewPath, 'utf8');
  const importText = "import { createEnchantTitleRecommendationSource } from './enchantTitleRecommendationSource.js';";
  assert.equal(source.split(importText).length - 1, 1);
  for (const name of [
    'buildSimulatedTitleTarget',
    'getTitleRows',
    'getTitleBaseEffectSignature',
    'getCurrentTitleBeadRows',
    'isSameTitleBase',
    'getTitleBeadOnlyRow',
  ]) {
    assert.equal(source.includes(`function ${name}`), false, `${name} has one authority in the new module`);
  }
  const reinforceSkillIndex = source.indexOf('function getReinforceSkillLevel');
  const factoryIndex = source.indexOf('} = createEnchantTitleRecommendationSource({');
  const itemSkillIndex = source.indexOf('function getItemSkillLevelBonus');
  assert.ok(reinforceSkillIndex >= 0 && reinforceSkillIndex < factoryIndex);
  assert.ok(factoryIndex < itemSkillIndex);
  assert.match(source.slice(factoryIndex, itemSkillIndex), /cloneSimulatorValue,\s+addEffects,\s+subtractEffects,\s+getEffectSignature,/);

  const sourceCalculationIndex = source.indexOf('} = createEnchantBufferSimulatorSourceCalculation({');
  const bufferRecommendationIndex = source.indexOf('} = createEnchantBufferRecommendation({');
  const dealerRecommendationIndex = source.indexOf('} = createEnchantDealerRecommendation({');
  assert.ok(factoryIndex < sourceCalculationIndex);
  assert.ok(sourceCalculationIndex < bufferRecommendationIndex);
  assert.ok(bufferRecommendationIndex < dealerRecommendationIndex);

  const sourceCalculationBlock = source.slice(
    sourceCalculationIndex,
    source.indexOf('});', sourceCalculationIndex) + 3,
  );
  assert.match(sourceCalculationBlock, /getItemSkillLevelBonus,\s+buildSimulatedTitleTarget,\s+getEquipmentProgressionType,/);
  const bufferRecommendationBlock = source.slice(
    bufferRecommendationIndex,
    source.indexOf('});', bufferRecommendationIndex) + 3,
  );
  assert.match(bufferRecommendationBlock, /adaptOathAcquisitionRecommendation,\s+getTitleBeadOnlyRow,\s+isFreeActionRecommendation,/);
  const dealerRecommendationBlock = source.slice(
    dealerRecommendationIndex,
    source.indexOf('});', dealerRecommendationIndex) + 3,
  );
  assert.match(dealerRecommendationBlock, /getCreatureArtifactType,\s+isSameTitleBase,\s+getTitleBeadOnlyRow,\s+getCostPerPointOnePercent,/);
}

const tests = [
  testFactoryAndPublicContract,
  testGeneralTitleRowMapping,
  testCurrentTitleBeadPriceTieInvalidAndOrder,
  testSameTitleBase,
  testBeadOnlyIdentityFallbackAndConversion,
  testBuildSimulatedTitleTargetFallbackAndDeepClone,
  testEnchantViewAssemblyAndTdzSmoke,
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

if (failures) process.exitCode = 1;
