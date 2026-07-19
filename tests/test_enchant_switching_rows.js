import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  getSwitchingTitleRows,
  getSwitchingFragmentRows,
  getSwitchingCreatureRows,
} from '../src/dnfHellTool/enchantSwitchingRows.js';

const PROVIDED_PRE_MOVE_CHARACTERIZATION_SHA256 =
  '13ed6f59ba8ef513588504932613e06c6e9833edf96680db1db89d88f386a6be';

function legacyGetSwitchingTitleRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingTitle',
    slot: candidate.slot === '버프강화 칭호' ? '벞강 칭호' : candidate.slot || '벞강 칭호',
    tier: candidate.tier === '스위칭' ? '버프강화' : candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingTitle',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    itemReinforceSkill: candidate.itemReinforceSkill || [],
    itemBuff: candidate.itemBuff || {},
    enchantEffects: candidate.enchantEffects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    buffSkillName: candidate.buffSkillName || '',
    enchantBuffSkillLevelDelta: Number(candidate.enchantBuffSkillLevelDelta || 0),
    switchingStatDelta: Number(candidate.switchingStatDelta || 0),
    switchingDirectStatDelta: Number(candidate.switchingDirectStatDelta || 0),
    switchingBuffAmplificationDelta: Number(candidate.switchingBuffAmplificationDelta || 0),
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    auraStatDelta: Number(candidate.auraStatDelta || 0),
    auraAttackDelta: Number(candidate.auraAttackDelta || 0),
    currentTitleContribution: Number(candidate.currentTitleContribution || 0),
    candidateTitleContribution: Number(candidate.candidateTitleContribution || 0),
    targetBuffSlot: 'TITLE',
    purchaseRoute: candidate.purchaseRoute || '',
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
    baseSkillContributions: candidate.baseSkillContributions || [],
    targetSkillContributions: candidate.targetSkillContributions || [],
    hasExactSkillContributions: Array.isArray(candidate.baseSkillContributions)
      && Array.isArray(candidate.targetSkillContributions),
    skillContributionScope: candidate.skillContributionScope || '',
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
}

function legacyGetSwitchingFragmentRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingFragment',
    slot: candidate.slot || '짙편린',
    tier: candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingFragment',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '유니크',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    switchingSlot: candidate.switchingSlot || '',
    targetBuffSlot: candidate.targetBuffSlot || candidate.switchingSlot || '',
    targetBuffChanges: candidate.targetBuffChanges || null,
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
  }));
}

function legacyGetSwitchingCreatureRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingCreature',
    slot: candidate.slot || '벞강 크리쳐',
    tier: candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingCreature',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    buffSkillName: candidate.buffSkillName || '',
    switchingStatDelta: Number(candidate.switchingStatDelta || 0),
    switchingDirectStatDelta: Number(candidate.switchingDirectStatDelta || 0),
    switchingBuffAmplificationDelta: Number(candidate.switchingBuffAmplificationDelta || 0),
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    currentCreatureContribution: Number(candidate.currentCreatureContribution || 0),
    candidateCreatureContribution: Number(candidate.candidateCreatureContribution || 0),
    targetBuffSlot: 'CREATURE',
    purchaseRoute: candidate.purchaseRoute || '',
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
    targetCreatureName: candidate.targetCreatureName || '',
    freeAction: Boolean(candidate.freeAction),
    baseSkillContributions: candidate.baseSkillContributions || [],
    targetSkillContributions: candidate.targetSkillContributions || [],
    hasExactSkillContributions: Array.isArray(candidate.baseSkillContributions)
      && Array.isArray(candidate.targetSkillContributions),
    skillContributionScope: candidate.skillContributionScope || '',
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
}

const titleKeys = [
  'sourceType',
  'slot',
  'tier',
  'kind',
  'itemId',
  'itemName',
  'itemRarity',
  'fame',
  'iconUrl',
  'effects',
  'itemReinforceSkill',
  'itemBuff',
  'enchantEffects',
  'skillDamageMultiplier',
  'itemExplain',
  'auction',
  'candidateName',
  'buffSkillName',
  'enchantBuffSkillLevelDelta',
  'switchingStatDelta',
  'switchingDirectStatDelta',
  'switchingBuffAmplificationDelta',
  'bufferBuffSkillLevelDelta',
  'auraStatDelta',
  'auraAttackDelta',
  'currentTitleContribution',
  'candidateTitleContribution',
  'targetBuffSlot',
  'purchaseRoute',
  'purchaseRouteLabel',
  'baseSkillContributions',
  'targetSkillContributions',
  'hasExactSkillContributions',
  'skillContributionScope',
  'recommendationPriority',
];

const fragmentKeys = [
  'sourceType',
  'slot',
  'tier',
  'kind',
  'itemId',
  'itemName',
  'itemRarity',
  'fame',
  'iconUrl',
  'effects',
  'skillDamageMultiplier',
  'itemExplain',
  'auction',
  'candidateName',
  'switchingSlot',
  'targetBuffSlot',
  'targetBuffChanges',
  'purchaseRouteLabel',
];

const creatureKeys = [
  'sourceType',
  'slot',
  'tier',
  'kind',
  'itemId',
  'itemName',
  'itemRarity',
  'fame',
  'iconUrl',
  'effects',
  'skillDamageMultiplier',
  'itemExplain',
  'auction',
  'candidateName',
  'buffSkillName',
  'switchingStatDelta',
  'switchingDirectStatDelta',
  'switchingBuffAmplificationDelta',
  'bufferBuffSkillLevelDelta',
  'currentCreatureContribution',
  'candidateCreatureContribution',
  'targetBuffSlot',
  'purchaseRoute',
  'purchaseRouteLabel',
  'targetCreatureName',
  'freeAction',
  'baseSkillContributions',
  'targetSkillContributions',
  'hasExactSkillContributions',
  'skillContributionScope',
  'recommendationPriority',
];

const titleEffects = { finalDamage: 1.5 };
const titleAuction = { minUnitPrice: 123456 };
const titleItemReinforceSkill = [{ jobName: '공통', skills: [{ name: '버프', value: 1 }] }];
const titleItemBuff = { reinforceSkill: [{ levelRange: [{ minLevel: 20, maxLevel: 25, value: 1 }] }] };
const titleEnchantEffects = { allStat: 10 };
const titleBaseContributions = [{ contextKey: 'title:base', levelContribution: 1 }];
const titleTargetContributions = [{ contextKey: 'title:target', levelContribution: 2 }];
const titleFull = {
  slot: '버프강화 칭호',
  tier: '스위칭',
  kind: 'customSwitchingTitle',
  itemId: 'title id/한글?&',
  itemName: '완전 칭호',
  itemRarity: '에픽',
  fame: 0,
  iconUrl: '',
  effects: titleEffects,
  itemReinforceSkill: titleItemReinforceSkill,
  itemBuff: titleItemBuff,
  enchantEffects: titleEnchantEffects,
  skillDamageMultiplier: '0',
  itemExplain: '칭호 설명',
  auction: titleAuction,
  buffSkillName: '버프 스킬',
  enchantBuffSkillLevelDelta: '2',
  switchingStatDelta: '-3',
  switchingDirectStatDelta: '4',
  switchingBuffAmplificationDelta: '5.5',
  bufferBuffSkillLevelDelta: '1',
  auraStatDelta: '6',
  auraAttackDelta: '7',
  currentTitleContribution: '1',
  candidateTitleContribution: '3',
  purchaseRoute: 'route',
  purchaseRouteLabel: '구매 경로',
  baseSkillContributions: titleBaseContributions,
  targetSkillContributions: titleTargetContributions,
  skillContributionScope: 'switching',
  recommendationPriority: '8',
};

const fragmentEffects = { skillDamageMultiplier: 1.02 };
const fragmentAuction = { minUnitPrice: 765432 };
const fragmentTargetBuffChanges = { equipment: { itemId: 'target-fragment' } };
const fragmentFull = {
  slot: '상의',
  tier: '짙은 편린',
  kind: 'customSwitchingFragment',
  itemId: 'fragment id/한글?&',
  itemName: '완전 짙편린',
  itemRarity: '레전더리',
  fame: 11,
  iconUrl: '',
  effects: fragmentEffects,
  skillDamageMultiplier: '1.25',
  itemExplain: '장비 설명',
  auction: fragmentAuction,
  switchingSlot: 'SWITCH_SLOT',
  targetBuffSlot: 'TARGET_SLOT',
  targetBuffChanges: fragmentTargetBuffChanges,
  purchaseRouteLabel: '구매 경로',
};

const creatureEffects = { allStat: 25 };
const creatureAuction = { minUnitPrice: 999999 };
const creatureBaseContributions = [{ contextKey: 'creature:base', levelContribution: 0 }];
const creatureTargetContributions = [{ contextKey: 'creature:target', levelContribution: 1 }];
const creatureFull = {
  slot: '버프강화 크리쳐',
  tier: '스위칭',
  kind: 'customSwitchingCreature',
  itemId: 'creature id/한글?&',
  itemName: '완전 크리쳐',
  itemRarity: '에픽',
  fame: 22,
  iconUrl: '',
  effects: creatureEffects,
  skillDamageMultiplier: '0',
  itemExplain: '크리쳐 설명',
  auction: creatureAuction,
  buffSkillName: '버프 스킬',
  switchingStatDelta: '10',
  switchingDirectStatDelta: '9',
  switchingBuffAmplificationDelta: '8',
  bufferBuffSkillLevelDelta: '1',
  currentCreatureContribution: '2',
  candidateCreatureContribution: '3',
  purchaseRoute: 'route',
  purchaseRouteLabel: '구매 경로',
  targetCreatureName: '교체 대상 크리쳐',
  freeAction: 'false',
  baseSkillContributions: creatureBaseContributions,
  targetSkillContributions: creatureTargetContributions,
  skillContributionScope: 'switching',
  recommendationPriority: '4',
};

const titleFixtures = [
  undefined,
  null,
  [],
  [{}],
  [titleFull],
  [{ skillDamageMultiplier: 0, baseSkillContributions: [], targetSkillContributions: [] }],
  [{ skillDamageMultiplier: '0', baseSkillContributions: {}, targetSkillContributions: [] }],
];
const fragmentFixtures = [
  undefined,
  null,
  [],
  [{}],
  [fragmentFull],
  [{ switchingSlot: 'SWITCH_ONLY', targetBuffSlot: '', targetBuffChanges: 0, skillDamageMultiplier: 0 }],
  [{ switchingSlot: '', targetBuffSlot: '', skillDamageMultiplier: '0' }],
];
const creatureFixtures = [
  undefined,
  null,
  [],
  [{}],
  [creatureFull],
  [{ freeAction: false, skillDamageMultiplier: 0, baseSkillContributions: [], targetSkillContributions: [] }],
  [{ freeAction: 'false', skillDamageMultiplier: '0', baseSkillContributions: [], targetSkillContributions: {} }],
];

function assertLegacyParity(label, legacyFunction, moduleFunction, fixtures) {
  fixtures.forEach((fixture, index) => {
    assert.deepStrictEqual(
      moduleFunction(fixture),
      legacyFunction(fixture),
      `${label} legacy parity fixture ${index}`,
    );
  });
}

assertLegacyParity('title', legacyGetSwitchingTitleRows, getSwitchingTitleRows, titleFixtures);
assertLegacyParity('fragment', legacyGetSwitchingFragmentRows, getSwitchingFragmentRows, fragmentFixtures);
assertLegacyParity('creature', legacyGetSwitchingCreatureRows, getSwitchingCreatureRows, creatureFixtures);

assert.deepStrictEqual(getSwitchingTitleRows(), []);
assert.deepStrictEqual(getSwitchingTitleRows(null), []);
assert.deepStrictEqual(getSwitchingTitleRows([]), []);
assert.deepStrictEqual(getSwitchingFragmentRows(), []);
assert.deepStrictEqual(getSwitchingFragmentRows(null), []);
assert.deepStrictEqual(getSwitchingFragmentRows([]), []);
assert.deepStrictEqual(getSwitchingCreatureRows(), []);
assert.deepStrictEqual(getSwitchingCreatureRows(null), []);
assert.deepStrictEqual(getSwitchingCreatureRows([]), []);

const minimalTitle = getSwitchingTitleRows([{}])[0];
const minimalFragment = getSwitchingFragmentRows([{}])[0];
const minimalCreature = getSwitchingCreatureRows([{}])[0];
assert.deepStrictEqual(Object.keys(minimalTitle), titleKeys);
assert.deepStrictEqual(Object.keys(minimalFragment), fragmentKeys);
assert.deepStrictEqual(Object.keys(minimalCreature), creatureKeys);
for (const row of [minimalTitle, minimalFragment, minimalCreature]) {
  for (const key of ['itemId', 'itemName', 'fame']) {
    assert.equal(Object.prototype.hasOwnProperty.call(row, key), true, `${row.sourceType}.${key} own-property`);
    assert.equal(row[key], undefined, `${row.sourceType}.${key} undefined value`);
  }
}

assert.equal(minimalTitle.slot, '벞강 칭호');
assert.equal(minimalTitle.tier, '버프강화');
assert.equal(minimalTitle.kind, 'switchingTitle');
assert.equal(minimalTitle.itemRarity, '레어');
assert.equal(minimalTitle.targetBuffSlot, 'TITLE');
assert.equal(minimalFragment.slot, '짙편린');
assert.equal(minimalFragment.tier, '버프강화');
assert.equal(minimalFragment.kind, 'switchingFragment');
assert.equal(minimalFragment.itemRarity, '유니크');
assert.equal(minimalFragment.targetBuffChanges, null);
assert.equal(minimalCreature.slot, '벞강 크리쳐');
assert.equal(minimalCreature.tier, '버프강화');
assert.equal(minimalCreature.kind, 'switchingCreature');
assert.equal(minimalCreature.itemRarity, '레어');
assert.equal(minimalCreature.targetBuffSlot, 'CREATURE');

const titleRow = getSwitchingTitleRows([titleFull])[0];
assert.deepStrictEqual(Object.keys(titleRow), titleKeys);
assert.equal(titleRow.slot, '벞강 칭호');
assert.equal(titleRow.tier, '버프강화');
assert.equal(titleRow.iconUrl, 'https://img-api.neople.co.kr/df/items/title%20id%2F%ED%95%9C%EA%B8%80%3F%26');
assert.equal(titleRow.skillDamageMultiplier, 0);
assert.equal(titleRow.targetBuffSlot, 'TITLE');
assert.equal(titleRow.hasExactSkillContributions, true);
assert.equal(titleRow.recommendationPriority, 8);
assert.strictEqual(titleRow.effects, titleEffects);
assert.strictEqual(titleRow.auction, titleAuction);
assert.strictEqual(titleRow.itemReinforceSkill, titleItemReinforceSkill);
assert.strictEqual(titleRow.itemBuff, titleItemBuff);
assert.strictEqual(titleRow.enchantEffects, titleEnchantEffects);
assert.strictEqual(titleRow.baseSkillContributions, titleBaseContributions);
assert.strictEqual(titleRow.targetSkillContributions, titleTargetContributions);

const titleNumericZero = getSwitchingTitleRows([{ skillDamageMultiplier: 0 }])[0];
const titleStringZero = getSwitchingTitleRows([{ skillDamageMultiplier: '0' }])[0];
assert.equal(titleNumericZero.skillDamageMultiplier, 1);
assert.equal(titleStringZero.skillDamageMultiplier, 0);
assert.equal(getSwitchingTitleRows([{ baseSkillContributions: [], targetSkillContributions: [] }])[0].hasExactSkillContributions, true);
assert.equal(getSwitchingTitleRows([{ baseSkillContributions: {}, targetSkillContributions: [] }])[0].hasExactSkillContributions, false);

const fragmentRow = getSwitchingFragmentRows([fragmentFull])[0];
assert.deepStrictEqual(Object.keys(fragmentRow), fragmentKeys);
assert.equal(fragmentRow.iconUrl, 'https://img-api.neople.co.kr/df/items/fragment%20id%2F%ED%95%9C%EA%B8%80%3F%26');
assert.equal(fragmentRow.targetBuffSlot, 'TARGET_SLOT');
assert.strictEqual(fragmentRow.effects, fragmentEffects);
assert.strictEqual(fragmentRow.auction, fragmentAuction);
assert.strictEqual(fragmentRow.targetBuffChanges, fragmentTargetBuffChanges);
const fragmentSwitchFallback = getSwitchingFragmentRows([{
  targetBuffSlot: '',
  switchingSlot: 'SWITCH_ONLY',
  targetBuffChanges: 0,
}])[0];
assert.equal(fragmentSwitchFallback.targetBuffSlot, 'SWITCH_ONLY');
assert.equal(fragmentSwitchFallback.targetBuffChanges, null);
assert.equal(getSwitchingFragmentRows([{ targetBuffSlot: '', switchingSlot: '' }])[0].targetBuffSlot, '');
assert.equal(getSwitchingFragmentRows([{ skillDamageMultiplier: 0 }])[0].skillDamageMultiplier, 1);
assert.equal(getSwitchingFragmentRows([{ skillDamageMultiplier: '0' }])[0].skillDamageMultiplier, 0);

const creatureRow = getSwitchingCreatureRows([creatureFull])[0];
assert.deepStrictEqual(Object.keys(creatureRow), creatureKeys);
assert.equal(creatureRow.iconUrl, 'https://img-api.neople.co.kr/df/items/creature%20id%2F%ED%95%9C%EA%B8%80%3F%26');
assert.equal(creatureRow.skillDamageMultiplier, 0);
assert.equal(creatureRow.targetBuffSlot, 'CREATURE');
assert.equal(creatureRow.freeAction, true);
assert.equal(creatureRow.hasExactSkillContributions, true);
assert.equal(creatureRow.recommendationPriority, 4);
assert.strictEqual(creatureRow.effects, creatureEffects);
assert.strictEqual(creatureRow.auction, creatureAuction);
assert.strictEqual(creatureRow.baseSkillContributions, creatureBaseContributions);
assert.strictEqual(creatureRow.targetSkillContributions, creatureTargetContributions);
assert.equal(getSwitchingCreatureRows([{ freeAction: false }])[0].freeAction, false);
assert.equal(getSwitchingCreatureRows([{ freeAction: 'false' }])[0].freeAction, true);
assert.equal(getSwitchingCreatureRows([{ skillDamageMultiplier: 0 }])[0].skillDamageMultiplier, 1);
assert.equal(getSwitchingCreatureRows([{ skillDamageMultiplier: '0' }])[0].skillDamageMultiplier, 0);
assert.equal(getSwitchingCreatureRows([{ baseSkillContributions: [], targetSkillContributions: [] }])[0].hasExactSkillContributions, true);
assert.equal(getSwitchingCreatureRows([{ baseSkillContributions: [], targetSkillContributions: {} }])[0].hasExactSkillContributions, false);

function jsonWithUndefined(value) {
  return JSON.stringify(value, (_key, item) => item === undefined ? '__undefined__' : item);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function getPreMoveCharacterization(api) {
  const shared = {
    effects: { attack: 1 },
    itemReinforceSkill: [{ skill: 'A' }],
    itemBuff: { x: 1 },
    enchantEffects: { allStat: 2 },
    auction: { minUnitPrice: 123 },
    baseSkillContributions: [{ name: 'base' }],
    targetSkillContributions: [{ name: 'target' }],
    targetBuffChanges: { delta: 1 },
  };
  const titleFull = {
    slot: '버프강화 칭호',
    tier: '스위칭',
    kind: '',
    itemId: '한 글/1',
    itemName: '칭호',
    itemRarity: '',
    fame: 0,
    iconUrl: '',
    effects: shared.effects,
    itemReinforceSkill: shared.itemReinforceSkill,
    itemBuff: shared.itemBuff,
    enchantEffects: shared.enchantEffects,
    skillDamageMultiplier: '0',
    itemExplain: '',
    auction: shared.auction,
    buffSkillName: '스킬',
    enchantBuffSkillLevelDelta: '2',
    switchingStatDelta: '-3',
    switchingDirectStatDelta: '4.5',
    switchingBuffAmplificationDelta: null,
    bufferBuffSkillLevelDelta: '1',
    auraStatDelta: '7',
    auraAttackDelta: '8',
    currentTitleContribution: '9',
    candidateTitleContribution: '10',
    purchaseRoute: 'auction',
    purchaseRouteLabel: '구매',
    baseSkillContributions: shared.baseSkillContributions,
    targetSkillContributions: shared.targetSkillContributions,
    skillContributionScope: 'scope',
    recommendationPriority: '11',
  };
  const fragmentFull = {
    slot: '',
    tier: '',
    kind: '',
    itemId: 'frag id',
    itemName: '조각',
    itemRarity: '',
    fame: null,
    iconUrl: '',
    effects: shared.effects,
    skillDamageMultiplier: '0',
    itemExplain: '',
    auction: shared.auction,
    switchingSlot: 'SLOT',
    targetBuffSlot: '',
    targetBuffChanges: shared.targetBuffChanges,
    purchaseRouteLabel: 'route',
  };
  const creatureFull = {
    slot: '',
    tier: '',
    kind: '',
    itemId: 'creature/한',
    itemName: '크리쳐',
    itemRarity: '',
    fame: 1,
    iconUrl: '',
    effects: shared.effects,
    skillDamageMultiplier: '1.25',
    itemExplain: '',
    auction: shared.auction,
    buffSkillName: 'buff',
    switchingStatDelta: '2',
    switchingDirectStatDelta: '3',
    switchingBuffAmplificationDelta: '4',
    bufferBuffSkillLevelDelta: '5',
    currentCreatureContribution: '6',
    candidateCreatureContribution: '7',
    purchaseRoute: 'free',
    purchaseRouteLabel: '무료',
    targetCreatureName: '목표',
    freeAction: 'false',
    baseSkillContributions: shared.baseSkillContributions,
    targetSkillContributions: shared.targetSkillContributions,
    skillContributionScope: 'scope',
    recommendationPriority: '8',
  };
  const titleRows = api.getSwitchingTitleRows([{}, titleFull]);
  const fragmentRows = api.getSwitchingFragmentRows([{}, fragmentFull]);
  const creatureRows = api.getSwitchingCreatureRows([{}, creatureFull]);

  return {
    empty: {
      titleUndefined: api.getSwitchingTitleRows(),
      titleNull: api.getSwitchingTitleRows(null),
      fragmentUndefined: api.getSwitchingFragmentRows(),
      fragmentNull: api.getSwitchingFragmentRows(null),
      creatureUndefined: api.getSwitchingCreatureRows(),
      creatureNull: api.getSwitchingCreatureRows(null),
    },
    rows: { title: titleRows, fragment: fragmentRows, creature: creatureRows },
    identity: {
      titleEffects: titleRows[1].effects === shared.effects,
      titleBase: titleRows[1].baseSkillContributions === shared.baseSkillContributions,
      titleTarget: titleRows[1].targetSkillContributions === shared.targetSkillContributions,
      titleAuction: titleRows[1].auction === shared.auction,
      fragmentChanges: fragmentRows[1].targetBuffChanges === shared.targetBuffChanges,
      fragmentEffects: fragmentRows[1].effects === shared.effects,
      creatureBase: creatureRows[1].baseSkillContributions === shared.baseSkillContributions,
      creatureTarget: creatureRows[1].targetSkillContributions === shared.targetSkillContributions,
      creatureAuction: creatureRows[1].auction === shared.auction,
    },
    order: {
      title: titleRows.map((row) => row.itemName),
      fragment: fragmentRows.map((row) => row.itemName),
      creature: creatureRows.map((row) => row.itemName),
    },
  };
}

const legacyCharacterization = {
  title: titleFixtures.map((fixture) => legacyGetSwitchingTitleRows(fixture)),
  fragment: fragmentFixtures.map((fixture) => legacyGetSwitchingFragmentRows(fixture)),
  creature: creatureFixtures.map((fixture) => legacyGetSwitchingCreatureRows(fixture)),
};
const moduleCharacterization = {
  title: titleFixtures.map((fixture) => getSwitchingTitleRows(fixture)),
  fragment: fragmentFixtures.map((fixture) => getSwitchingFragmentRows(fixture)),
  creature: creatureFixtures.map((fixture) => getSwitchingCreatureRows(fixture)),
};
const legacyCharacterizationSha256 = sha256(jsonWithUndefined(legacyCharacterization));
const moduleCharacterizationSha256 = sha256(jsonWithUndefined(moduleCharacterization));
assert.equal(moduleCharacterizationSha256, legacyCharacterizationSha256);

const preMoveLegacyCharacterizationSha256 = sha256(JSON.stringify(getPreMoveCharacterization({
  getSwitchingTitleRows: legacyGetSwitchingTitleRows,
  getSwitchingFragmentRows: legacyGetSwitchingFragmentRows,
  getSwitchingCreatureRows: legacyGetSwitchingCreatureRows,
})));
const preMoveModuleCharacterizationSha256 = sha256(JSON.stringify(getPreMoveCharacterization({
  getSwitchingTitleRows,
  getSwitchingFragmentRows,
  getSwitchingCreatureRows,
})));
assert.equal(preMoveLegacyCharacterizationSha256, PROVIDED_PRE_MOVE_CHARACTERIZATION_SHA256);
assert.equal(preMoveModuleCharacterizationSha256, PROVIDED_PRE_MOVE_CHARACTERIZATION_SHA256);

console.log(`enchant switching rows: ok (${preMoveModuleCharacterizationSha256})`);
