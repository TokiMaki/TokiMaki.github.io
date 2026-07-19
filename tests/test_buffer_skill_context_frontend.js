import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('src/dnfHellTool/enchantView.js', 'utf8');
const start = source.indexOf('const BUFFER_SIMULATOR_CHANGE_KEYS =');
const end = source.indexOf('\nfunction replaceBufferScopeLoadoutRow', start);
const adjacentStart = source.indexOf('function getExactAdjacentSkillValueDelta');
const adjacentEnd = source.indexOf('\nfunction getBufferItemSkillChanges', adjacentStart);
const reinforceStart = source.indexOf('function getReinforceSkillLevel');
const reinforceEnd = source.indexOf('\nfunction getBufferEnchantSkillDelta', reinforceStart);
const authoritativeStart = source.indexOf('function getAuthoritativeItemSkillLevelBonus');
const authoritativeEnd = source.indexOf('\nfunction getBufferEquippedItemBaseRelativeChanges', authoritativeStart);
assert(
  start >= 0 && end > start
  && adjacentStart >= 0 && adjacentEnd > adjacentStart
  && reinforceStart >= 0 && reinforceEnd > reinforceStart
  && authoritativeStart >= 0 && authoritativeEnd > authoritativeStart,
);
const sandbox = {
  BUFF_LOADOUT_SLOT_NAME_ALIASES: {},
  cloneSimulatorValue: (value) => structuredClone(value),
  getBuffLoadoutRowsForMetric: (value) => Array.isArray(value) ? value : [],
};
vm.createContext(sandbox);
vm.runInContext([
  source.slice(start, end),
  source.slice(reinforceStart, reinforceEnd),
  source.slice(authoritativeStart, authoritativeEnd),
  source.slice(adjacentStart, adjacentEnd),
].join('\n'), sandbox);
const fallback = sandbox.getBufferBaselineSkillContexts({
  currentSelfStatSkills: {
    passive: {
      contextKey: 'job:skill',
      jobId: 'job',
      skillId: 'skill',
      level: 10,
      affectsSelfStat: true,
      affectsAuraStat: false,
      affectsAuraAttack: false,
      previousStat: 90,
      currentStat: 100,
      nextStat: 110,
    },
  },
});
const formal = {
  'job:skill': {
    jobId: 'job',
    skillId: 'skill',
    skillName: 'passive',
    currentLevel: 10,
    minReachableLevel: 10,
    maxReachableLevel: 11,
    netChangesByLevel: {
      10: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      11: { selfStatSkillDelta: 15, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
};
const merged = sandbox.mergeBufferSkillContexts(fallback, formal);
assert.strictEqual(merged['job:skill'].netChangesByLevel['11'].selfStatSkillDelta, 15);
assert.strictEqual(merged['job:skill'].netChangesByLevel['9'].selfStatSkillDelta, -10);
const missingPrevious = sandbox.getBufferBaselineSkillContexts({
  currentSelfStatSkills: {
    passive: {
      contextKey: 'job:missing',
      jobId: 'job',
      skillId: 'missing',
      level: 10,
      affectsSelfStat: true,
      affectsAuraStat: false,
      affectsAuraAttack: false,
      currentStat: 100,
      nextStat: 110,
    },
  },
});
assert.ok(!missingPrevious['job:missing'].netChangesByLevel['9']);
assert.strictEqual(missingPrevious['job:missing'].netChangesByLevel['11'].selfStatSkillDelta, 10);
const changes = {
  statDelta: 100,
  baseSkillContributions: [],
  targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 2 }],
};
assert.throws(() => sandbox.resolveBufferNetChanges(
  { SLOT: changes },
  formal,
), /Unsupported buffer skill level/);
assert.strictEqual(changes.statDelta, 100);
assert.strictEqual(changes.targetSkillContributions[0].levelContribution, 2);
const scopedContexts = {
  'job:skill': {
    currentLevel: 10,
    netChangesByLevel: {
      10: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      11: { selfStatSkillDelta: 15, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
  'job:skill:switching': {
    currentLevel: 12,
    netChangesByLevel: {
      12: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      13: { selfStatSkillDelta: 17, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
};
const commonResult = sandbox.resolveBufferNetChanges({
  SLOT: {
    baseSkillContributions: [],
    targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
  },
}, scopedContexts);
assert.strictEqual(commonResult.selfStatSkillDelta, 15);
assert.strictEqual(commonResult.switchingStatDelta, 2);
const switchingResult = sandbox.resolveBufferNetChanges({
  SLOT: {
    skillContributionScope: 'switching',
    baseSkillContributions: [],
    targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
  },
}, scopedContexts);
assert.strictEqual(switchingResult.selfStatSkillDelta, 0);
assert.strictEqual(switchingResult.switchingStatDelta, 17);
assert.throws(() => sandbox.resolveBufferNetChanges({
  SLOT: {
    baseSkillContributions: [],
    targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
  },
}, { 'job:skill': formal['job:skill'] }), /Unsupported buffer skill level/);
const currentOnlyFallback = sandbox.resolveBufferNetChanges({
  SLOT: {
    skillContributionScope: 'current',
    baseSkillContributions: [],
    targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
  },
}, fallback);
assert.strictEqual(currentOnlyFallback.currentStatDelta, 10);
assert.strictEqual(currentOnlyFallback.switchingStatDelta, 0);
assert.strictEqual(sandbox.getExactAdjacentSkillValueDelta({
  currentStat: 100,
  nextStat: 110,
}, 'Stat', 2), 0);
assert.strictEqual(sandbox.getExactAdjacentSkillValueDelta({
  currentStat: 100,
  nextStat: 115,
}, 'Stat', 1), 15);
assert.ok(source.includes(
  "if (!isBufferSimulatorActive() || !row?.bufferSimulatorSupported) return null;",
));
assert.strictEqual(sandbox.getAuthoritativeItemSkillLevelBonus({
  itemBuff: {
    reinforceSkill: [{
      jobName: '테스트 직업',
      levelRange: [{ minLevel: 1, maxLevel: 30, value: 2 }],
    }],
    explain: '20레벨 스킬 Lv +99',
  },
  enchant: {
    reinforceSkill: [{
      jobName: '테스트 직업',
      levelRange: [{ minLevel: 20, maxLevel: 20, value: 1 }],
    }],
  },
}, { jobName: '테스트 직업' }, '테스트 스킬', 20), 3);
console.log('frontend buffer skill context tests passed');
