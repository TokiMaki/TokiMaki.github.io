import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEnchantRecommendationApplicationState } from '../src/dnfHellTool/enchantRecommendationApplicationState.js';

const LEGACY_MAP_BLOCK_SHA256 = '41c36e1e0ef7175dee3b897f01c19a01cf8d8e6c49166c46281a172fe5bad985';
const RECREATED_FIXTURE_JSON_SHA256 = 'afab51ab51d082f8321c58a61fb501ba137c9e891c51100743fc4115cfa30292';
const PROTECTED_FILE_SHA256 = Object.freeze({
  eventBindings: '02d28f0f55a05c9d51b1ec8a6405b3352124d26e9adabfe91d07e27e6f34c31f',
  initDnfHellTool: 'c9999ba2b1b727afe699d7377128ad47d8673052b361b2436a8206c684b146df',
});

const LEGACY_MAP_BLOCK = `    const decoratedRecommendations = recommendations.map((row) => {
      const isCombinedOathAcquisition = row.sourceType === 'oathAcquisitionCombined';
      const exclusiveGroupKey = isCombinedOathAcquisition
        ? \`oathAcquisitionCombined:\${row.oathAcquisitionPairKey}\`
        : getSimulatorExclusiveGroupKey(row);
      const candidateSignature = isCombinedOathAcquisition
        ? \`\${exclusiveGroupKey}:\${Number(row.transcendCount || 0)}:\${Number(row.craftCount || 0)}\`
        : getSimulatorCandidateSignature(row);
      const oathAcquisitionDescriptors = getOathAcquisitionSelectionDescriptors(row);
      const activeCombinedCounts = isCombinedOathAcquisition
        ? getActiveOathAcquisitionMethodCounts(
          simulator,
          [
            ...(row.transcendRecommendations || [row.transcendRecommendation]),
            ...(row.craftRecommendations || [row.craftRecommendation]),
          ].filter(Boolean),
        )
        : null;
      const activeSelection = exclusiveGroupKey
        ? simulator?.activeSelectionByGroup?.[exclusiveGroupKey]
        : null;
      const isAppliedBufferUpgrade = Boolean(
        simulator?.role === 'buffer'
        && row.sourceType === 'upgrade'
        && activeSelection?.applyType === 'replaceBufferEquipmentProgression'
        && activeSelection.progressionType === getEquipmentProgressionType(row)
        && Number(activeSelection.targetLevel) === Number(row.targetLevel),
      );
      const isApplied = isCombinedOathAcquisition
        ? activeCombinedCounts.transcend + activeCombinedCounts.craft > 0
          && activeCombinedCounts.transcend === Number(row.transcendCount || 0)
          && activeCombinedCounts.craft === Number(row.craftCount || 0)
        : oathAcquisitionDescriptors.length
        ? isAppliedOathAcquisitionRecommendation(row, simulator)
        : isAppliedBufferUpgrade || Boolean(
          exclusiveGroupKey &&
          candidateSignature &&
          activeSelection?.candidateSignature === candidateSignature
        );
      return {
        ...row,
        isApplied,
        exclusiveGroupKey,
        candidateSignature,
      };
    });`;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function createEmbeddedLegacyDecorator({
  getSimulatorExclusiveGroupKey,
  getSimulatorCandidateSignature,
  getOathAcquisitionSelectionDescriptors,
  getActiveOathAcquisitionMethodCounts,
  getEquipmentProgressionType,
  isAppliedOathAcquisitionRecommendation,
}) {
  return function decorateEnchantRecommendationApplicationState(recommendations, simulator) {
    const decoratedRecommendations = recommendations.map((row) => {
      const isCombinedOathAcquisition = row.sourceType === 'oathAcquisitionCombined';
      const exclusiveGroupKey = isCombinedOathAcquisition
        ? `oathAcquisitionCombined:${row.oathAcquisitionPairKey}`
        : getSimulatorExclusiveGroupKey(row);
      const candidateSignature = isCombinedOathAcquisition
        ? `${exclusiveGroupKey}:${Number(row.transcendCount || 0)}:${Number(row.craftCount || 0)}`
        : getSimulatorCandidateSignature(row);
      const oathAcquisitionDescriptors = getOathAcquisitionSelectionDescriptors(row);
      const activeCombinedCounts = isCombinedOathAcquisition
        ? getActiveOathAcquisitionMethodCounts(
          simulator,
          [
            ...(row.transcendRecommendations || [row.transcendRecommendation]),
            ...(row.craftRecommendations || [row.craftRecommendation]),
          ].filter(Boolean),
        )
        : null;
      const activeSelection = exclusiveGroupKey
        ? simulator?.activeSelectionByGroup?.[exclusiveGroupKey]
        : null;
      const isAppliedBufferUpgrade = Boolean(
        simulator?.role === 'buffer'
        && row.sourceType === 'upgrade'
        && activeSelection?.applyType === 'replaceBufferEquipmentProgression'
        && activeSelection.progressionType === getEquipmentProgressionType(row)
        && Number(activeSelection.targetLevel) === Number(row.targetLevel),
      );
      const isApplied = isCombinedOathAcquisition
        ? activeCombinedCounts.transcend + activeCombinedCounts.craft > 0
          && activeCombinedCounts.transcend === Number(row.transcendCount || 0)
          && activeCombinedCounts.craft === Number(row.craftCount || 0)
        : oathAcquisitionDescriptors.length
        ? isAppliedOathAcquisitionRecommendation(row, simulator)
        : isAppliedBufferUpgrade || Boolean(
          exclusiveGroupKey &&
          candidateSignature &&
          activeSelection?.candidateSignature === candidateSignature
        );
      return {
        ...row,
        isApplied,
        exclusiveGroupKey,
        candidateSignature,
      };
    });
    return decoratedRecommendations;
  };
}

function getProgressionType(row = {}) {
  return ['amplification', 'safeAmplification', 'amplificationConversion'].includes(row.upgradeMode)
    ? 'amplify'
    : ['reinforcement', 'safeReinforcement'].includes(row.upgradeMode)
      ? 'reinforce'
      : '';
}

function createHelperHarness() {
  const calls = [];
  const deps = {
    getSimulatorExclusiveGroupKey(row) {
      calls.push(`group:${row.id}`);
      return row.groupKey || '';
    },
    getSimulatorCandidateSignature(row) {
      calls.push(`signature:${row.id}`);
      return row.signature || '';
    },
    getOathAcquisitionSelectionDescriptors(row) {
      calls.push(`descriptors:${row.id}`);
      return row.descriptors || [];
    },
    getActiveOathAcquisitionMethodCounts(simulator, rows) {
      calls.push(`counts:${rows.map((row) => row.id).join(',')}`);
      return simulator?.activeCombinedCounts || { transcend: 0, craft: 0 };
    },
    getEquipmentProgressionType(row) {
      calls.push(`progression:${row.id}`);
      return getProgressionType(row);
    },
    isAppliedOathAcquisitionRecommendation(row) {
      calls.push(`oathApplied:${row.id}`);
      return row.oathAppliedResult === true;
    },
  };
  return { calls, deps };
}

function createScenarios() {
  const sharedNone = { marker: 'none' };
  const sharedGeneric = { marker: 'generic' };
  const sharedUpgrade = { marker: 'upgrade' };
  const sharedOath = { marker: 'oath' };
  const sharedCombined = { marker: 'combined' };
  return [
    {
      name: 'simulator 없음',
      recommendations: [
        {
          id: 'none',
          sourceType: 'enchant',
          groupKey: 'generic:none',
          signature: 'sig:none',
          nested: sharedNone,
        },
      ],
      simulator: undefined,
      expectedApplied: [false],
      expectedCalls: ['group:none', 'signature:none', 'descriptors:none'],
    },
    {
      name: '일반 active selection match/mismatch',
      recommendations: [
        {
          id: 'generic-match',
          sourceType: 'enchant',
          groupKey: 'generic:match',
          signature: 'sig:match',
          nested: sharedGeneric,
        },
        {
          id: 'generic-mismatch',
          sourceType: 'aura',
          groupKey: 'generic:mismatch',
          signature: 'sig:mismatch',
          nested: sharedGeneric,
        },
      ],
      simulator: {
        role: 'dealer',
        activeSelectionByGroup: {
          'generic:match': { candidateSignature: 'sig:match' },
          'generic:mismatch': { candidateSignature: 'sig:other' },
        },
      },
      expectedApplied: [true, false],
      expectedCalls: [
        'group:generic-match',
        'signature:generic-match',
        'descriptors:generic-match',
        'group:generic-mismatch',
        'signature:generic-mismatch',
        'descriptors:generic-mismatch',
      ],
    },
    {
      name: 'buffer upgrade applyType progressionType Number targetLevel 3조건',
      recommendations: [
        {
          id: 'upgrade-match',
          sourceType: 'upgrade',
          groupKey: 'upgrade:match',
          signature: 'upgrade-sig:match',
          upgradeMode: 'safeAmplification',
          targetLevel: '12',
          nested: sharedUpgrade,
        },
        {
          id: 'upgrade-applyType-mismatch',
          sourceType: 'upgrade',
          groupKey: 'upgrade:applyType',
          signature: 'upgrade-sig:applyType',
          upgradeMode: 'safeAmplification',
          targetLevel: 12,
          nested: sharedUpgrade,
        },
        {
          id: 'upgrade-progression-mismatch',
          sourceType: 'upgrade',
          groupKey: 'upgrade:progression',
          signature: 'upgrade-sig:progression',
          upgradeMode: 'safeAmplification',
          targetLevel: 12,
          nested: sharedUpgrade,
        },
        {
          id: 'upgrade-level-mismatch',
          sourceType: 'upgrade',
          groupKey: 'upgrade:level',
          signature: 'upgrade-sig:level',
          upgradeMode: 'safeAmplification',
          targetLevel: 12,
          nested: sharedUpgrade,
        },
      ],
      simulator: {
        role: 'buffer',
        activeSelectionByGroup: {
          'upgrade:match': {
            applyType: 'replaceBufferEquipmentProgression',
            progressionType: 'amplify',
            targetLevel: 12,
            candidateSignature: 'different',
          },
          'upgrade:applyType': {
            applyType: 'replaceEquipmentProgression',
            progressionType: 'amplify',
            targetLevel: 12,
            candidateSignature: 'different',
          },
          'upgrade:progression': {
            applyType: 'replaceBufferEquipmentProgression',
            progressionType: 'reinforce',
            targetLevel: 12,
            candidateSignature: 'different',
          },
          'upgrade:level': {
            applyType: 'replaceBufferEquipmentProgression',
            progressionType: 'amplify',
            targetLevel: '13',
            candidateSignature: 'different',
          },
        },
      },
      expectedApplied: [true, false, false, false],
      expectedCalls: [
        'group:upgrade-match',
        'signature:upgrade-match',
        'descriptors:upgrade-match',
        'progression:upgrade-match',
        'group:upgrade-applyType-mismatch',
        'signature:upgrade-applyType-mismatch',
        'descriptors:upgrade-applyType-mismatch',
        'group:upgrade-progression-mismatch',
        'signature:upgrade-progression-mismatch',
        'descriptors:upgrade-progression-mismatch',
        'progression:upgrade-progression-mismatch',
        'group:upgrade-level-mismatch',
        'signature:upgrade-level-mismatch',
        'descriptors:upgrade-level-mismatch',
        'progression:upgrade-level-mismatch',
      ],
    },
    {
      name: 'descriptor 우선 true/false',
      recommendations: [
        {
          id: 'oath-false',
          sourceType: 'oathTranscend',
          groupKey: 'oath:false',
          signature: 'oath-sig:false',
          descriptors: [{ exclusiveGroupKey: 'oathAcquire:0' }],
          oathAppliedResult: false,
          nested: sharedOath,
        },
        {
          id: 'oath-true',
          sourceType: 'oathCraft',
          groupKey: 'oath:true',
          signature: 'oath-sig:true',
          descriptors: [{ exclusiveGroupKey: 'oathAcquire:1' }],
          oathAppliedResult: true,
          nested: sharedOath,
        },
      ],
      simulator: {
        role: 'dealer',
        activeSelectionByGroup: {
          'oath:false': { candidateSignature: 'oath-sig:false' },
          'oath:true': { candidateSignature: 'different' },
        },
      },
      expectedApplied: [false, true],
      expectedCalls: [
        'group:oath-false',
        'signature:oath-false',
        'descriptors:oath-false',
        'oathApplied:oath-false',
        'group:oath-true',
        'signature:oath-true',
        'descriptors:oath-true',
        'oathApplied:oath-true',
      ],
    },
    {
      name: 'oathAcquisitionCombined exact distribution and same-total mismatch',
      recommendations: [
        {
          id: 'combined-exact',
          sourceType: 'oathAcquisitionCombined',
          oathAcquisitionPairKey: 'oathDecision:에픽',
          transcendCount: '2',
          craftCount: 1,
          transcendRecommendations: [{ id: 'transcend-1' }, { id: 'transcend-2' }],
          craftRecommendations: [{ id: 'craft-1' }],
          nested: sharedCombined,
        },
        {
          id: 'combined-distribution-mismatch',
          sourceType: 'oathAcquisitionCombined',
          oathAcquisitionPairKey: 'oathDecision:에픽',
          transcendCount: 1,
          craftCount: 2,
          transcendRecommendation: { id: 'transcend-single' },
          craftRecommendation: { id: 'craft-single' },
          nested: sharedCombined,
        },
      ],
      simulator: {
        role: 'dealer',
        activeSelectionByGroup: {
          untouched: { candidateSignature: 'untouched' },
        },
        activeCombinedCounts: { transcend: 2, craft: 1 },
      },
      expectedApplied: [true, false],
      expectedCalls: [
        'descriptors:combined-exact',
        'counts:transcend-1,transcend-2,craft-1',
        'descriptors:combined-distribution-mismatch',
        'counts:transcend-single,craft-single',
      ],
    },
  ];
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function runScenario(kind, scenario) {
  const { calls, deps } = createHelperHarness();
  const factoryResult = createEnchantRecommendationApplicationState(deps);
  assert.deepEqual(Object.keys(factoryResult), ['decorateEnchantRecommendationApplicationState']);
  assert.equal(calls.length, 0, 'factory creation must not call helpers');
  const decorate = kind === 'legacy'
    ? createEmbeddedLegacyDecorator(deps)
    : factoryResult.decorateEnchantRecommendationApplicationState;
  const recommendationsBefore = cloneJson(scenario.recommendations);
  const simulatorBefore = cloneJson(scenario.simulator);
  const activeSelectionBefore = cloneJson(scenario.simulator?.activeSelectionByGroup);
  const output = decorate(scenario.recommendations, scenario.simulator);

  assert.notEqual(output, scenario.recommendations, `${scenario.name}: output array is new`);
  assert.equal(output.length, scenario.recommendations.length, `${scenario.name}: count preserved`);
  assert.deepEqual(
    output.map((row) => [row.sourceType, row.id]),
    scenario.recommendations.map((row) => [row.sourceType, row.id]),
    `${scenario.name}: sourceType/id order preserved`,
  );
  assert.deepEqual(output.map((row) => row.isApplied), scenario.expectedApplied);
  assert.deepEqual(calls, scenario.expectedCalls, `${scenario.name}: helper call order`);
  assert.deepEqual(scenario.recommendations, recommendationsBefore, `${scenario.name}: input unchanged`);
  assert.deepEqual(scenario.simulator, simulatorBefore, `${scenario.name}: simulator unchanged`);
  assert.deepEqual(
    scenario.simulator?.activeSelectionByGroup,
    activeSelectionBefore,
    `${scenario.name}: activeSelectionByGroup unchanged`,
  );

  output.forEach((row, index) => {
    const inputRow = scenario.recommendations[index];
    assert.notEqual(row, inputRow, `${scenario.name}: output row ${index} is decorated copy`);
    assert.equal(row.nested, inputRow.nested, `${scenario.name}: nested reference ${index} preserved`);
    assert.deepEqual(
      Object.keys(row),
      [...Object.keys(inputRow), 'isApplied', 'exclusiveGroupKey', 'candidateSignature'],
      `${scenario.name}: spread and appended field order ${index}`,
    );
  });

  return {
    name: scenario.name,
    inputOrder: scenario.recommendations.map((row) => [row.sourceType, row.id]),
    output: output.map((row) => ({
      sourceType: row.sourceType,
      id: row.id,
      isApplied: row.isApplied,
      exclusiveGroupKey: row.exclusiveGroupKey,
      candidateSignature: row.candidateSignature,
    })),
    calls: calls.slice(),
  };
}

function testBehaviorParity() {
  const scenarios = createScenarios();
  const legacyResults = scenarios.map((scenario) => runScenario('legacy', scenario));
  const moduleResults = createScenarios().map((scenario) => runScenario('module', scenario));
  assert.deepEqual(moduleResults, legacyResults);

  const portableFixture = {
    schema: 'enchantRecommendationApplicationState/v1',
    scenarios: legacyResults,
  };
  const currentFixtureHash = sha256(JSON.stringify(portableFixture));
  assert.equal(currentFixtureHash, RECREATED_FIXTURE_JSON_SHA256);
  return currentFixtureHash;
}

function testErrorContract() {
  for (const recommendations of [undefined, null]) {
    for (const kind of ['legacy', 'module']) {
      const { deps } = createHelperHarness();
      const decorate = kind === 'legacy'
        ? createEmbeddedLegacyDecorator(deps)
        : createEnchantRecommendationApplicationState(deps)
          .decorateEnchantRecommendationApplicationState;
      assert.throws(
        () => decorate(recommendations, null),
        TypeError,
        `${kind}: recommendations ${recommendations} keeps map error behavior`,
      );
    }
  }
}

function normalizeLf(value) {
  return value.replaceAll('\r\n', '\n');
}

function testMechanicalSourceContract() {
  assert.equal(sha256(LEGACY_MAP_BLOCK), LEGACY_MAP_BLOCK_SHA256);
  assert.equal(LEGACY_MAP_BLOCK.split('\n').length, 46);

  const testFile = fileURLToPath(import.meta.url);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationApplicationState.js', import.meta.url));
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const eventBindingsPath = fileURLToPath(new URL('../src/dnfHellTool/eventBindings.js', import.meta.url));
  const initPath = fileURLToPath(new URL('../src/dnfHellTool/initDnfHellTool.js', import.meta.url));
  assert.ok(testFile.startsWith(root));

  const moduleSource = normalizeLf(readFileSync(modulePath, 'utf8'));
  assert.equal((moduleSource.match(/export function createEnchantRecommendationApplicationState/g) || []).length, 1);
  assert.equal((moduleSource.match(/decorateEnchantRecommendationApplicationState/g) || []).length, 2);
  for (const forbidden of [
    /^import\s/m,
    /export\s+default/,
    /\bclass\b/,
    /\bstate\b/,
    /\bels\b/,
    /\bdocument\b/,
    /\bwindow\b/,
    /\bMap\b/,
    /\.sort\s*\(/,
  ]) {
    assert.ok(!forbidden.test(moduleSource), `new module forbids ${forbidden}`);
  }
  const moduleMapStart = moduleSource.indexOf('    return recommendations.map((row) => {');
  assert.ok(moduleMapStart >= 0);
  const moduleMapEnd = moduleSource.indexOf('    });', moduleMapStart) + '    });'.length;
  const normalizedModuleMap = moduleSource
    .slice(moduleMapStart, moduleMapEnd)
    .replace(
      '    return recommendations.map((row) => {',
      '    const decoratedRecommendations = recommendations.map((row) => {',
    );
  assert.equal(normalizedModuleMap, LEGACY_MAP_BLOCK, 'decorator map block is mechanically identical');

  const viewBytes = readFileSync(viewPath);
  const viewSource = viewBytes.toString('utf8');
  const importAnchor = "import { createEnchantRecommendationLayout } from './enchantRecommendationLayout.js';\r\n";
  const newImport = "import { createEnchantRecommendationApplicationState } from './enchantRecommendationApplicationState.js';\r\n";
  assert.equal(viewSource.split(newImport).length - 1, 1);
  assert.ok(viewSource.includes(importAnchor + newImport), 'import is adjacent to recommendation layout');

  const layoutInstall = [
    '  const {',
    '    scheduleFitEnchantRecommendTitles,',
    '    scheduleRecommendPopoverShift,',
    '    scheduleOpenTunePopoverShift,',
    '    resetRecommendPopoverShift,',
    '    isLeavingRecommendPopoverHost,',
    '  } = createEnchantRecommendationLayout({',
    '    getRecommendList: () => els.enchantRecommendList,',
    '  });',
  ].join('\r\n');
  const applicationInstall = [
    '',
    '  const { decorateEnchantRecommendationApplicationState } =',
    '    createEnchantRecommendationApplicationState({',
    '      getSimulatorExclusiveGroupKey,',
    '      getSimulatorCandidateSignature,',
    '      getOathAcquisitionSelectionDescriptors,',
    '      getActiveOathAcquisitionMethodCounts,',
    '      getEquipmentProgressionType,',
    '      isAppliedOathAcquisitionRecommendation,',
    '    });',
  ].join('\r\n');
  const layoutInstallIndex = viewSource.indexOf(layoutInstall);
  const applicationInstallIndex = viewSource.indexOf(applicationInstall);
  const rendererIndex = viewSource.indexOf('  function renderEnchantRecommendations');
  assert.ok(layoutInstallIndex >= 0, 'layout factory install remains present');
  assert.ok(applicationInstallIndex > layoutInstallIndex, 'application-state factory follows layout');
  assert.ok(rendererIndex > applicationInstallIndex, 'application-state factory precedes renderer');

  const replacementCall = '    const decoratedRecommendations = decorateEnchantRecommendationApplicationState(recommendations, simulator);\r\n';
  assert.equal(viewSource.split(replacementCall).length - 1, 1);
  assert.ok(!viewSource.includes('    const decoratedRecommendations = recommendations.map((row) => {'));

  const orderAnchors = [
    '    const decoratedRecommendations = decorateEnchantRecommendationApplicationState(recommendations, simulator);',
    '    let displayRecommendations = orderEnchantRecommendationDisplay(decoratedRecommendations);',
    '    state.dealerSimulatorRecommendations = new Map();',
    '    state.renderedOathAcquisitionCombinedRows = new Map();',
    '    renderEfficiencyLegend(recommendations);',
    '    if (!displayRecommendations.length) {',
    '    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {',
    '    scheduleFitEnchantRecommendTitles();',
  ];
  let previousIndex = -1;
  for (const anchor of orderAnchors) {
    const index = viewSource.indexOf(anchor, previousIndex + 1);
    assert.ok(index > previousIndex, `renderer call order keeps ${anchor}`);
    previousIndex = index;
  }

  assert.equal(sha256(readFileSync(eventBindingsPath)), PROTECTED_FILE_SHA256.eventBindings);
  assert.equal(sha256(readFileSync(initPath)), PROTECTED_FILE_SHA256.initDnfHellTool);
}

const fixtureHash = testBehaviorParity();
testErrorContract();
testMechanicalSourceContract();

console.log(`enchant recommendation application state: ok (${fixtureHash})`);
