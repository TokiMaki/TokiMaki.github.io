export function createEnchantDealerDamageMetric(deps) {
  const {
    elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
  } = deps;

  const ENCHANT_DAMAGE_BASELINE = {
    stat: 6500,
    baseStat: 800,
    element: 330,
    attack: 4000,
    attackIncrease: 0,
    attackAmplification: 0,
  };
  const REGION_STAT_FLAT_A = 168350;
  const REGION_STAT_FLAT_B = 297900;
  const REGION_STAT_SCALE = 3.08;
  const REGION_STAT_OFFSET = 2886;
  const REGION_ATTACK_FLAT = 31215;
  const ELEMENT_DAMAGE_PER_ELEMENT = 0.45;
  const ELEMENT_BASE_DAMAGE_PERCENT = 5;

  function getDealerPrimaryStatKey(baseline = {}) {
    if (baseline?.statName === '힘') return 'str';
    if (baseline?.statName === '지능') return 'int';
    return '';
  }

  function getDamageBaseline(baseline = {}) {
    baseline = baseline || {};
    const stat = Number(baseline.stat || 0) || ENCHANT_DAMAGE_BASELINE.stat;
    const baseStat = Number(baseline.baseStat || 0) || ENCHANT_DAMAGE_BASELINE.baseStat;
    const elementNames = Array.isArray(baseline.elementNames)
      ? baseline.elementNames.filter(Boolean)
      : (baseline.elementName ? [baseline.elementName] : []);
    const elementValues = Object.fromEntries(Object.keys(ELEMENT_EFFECT_KEY_BY_NAME)
      .map((element) => [element, Number(baseline.elementValues?.[element] || 0)]));
    return {
      stat,
      statName: baseline.statName === '지능' ? '지능' : '힘',
      baseStat,
      element: Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element,
      elementName: elementNames[0] || '',
      elementNames,
      elementValues,
      elementDamage: Number.isFinite(Number(baseline.elementDamage))
        ? Number(baseline.elementDamage)
        : ELEMENT_BASE_DAMAGE_PERCENT + (Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element) * ELEMENT_DAMAGE_PER_ELEMENT,
      attack: Number(baseline.attack || 0) || ENCHANT_DAMAGE_BASELINE.attack,
      attackSource: String(baseline.attackSource || '').trim(),
      finalDamage: Number(baseline.finalDamage || 0),
      attackIncrease: Number(baseline.attackIncrease || 0) || ENCHANT_DAMAGE_BASELINE.attackIncrease,
      attackAmplification: Number(baseline.attackAmplification || 0) || ENCHANT_DAMAGE_BASELINE.attackAmplification,
    };
  }

  function getEquipmentScoreEffectiveStat(stat, baseStat) {
    return stat +
      REGION_STAT_FLAT_A +
      REGION_STAT_FLAT_B +
      Math.trunc(REGION_STAT_SCALE * (stat - baseStat) + REGION_STAT_OFFSET);
  }

  function getSelectedStatEffect(effects = {}, baseline = {}) {
    effects = effects || {};
    baseline = baseline || {};
    if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
    return baseline.statName === '지능'
      ? Number(effects.int || 0)
      : Number(effects.str || 0);
  }

  function estimateDamagePercent(effects = {}, baseline = {}) {
    effects = effects || {};
    return (estimateDamageMultiplier(effects, baseline) / estimateDamageMultiplier({}, baseline) - 1) * 100;
  }

  function estimateDamageMultiplier(effects = {}, baseline = {}) {
    effects = effects || {};
    const base = getDamageBaseline(baseline);
    const currentFinalDamageMultiplier = 1 + base.finalDamage / 100;
    const candidateFinalDamageMultiplier = 1 + (base.finalDamage + Number(effects.finalDamage || 0)) / 100;
    const finalDamageMultiplier = candidateFinalDamageMultiplier / currentFinalDamageMultiplier;
    const currentAttackIncreaseMultiplier = 1 + base.attackIncrease / 100;
    const candidateAttackIncreaseMultiplier = 1 + (base.attackIncrease + Number(effects.attackIncrease || 0)) / 100;
    const attackIncreaseMultiplier = candidateAttackIncreaseMultiplier / currentAttackIncreaseMultiplier;
    const currentAttackAmplificationMultiplier = 1 + base.attackAmplification / 100;
    const candidateAttackAmplificationMultiplier = 1 + (base.attackAmplification + Number(effects.attackAmplification || 0)) / 100;
    const attackAmplificationMultiplier = candidateAttackAmplificationMultiplier / currentAttackAmplificationMultiplier;
    const currentElementDamage = base.elementDamage;
    const candidateElementDamage = currentElementDamage + Number(effects.elementAll || 0) * ELEMENT_DAMAGE_PER_ELEMENT;
    const currentElementMultiplier = 1 + currentElementDamage / 100;
    const candidateElementMultiplier = 1 + candidateElementDamage / 100;
    const elementMultiplier = candidateElementMultiplier / currentElementMultiplier;
    const effectiveAttack = base.attack + REGION_ATTACK_FLAT;
    const attackMultiplier = (effectiveAttack + Number(effects.attack || 0)) / effectiveAttack;
    const statValue = getSelectedStatEffect(effects, base);
    const currentEffectiveStat = getEquipmentScoreEffectiveStat(base.stat, base.baseStat);
    const candidateEffectiveStat = getEquipmentScoreEffectiveStat(base.stat + statValue, base.baseStat);
    const statMultiplier = (1 + candidateEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
    const explicitSkillDamageMultiplier = Number(effects.skillDamageMultiplier || 0);
    const skillDamageMultiplier = Number.isFinite(explicitSkillDamageMultiplier) && explicitSkillDamageMultiplier > 0
      ? explicitSkillDamageMultiplier
      : 1;
    return finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier * skillDamageMultiplier;
  }

  return {
    getDealerPrimaryStatKey,
    getDamageBaseline,
    getEquipmentScoreEffectiveStat,
    getSelectedStatEffect,
    estimateDamagePercent,
    estimateDamageMultiplier,
    regionAttackFlat: REGION_ATTACK_FLAT,
    elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
  };
}
