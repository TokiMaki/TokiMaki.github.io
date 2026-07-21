import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as identityModule from '../src/dnfHellTool/enchantSimulatorIdentity.js';

const { createEnchantSimulatorIdentity } = identityModule;

const DEPENDENCY_NAMES = [
  'effectOrder',
  'blackFangSimulatorSlots',
];

const PUBLIC_OUTPUTS = [
  'getEffectSignature',
  'getEnchantExclusiveGroupKey',
  'getEnchantCandidateSignature',
  'getAuraExclusiveGroupKey',
  'getAuraCandidateSignature',
  'getCreatureExclusiveGroupKey',
  'getCreatureCandidateSignature',
  'getCreatureArtifactType',
  'getCreatureArtifactExclusiveGroupKey',
  'getCreatureArtifactCandidateSignature',
  'getTitleExclusiveGroupKey',
  'getTitleCandidateSignature',
  'getBlackFangExclusiveGroupKey',
  'getBlackFangCandidateSignature',
  'getRelicCraftExclusiveGroupKey',
  'getRelicCraftCandidateSignature',
  'getAvatarEmblemExclusiveGroupKey',
  'getAvatarEmblemCandidateSignature',
  'getAvatarPlatinumExclusiveGroupKey',
  'getAvatarPlatinumCandidateSignature',
  'getBuffSimulatorTargetSlotId',
  'getBuffSimulatorExclusiveGroupKey',
  'getBuffSimulatorCandidateSignature',
  'getStableObjectSignature',
  'getCurrentCreatureArtifactBySlot',
  'creatureArtifactTypes',
];

const MOVED_FUNCTIONS = PUBLIC_OUTPUTS.filter((name) => name !== 'creatureArtifactTypes');

const EXCLUSIVE_DISPATCH_ORDER = [
  'getBufferEnchantExclusiveGroupKey',
  'getBufferCreatureArtifactExclusiveGroupKey',
  'getBufferUpgradeExclusiveGroupKey',
  'getBufferBlackFangExclusiveGroupKey',
  'getBufferRelicCraftExclusiveGroupKey',
  'getBufferCreatureExclusiveGroupKey',
  'getBufferAuraExclusiveGroupKey',
  'getBufferTitleExclusiveGroupKey',
  'getBufferSwitchingCreatureExclusiveGroupKey',
  'getBufferSwitchingTitleExclusiveGroupKey',
  'getBufferSwitchingAvatarExclusiveGroupKey',
  'getBufferSwitchingPlatinumExclusiveGroupKey',
  'getEnchantExclusiveGroupKey',
  'getAuraExclusiveGroupKey',
  'getCreatureExclusiveGroupKey',
  'getCreatureArtifactExclusiveGroupKey',
  'getTitleExclusiveGroupKey',
  'getEquipmentTuneExclusiveGroupKey',
  'getOathTuneExclusiveGroupKey',
  'getOathAcquisitionExclusiveGroupKey',
  'getBlackFangExclusiveGroupKey',
  'getRelicCraftExclusiveGroupKey',
  'getEquipmentProgressionExclusiveGroupKey',
  'getAvatarEmblemExclusiveGroupKey',
  'getAvatarPlatinumExclusiveGroupKey',
  'getBuffSimulatorExclusiveGroupKey',
];

const CANDIDATE_DISPATCH_ORDER = [
  'getBufferEnchantCandidateSignature',
  'getBufferCreatureArtifactCandidateSignature',
  'getBufferUpgradeCandidateSignature',
  'getBufferBlackFangCandidateSignature',
  'getBufferRelicCraftCandidateSignature',
  'getBufferCreatureCandidateSignature',
  'getBufferAuraCandidateSignature',
  'getBufferTitleCandidateSignature',
  'getBufferSwitchingCreatureCandidateSignature',
  'getBufferSwitchingTitleCandidateSignature',
  'getBufferSwitchingAvatarCandidateSignature',
  'getBufferSwitchingPlatinumCandidateSignature',
  'getEnchantCandidateSignature',
  'getAuraCandidateSignature',
  'getCreatureCandidateSignature',
  'getCreatureArtifactCandidateSignature',
  'getTitleCandidateSignature',
  'getEquipmentTuneCandidateSignature',
  'getOathTuneCandidateSignature',
  'getOathAcquisitionCandidateSignature',
  'getBlackFangCandidateSignature',
  'getRelicCraftCandidateSignature',
  'getEquipmentProgressionCandidateSignature',
  'getAvatarEmblemCandidateSignature',
  'getAvatarPlatinumCandidateSignature',
  'getBuffSimulatorCandidateSignature',
];

function createIdentity(effectOrder = ['finalDamage', 'attack'], blackFangSlots = new Set(['목걸이', '팔찌', '반지'])) {
  return createEnchantSimulatorIdentity({
    effectOrder,
    blackFangSimulatorSlots: blackFangSlots,
  });
}

function getFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
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
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        state = 'code';
      }
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

function testFactoryContractDependencyAliasesAndPublicSet() {
  assert.deepEqual(Object.keys(identityModule), ['createEnchantSimulatorIdentity']);
  const dependencyReads = [];
  const dependencies = new Proxy({
    effectOrder: ['second', 'first'],
    blackFangSimulatorSlots: new Set(['특수 슬롯']),
  }, {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const identity = createEnchantSimulatorIdentity(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(identity), PUBLIC_OUTPUTS);
  MOVED_FUNCTIONS.forEach((name) => assert.equal(typeof identity[name], 'function'));
  assert.ok(identity.creatureArtifactTypes instanceof Set);
  assert.deepEqual([...identity.creatureArtifactTypes], ['RED', 'BLUE', 'GREEN']);
  for (const privateName of [
    'EFFECT_ORDER',
    'BLACK_FANG_SIMULATOR_SLOTS',
    'CREATURE_ARTIFACT_TYPES',
    'deps',
  ]) {
    assert.equal(privateName in identity, false);
    assert.equal(privateName in identityModule, false);
  }
  assert.equal(identity.getEffectSignature({ first: 4 }), 'second:0|first:4');
  assert.equal(
    identity.getBlackFangExclusiveGroupKey({ sourceType: 'blackFang', slot: '특수 슬롯' }),
    'blackFang:특수 슬롯',
  );

  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantSimulatorIdentity.js', import.meta.url));
  const moduleSource = readFileSync(modulePath, 'utf8');
  assert.match(moduleSource, /const \{\s*effectOrder: EFFECT_ORDER,\s*blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,\s*\} = deps;/);
}

function testEffectAndStableObjectSignatures() {
  const identity = createIdentity(['attack', 'finalDamage', 'elementAll']);
  assert.equal(
    identity.getEffectSignature({ finalDamage: 7, attack: 3, ignored: 99 }),
    'attack:3|finalDamage:7|elementAll:0',
  );
  assert.equal(identity.getEffectSignature(), 'attack:0|finalDamage:0|elementAll:0');
  assert.equal(
    identity.getStableObjectSignature({
      z: 1,
      a: {
        d: 4,
        b: [{ y: 2, x: 1 }, 'v'],
      },
    }),
    'a:b:0:x:1|y:2|1:v|d:4|z:1',
  );
  assert.equal(identity.getStableObjectSignature(['z', { b: 2, a: 1 }]), '0:z|1:a:1|b:2');
  assert.equal(identity.getStableObjectSignature(null), '');
  assert.equal(identity.getStableObjectSignature(false), 'false');
}

function testDealerSourceIdentityMatrix() {
  const identity = createIdentity();

  const enchant = {
    sourceType: 'enchant',
    slot: ' 상의 ',
    itemId: 'enchant-1',
    tier: '종결',
    effects: { finalDamage: 5 },
    reinforceSkill: [{ b: 2, a: 1 }],
  };
  assert.equal(identity.getEnchantExclusiveGroupKey(enchant), 'enchant:상의');
  assert.equal(
    identity.getEnchantCandidateSignature(enchant),
    'enchant:상의:enchant-1:종결:finalDamage:5|attack:0:0:a:1|b:2',
  );
  assert.equal(identity.getEnchantExclusiveGroupKey({ ...enchant, sourceType: 'aura' }), '');

  const aura = {
    sourceType: 'aura',
    itemId: 'aura-1',
    tier: '일반',
    effects: { attack: 2 },
    itemReinforceSkill: [{ name: '오라' }],
    skillDamageMultiplier: 1.25,
  };
  assert.equal(identity.getAuraExclusiveGroupKey(aura), 'aura');
  assert.equal(
    identity.getAuraCandidateSignature(aura),
    'aura:aura-1:일반:finalDamage:0|attack:2:0:name:오라:1.25000000',
  );

  const creature = {
    sourceType: 'creature',
    itemId: 'creature-1',
    tier: '플래티넘',
    effects: { finalDamage: 3 },
    reinforceSkills: [{ value: 2, name: '스킬' }],
    skillDamageMultiplier: 0,
  };
  assert.equal(identity.getCreatureExclusiveGroupKey(creature), 'creature');
  assert.equal(
    identity.getCreatureCandidateSignature(creature),
    'creature:creature-1:플래티넘:finalDamage:3|attack:0:0:name:스킬|value:2:1.00000000',
  );

  const artifact = {
    sourceType: 'creatureArtifact',
    slotColor: ' blue ',
    itemId: 'artifact-1',
  };
  assert.equal(identity.getCreatureArtifactExclusiveGroupKey(artifact), 'creatureArtifact:BLUE');
  assert.equal(identity.getCreatureArtifactCandidateSignature(artifact), 'creatureArtifact:BLUE:artifact-1');
  assert.equal(identity.getCreatureArtifactCandidateSignature({ ...artifact, itemId: '' }), '');

  const title = {
    sourceType: 'title',
    itemId: 'title-1',
    tier: '일반',
    titlePackageEffects: { finalDamage: 4 },
    titleEnchantElement: 'fire',
    targetTitleEnchantEffects: { attack: 5 },
    titleBead: { itemId: 'bead-1' },
    purchaseRoute: 'attachedBead',
    priceItem: { itemId: 'price-1' },
  };
  assert.equal(identity.getTitleExclusiveGroupKey(title), 'title');
  assert.equal(
    identity.getTitleCandidateSignature(title),
    'title:title-1:일반:finalDamage:4|attack:0:fire:finalDamage:0|attack:5:bead-1:attachedBead:price-1',
  );

  const blackFang = {
    sourceType: 'blackFang',
    slot: ' 목걸이 ',
    targetItemId: 'black-fang-1',
    targetEffects: { finalDamage: 6 },
  };
  assert.equal(identity.getBlackFangExclusiveGroupKey(blackFang), 'blackFang:목걸이');
  assert.equal(
    identity.getBlackFangCandidateSignature(blackFang),
    'blackFang:목걸이:black-fang-1:finalDamage:6|attack:0',
  );
  assert.equal(identity.getBlackFangExclusiveGroupKey({ ...blackFang, slot: '무기' }), '');

  const relicCraft = {
    sourceType: 'relicCraft',
    targetSlotId: 'MAGIC_STON',
    targetEquipmentBody: {
      itemId: 'perfume-1',
      effects: { finalDamage: 70.67376612, attack: 3729 },
    },
  };
  assert.equal(identity.getRelicCraftExclusiveGroupKey(relicCraft), 'relicCraft:마법석');
  assert.equal(
    identity.getRelicCraftCandidateSignature(relicCraft),
    'relicCraft:마법석:perfume-1:finalDamage:70.67376612|attack:3729',
  );
  assert.equal(identity.getRelicCraftExclusiveGroupKey({ ...relicCraft, targetSlotId: 'SUPPORT' }), '');
}

function testAvatarAndBuffSwitchingIdentityMatrix() {
  const identity = createIdentity();
  const emblem = {
    sourceType: 'avatar',
    kind: 'brilliantEmblem',
    targetSlotId: 'JACKET',
    itemId: 'emblem-row',
    socketChanges: [
      {
        socketIndex: 0,
        targetEmblem: { itemId: 'red-emblem', effects: { attack: 3 } },
      },
      {
        socketKey: 'special',
        targetEmblem: { effects: { finalDamage: 1 } },
      },
    ],
  };
  assert.equal(identity.getAvatarEmblemExclusiveGroupKey(emblem), 'avatarEmblem:JACKET');
  assert.equal(
    identity.getAvatarEmblemCandidateSignature(emblem),
    'avatarEmblem:JACKET:emblem-row:regular:0:red-emblem:finalDamage:0|attack:3,special:emblem-row:finalDamage:1|attack:0',
  );
  assert.equal(
    identity.getAvatarEmblemExclusiveGroupKey({ ...emblem, bufferStatScope: 'switching' }),
    'buffAvatarEmblem:JACKET',
  );
  assert.equal(identity.getAvatarEmblemCandidateSignature({ ...emblem, socketChanges: [] }), '');

  const platinum = {
    sourceType: 'avatar',
    kind: 'platinumEmblem',
    targetSlotId: 'PANTS',
    targetSkill: 'fallback-skill',
    targetPlatinumEmblem: {
      itemId: 'platinum-1',
      targetSkill: 'target-skill',
    },
  };
  assert.equal(identity.getAvatarPlatinumExclusiveGroupKey(platinum), 'avatarPlatinum:PANTS');
  assert.equal(
    identity.getAvatarPlatinumCandidateSignature(platinum),
    'avatarPlatinum:PANTS:platinum-1:target-skill',
  );

  const switchingRows = [
    {
      row: {
        sourceType: 'switchingTitle',
        itemId: 'switch-title',
        targetSkill: '버프',
        candidateTitleContribution: 2,
        targetBuffChanges: { z: 1, a: 2 },
        priceMode: 'auction',
      },
      targetSlot: 'TITLE',
      group: 'buffTitle',
      signature: 'buffTitle:switch-title:버프:2:a:2|z:1:auction',
    },
    {
      row: {
        sourceType: 'switchingCreature',
        itemId: 'switch-creature',
        candidateCreatureContribution: 3,
        targetBuffChanges: { creature: { b: 2, a: 1 } },
      },
      targetSlot: 'CREATURE',
      group: 'buffCreature',
      signature: 'buffCreature:switch-creature::3:creature:a:1|b:2:',
    },
    {
      row: {
        sourceType: 'switchingFragment',
        itemId: 'switch-fragment',
        targetBuffSlot: ' SHOES ',
        targetBuffChanges: { equipment: { level: 4 } },
      },
      targetSlot: 'SHOES',
      group: 'buffEquipment:SHOES',
      signature: 'buffEquipment:SHOES:switch-fragment:::equipment:level:4:',
    },
    {
      row: {
        sourceType: 'avatar',
        kind: 'switchingAvatar',
        itemId: 'switch-avatar',
        targetSlotId: 'JACKET',
        targetBuffChanges: { avatar: { itemId: 'package' } },
      },
      targetSlot: 'JACKET',
      group: 'buffAvatarPackage:JACKET',
      signature: 'buffAvatarPackage:JACKET:switch-avatar:::avatar:itemId:package:',
    },
    {
      row: {
        sourceType: 'avatar',
        kind: 'switchingPlatinumEmblem',
        itemId: 'switch-platinum',
        slot: '하의 아바타',
        targetBuffChanges: { platinumEmblem: { itemId: 'plat' } },
      },
      targetSlot: 'PANTS',
      group: 'buffAvatarPlatinum:PANTS',
      signature: 'buffAvatarPlatinum:PANTS:switch-platinum:::platinumEmblem:itemId:plat:',
    },
  ];

  switchingRows.forEach(({ row, targetSlot, group, signature }) => {
    assert.equal(identity.getBuffSimulatorTargetSlotId(row), targetSlot);
    assert.equal(identity.getBuffSimulatorExclusiveGroupKey(row), group);
    assert.equal(identity.getBuffSimulatorCandidateSignature(row), signature);
  });
  assert.equal(
    identity.getBuffSimulatorTargetSlotId({ sourceType: 'avatar', kind: 'switchingAvatar', slot: '상의 아바타' }),
    'JACKET',
  );
  assert.equal(identity.getBuffSimulatorTargetSlotId({ sourceType: 'title' }), '');
}

function testArtifactTypesAndCurrentMapReferenceSemantics() {
  const identity = createIdentity();
  assert.equal(identity.getCreatureArtifactType({ slotColor: ' red ' }), 'RED');
  assert.equal(identity.getCreatureArtifactType({ artifactType: 'blue' }), 'BLUE');
  assert.equal(identity.getCreatureArtifactType({ slotColor: 'GREEN' }), 'GREEN');
  assert.equal(identity.getCreatureArtifactType({ slotColor: 'yellow' }), '');
  assert.equal(identity.getCreatureArtifactType({ artifactType: 'yellow', slotColor: 'RED' }), '');

  const firstRed = { slotColor: 'RED', itemId: 'red-first' };
  const lastRed = { artifactType: 'red', itemId: 'red-last' };
  const blue = { slotColor: 'BLUE', itemId: 'blue' };
  const invalid = { slotColor: 'YELLOW', itemId: 'invalid' };
  const map = identity.getCurrentCreatureArtifactBySlot({
    artifacts: [firstRed, invalid, lastRed, blue],
  });
  assert.ok(map instanceof Map);
  assert.deepEqual([...map.keys()], ['RED', 'BLUE']);
  assert.strictEqual(map.get('RED'), lastRed);
  assert.strictEqual(map.get('BLUE'), blue);
  lastRed.itemName = 'mutated';
  assert.equal(map.get('RED').itemName, 'mutated');

  assert.equal(identity.creatureArtifactTypes.delete('GREEN'), true);
  assert.equal(identity.getCreatureArtifactType({ slotColor: 'GREEN' }), '');
  identity.creatureArtifactTypes.add('GREEN');
  assert.equal(identity.getCreatureArtifactType({ slotColor: 'GREEN' }), 'GREEN');
}

function testViewAssemblyDispatchersAndOathBoundary() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const view = readFileSync(viewPath, 'utf8');

  assert.match(
    view,
    /import \{ createEnchantSimulatorIdentity \} from '\.\/enchantSimulatorIdentity\.js';/,
  );
  const identityCallIndex = view.indexOf('} = createEnchantSimulatorIdentity({');
  assert.ok(identityCallIndex >= 0, 'simulator identity factory is assembled');
  const identityAssembly = view.slice(
    view.lastIndexOf('const {', identityCallIndex),
    view.indexOf('});', identityCallIndex) + 3,
  );
  PUBLIC_OUTPUTS.forEach((name) => {
    assert.match(identityAssembly, new RegExp(`\\b${name}\\b`));
  });
  assert.match(identityAssembly, /effectOrder:\s*EFFECT_ORDER/);
  assert.match(identityAssembly, /blackFangSimulatorSlots:\s*BLACK_FANG_SIMULATOR_SLOTS/);
  assert.match(identityAssembly, /creatureArtifactTypes:\s*CREATURE_ARTIFACT_TYPES/);

  const exclusiveDispatcher = getFunctionSource(view, 'getSimulatorExclusiveGroupKey');
  const candidateDispatcher = getFunctionSource(view, 'getSimulatorCandidateSignature');
  assert.deepEqual(
    [...exclusiveDispatcher.matchAll(/\b(get[A-Za-z0-9]+)\(row\)/g)].map((match) => match[1]),
    EXCLUSIVE_DISPATCH_ORDER,
  );
  assert.deepEqual(
    [...candidateDispatcher.matchAll(/\b(get[A-Za-z0-9]+)\(row\)/g)].map((match) => match[1]),
    CANDIDATE_DISPATCH_ORDER,
  );

  const oathCallIndex = view.indexOf('} = createEnchantOathAcquisition({');
  assert.ok(oathCallIndex >= 0, 'oath acquisition factory is assembled');
  const oathAssembly = view.slice(
    view.lastIndexOf('const {', oathCallIndex),
    view.indexOf('});', oathCallIndex) + 3,
  );
  assert.match(oathAssembly, /getSimulatorExclusiveGroupKey,\s*getSimulatorCandidateSignature,/);
}

const tests = [
  testFactoryContractDependencyAliasesAndPublicSet,
  testEffectAndStableObjectSignatures,
  testDealerSourceIdentityMatrix,
  testAvatarAndBuffSwitchingIdentityMatrix,
  testArtifactTypesAndCurrentMapReferenceSemantics,
  testViewAssemblyDispatchersAndOathBoundary,
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
else console.log('enchant simulator identity: ok');
