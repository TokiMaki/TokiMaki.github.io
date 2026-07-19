import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEnchantDealerSimulatorRecommendationEligibility } from '../src/dnfHellTool/enchantDealerSimulatorRecommendationEligibility.js';

const LEGACY_BLOCK_LF_SHA256 = '43522695a3831cf0c029144e8dc5e39b8c9376f03df1fd710b8d30eb8189e7b1';
const LEGACY_BLOCK_CRLF_RAW_SHA256 = '4767a0bce25b103b786c6e51b8401bfe3f6ac9f4a9a5d57e4da38e0d9c25b02e';
const PRE_MOVE_FIXTURE_JSON_SHA256 = '00379bff8d9798dc730e7c63d0a68a6b5e2b9c46609d5b8f0c91dea9c069f0e7';
const HTML_MAP_LF_BLOCK_SHA256 = 'b1e928aca8315e0cff2d93b514e9d12457310dd68061c25dd12a6a1d1b164641';
const PROTECTED_FILE_SHA256 = Object.freeze({
  applicationStateModule: '18433dc58de22f4b48ac35cecb85b96efd0615b0d6cbe8b6ff2b3688dc9e944d',
  displayOrderModule: '6a7686d1a7128b50dcea773cae8993e709d59f31d1f27cd100fa09970b5f34dd',
  layoutModule: '7b37b254b2fd4c135f8286061ca93a26d621389bf1d2b02fbf2d3b2449160265',
  applicationStateTest: '07be12a9f8dc3d43d737fce8f82e5812c70e4de1a68d77c51eb69b2a7579d994',
  layoutTest: 'e3db0e5f8d3999fe3cb3f5f00f6fa0daac509456e281dd56fb9c2b6c2f5c90a9',
  eventBindings: '02d28f0f55a05c9d51b1ec8a6405b3352124d26e9adabfe91d07e27e6f34c31f',
  initDnfHellTool: 'c9999ba2b1b727afe699d7377128ad47d8673052b361b2436a8206c684b146df',
});

const LEGACY_BLOCK_LF = `    if (dealerSimulator && !dealerSimulator.baseEligibleEnchantCandidateSignatures.length) {
      dealerSimulator.baseEligibleEnchantCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'enchant')
        .map(getEnchantCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleAuraCandidateSignatures.length) {
      dealerSimulator.baseEligibleAuraCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'aura')
        .map(getAuraCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleCreatureCandidateSignatures.length) {
      dealerSimulator.baseEligibleCreatureCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'creature')
        .map(getCreatureCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleTitleCandidateSignatures.length) {
      dealerSimulator.baseEligibleTitleCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'title')
        .map(getTitleCandidateSignature)
        .filter(Boolean);
    }
    const eligibleTitleSignatures = new Set(dealerSimulator?.baseEligibleTitleCandidateSignatures || []);
    if (dealerSimulator && Object.keys(dealerSimulator.activeSelectionByGroup || {}).length && eligibleTitleSignatures.size) {
      recommendations = recommendations.filter((row) => (
        row.sourceType !== 'title' || eligibleTitleSignatures.has(getTitleCandidateSignature(row))
      ));
    }`;

const EXPECTED_PRE_MOVE_FIXTURE = {
  schema: 'enchantDealerSimulatorRecommendationEligibility/pre-move-v1',
  scenarios: [
    {
      name: 'null-simulator',
      outputOrder: [['enchant', 'n-enchant'], ['title', 'n-title']],
      sameArray: true,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: [],
      setterCalls: [],
      eligible: null,
      activeSelectionUnchanged: true,
    },
    {
      name: 'all-empty-no-active',
      outputOrder: [['enchant', 'e1'], ['aura', 'a1'], ['creature', 'c1'], ['title', 't1'], ['upgrade', 'x1']],
      sameArray: true,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: ['enchant:e1', 'aura:a1', 'creature:c1', 'title:t1'],
      setterCalls: [
        ['baseEligibleEnchantCandidateSignatures', ['e:1']],
        ['baseEligibleAuraCandidateSignatures', ['a:1']],
        ['baseEligibleCreatureCandidateSignatures', ['c:1']],
        ['baseEligibleTitleCandidateSignatures', ['t:1']],
      ],
      eligible: { enchant: ['e:1'], aura: ['a:1'], creature: ['c:1'], title: ['t:1'] },
      activeSelectionUnchanged: true,
    },
    {
      name: 'partial-existing',
      outputOrder: [['enchant', 'e2'], ['aura', 'a2'], ['creature', 'c2'], ['title', 't2']],
      sameArray: true,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: ['aura:a2', 'creature:c2'],
      setterCalls: [
        ['baseEligibleAuraCandidateSignatures', ['a:new']],
        ['baseEligibleCreatureCandidateSignatures', ['c:new']],
      ],
      eligible: { enchant: ['e:existing'], aura: ['a:new'], creature: ['c:new'], title: ['t:existing'] },
      activeSelectionUnchanged: true,
    },
    {
      name: 'active-title-filter',
      outputOrder: [['enchant', 'e3'], ['title', 't-match'], ['aura', 'a3']],
      sameArray: false,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: ['enchant:e3', 'aura:a3', 'title:t-match', 'title:t-drop'],
      setterCalls: [
        ['baseEligibleEnchantCandidateSignatures', ['e:3']],
        ['baseEligibleAuraCandidateSignatures', ['a:3']],
        ['baseEligibleCreatureCandidateSignatures', []],
      ],
      eligible: { enchant: ['e:3'], aura: ['a:3'], creature: [], title: ['t:keep'] },
      activeSelectionUnchanged: true,
    },
    {
      name: 'active-all-title-pass-new-array',
      outputOrder: [['title', 't4a'], ['enchant', 'e4'], ['title', 't4b']],
      sameArray: false,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: ['title:t4a', 'title:t4b'],
      setterCalls: [],
      eligible: { enchant: ['e:base'], aura: ['a:base'], creature: ['c:base'], title: ['t:4a', 't:4b'] },
      activeSelectionUnchanged: true,
    },
    {
      name: 'duplicate-falsey-signatures',
      outputOrder: [['enchant', 'e5a'], ['enchant', 'e5b'], ['enchant', 'e5c'], ['aura', 'a5'], ['creature', 'c5'], ['title', 't5a'], ['title', 't5b']],
      sameArray: true,
      sameRows: true,
      sameNested: true,
      inputOrderUnchanged: true,
      helperCalls: ['enchant:e5a', 'enchant:e5b', 'enchant:e5c', 'aura:a5', 'creature:c5', 'title:t5a', 'title:t5b'],
      setterCalls: [
        ['baseEligibleEnchantCandidateSignatures', ['dup', 'dup']],
        ['baseEligibleAuraCandidateSignatures', []],
        ['baseEligibleCreatureCandidateSignatures', ['c:5']],
        ['baseEligibleTitleCandidateSignatures', ['t:5']],
      ],
      eligible: { enchant: ['dup', 'dup'], aura: [], creature: ['c:5'], title: ['t:5'] },
      activeSelectionUnchanged: true,
    },
  ],
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeLf(value) {
  return value.replaceAll('\r\n', '\n');
}

function createEmbeddedLegacyEligibility({
  getEnchantCandidateSignature,
  getAuraCandidateSignature,
  getCreatureCandidateSignature,
  getTitleCandidateSignature,
}) {
  return function applyDealerSimulatorRecommendationEligibility(recommendations, dealerSimulator) {
    if (dealerSimulator && !dealerSimulator.baseEligibleEnchantCandidateSignatures.length) {
      dealerSimulator.baseEligibleEnchantCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'enchant')
        .map(getEnchantCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleAuraCandidateSignatures.length) {
      dealerSimulator.baseEligibleAuraCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'aura')
        .map(getAuraCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleCreatureCandidateSignatures.length) {
      dealerSimulator.baseEligibleCreatureCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'creature')
        .map(getCreatureCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleTitleCandidateSignatures.length) {
      dealerSimulator.baseEligibleTitleCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'title')
        .map(getTitleCandidateSignature)
        .filter(Boolean);
    }
    const eligibleTitleSignatures = new Set(dealerSimulator?.baseEligibleTitleCandidateSignatures || []);
    if (dealerSimulator && Object.keys(dealerSimulator.activeSelectionByGroup || {}).length && eligibleTitleSignatures.size) {
      recommendations = recommendations.filter((row) => (
        row.sourceType !== 'title' || eligibleTitleSignatures.has(getTitleCandidateSignature(row))
      ));
    }
    return recommendations;
  };
}

function createHelperHarness() {
  const calls = [];
  return {
    calls,
    deps: {
      getEnchantCandidateSignature(row) {
        calls.push(`enchant:${row.id}`);
        return row.signature;
      },
      getAuraCandidateSignature(row) {
        calls.push(`aura:${row.id}`);
        return row.signature;
      },
      getCreatureCandidateSignature(row) {
        calls.push(`creature:${row.id}`);
        return row.signature;
      },
      getTitleCandidateSignature(row) {
        calls.push(`title:${row.id}`);
        return row.signature;
      },
    },
  };
}

function createSimulatorProxy(initialState) {
  const setterCalls = [];
  const target = { ...initialState };
  const proxy = new Proxy(target, {
    set(current, key, value) {
      setterCalls.push([String(key), value]);
      current[key] = value;
      return true;
    },
  });
  return { proxy, setterCalls };
}

function recommendation(sourceType, id, signature, nested) {
  return { sourceType, id, signature, nested };
}

function createScenarioBuilders() {
  return [
    {
      name: 'null-simulator',
      build() {
        const nested = { marker: 'null' };
        return {
          recommendations: [
            recommendation('enchant', 'n-enchant', 'e:null', nested),
            recommendation('title', 'n-title', 't:null', nested),
          ],
          dealerSimulator: null,
          setterCalls: [],
        };
      },
    },
    {
      name: 'all-empty-no-active',
      build() {
        const nested = { marker: 'all-empty' };
        const simulator = createSimulatorProxy({
          baseEligibleEnchantCandidateSignatures: [],
          baseEligibleAuraCandidateSignatures: [],
          baseEligibleCreatureCandidateSignatures: [],
          baseEligibleTitleCandidateSignatures: [],
          activeSelectionByGroup: {},
        });
        return {
          recommendations: [
            recommendation('enchant', 'e1', 'e:1', nested),
            recommendation('aura', 'a1', 'a:1', nested),
            recommendation('creature', 'c1', 'c:1', nested),
            recommendation('title', 't1', 't:1', nested),
            recommendation('upgrade', 'x1', 'x:1', nested),
          ],
          dealerSimulator: simulator.proxy,
          setterCalls: simulator.setterCalls,
        };
      },
    },
    {
      name: 'partial-existing',
      build() {
        const nested = { marker: 'partial' };
        const simulator = createSimulatorProxy({
          baseEligibleEnchantCandidateSignatures: ['e:existing'],
          baseEligibleAuraCandidateSignatures: [],
          baseEligibleCreatureCandidateSignatures: [],
          baseEligibleTitleCandidateSignatures: ['t:existing'],
          activeSelectionByGroup: {},
        });
        return {
          recommendations: [
            recommendation('enchant', 'e2', 'e:new', nested),
            recommendation('aura', 'a2', 'a:new', nested),
            recommendation('creature', 'c2', 'c:new', nested),
            recommendation('title', 't2', 't:new', nested),
          ],
          dealerSimulator: simulator.proxy,
          setterCalls: simulator.setterCalls,
        };
      },
    },
    {
      name: 'active-title-filter',
      build() {
        const nested = { marker: 'active-filter' };
        const simulator = createSimulatorProxy({
          baseEligibleEnchantCandidateSignatures: [],
          baseEligibleAuraCandidateSignatures: [],
          baseEligibleCreatureCandidateSignatures: [],
          baseEligibleTitleCandidateSignatures: ['t:keep'],
          activeSelectionByGroup: {
            active: { candidateSignature: 'active' },
          },
        });
        return {
          recommendations: [
            recommendation('enchant', 'e3', 'e:3', nested),
            recommendation('title', 't-match', 't:keep', nested),
            recommendation('title', 't-drop', 't:drop', nested),
            recommendation('aura', 'a3', 'a:3', nested),
          ],
          dealerSimulator: simulator.proxy,
          setterCalls: simulator.setterCalls,
        };
      },
    },
    {
      name: 'active-all-title-pass-new-array',
      build() {
        const nested = { marker: 'all-pass' };
        const simulator = createSimulatorProxy({
          baseEligibleEnchantCandidateSignatures: ['e:base'],
          baseEligibleAuraCandidateSignatures: ['a:base'],
          baseEligibleCreatureCandidateSignatures: ['c:base'],
          baseEligibleTitleCandidateSignatures: ['t:4a', 't:4b'],
          activeSelectionByGroup: {
            active: { candidateSignature: 'active' },
          },
        });
        return {
          recommendations: [
            recommendation('title', 't4a', 't:4a', nested),
            recommendation('enchant', 'e4', 'e:4', nested),
            recommendation('title', 't4b', 't:4b', nested),
          ],
          dealerSimulator: simulator.proxy,
          setterCalls: simulator.setterCalls,
        };
      },
    },
    {
      name: 'duplicate-falsey-signatures',
      build() {
        const nested = { marker: 'duplicate-falsey' };
        const simulator = createSimulatorProxy({
          baseEligibleEnchantCandidateSignatures: [],
          baseEligibleAuraCandidateSignatures: [],
          baseEligibleCreatureCandidateSignatures: [],
          baseEligibleTitleCandidateSignatures: [],
          activeSelectionByGroup: {},
        });
        return {
          recommendations: [
            recommendation('enchant', 'e5a', 'dup', nested),
            recommendation('enchant', 'e5b', '', nested),
            recommendation('enchant', 'e5c', 'dup', nested),
            recommendation('aura', 'a5', null, nested),
            recommendation('creature', 'c5', 'c:5', nested),
            recommendation('title', 't5a', 0, nested),
            recommendation('title', 't5b', 't:5', nested),
          ],
          dealerSimulator: simulator.proxy,
          setterCalls: simulator.setterCalls,
        };
      },
    },
  ];
}

const ELIGIBILITY_KEYS = [
  'baseEligibleEnchantCandidateSignatures',
  'baseEligibleAuraCandidateSignatures',
  'baseEligibleCreatureCandidateSignatures',
  'baseEligibleTitleCandidateSignatures',
];

function getEligibleSnapshot(dealerSimulator) {
  if (!dealerSimulator) return null;
  return {
    enchant: dealerSimulator.baseEligibleEnchantCandidateSignatures.slice(),
    aura: dealerSimulator.baseEligibleAuraCandidateSignatures.slice(),
    creature: dealerSimulator.baseEligibleCreatureCandidateSignatures.slice(),
    title: dealerSimulator.baseEligibleTitleCandidateSignatures.slice(),
  };
}

function runScenario(kind, scenarioBuilder) {
  const scenario = scenarioBuilder.build();
  const { calls, deps } = createHelperHarness();
  const factoryResult = createEnchantDealerSimulatorRecommendationEligibility(deps);
  assert.deepEqual(Object.keys(factoryResult), ['applyDealerSimulatorRecommendationEligibility']);
  assert.equal(calls.length, 0, `${scenarioBuilder.name}: factory does not call helpers`);
  const apply = kind === 'legacy'
    ? createEmbeddedLegacyEligibility(deps)
    : factoryResult.applyDealerSimulatorRecommendationEligibility;

  const inputArray = scenario.recommendations;
  const inputOrder = inputArray.map((row) => [row.sourceType, row.id]);
  const rowById = new Map(inputArray.map((row) => [row.id, row]));
  const rowSnapshots = new Map(inputArray.map((row) => [row.id, structuredClone(row)]));
  const nestedById = new Map(inputArray.map((row) => [row.id, row.nested]));
  const nonEligibilitySnapshot = scenario.dealerSimulator
    ? cloneJson(Object.fromEntries(
      Object.entries(scenario.dealerSimulator).filter(([key]) => !ELIGIBILITY_KEYS.includes(key)),
    ))
    : null;
  const activeSelectionReference = scenario.dealerSimulator?.activeSelectionByGroup;
  const activeSelectionSnapshot = cloneJson(activeSelectionReference);
  const eligibilityReferences = scenario.dealerSimulator
    ? Object.fromEntries(ELIGIBILITY_KEYS.map((key) => [key, scenario.dealerSimulator[key]]))
    : null;

  const output = apply(inputArray, scenario.dealerSimulator);
  const outputOrder = output.map((row) => [row.sourceType, row.id]);
  const sameRows = output.every((row) => row === rowById.get(row.id));
  const sameNested = output.every((row) => row.nested === nestedById.get(row.id));
  const inputOrderUnchanged = JSON.stringify(inputArray.map((row) => [row.sourceType, row.id]))
    === JSON.stringify(inputOrder);
  const activeSelectionUnchanged = scenario.dealerSimulator
    ? scenario.dealerSimulator.activeSelectionByGroup === activeSelectionReference
      && JSON.stringify(scenario.dealerSimulator.activeSelectionByGroup) === JSON.stringify(activeSelectionSnapshot)
    : true;

  assert.equal(output.length, outputOrder.length, `${scenarioBuilder.name}: recommendation count`);
  assert.ok(sameRows, `${scenarioBuilder.name}: row identities preserved`);
  assert.ok(sameNested, `${scenarioBuilder.name}: nested identities preserved`);
  assert.ok(inputOrderUnchanged, `${scenarioBuilder.name}: input order unchanged`);
  inputArray.forEach((row) => {
    assert.deepEqual(row, rowSnapshots.get(row.id), `${scenarioBuilder.name}: row unchanged ${row.id}`);
  });
  assert.ok(activeSelectionUnchanged, `${scenarioBuilder.name}: active selection unchanged`);
  assert.deepEqual(
    scenario.dealerSimulator
      ? Object.fromEntries(
        Object.entries(scenario.dealerSimulator).filter(([key]) => !ELIGIBILITY_KEYS.includes(key)),
      )
      : null,
    nonEligibilitySnapshot,
    `${scenarioBuilder.name}: non-eligibility simulator state unchanged`,
  );

  const expected = EXPECTED_PRE_MOVE_FIXTURE.scenarios.find(({ name }) => name === scenarioBuilder.name);
  assert.ok(expected, `${scenarioBuilder.name}: expected fixture row exists`);
  assert.deepEqual(outputOrder, expected.outputOrder, `${scenarioBuilder.name}: sourceType/id order`);
  assert.equal(output === inputArray, expected.sameArray, `${scenarioBuilder.name}: array identity`);
  assert.deepEqual(calls, expected.helperCalls, `${scenarioBuilder.name}: helper call order`);
  assert.deepEqual(scenario.setterCalls, expected.setterCalls, `${scenarioBuilder.name}: setter order`);
  assert.deepEqual(getEligibleSnapshot(scenario.dealerSimulator), expected.eligible, `${scenarioBuilder.name}: eligible arrays`);

  if (scenario.dealerSimulator) {
    ELIGIBILITY_KEYS.forEach((key) => {
      const wasNonEmpty = eligibilityReferences[key].length > 0;
      if (wasNonEmpty) {
        assert.equal(
          scenario.dealerSimulator[key],
          eligibilityReferences[key],
          `${scenarioBuilder.name}: existing ${key} reference preserved`,
        );
      }
    });
  }

  return {
    name: scenarioBuilder.name,
    outputOrder,
    sameArray: output === inputArray,
    sameRows,
    sameNested,
    inputOrderUnchanged,
    helperCalls: calls.slice(),
    setterCalls: scenario.setterCalls.map(([key, value]) => [key, value.slice()]),
    eligible: getEligibleSnapshot(scenario.dealerSimulator),
    activeSelectionUnchanged,
  };
}

function testBehaviorAndFixture() {
  const builders = createScenarioBuilders();
  const legacyResults = builders.map((builder) => runScenario('legacy', builder));
  const moduleResults = builders.map((builder) => runScenario('module', builder));
  assert.deepEqual(moduleResults, legacyResults, 'module behavior matches embedded legacy');

  const portableFixture = {
    schema: 'enchantDealerSimulatorRecommendationEligibility/pre-move-v1',
    scenarios: legacyResults,
  };
  assert.deepEqual(portableFixture, EXPECTED_PRE_MOVE_FIXTURE, 'actual legacy execution recreates supplied fixture');
  const fixtureJson = JSON.stringify(portableFixture);
  assert.equal(sha256(fixtureJson), PRE_MOVE_FIXTURE_JSON_SHA256);
  return PRE_MOVE_FIXTURE_JSON_SHA256;
}

function testMalformedEligibilityArrays() {
  for (const malformedKey of ELIGIBILITY_KEYS) {
    for (const kind of ['legacy', 'module']) {
      const { calls, deps } = createHelperHarness();
      const apply = kind === 'legacy'
        ? createEmbeddedLegacyEligibility(deps)
        : createEnchantDealerSimulatorRecommendationEligibility(deps)
          .applyDealerSimulatorRecommendationEligibility;
      const recommendations = [recommendation('title', 'error-title', 't:error', { marker: 'error' })];
      const initialState = {
        baseEligibleEnchantCandidateSignatures: ['e:keep'],
        baseEligibleAuraCandidateSignatures: ['a:keep'],
        baseEligibleCreatureCandidateSignatures: ['c:keep'],
        baseEligibleTitleCandidateSignatures: ['t:keep'],
        activeSelectionByGroup: {},
      };
      initialState[malformedKey] = null;
      const simulator = createSimulatorProxy(initialState);
      const inputSnapshot = cloneJson(recommendations);
      const activeSelectionReference = simulator.proxy.activeSelectionByGroup;
      assert.throws(
        () => apply(recommendations, simulator.proxy),
        TypeError,
        `${kind}: malformed ${malformedKey} preserves TypeError`,
      );
      assert.deepEqual(simulator.setterCalls, [], `${kind}: malformed ${malformedKey} does not assign`);
      assert.deepEqual(calls, [], `${kind}: malformed ${malformedKey} does not call helpers first`);
      assert.deepEqual(recommendations, inputSnapshot, `${kind}: malformed ${malformedKey} leaves rows unchanged`);
      assert.equal(simulator.proxy.activeSelectionByGroup, activeSelectionReference);
    }
  }
}

function testMechanicalSourceContract() {
  assert.equal(LEGACY_BLOCK_LF.split('\n').length, 30);
  assert.equal(sha256(LEGACY_BLOCK_LF), LEGACY_BLOCK_LF_SHA256);
  assert.equal(
    sha256(LEGACY_BLOCK_LF.replaceAll('\n', '\r\n')),
    LEGACY_BLOCK_CRLF_RAW_SHA256,
  );

  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantDealerSimulatorRecommendationEligibility.js', import.meta.url));
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const applicationStateModulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationApplicationState.js', import.meta.url));
  const displayOrderModulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationDisplayOrder.js', import.meta.url));
  const layoutModulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationLayout.js', import.meta.url));
  const applicationStateTestPath = fileURLToPath(new URL('./test_enchant_recommendation_application_state.js', import.meta.url));
  const layoutTestPath = fileURLToPath(new URL('./test_enchant_recommendation_layout.js', import.meta.url));
  const eventBindingsPath = fileURLToPath(new URL('../src/dnfHellTool/eventBindings.js', import.meta.url));
  const initPath = fileURLToPath(new URL('../src/dnfHellTool/initDnfHellTool.js', import.meta.url));

  const moduleSource = normalizeLf(readFileSync(modulePath, 'utf8'));
  const factorySignature = `export function createEnchantDealerSimulatorRecommendationEligibility({
  getEnchantCandidateSignature,
  getAuraCandidateSignature,
  getCreatureCandidateSignature,
  getTitleCandidateSignature,
}) {`;
  assert.ok(moduleSource.startsWith(factorySignature));
  assert.equal((moduleSource.match(/\bexport\b/g) || []).length, 1);
  assert.equal((moduleSource.match(/applyDealerSimulatorRecommendationEligibility/g) || []).length, 2);
  for (const forbidden of [
    /^import\s/m,
    /export\s+default/,
    /\bclass\b/,
    /\bstate\b/,
    /\bels\b/,
    /\bdocument\b/,
    /\bwindow\b/,
    /\bMap\b/,
    /comparator/i,
    /\.sort\s*\(/,
    /innerHTML/,
  ]) {
    assert.ok(!forbidden.test(moduleSource), `new module forbids ${forbidden}`);
  }
  assert.equal((moduleSource.match(/\.filter\(\(row\) => row\.sourceType ===/g) || []).length, 4);
  assert.equal((moduleSource.match(/\.filter\(Boolean\)/g) || []).length, 4);
  assert.equal((moduleSource.match(/\.map\(getEnchantCandidateSignature\)/g) || []).length, 1);
  assert.equal((moduleSource.match(/\.map\(getAuraCandidateSignature\)/g) || []).length, 1);
  assert.equal((moduleSource.match(/\.map\(getCreatureCandidateSignature\)/g) || []).length, 1);
  assert.equal((moduleSource.match(/\.map\(getTitleCandidateSignature\)/g) || []).length, 1);
  assert.equal((moduleSource.match(/new Set\(/g) || []).length, 1);
  assert.equal((moduleSource.match(/Object\.keys\(/g) || []).length, 1);

  const moduleCoreStart = moduleSource.indexOf('    if (dealerSimulator && !dealerSimulator.baseEligibleEnchantCandidateSignatures.length) {');
  const moduleCoreEnd = moduleSource.indexOf('    return recommendations;', moduleCoreStart);
  assert.ok(moduleCoreStart >= 0 && moduleCoreEnd > moduleCoreStart);
  assert.equal(moduleSource.slice(moduleCoreStart, moduleCoreEnd).trimEnd(), LEGACY_BLOCK_LF);
  assert.ok(moduleSource.includes('  return { applyDealerSimulatorRecommendationEligibility };'));

  const viewSource = readFileSync(viewPath, 'utf8');
  const applicationImport = "import { createEnchantRecommendationApplicationState } from './enchantRecommendationApplicationState.js';\r\n";
  const displayImport = "import { createEnchantRecommendationDisplayOrder } from './enchantRecommendationDisplayOrder.js';\r\n";
  const eligibilityImport = "import { createEnchantDealerSimulatorRecommendationEligibility } from './enchantDealerSimulatorRecommendationEligibility.js';\r\n";
  assert.equal(viewSource.split(eligibilityImport).length - 1, 1);
  assert.ok(viewSource.includes(applicationImport + displayImport + eligibilityImport));

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
  const eligibilityInstall = [
    '',
    '',
    '  const { applyDealerSimulatorRecommendationEligibility } =',
    '    createEnchantDealerSimulatorRecommendationEligibility({',
    '      getEnchantCandidateSignature,',
    '      getAuraCandidateSignature,',
    '      getCreatureCandidateSignature,',
    '      getTitleCandidateSignature,',
    '    });',
  ].join('\r\n');
  const applicationInstall = [
    '',
    '',
    '  const { decorateEnchantRecommendationApplicationState } =',
    '    createEnchantRecommendationApplicationState({',
  ].join('\r\n');
  assert.equal(viewSource.split(eligibilityInstall).length - 1, 1);
  const layoutInstallIndex = viewSource.indexOf(layoutInstall);
  const eligibilityInstallIndex = viewSource.indexOf(eligibilityInstall, layoutInstallIndex);
  const applicationInstallIndex = viewSource.indexOf(applicationInstall, eligibilityInstallIndex);
  const rendererIndex = viewSource.indexOf('  function renderEnchantRecommendations', applicationInstallIndex);
  assert.ok(layoutInstallIndex >= 0);
  assert.ok(eligibilityInstallIndex > layoutInstallIndex, 'eligibility factory follows layout immediately');
  assert.ok(applicationInstallIndex > eligibilityInstallIndex, 'application-state factory follows eligibility');
  assert.ok(rendererIndex > applicationInstallIndex);
  assert.ok(viewSource.includes(`${layoutInstall}${eligibilityInstall}${applicationInstall}`));

  const replacementCall = '    recommendations = applyDealerSimulatorRecommendationEligibility(recommendations, dealerSimulator);\r\n';
  assert.equal(viewSource.split(replacementCall).length - 1, 1);
  assert.ok(!viewSource.includes(LEGACY_BLOCK_LF.replaceAll('\n', '\r\n')));
  assert.ok(!viewSource.includes('    if (dealerSimulator && !dealerSimulator.baseEligibleEnchantCandidateSignatures.length) {'));

  const firstTuneMap = '    recommendations = recommendations.map((row) => (\r\n      TUNE_SOURCE_TYPES.has(row.sourceType)';
  const dealerTunePass = "    if (dealerSimulator) {\r\n      const equipmentTuneStepIndex = getTuneStepIndexBySource(state, 'equipmentTune');";
  const orderAnchors = [
    '      : getDealerSimulatorRecommendationContext(rows);',
    firstTuneMap,
    replacementCall.trimEnd(),
    dealerTunePass,
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

  const lfView = normalizeLf(viewSource);
  const htmlStart = lfView.indexOf('    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {');
  const htmlEndMarker = "    }).join('');";
  const htmlEnd = lfView.indexOf(htmlEndMarker, htmlStart) + htmlEndMarker.length;
  assert.ok(htmlStart >= 0 && htmlEnd > htmlStart);
  const htmlMapBlock = lfView.slice(htmlStart, htmlEnd);
  assert.equal(htmlMapBlock.split('\n').length, 325);
  assert.equal(sha256(htmlMapBlock), HTML_MAP_LF_BLOCK_SHA256);

  assert.equal(sha256(readFileSync(applicationStateModulePath)), PROTECTED_FILE_SHA256.applicationStateModule);
  assert.equal(sha256(readFileSync(displayOrderModulePath)), PROTECTED_FILE_SHA256.displayOrderModule);
  assert.equal(sha256(readFileSync(layoutModulePath)), PROTECTED_FILE_SHA256.layoutModule);
  assert.equal(sha256(readFileSync(applicationStateTestPath)), PROTECTED_FILE_SHA256.applicationStateTest);
  assert.equal(sha256(readFileSync(layoutTestPath)), PROTECTED_FILE_SHA256.layoutTest);
  assert.equal(sha256(readFileSync(eventBindingsPath)), PROTECTED_FILE_SHA256.eventBindings);
  assert.equal(sha256(readFileSync(initPath)), PROTECTED_FILE_SHA256.initDnfHellTool);
}

const fixtureHash = testBehaviorAndFixture();
testMalformedEligibilityArrays();
testMechanicalSourceContract();

console.log(`enchant dealer simulator recommendation eligibility: ok (${fixtureHash})`);
