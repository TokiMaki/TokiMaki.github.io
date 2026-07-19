import assert from 'node:assert/strict';
import * as dealerRecommendationModule from '../src/dnfHellTool/enchantDealerRecommendation.js';

const { createEnchantDealerRecommendation } = dealerRecommendationModule;

const DEPENDENCY_NAMES = [
  'tuneSourceTypes',
  'creatureArtifactTypes',
  'elementEffectKeyByName',
  'regionAttackFlat',
  'elementDamagePerElement',
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

const ELEMENT_EFFECT_KEY_BY_NAME = {
  fire: 'elementFire',
  water: 'elementWater',
  light: 'elementLight',
  dark: 'elementDark',
};
const REGION_ATTACK_FLAT = 31215;
const ELEMENT_DAMAGE_PER_ELEMENT = 0.45;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
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
  const result = {};
  new Set([...Object.keys(nextEffects || {}), ...Object.keys(currentEffects || {})])
    .forEach((key) => {
      const value = Number(nextEffects?.[key] || 0) - Number(currentEffects?.[key] || 0);
      if (Number.isFinite(value) && Math.abs(value) > 0.000001) result[key] = value;
    });
  return result;
}

function getDamageBaseline(baseline = {}) {
  const elementNames = Array.isArray(baseline.elementNames)
    ? baseline.elementNames.filter(Boolean)
    : (baseline.elementName ? [baseline.elementName] : []);
  const element = Number(baseline.element || 0);
  return {
    stat: Number(baseline.stat || 0),
    statName: baseline.statName === '지능' ? '지능' : '힘',
    baseStat: Number(baseline.baseStat || 0),
    element,
    elementName: elementNames[0] || '',
    elementNames,
    elementValues: Object.fromEntries(Object.keys(ELEMENT_EFFECT_KEY_BY_NAME)
      .map((name) => [name, Number(baseline.elementValues?.[name] || 0)])),
    elementDamage: Number.isFinite(Number(baseline.elementDamage))
      ? Number(baseline.elementDamage)
      : 5 + element * ELEMENT_DAMAGE_PER_ELEMENT,
    attack: Number(baseline.attack || 0),
    finalDamage: Number(baseline.finalDamage || 0),
    attackIncrease: Number(baseline.attackIncrease || 0),
    attackAmplification: Number(baseline.attackAmplification || 0),
  };
}

function getSelectedStatEffect(effects = {}, baseline = {}) {
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  return baseline.statName === '지능'
    ? Number(effects.int || 0)
    : Number(effects.str || 0);
}

function getEquipmentScoreEffectiveStat(stat, baseStat) {
  return stat + 168350 + 297900 + Math.trunc(3.08 * (stat - baseStat) + 2886);
}

function estimateDamageMultiplier(effects = {}, baseline = {}) {
  const base = getDamageBaseline(baseline);
  const finalDamageMultiplier = (1 + (base.finalDamage + Number(effects.finalDamage || 0)) / 100)
    / (1 + base.finalDamage / 100);
  const attackIncreaseMultiplier = (1 + (base.attackIncrease + Number(effects.attackIncrease || 0)) / 100)
    / (1 + base.attackIncrease / 100);
  const attackAmplificationMultiplier = (1 + (base.attackAmplification + Number(effects.attackAmplification || 0)) / 100)
    / (1 + base.attackAmplification / 100);
  const elementMultiplier = (1 + (base.elementDamage + Number(effects.elementAll || 0) * ELEMENT_DAMAGE_PER_ELEMENT) / 100)
    / (1 + base.elementDamage / 100);
  const attackMultiplier = (base.attack + REGION_ATTACK_FLAT + Number(effects.attack || 0))
    / (base.attack + REGION_ATTACK_FLAT);
  const currentEffectiveStat = getEquipmentScoreEffectiveStat(base.stat, base.baseStat);
  const candidateEffectiveStat = getEquipmentScoreEffectiveStat(
    base.stat + getSelectedStatEffect(effects, base),
    base.baseStat,
  );
  const statMultiplier = (1 + candidateEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
  const explicitSkillDamageMultiplier = Number(effects.skillDamageMultiplier || 0);
  const skillDamageMultiplier = Number.isFinite(explicitSkillDamageMultiplier)
    && explicitSkillDamageMultiplier > 0
    ? explicitSkillDamageMultiplier
    : 1;
  return finalDamageMultiplier
    * attackIncreaseMultiplier
    * attackAmplificationMultiplier
    * elementMultiplier
    * attackMultiplier
    * statMultiplier
    * skillDamageMultiplier;
}

function estimateDamagePercent(effects = {}, baseline = {}) {
  return (estimateDamageMultiplier(effects, baseline) / estimateDamageMultiplier({}, baseline) - 1) * 100;
}

function getFinalDamageReplacementMultiplier(currentEffects = {}, targetEffects = {}) {
  const currentMultiplier = 1 + Number(currentEffects.finalDamage || 0) / 100;
  const targetMultiplier = 1 + Number(targetEffects.finalDamage || 0) / 100;
  return currentMultiplier > 0 && Number.isFinite(targetMultiplier)
    ? targetMultiplier / currentMultiplier
    : 1;
}

function getCreatureArtifactType(row = {}) {
  const type = String(row.artifactType || row.slotColor || '').trim().toUpperCase();
  return new Set(['RED', 'BLUE', 'GREEN']).has(type) ? type : '';
}

function getCurrentCreatureArtifactBySlot(creature = {}) {
  return new Map((creature?.artifacts || [])
    .map((artifact) => [getCreatureArtifactType(artifact), artifact])
    .filter(([type]) => type));
}

function getEffectSignature(effects = {}) {
  return Object.keys(effects || {})
    .sort()
    .map((key) => `${key}:${Number(effects[key] || 0)}`)
    .join('|');
}

function getRecommendationGold(row = {}, includeMaterialCosts = false) {
  const base = Number.isFinite(row.expectedGold)
    ? Number(row.expectedGold)
    : Number(row.auction?.minUnitPrice || 0);
  const material = includeMaterialCosts
    ? (row.expectedMaterials || []).reduce((sum, item) => (
      sum + Number(item.amount || 0) * Number(item.auction?.minUnitPrice || 0)
    ), 0)
    : 0;
  return base + material;
}

function getCostPerPointOnePercent(row = {}, includeMaterialCosts = false) {
  const price = getRecommendationGold(row, includeMaterialCosts);
  const damage = Number(row.incrementalDamagePercent || 0);
  return Number.isFinite(price) && price > 0 && Number.isFinite(damage) && damage > 0
    ? price * 0.1 / damage
    : 0;
}

function isMaterialAcquisition(row = {}) {
  return Boolean(row?.acquisition?.label);
}

function isFreeActionRecommendation(row = {}) {
  return Boolean(row?.freeAction);
}

function isMaterialEnchantAcquisition(row = {}) {
  return row.sourceType === 'enchant' && isMaterialAcquisition(row);
}

function compareMaterialEnchantOrder(a = {}, b = {}) {
  return Number(a.materialOrder || 0) - Number(b.materialOrder || 0);
}

function isPreferredDuplicateRecommendation(row, previous, includeMaterialCosts = false) {
  if (!previous) return true;
  const material = isMaterialAcquisition(row);
  const previousMaterial = isMaterialAcquisition(previous);
  if (material !== previousMaterial) return material;
  if (material && previousMaterial) return false;
  return getRecommendationGold(row, includeMaterialCosts)
    < getRecommendationGold(previous, includeMaterialCosts);
}

function createDependencies(overrides = {}) {
  return {
    tuneSourceTypes: new Set(['equipmentTune', 'oathTune']),
    creatureArtifactTypes: new Set(['RED', 'BLUE', 'GREEN']),
    elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
    regionAttackFlat: REGION_ATTACK_FLAT,
    elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
    estimateDamagePercent,
    addEffects,
    subtractEffects,
    getDamageBaseline,
    getFinalDamageReplacementMultiplier,
    estimateDamageMultiplier,
    getSelectedStatEffect,
    getEquipmentScoreEffectiveStat,
    getCurrentCreatureArtifactBySlot,
    getCreatureArtifactType,
    isSameTitleBase: (row, currentTitle) => Boolean(
      row?.sameTitleBase && currentTitle?.itemId,
    ),
    getTitleBeadOnlyRow: (row) => row,
    getCostPerPointOnePercent,
    getEffectSignature,
    getRoleRelevantEffects: (effects) => effects || {},
    getRoundedMetricKey: (value) => Number(value || 0).toFixed(6),
    isMaterialAcquisition,
    isFreeActionRecommendation,
    isMaterialEnchantAcquisition,
    compareMaterialEnchantOrder,
    isPreferredDuplicateRecommendation,
    removeInefficientLowerTierEnchants: (rows) => rows,
    ...overrides,
  };
}

function createRecommendation(overrides = {}) {
  return createEnchantDealerRecommendation(createDependencies(overrides));
}

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function testFactoryContract() {
  assert.deepEqual(Object.keys(dealerRecommendationModule), ['createEnchantDealerRecommendation']);
  const reads = [];
  const deps = new Proxy(createDependencies(), {
    get(target, property, receiver) {
      reads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const recommendation = createEnchantDealerRecommendation(deps);
  assert.deepEqual(reads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(recommendation), [
    'getSkillDamageMultiplier',
    'getReplacementIncrementalDamagePercent',
    'getAdjustedElementBaselineForRecommendation',
    'getElementAdjustedReplacementIncrementalDamagePercent',
    'getCreatureArtifactEffectsTotal',
    'getCreatureArtifactReplacementMultiplier',
    'getCreatureArtifactDisplayEffects',
    'getRepresentativeRecommendationRows',
    'compareDealerRecommendationOrder',
  ]);
  Object.values(recommendation).forEach((value) => assert.equal(typeof value, 'function'));
}

function testReplacementDamageFormulas() {
  const {
    getSkillDamageMultiplier,
    getReplacementIncrementalDamagePercent,
    getAdjustedElementBaselineForRecommendation,
    getElementAdjustedReplacementIncrementalDamagePercent,
  } = createRecommendation();
  const baseline = deepFreeze({
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: 'fire',
    elementNames: ['fire'],
    elementValues: { fire: 400, water: 390, light: 100, dark: 80 },
    elementDamage: 153.5,
    attack: 4000,
    finalDamage: 10,
    attackIncrease: 20,
    attackAmplification: 5,
  });
  const current = deepFreeze({
    skillDamageMultiplier: 1.02,
    effects: {
      finalDamage: 5,
      attackIncrease: 10,
      attackAmplification: 3,
      elementAll: 20,
      attack: 100,
      str: 50,
    },
  });
  const target = deepFreeze({
    skillDamageMultiplier: 1.1,
    effects: {
      finalDamage: 8,
      attackIncrease: 15,
      attackAmplification: 5,
      elementAll: 35,
      attack: 250,
      str: 120,
    },
  });
  assert.equal(getSkillDamageMultiplier({ skillDamageMultiplier: 0 }), 1);
  assert.equal(getSkillDamageMultiplier(target), 1.1);
  assertClose(
    getReplacementIncrementalDamagePercent(target, current, baseline),
    21.467397056647286,
    1e-12,
  );

  const titleCurrent = deepFreeze({
    sourceType: 'title',
    titleEnchantElement: 'fire',
    enchantEffects: { elementAll: 20 },
    effects: current.effects,
    skillDamageMultiplier: current.skillDamageMultiplier,
  });
  const titleTarget = deepFreeze({
    sourceType: 'title',
    titleEnchantElement: 'water',
    targetTitleEnchantEffects: { elementAll: 30 },
    effects: target.effects,
    skillDamageMultiplier: target.skillDamageMultiplier,
  });
  const adjusted = getAdjustedElementBaselineForRecommendation(
    titleTarget,
    titleCurrent,
    baseline,
  );
  assert.deepEqual(adjusted.elementValues, {
    fire: 380,
    water: 420,
    light: 100,
    dark: 80,
  });
  assert.equal(adjusted.element, 420);
  assert.equal(adjusted.elementName, 'water');
  assert.deepEqual(adjusted.elementNames, ['water']);
  assert.equal(adjusted.elementDamage, 162.5);
  assertClose(
    getElementAdjustedReplacementIncrementalDamagePercent(
      titleTarget,
      titleCurrent,
      baseline,
      adjusted,
    ),
    22.517547463477072,
    1e-12,
  );
  assert.equal(
    getAdjustedElementBaselineForRecommendation(
      { sourceType: 'aura', effects: {} },
      {},
      baseline,
    ),
    null,
  );
}

function testCreatureArtifactCalculations() {
  const {
    getCreatureArtifactEffectsTotal,
    getCreatureArtifactReplacementMultiplier,
    getCreatureArtifactDisplayEffects,
  } = createRecommendation();
  const baseline = deepFreeze({
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: 'fire',
    elementNames: ['fire'],
    elementValues: { fire: 330, water: 300, light: 0, dark: 0 },
    elementDamage: 153.5,
    attack: 4000,
  });
  const artifacts = deepFreeze([
    {
      slotColor: 'RED',
      element: 'fire',
      effects: { finalDamage: 2 },
      artifactAllElement: 5,
      artifactSingleElement: 10,
      skillDamageMultiplier: 1.02,
    },
    {
      slotColor: 'BLUE',
      element: 'water',
      effects: { attack: 50 },
      artifactAllElement: 4,
      artifactSingleElement: 8,
    },
  ]);
  assert.deepEqual(
    getCreatureArtifactEffectsTotal(artifacts, baseline, {}),
    { finalDamage: 2, elementAll: 19, attack: 50 },
  );
  assert.deepEqual(
    getCreatureArtifactDisplayEffects(
      { sourceType: 'creatureArtifact', ...artifacts[0] },
      baseline,
      'fire',
    ),
    { finalDamage: 2, elementAll: 5, elementFire: 10 },
  );
  assert.deepEqual(
    getCreatureArtifactDisplayEffects(
      { sourceType: 'creatureArtifact', ...artifacts[1] },
      baseline,
      'fire',
    ),
    { attack: 50, elementAll: 4 },
  );

  const simulated = deepFreeze([
    {
      slotColor: 'RED',
      effects: { finalDamage: 5 },
      skillDamageMultiplier: 1.08,
    },
    {
      slotColor: 'BLUE',
      effects: { finalDamage: 1 },
      skillDamageMultiplier: 1.01,
    },
  ]);
  assertClose(
    getCreatureArtifactReplacementMultiplier(artifacts, simulated),
    (1.05 / 1.02) * (1.08 / 1.02) * 1.01 * 1.01,
    1e-12,
  );
}

function testRepresentativeRowsAndSimulatorReferences() {
  const postProcessCalls = [];
  const { getRepresentativeRecommendationRows } = createRecommendation({
    removeInefficientLowerTierEnchants: (rows, isBuffer) => {
      postProcessCalls.push({ rows: rows.slice(), isBuffer });
      return rows.filter((row) => row.itemId !== 'remove-me');
    },
  });
  const baseline = deepFreeze({
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: 'fire',
    elementNames: ['fire'],
    elementValues: { fire: 330, water: 300, light: 0, dark: 0 },
    elementDamage: 153.5,
    attack: 4000,
    finalDamage: 0,
    attackIncrease: 0,
    attackAmplification: 0,
  });
  const currentEnchants = deepFreeze([
    { slot: '무기', itemId: 'current-weapon', effects: {} },
    { slot: '상의', itemId: 'current-top', effects: {} },
  ]);
  const currentCreature = deepFreeze({
    itemId: 'combined-creature',
    effects: {},
    artifacts: [{
      slotColor: 'RED',
      itemId: 'current-red',
      element: 'fire',
      effects: {},
      artifactAllElement: 0,
      artifactSingleElement: 0,
    }],
  });
  const currentCreatureBody = deepFreeze({ itemId: 'body-creature', effects: {} });
  const currentTitle = deepFreeze({
    itemId: 'current-title',
    effects: {},
    titleEnchantElement: 'fire',
    enchantEffects: {},
  });
  const currentAura = deepFreeze({ itemId: 'current-aura', effects: {} });
  const rows = deepFreeze([
    {
      sourceType: 'enchant', slot: '무기', tier: '종결', itemId: 'expensive',
      itemName: '비싼 중복', effects: { allStat: 100 }, auction: { minUnitPrice: 2000 },
    },
    {
      sourceType: 'enchant', slot: '무기', tier: '종결', itemId: 'cheap',
      itemName: '저렴한 중복', effects: { allStat: 100 }, auction: { minUnitPrice: 1000 },
    },
    {
      sourceType: 'enchant', slot: '상의', tier: '준종결', itemId: 'remove-me',
      effects: { allStat: 50 }, auction: { minUnitPrice: 100 },
    },
    {
      sourceType: 'enchant', slot: '하의', tier: '준종결', itemId: 'no-price',
      effects: { allStat: 500 }, auction: {},
    },
    {
      sourceType: 'enchant', slot: '벨트', tier: '가성비', itemId: 'free',
      effects: { allStat: 20 }, auction: {}, freeAction: true,
    },
    {
      sourceType: 'creature', slot: '크리쳐', tier: '일반', itemId: 'same-creature',
      effects: { finalDamage: 99 }, auction: { minUnitPrice: 1 },
    },
    {
      sourceType: 'creature', slot: '크리쳐', tier: '일반', itemId: 'new-creature',
      effects: { finalDamage: 5 }, auction: { minUnitPrice: 5000 },
    },
    {
      sourceType: 'creatureArtifact', slot: '크리쳐', slotColor: 'RED', tier: '레어',
      itemId: 'red-expensive', element: 'fire', effects: { finalDamage: 2 },
      auction: { minUnitPrice: 2000 },
    },
    {
      sourceType: 'creatureArtifact', slot: '크리쳐', slotColor: 'RED', tier: '레어',
      itemId: 'red-cheap', element: 'fire', effects: { finalDamage: 2 },
      auction: { minUnitPrice: 1000 },
    },
    {
      sourceType: 'title', slot: '칭호', tier: '일반', itemId: 'new-title',
      titleEnchantElement: 'fire', effects: { finalDamage: 4 }, auction: { minUnitPrice: 4000 },
    },
    {
      sourceType: 'aura', slot: '오라', tier: '일반', itemId: 'new-aura',
      effects: { finalDamage: 3 }, auction: { minUnitPrice: 3000 },
    },
    {
      sourceType: 'avatar', kind: 'platinumEmblem', slot: '상의 아바타', itemId: 'avatar',
      effects: { skillDamageMultiplier: 1.01 }, auction: { minUnitPrice: 1500 },
    },
    {
      sourceType: 'blackFang', slot: '목걸이', itemId: 'black-fang',
      currentEffects: {}, targetEffects: { finalDamage: 2.5 }, effects: { finalDamage: 2.5 },
      auction: { minUnitPrice: 2500 },
    },
    {
      sourceType: 'upgrade', slot: '귀걸이', itemId: 'upgrade-bad', upgradeMode: 'reinforcement',
      targetLevel: 12, effects: { finalDamage: 2 }, auction: { minUnitPrice: 3000 },
    },
    {
      sourceType: 'upgrade', slot: '귀걸이', itemId: 'upgrade-best', upgradeMode: 'reinforcement',
      targetLevel: 13, effects: { finalDamage: 3 }, auction: { minUnitPrice: 3000 },
    },
    {
      sourceType: 'equipmentTune', slot: '장비 조율', itemId: 'equipment-tune',
      effects: { skillDamageMultiplier: 1.02 }, auction: { minUnitPrice: 2000 },
    },
    {
      sourceType: 'oathTune', slot: '서약 조율', itemId: 'oath-tune',
      effects: { skillDamageMultiplier: 1.015 }, auction: { minUnitPrice: 1800 },
    },
  ].map((row) => (
    row.itemId === 'same-creature' ? { ...row, itemId: 'body-creature' } : row
  )));

  const result = getRepresentativeRecommendationRows(
    rows,
    currentEnchants,
    currentCreature,
    currentTitle,
    currentAura,
    baseline,
    false,
    { progressionReferenceBaselineBySlot: { get: () => { throw new Error('unused'); } } },
    currentCreatureBody,
  );
  assert.equal(postProcessCalls.length, 1);
  assert.equal(postProcessCalls[0].isBuffer, false);
  assert.ok(!result.some((row) => row.itemId === 'expensive'));
  assert.ok(result.some((row) => row.itemId === 'cheap'));
  assert.ok(!result.some((row) => row.itemId === 'remove-me'));
  assert.ok(!result.some((row) => row.itemId === 'no-price'));
  assert.ok(result.some((row) => row.itemId === 'free'));
  assert.ok(!result.some((row) => row.itemId === 'body-creature'));
  assert.equal(result.find((row) => row.itemId === 'new-creature').currentEnchant.itemId, 'body-creature');
  assert.ok(!result.some((row) => row.itemId === 'red-expensive'));
  assert.ok(result.some((row) => row.itemId === 'red-cheap'));
  assert.ok(result.some((row) => row.itemId === 'new-title'));
  assert.ok(result.some((row) => row.itemId === 'new-aura'));
  assert.ok(result.some((row) => row.itemId === 'avatar'));
  assert.ok(result.some((row) => row.itemId === 'black-fang'));
  assert.ok(!result.some((row) => row.itemId === 'upgrade-bad'));
  assert.ok(result.some((row) => row.itemId === 'upgrade-best'));
  assert.ok(result.some((row) => row.itemId === 'equipment-tune'));
  assert.ok(result.some((row) => row.itemId === 'oath-tune'));
  result.forEach((row) => {
    assert.ok(row.incrementalDamagePercent > 0);
    if (!row.freeAction) assert.ok(row.costPerPointOnePercent > 0);
  });

  const referenceCurrent = deepFreeze({ slot: '무기', itemId: 'reference-enchant', effects: { allStat: 40 } });
  const referenceBaseline = deepFreeze({ ...baseline, stat: 9000 });
  const [referenced] = getRepresentativeRecommendationRows(
    [rows.find((row) => row.itemId === 'cheap')],
    currentEnchants,
    currentCreature,
    currentTitle,
    currentAura,
    baseline,
    false,
    {
      referenceEnchantBySlot: new Map([['무기', referenceCurrent]]),
      referenceBaselineBySlot: new Map([['무기', referenceBaseline]]),
      preserveEligibleEnchantCandidates: true,
      progressionReferenceBaselineBySlot: { get: () => { throw new Error('unused'); } },
    },
    currentCreatureBody,
  );
  assert.equal(postProcessCalls.length, 1, 'preserveEligibleEnchantCandidates skips tier post-processing');
  assert.equal(referenced.currentEnchant.itemId, 'reference-enchant');
  assert.ok(referenced.incrementalDamagePercent > 0);

  const tiedElementBaseline = deepFreeze({
    ...baseline,
    elementName: 'fire',
    elementNames: ['fire', 'water'],
    elementValues: { fire: 330, water: 330, light: 0, dark: 0 },
  });
  const actualCurrentTitle = deepFreeze({
    itemId: 'actual-current-title',
    effects: {},
    titleEnchantElement: 'fire',
    enchantEffects: {},
  });
  const simulatedReferenceTitle = deepFreeze({
    itemId: 'simulated-reference-title',
    effects: {},
    titleEnchantElement: 'water',
    enchantEffects: {},
  });
  const [actualTitleAligned] = getRepresentativeRecommendationRows(
    [{
      sourceType: 'title', slot: '칭호', tier: '일반', itemId: 'fire-title-candidate',
      titleEnchantElement: 'fire', effects: { finalDamage: 1 },
      auction: { minUnitPrice: 1000 },
    }],
    currentEnchants,
    { artifacts: [] },
    actualCurrentTitle,
    currentAura,
    tiedElementBaseline,
    false,
    {
      referenceTitle: simulatedReferenceTitle,
      titleReferenceBaseline: tiedElementBaseline,
      preserveEligibleEnchantCandidates: true,
    },
    currentCreatureBody,
  );
  assert.equal(actualTitleAligned.itemId, 'fire-title-candidate');
  assert.equal(actualTitleAligned.currentEnchant.itemId, 'simulated-reference-title');
}

function testComparatorPolicyAndStableSort() {
  const { compareDealerRecommendationOrder } = createRecommendation();
  const normalA = { id: 'a', costPerPointOnePercent: 100 };
  const normalB = { id: 'b', costPerPointOnePercent: 200 };
  const materialEnchantA = {
    sourceType: 'enchant', acquisition: { label: '재료' }, materialOrder: 1,
    incrementalDamagePercent: 1,
  };
  const materialEnchantB = {
    sourceType: 'enchant', acquisition: { label: '재료' }, materialOrder: 2,
    incrementalDamagePercent: 100,
  };
  const materialOtherA = {
    sourceType: 'oathTranscend', acquisition: { label: '재료' }, incrementalDamagePercent: 2,
  };
  const materialOtherB = {
    sourceType: 'oathCraft', acquisition: { label: '재료' }, incrementalDamagePercent: 3,
  };
  assert.ok(compareDealerRecommendationOrder(
    { ...normalB, recommendationPriority: -1 },
    { ...materialEnchantA, recommendationPriority: 0 },
  ) < 0);
  assert.ok(compareDealerRecommendationOrder(materialEnchantA, normalA) < 0);
  assert.ok(compareDealerRecommendationOrder(materialEnchantA, materialEnchantB) < 0);
  assert.ok(compareDealerRecommendationOrder(materialOtherB, materialOtherA) < 0);
  assert.ok(compareDealerRecommendationOrder(normalA, normalB) < 0);
  assert.equal(compareDealerRecommendationOrder(
    { costPerPointOnePercent: 100 },
    { costPerPointOnePercent: 100 },
  ), 0);
  const stable = [
    { id: 'first', costPerPointOnePercent: 100 },
    { id: 'second', costPerPointOnePercent: 100 },
    { id: 'third', costPerPointOnePercent: 100 },
  ].sort(compareDealerRecommendationOrder);
  assert.deepEqual(stable.map((row) => row.id), ['first', 'second', 'third']);
}

function testInputImmutability() {
  const recommendation = createRecommendation();
  const baseline = deepFreeze({
    stat: 6500,
    statName: '힘',
    baseStat: 800,
    element: 330,
    elementName: 'fire',
    elementNames: ['fire'],
    elementValues: { fire: 330, water: 300, light: 0, dark: 0 },
    elementDamage: 153.5,
    attack: 4000,
  });
  const artifacts = deepFreeze([{
    slotColor: 'RED', element: 'fire', effects: { finalDamage: 2 },
    artifactAllElement: 5, artifactSingleElement: 10,
  }]);
  const artifactSnapshot = clone(artifacts);
  const baselineSnapshot = clone(baseline);
  recommendation.getCreatureArtifactEffectsTotal(artifacts, baseline, {});
  recommendation.getCreatureArtifactDisplayEffects(
    { sourceType: 'creatureArtifact', ...artifacts[0] },
    baseline,
    'fire',
  );
  recommendation.getAdjustedElementBaselineForRecommendation(
    {
      sourceType: 'title', titleEnchantElement: 'water',
      targetTitleEnchantEffects: { elementAll: 20 }, effects: {},
    },
    {
      sourceType: 'title', titleEnchantElement: 'fire',
      enchantEffects: { elementAll: 10 }, effects: {},
    },
    baseline,
  );
  assert.deepEqual(artifacts, artifactSnapshot);
  assert.deepEqual(baseline, baselineSnapshot);
}

const tests = [
  testFactoryContract,
  testReplacementDamageFormulas,
  testCreatureArtifactCalculations,
  testRepresentativeRowsAndSimulatorReferences,
  testComparatorPolicyAndStableSort,
  testInputImmutability,
];

for (const test of tests) test();
console.log('enchant dealer recommendation: ok');
