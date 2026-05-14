import {
  SUPPLY_FORMULA_CONSTANTS,
  SUPPLY_SOUL_RECOVERY_RARITIES,
} from '../data/supplyConstants.js';

// 헬 회수율/계시 수급 분해 계산.

export function calcSupplyFromWorkbook(gearMultiplier, tunerMultiplier, hellCost, fixedSupply = 0) {
  return (
    SUPPLY_FORMULA_CONSTANTS.gearRecoveryPerRun * Number(gearMultiplier || 0)
    + SUPPLY_FORMULA_CONSTANTS.tuningRecoveryPerRun * Number(tunerMultiplier || 0)
    + (Number(hellCost || 0) / SUPPLY_FORMULA_CONSTANTS.hellCostPerRun) * SUPPLY_FORMULA_CONSTANTS.recoveryPerHell
    + Number(fixedSupply || 0)
  );
}

export function calcSoulRecoveryRows(gearMultiplier = 0, tunerMultiplier = 0, hellRuns = 0) {
  const gearCount = Number(gearMultiplier || 0);
  const tunerCount = Number(tunerMultiplier || 0);
  const boundHellRuns = Number(hellRuns || 0);
  const gearRows = SUPPLY_SOUL_RECOVERY_RARITIES.map((rarity) => {
    const gearExpectedCount = gearCount * Number(rarity.gearRate || 0);
    const boundHellGearExpectedCount = boundHellRuns * Number(rarity.gearRate || 0);
    const gearValueTotal = gearExpectedCount * Number(rarity.gearValue || 0);
    const boundHellGearValueTotal = boundHellGearExpectedCount * Number(rarity.gearValue || 0);
    return {
      key: `gear:${rarity.key}`,
      label: rarity.label,
      sourceLabel: '일반 장비',
      gearExpectedCount,
      boundHellGearExpectedCount,
      tunerExpectedCount: 0,
      expectedCount: gearExpectedCount + boundHellGearExpectedCount,
      gearValueTotal,
      boundHellGearValueTotal,
      tunerValueTotal: 0,
      valueTotal: gearValueTotal + boundHellGearValueTotal,
    };
  });
  
  const tunerRows = SUPPLY_SOUL_RECOVERY_RARITIES.map((rarity) => {
    const contentDecisionExpectedCount = tunerCount * Number(rarity.tunerRate || 0);
    const boundHellDecisionExpectedCount = boundHellRuns * Number(rarity.tunerHellRate || 0);
    const contentDimSoulExpectedCount = contentDecisionExpectedCount * Number(rarity.dimSoulCount || 0);
    const boundHellDimSoulExpectedCount = boundHellDecisionExpectedCount * Number(rarity.dimSoulCount || 0);
    const dimSoulExpectedCount = contentDimSoulExpectedCount + boundHellDimSoulExpectedCount;
    const contentValueTotal = contentDimSoulExpectedCount * 4;
    const boundHellValueTotal = boundHellDimSoulExpectedCount * 4;
    const valueTotal = contentValueTotal + boundHellValueTotal;
    return {
      key: `tuner:${rarity.key}`,
      label: `미광(${rarity.decisionLabel})`,
      sourceLabel: '서약결정',
      gearExpectedCount: 0,
      tunerExpectedCount: contentDecisionExpectedCount,
      tunerHellExpectedCount: boundHellDecisionExpectedCount,
      contentDimSoulExpectedCount,
      boundHellDimSoulExpectedCount,
      expectedCount: dimSoulExpectedCount,
      gearValueTotal: 0,
      tunerValueTotal: contentValueTotal,
      boundHellValueTotal,
      valueTotal,
    };
  });
  
  return [...gearRows, ...tunerRows];
}

export function calcIndependentSoulRecoveryRows(runCount = 0, rarityKeys = [], rarityRates = null) {
  const runs = Number(runCount || 0);
  const allowedKeys = new Set(Array.isArray(rarityKeys) ? rarityKeys : []);
  const rates = rarityRates && typeof rarityRates === 'object' ? rarityRates : {};
  return SUPPLY_SOUL_RECOVERY_RARITIES
    .filter((rarity) => allowedKeys.size <= 0 || allowedKeys.has(rarity.key))
    .flatMap((rarity) => {
      const rate = Object.prototype.hasOwnProperty.call(rates, rarity.key)
        ? Number(rates[rarity.key] || 0)
        : Number(rarity.gearRate || 0);
      const gearExpectedCount = runs * rate;
      const gearValueTotal = gearExpectedCount * Number(rarity.gearValue || 0);
      const tunerExpectedCount = runs * rate;
      const contentDimSoulExpectedCount = tunerExpectedCount * Number(rarity.dimSoulCount || 0);
      const tunerValueTotal = contentDimSoulExpectedCount * 4;
      return [
        {
          key: `gear:${rarity.key}`,
          label: rarity.label,
          sourceLabel: '일반 장비',
          gearExpectedCount,
          boundHellGearExpectedCount: 0,
          tunerExpectedCount: 0,
          expectedCount: gearExpectedCount,
          gearValueTotal,
          boundHellGearValueTotal: 0,
          tunerValueTotal: 0,
          valueTotal: gearValueTotal,
        },
        {
          key: `tuner:${rarity.key}`,
          label: `미광(${rarity.decisionLabel})`,
          sourceLabel: '서약결정',
          gearExpectedCount: 0,
          tunerExpectedCount,
          tunerHellExpectedCount: 0,
          contentDimSoulExpectedCount,
          boundHellDimSoulExpectedCount: 0,
          expectedCount: contentDimSoulExpectedCount,
          gearValueTotal: 0,
          tunerValueTotal,
          boundHellValueTotal: 0,
          valueTotal: tunerValueTotal,
        },
      ];
    });
}

export function mergeSupplyRecoveryRows(rows) {
  const merged = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row?.key || '').trim();
    if (!key) continue;
    const current = merged.get(key) || {
      ...row,
      gearExpectedCount: 0,
      boundHellGearExpectedCount: 0,
      tunerExpectedCount: 0,
      tunerHellExpectedCount: 0,
      contentDimSoulExpectedCount: 0,
      boundHellDimSoulExpectedCount: 0,
      expectedCount: 0,
      gearValueTotal: 0,
      boundHellGearValueTotal: 0,
      tunerValueTotal: 0,
      boundHellValueTotal: 0,
      valueTotal: 0,
    };
    current.gearExpectedCount += Number(row.gearExpectedCount || 0);
    current.boundHellGearExpectedCount += Number(row.boundHellGearExpectedCount || 0);
    current.tunerExpectedCount += Number(row.tunerExpectedCount || 0);
    current.tunerHellExpectedCount += Number(row.tunerHellExpectedCount || 0);
    current.contentDimSoulExpectedCount += Number(row.contentDimSoulExpectedCount || 0);
    current.boundHellDimSoulExpectedCount += Number(row.boundHellDimSoulExpectedCount || 0);
    current.expectedCount += Number(row.expectedCount || 0);
    current.gearValueTotal += Number(row.gearValueTotal || 0);
    current.boundHellGearValueTotal += Number(row.boundHellGearValueTotal || 0);
    current.tunerValueTotal += Number(row.tunerValueTotal || 0);
    current.boundHellValueTotal += Number(row.boundHellValueTotal || 0);
    current.valueTotal += Number(row.valueTotal || 0);
    merged.set(key, current);
  }
  return [...merged.values()];
}

export function calcSupplyParts(gearMultiplier, tunerMultiplier, boundSupply = 0, accountBonus = 0) {
  const weeklyBoundSupply = Number(boundSupply || 0);
  const boundHellRuns = weeklyBoundSupply / SUPPLY_FORMULA_CONSTANTS.hellCostPerRun;
  const soulRecoveries = calcSoulRecoveryRows(gearMultiplier, tunerMultiplier, boundHellRuns);
  const gearRows = mergeSupplyRecoveryRows(soulRecoveries.filter((row) => String(row.key || '').startsWith('gear:')));
  const dimRows = mergeSupplyRecoveryRows(soulRecoveries.filter((row) => String(row.key || '').startsWith('tuner:')));
  const gearRecoveryTotal = gearRows.reduce((sum, row) => sum + Number(row.valueTotal || 0), 0);
  const dimSoulCount = dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0);
  const dimSoulValue = dimSoulCount * 4;
  const soulRecoveryTotal = gearRecoveryTotal + dimSoulValue;
  const boundHellDimRecovery = soulRecoveries.reduce((sum, row) => sum + Number(row.boundHellValueTotal || 0), 0);
  const boundHellGearRecovery = boundHellRuns * SUPPLY_FORMULA_CONSTANTS.gearRecoveryPerRun;
  const supplyParts = {
    gearRecovery: gearRecoveryTotal,
    tunerRecovery: soulRecoveries.reduce((sum, row) => sum + Number(row.tunerValueTotal || 0), 0),
    boundRecovery: boundHellGearRecovery + boundHellDimRecovery,
    boundHellGearRecovery,
    boundHellDimRecovery,
    fixedAccountSupply: Number(accountBonus || 0),
    gearRows,
    dimRows,
    gearRecoveryTotal,
    dimSoulCount,
    dimSoulValue,
    soulRecoveryTotal,
    soulRecoveries,
  };
  const weeklyAccountSupply = Number(accountBonus || 0);
  return {
    boundSupply: weeklyBoundSupply,
    accountSupply: weeklyAccountSupply,
    totalSupply: weeklyBoundSupply + weeklyAccountSupply,
    supply: weeklyAccountSupply,
    supplyParts,
  };
}

export function calcIndependentSupplyParts(runCount = 0, rarityKeys = ['rare', 'unique', 'legendary'], boundSupply = 0, accountBonus = 0, rarityRates = null) {
  const weeklyBoundSupply = Number(boundSupply || 0);
  const soulRecoveries = calcIndependentSoulRecoveryRows(runCount, rarityKeys, rarityRates);
  const gearRows = mergeSupplyRecoveryRows(soulRecoveries.filter((row) => String(row.key || '').startsWith('gear:')));
  const dimRows = mergeSupplyRecoveryRows(soulRecoveries.filter((row) => String(row.key || '').startsWith('tuner:')));
  const gearRecoveryTotal = gearRows.reduce((sum, row) => sum + Number(row.valueTotal || 0), 0);
  const dimSoulCount = dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0);
  const dimSoulValue = dimSoulCount * 4;
  const soulRecoveryTotal = gearRecoveryTotal + dimSoulValue;
  const supplyParts = {
    gearRecovery: gearRecoveryTotal,
    tunerRecovery: dimSoulValue,
    boundRecovery: 0,
    boundHellGearRecovery: 0,
    boundHellDimRecovery: 0,
    fixedAccountSupply: Number(accountBonus || 0),
    gearRows,
    dimRows,
    gearRecoveryTotal,
    dimSoulCount,
    dimSoulValue,
    soulRecoveryTotal,
    soulRecoveries,
  };
  const weeklyAccountSupply = Number(accountBonus || 0);
  return {
    boundSupply: weeklyBoundSupply,
    accountSupply: weeklyAccountSupply,
    totalSupply: weeklyBoundSupply + weeklyAccountSupply,
    supply: weeklyAccountSupply,
    supplyParts,
  };
}

export function calcDailyContentWeeklySupply(basePerDay, mwfBonusPerDay = 0) {
  return Number(basePerDay || 0) * 7 + Number(mwfBonusPerDay || 0) * 3;
}

export function normalizeSupplyParts(parts, fallbackAccountSupply = 0) {
  const source = parts && typeof parts === 'object' ? parts : {};
  const soulRecoveries = Array.isArray(source.soulRecoveries) ? source.soulRecoveries : [];
  const gearRows = mergeSupplyRecoveryRows(Array.isArray(source.gearRows) ? source.gearRows : soulRecoveries.filter((row) => String(row.key || '').startsWith('gear:')));
  const dimRows = mergeSupplyRecoveryRows(Array.isArray(source.dimRows) ? source.dimRows : soulRecoveries.filter((row) => String(row.key || '').startsWith('tuner:')));
  const gearRecoveryTotal = Number(source.gearRecoveryTotal || gearRows.reduce((sum, row) => sum + Number(row.valueTotal || 0), 0));
  const dimSoulCount = Number(source.dimSoulCount || dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0));
  const dimSoulValue = Number(source.dimSoulValue || (dimSoulCount * 4));
  const soulRecoveryTotal = Number(source.soulRecoveryTotal || (gearRecoveryTotal + dimSoulValue));
  const normalized = {
    gearRecovery: Number(source.gearRecovery || 0),
    tunerRecovery: Number(source.tunerRecovery || 0),
    boundRecovery: Number(source.boundRecovery || 0),
    boundHellGearRecovery: Number(source.boundHellGearRecovery || 0),
    boundHellDimRecovery: Number(source.boundHellDimRecovery || 0),
    fixedAccountSupply: Number(source.fixedAccountSupply || 0),
    gearRows,
    dimRows,
    gearRecoveryTotal,
    dimSoulCount,
    dimSoulValue,
    soulRecoveryTotal,
    soulRecoveries,
  };
  const knownTotal = normalized.gearRecovery + normalized.tunerRecovery + normalized.boundRecovery + normalized.fixedAccountSupply;
  if (knownTotal <= 0 && Number(fallbackAccountSupply || 0) > 0) {
    normalized.fixedAccountSupply = Number(fallbackAccountSupply || 0);
  }
  return normalized;
}

export function calcSupplyPartsFromEntries(entries, weeklyHellRuns = 0, includeBoundHellRecovery = true) {
  const contentGearRows = [];
  const contentDimRows = [];
  let boundRecoveryTotal = 0;
  let boundHellGearRecoveryTotal = 0;
  let boundHellDimRecoveryTotal = 0;
  const fixedAccountSupply = { value: 0 };
  
  for (const entry of Array.isArray(entries) ? entries : []) {
    const entryParts = normalizeSupplyParts(entry?.supplyParts, entry?.accountSupply ?? entry?.supply ?? 0);
    fixedAccountSupply.value += Number(entryParts.fixedAccountSupply || 0);
    boundRecoveryTotal += Number(entryParts.boundRecovery || 0);
    boundHellGearRecoveryTotal += Number(entryParts.boundHellGearRecovery || 0);
    boundHellDimRecoveryTotal += Number(entryParts.boundHellDimRecovery || 0);
  
    for (const row of Array.isArray(entryParts.gearRows) ? entryParts.gearRows : []) {
      contentGearRows.push({
        ...row,
        expectedCount: Math.max(0, Number(row.expectedCount || 0) - Number(row.boundHellGearExpectedCount || 0)),
        valueTotal: Math.max(0, Number(row.valueTotal || 0) - Number(row.boundHellGearValueTotal || 0)),
        boundHellGearExpectedCount: 0,
        boundHellGearValueTotal: 0,
      });
    }
  
    for (const row of Array.isArray(entryParts.dimRows) ? entryParts.dimRows : []) {
      contentDimRows.push({
        ...row,
        expectedCount: Math.max(0, Number(row.expectedCount || 0) - Number(row.boundHellDimSoulExpectedCount || 0)),
        valueTotal: Math.max(0, Number(row.valueTotal || 0) - Number(row.boundHellValueTotal || 0)),
        boundHellDimSoulExpectedCount: 0,
        boundHellValueTotal: 0,
      });
    }
  }
  
  const hellSoulRecoveries = calcSoulRecoveryRows(0, 0, weeklyHellRuns);
  const gearRows = mergeSupplyRecoveryRows([
    ...contentGearRows,
    ...mergeSupplyRecoveryRows(hellSoulRecoveries.filter((row) => String(row.key || '').startsWith('gear:'))),
  ]);
  const dimRows = mergeSupplyRecoveryRows([
    ...contentDimRows,
    ...mergeSupplyRecoveryRows(hellSoulRecoveries.filter((row) => String(row.key || '').startsWith('tuner:'))),
  ]);
  const gearRecoveryTotal = gearRows.reduce((sum, row) => sum + Number(row.valueTotal || 0), 0);
  const dimSoulCount = dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0);
  const dimSoulValue = dimSoulCount * 4;
  const effectiveBoundRecoveryTotal = includeBoundHellRecovery ? boundRecoveryTotal : 0;
  const effectiveBoundHellGearRecoveryTotal = includeBoundHellRecovery ? boundHellGearRecoveryTotal : 0;
  const effectiveBoundHellDimRecoveryTotal = includeBoundHellRecovery ? boundHellDimRecoveryTotal : 0;
  const soulRecoveryTotal = gearRecoveryTotal + dimSoulValue + effectiveBoundRecoveryTotal;
  const soulRecoveries = [...gearRows, ...dimRows];
  const rawAccountSupply = fixedAccountSupply.value + soulRecoveryTotal;
  
  return {
    parts: {
      gearRecovery: gearRecoveryTotal,
      tunerRecovery: dimSoulValue,
      boundRecovery: effectiveBoundRecoveryTotal,
      boundHellGearRecovery: effectiveBoundHellGearRecoveryTotal,
      boundHellDimRecovery: effectiveBoundHellDimRecoveryTotal,
      fixedAccountSupply: fixedAccountSupply.value,
      gearRows,
      dimRows,
      gearRecoveryTotal,
      dimSoulCount,
      dimSoulValue,
      soulRecoveryTotal,
      soulRecoveries,
    },
    accountSupply: fixedAccountSupply.value,
    recoverySupply: rawAccountSupply - fixedAccountSupply.value,
  };
}

export function summarizeSoulRecoveryParts(characters) {
  const gearMap = new Map();
  const dimMap = new Map();
  let dimSoulCount = 0;
  let dimSoulValue = 0;
  let total = 0;
  
  for (const character of Array.isArray(characters) ? characters : []) {
    const supplyParts = normalizeSupplyParts(character?.supplyParts, character?.weeklyRawAccountSupply || 0);
    total += Number(supplyParts.soulRecoveryTotal || 0);
    dimSoulCount += Number(supplyParts.dimSoulCount || 0);
    dimSoulValue += Number(supplyParts.dimSoulValue || 0);
  
    for (const row of Array.isArray(supplyParts.gearRows) ? supplyParts.gearRows : []) {
      const key = String(row?.key || '').trim();
      if (!key) continue;
      const current = gearMap.get(key) || {
        key,
        label: row.label || key,
        expectedCount: 0,
        valueTotal: 0,
      };
      current.expectedCount += Number(row.expectedCount || 0);
      current.valueTotal += Number(row.valueTotal || 0);
      gearMap.set(key, current);
    }

    for (const row of Array.isArray(supplyParts.dimRows) ? supplyParts.dimRows : []) {
      const key = String(row?.key || '').trim();
      if (!key) continue;
      const current = dimMap.get(key) || {
        key,
        label: row.label || key,
        tunerExpectedCount: 0,
        tunerHellExpectedCount: 0,
        expectedCount: 0,
        valueTotal: 0,
      };
      current.tunerExpectedCount += Number(row.tunerExpectedCount || 0);
      current.tunerHellExpectedCount += Number(row.tunerHellExpectedCount || 0);
      current.expectedCount += Number(row.expectedCount || 0);
      current.valueTotal += Number(row.valueTotal || 0);
      dimMap.set(key, current);
    }
  }
  
  const order = { rare: 0, unique: 1, legendary: 2, epic: 3, taecho: 4 };
  const sortByRarity = (a, b) => {
    const aKey = String(a.key || '').split(':')[1] || '';
    const bKey = String(b.key || '').split(':')[1] || '';
    const orderDiff = (order[aKey] ?? 99) - (order[bKey] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return String(a.label || '').localeCompare(String(b.label || ''), 'ko-KR');
  };
  const gearRows = [...gearMap.values()].sort(sortByRarity);
  const dimRows = [...dimMap.values()].sort(sortByRarity);
  
  return {
    total,
    gearRows,
    dimRows,
    dimSoulCount,
    dimSoulValue,
  };
}
