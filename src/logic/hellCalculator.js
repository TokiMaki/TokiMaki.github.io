// 헬 졸업 기대값/정가 비교 계산 전용 모듈.
// DOM을 직접 만지지 않는 순수 계산만 둔다.

export const TARGET_TAECHO = 3;
export const TARGET_EPIC = 8;

export const HELL_FRAGMENT_REQUIREMENTS = {
  rare: 1,
  unique: 12,
  legendary: 28,
  epic: 1000,
  taecho: 1500,
};

export const HELL_FRAGMENT_EXPECTED_PER_RUN = {
  rare: 0.25,
  unique: 0.3,
  legendary: 0.12990523942725501,
  epic: 0.08797122016457304,
  taecho: 0.020034626038781162,
};

export function calcCraftCost(set, taechoCraftCost, epicCraftCost) {
  const taechoGap = Math.max(0, TARGET_TAECHO - set.taecho);
  const epicGap = Math.max(0, TARGET_EPIC - set.epic);
  return taechoGap * taechoCraftCost + epicGap * epicCraftCost;
}
  
export function buildSetRows(sets, taechoCraftCost, epicCraftCost) {
  return sets.map((set) => {
    const taechoGap = Math.max(0, TARGET_TAECHO - set.taecho);
    const epicGap = Math.max(0, TARGET_EPIC - set.epic);
    return {
      ...set,
      taechoGap,
      epicGap,
      craftCost: calcCraftCost(set, taechoCraftCost, epicCraftCost),
    };
  }).sort((a, b) => a.craftCost - b.craftCost || a.epicGap - b.epicGap || a.taechoGap - b.taechoGap);
}
  
function isComplete(state) {
  return state.t >= TARGET_TAECHO && state.e >= TARGET_EPIC;
}
  
function hashStringToSeed(text) {
  let hash = 2166136261;
  const input = String(text || '');
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
  
function createSeededRng(seedText) {
  let state = hashStringToSeed(seedText) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
  
function sampleGeometricSteps(probability, rng) {
  if (!(probability > 0)) return Infinity;
  if (probability >= 1) return 1;
  const random = typeof rng === 'function' ? rng() : Math.random();
  return Math.floor(Math.log1p(-random) / Math.log1p(-probability)) + 1;
}
  
export function simulateCharacterCompletion(inputSets, epicRate, taechoRate, setCount, trials, seedText = '') {
  const results = [];
  const maxRuns = 300000;
  const totalRate = epicRate + taechoRate;
  const epicShare = totalRate > 0 ? epicRate / totalRate : 0;
  const rng = createSeededRng(seedText);
  
  for (let trial = 0; trial < trials; trial += 1) {
    const states = inputSets.map((set) => ({
      t: Math.min(TARGET_TAECHO, set.taecho),
      e: Math.min(TARGET_EPIC, set.epic),
    }));
    let run = 0;
    let completed = false;
  
    while (run < maxRuns) {
      if (states.some(isComplete)) {
        results.push(run);
        completed = true;
        break;
      }
  
      const step = sampleGeometricSteps(totalRate, rng);
      if (!Number.isFinite(step)) {
        break;
      }
  
      run += step;
      if (run > maxRuns) {
        break;
      }
  
      const setIndex = Math.floor(rng() * setCount);
      const target = states[setIndex];
      if (target) {
        if (rng() < epicShare) {
          if (target.e < TARGET_EPIC) {
            target.e += 1;
          }
        } else if (target.t < TARGET_TAECHO) {
          target.t += 1;
        }
      }
  
      if (states.some(isComplete)) {
        results.push(run);
        completed = true;
        break;
      }
    }
  
    if (!completed) {
      results.push(maxRuns);
    }
  }
  
  results.sort((a, b) => a - b);
  return results;
}
  
export function percentileValue(sortedRuns, percentile) {
  const n = sortedRuns.length;
  if (n === 0) return 0;
  const index = Math.max(0, Math.min(n - 1, Math.ceil((percentile / 100) * n) - 1));
  return sortedRuns[index];
}
  
export function verdictClass(selectedHellCost, craftCost) {
  const ratio = selectedHellCost / craftCost;
  if (ratio <= 0.9) return { text: '헬 유지', className: 'good' };
  if (ratio <= 1.1) return { text: '헬/정가 경계', className: 'warn' };
  return { text: '정가/초월 우선', className: 'priority' };
}
  
export function calcNetCost(hellPerRun, recoveryAmount) {
  return Math.max(0, hellPerRun - recoveryAmount);
}
  
export function calcFragmentExpectation(craftBest, netCost) {
  const taechoGap = Math.max(0, Number(craftBest?.taechoGap || 0));
  const epicGap = Math.max(0, Number(craftBest?.epicGap || 0));
  const taechoPieces = taechoGap * HELL_FRAGMENT_REQUIREMENTS.taecho;
  const epicPieces = epicGap * HELL_FRAGMENT_REQUIREMENTS.epic;
  const requiredPieces = taechoPieces + epicPieces;
  const taechoCostPerPiece = HELL_FRAGMENT_EXPECTED_PER_RUN.taecho > 0
    ? Number(netCost || 0) / HELL_FRAGMENT_EXPECTED_PER_RUN.taecho
    : 0;
  const epicCostPerPiece = HELL_FRAGMENT_EXPECTED_PER_RUN.epic > 0
    ? Number(netCost || 0) / HELL_FRAGMENT_EXPECTED_PER_RUN.epic
    : 0;
  const expectedCost = (taechoPieces * taechoCostPerPiece) + (epicPieces * epicCostPerPiece);
  
  return {
    taechoGap,
    epicGap,
    taechoPieces,
    epicPieces,
    requiredPieces,
    taechoCostPerPiece,
    epicCostPerPiece,
    expectedCost,
  };
}
  
export function applySelectedPercentile(results, selectedPercentile) {
  for (const result of results) {
    const selectedRuns = percentileValue(result.sortedRuns, selectedPercentile);
    result.selectedRuns = selectedRuns;
    result.selectedHellCost = selectedRuns * result.netCost;
    result.ratio = result.selectedHellCost / result.craftBest.craftCost;
    result.verdict = verdictClass(result.selectedHellCost, result.craftBest.craftCost);
  }
}
  
export function calcCharacter(character, config) {
  const setRows = buildSetRows(character.sets, config.taechoCraftCost, config.epicCraftCost);
  const craftBest = setRows[0];
  const seedText = JSON.stringify({
    characterKey: character.key,
    sets: character.sets,
    epicRate: config.epicRate,
    taechoRate: config.taechoRate,
    setCount: config.setCount,
    trials: config.trials,
  });
  const sortedRuns = simulateCharacterCompletion(
    character.sets,
    config.epicRate,
    config.taechoRate,
    config.setCount,
    config.trials,
    seedText
  );
  
  const meanRuns = sortedRuns.reduce((acc, value) => acc + value, 0) / sortedRuns.length;
  const p50Runs = percentileValue(sortedRuns, 50);
  const p66Runs = percentileValue(sortedRuns, 66);
  const p80Runs = percentileValue(sortedRuns, 80);
  const netCost = calcNetCost(config.hellPerRun, config.recoveryAmount);
  
  const result = {
    key: character.key,
    serverId: character.serverId,
    characterId: character.characterId,
    name: character.name,
    jobId: character.jobId || '',
    jobName: character.jobName || '',
    jobGrowId: character.jobGrowId || '',
    jobGrowName: character.jobGrowName || '',
    setRows,
    craftBest,
    sortedRuns,
    hellPerRun: config.hellPerRun,
    recoveryAmount: config.recoveryAmount,
    netCost,
    p50Runs,
    p50Cost: p50Runs * netCost,
    p66Runs,
    p66Cost: p66Runs * netCost,
    p80Runs,
    p80Cost: p80Runs * netCost,
    meanRuns,
    meanCost: meanRuns * netCost,
  };
  return result;
}
  
