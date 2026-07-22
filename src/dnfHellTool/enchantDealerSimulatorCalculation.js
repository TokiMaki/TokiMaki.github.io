import {
  getPlagueHeartDealerMultiplier,
  getPlagueHeartEquipmentScoreMultiplier,
} from './enchantPlagueHeartSynergy.js';

export function createEnchantDealerSimulatorCalculation(deps) {
  const {
    addEffects,
    getFinalDamageReplacementMultiplier,
    getAvatarEmblemMetricBaseline,
    getDamageBaseline,
    getCreatureArtifactEffectsTotal,
    subtractEffects,
    getAvatarRegularEmblemEffectsTotal,
    getEquipmentProgressionEffectsTotal,
    getOathCrystalEffectsTotal,
    normalizeSimulatorDamageDelta,
    getSelectedStatEffect,
    elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
    getAdjustedElementBaselineForRecommendation,
    estimateDamageMultiplier,
    getSkillDamageMultiplier,
    getCreatureArtifactReplacementMultiplier,
    getEquipmentProgressionFinalDamageChangeMultiplier,
    getEquipmentTuneDamageMultiplier,
    getOathCrystalFinalDamageChangeMultiplier,
    getOathTuneDamageMultiplier,
    getElementAdjustedReplacementIncrementalDamagePercent,
    getReplacementIncrementalDamagePercent,
    getDealerAvatarPlatinumEquipmentScoreMultiplier,
    getAvatarPlatinumDamageMultiplier,
    getBuffEnhancementMetricMultiplier,
  } = deps;

  function getEnchantEffectsTotal(enchants = []) {
    return (enchants || []).reduce((total, enchant) => addEffects(total, enchant?.effects || {}), {});
  }

  function getEnchantFinalDamageChangeMultiplier(baseEnchants = [], simulatedEnchants = []) {
    const baseBySlot = new Map((baseEnchants || [])
      .filter((enchant) => enchant?.slot)
      .map((enchant) => [enchant.slot, enchant.effects || {}]));
    const simulatedBySlot = new Map((simulatedEnchants || [])
      .filter((enchant) => enchant?.slot)
      .map((enchant) => [enchant.slot, enchant.effects || {}]));
    const slots = new Set([...baseBySlot.keys(), ...simulatedBySlot.keys()]);
    return [...slots].reduce((multiplier, slot) => (
      multiplier * getFinalDamageReplacementMultiplier(
        baseBySlot.get(slot) || {},
        simulatedBySlot.get(slot) || {},
      )
    ), 1);
  }

  function getTitleEffectsWithoutEnchantElement(title = {}) {
    const effects = { ...(title?.effects || {}) };
    const enchantElement = Number(title?.enchantEffects?.elementAll || 0);
    if (enchantElement) {
      effects.elementAll = Number(effects.elementAll || 0) - enchantElement;
      if (Math.abs(effects.elementAll) <= 0.000001) delete effects.elementAll;
    }
    return effects;
  }

  function getEquipmentBodyEffectsTotal(equipmentRows = []) {
    return (equipmentRows || []).reduce(
      (total, equipment) => addEffects(total, equipment?.bodyEffects || {}),
      {},
    );
  }

  function getEquipmentBodyFinalDamageChangeMultiplier(baseEquipment = [], simulatedEquipment = baseEquipment) {
    const getSlotKey = (equipment = {}) => String(
      equipment?.slotId || equipment?.slot || equipment?.slotName || '',
    ).trim();
    const baseBySlot = new Map((baseEquipment || [])
      .map((equipment) => [getSlotKey(equipment), equipment])
      .filter(([slot]) => slot));
    const simulatedBySlot = new Map((simulatedEquipment || [])
      .map((equipment) => [getSlotKey(equipment), equipment])
      .filter(([slot]) => slot));
    const slots = new Set([...baseBySlot.keys(), ...simulatedBySlot.keys()]);
    return [...slots].reduce((multiplier, slot) => (
      multiplier * getFinalDamageReplacementMultiplier(
        baseBySlot.get(slot)?.bodyEffects || {},
        simulatedBySlot.get(slot)?.bodyEffects || baseBySlot.get(slot)?.bodyEffects || {},
      )
    ), 1);
  }

  function buildSimulatedDamageBaseline(
    baseBaseline = {},
    baseEnchants = [],
    simulatedEnchants = [],
    baseAura = {},
    simulatedAura = baseAura,
    baseCreature = {},
    simulatedCreature = baseCreature,
    baseTitle = {},
    simulatedTitle = baseTitle,
    baseEquipment = [],
    simulatedEquipment = baseEquipment,
    baseOath = {},
    simulatedOath = baseOath,
    baseAvatar = {},
    simulatedAvatar = baseAvatar,
    avatarEmblemMode = 'actual',
    baseCreatureArtifacts = [],
    simulatedCreatureArtifacts = baseCreatureArtifacts,
    upgradeDb = {},
  ) {
    const metricBaseBaseline = getAvatarEmblemMetricBaseline(
      baseBaseline,
      baseAvatar,
      avatarEmblemMode,
    );
    const base = getDamageBaseline(metricBaseBaseline);
    const baseArtifactEffects = getCreatureArtifactEffectsTotal(
      baseCreatureArtifacts,
      metricBaseBaseline,
      baseTitle,
    );
    const simulatedArtifactEffects = getCreatureArtifactEffectsTotal(
      simulatedCreatureArtifacts,
      metricBaseBaseline,
      simulatedTitle,
    );
    const effectDelta = subtractEffects(
      addEffects(
        addEffects(
          addEffects(
            addEffects(getEnchantEffectsTotal(simulatedEnchants), simulatedAura?.effects || {}),
            addEffects(simulatedCreature?.effects || {}, simulatedArtifactEffects),
          ),
          getAvatarRegularEmblemEffectsTotal(simulatedAvatar, avatarEmblemMode, base),
        ),
        addEffects(
          getTitleEffectsWithoutEnchantElement(simulatedTitle),
          addEffects(
            addEffects(
              getEquipmentBodyEffectsTotal(simulatedEquipment),
              getEquipmentProgressionEffectsTotal(simulatedEquipment, upgradeDb, metricBaseBaseline),
            ),
            getOathCrystalEffectsTotal(simulatedOath),
          ),
        ),
      ),
      addEffects(
        addEffects(
          addEffects(
            addEffects(getEnchantEffectsTotal(baseEnchants), baseAura?.effects || {}),
            addEffects(baseCreature?.effects || {}, baseArtifactEffects),
          ),
          getAvatarRegularEmblemEffectsTotal(baseAvatar, avatarEmblemMode, base),
        ),
        addEffects(
          getTitleEffectsWithoutEnchantElement(baseTitle),
          addEffects(
            addEffects(
              getEquipmentBodyEffectsTotal(baseEquipment),
              getEquipmentProgressionEffectsTotal(baseEquipment, upgradeDb, metricBaseBaseline),
            ),
            getOathCrystalEffectsTotal(baseOath),
          ),
        ),
      ),
    );
    delete effectDelta.finalDamage;
    const delta = normalizeSimulatorDamageDelta(
      effectDelta,
      base,
    );
    const selectedStatDelta = getSelectedStatEffect(delta, base);
    const elementDelta = Number(delta.elementAll || 0);
    const simulatedBaseline = {
      ...(metricBaseBaseline || {}),
      stat: base.stat + selectedStatDelta,
      element: base.element + elementDelta,
      elementDamage: base.elementDamage + elementDelta * ELEMENT_DAMAGE_PER_ELEMENT,
      elementValues: Object.fromEntries(Object.entries(base.elementValues || {}).map(([key, value]) => [
        key,
        Number(value || 0) + elementDelta,
      ])),
      attack: base.attack + Number(delta.attack || 0),
      finalDamage: base.finalDamage,
      attackIncrease: base.attackIncrease + Number(delta.attackIncrease || 0),
      attackAmplification: base.attackAmplification + Number(delta.attackAmplification || 0),
    };
    return getAdjustedElementBaselineForRecommendation(
      { sourceType: 'title', ...simulatedTitle },
      baseTitle,
      simulatedBaseline,
    ) || simulatedBaseline;
  }

  function getSimulatorCumulativeDamageMultiplier(simulator = {}, avatarEmblemMode = 'actual') {
    if (!simulator?.baseDamageBaseline) return 1;
    const metricBaseBaseline = getAvatarEmblemMetricBaseline(
      simulator.baseDamageBaseline,
      simulator.baseAvatar,
      avatarEmblemMode,
    );
    const baseArtifactEffects = getCreatureArtifactEffectsTotal(
      simulator.baseCreatureArtifacts,
      metricBaseBaseline,
      simulator.baseTitle,
    );
    const simulatedArtifactEffects = getCreatureArtifactEffectsTotal(
      simulator.simulatedCreatureArtifacts,
      metricBaseBaseline,
      simulator.simulatedTitle,
    );
    const effectDelta = subtractEffects(
      addEffects(
        addEffects(
          addEffects(
            addEffects(getEnchantEffectsTotal(simulator.simulatedEnchants), simulator.simulatedAura?.effects || {}),
            addEffects(simulator.simulatedCreature?.effects || {}, simulatedArtifactEffects),
          ),
          getAvatarRegularEmblemEffectsTotal(simulator.simulatedAvatar, avatarEmblemMode, metricBaseBaseline),
        ),
        addEffects(
          addEffects(
            getEquipmentBodyEffectsTotal(simulator.simulatedEquipmentUpgrades),
            getEquipmentProgressionEffectsTotal(
              simulator.simulatedEquipmentUpgrades,
              simulator.upgradeDb,
              metricBaseBaseline,
            ),
          ),
          getOathCrystalEffectsTotal(simulator.simulatedOathUpgrades),
        ),
      ),
      addEffects(
        addEffects(
          addEffects(
            addEffects(getEnchantEffectsTotal(simulator.baseEnchants), simulator.baseAura?.effects || {}),
            addEffects(simulator.baseCreature?.effects || {}, baseArtifactEffects),
          ),
          getAvatarRegularEmblemEffectsTotal(simulator.baseAvatar, avatarEmblemMode, metricBaseBaseline),
        ),
        addEffects(
          addEffects(
            getEquipmentBodyEffectsTotal(simulator.baseEquipmentUpgrades),
            getEquipmentProgressionEffectsTotal(
              simulator.baseEquipmentUpgrades,
              simulator.upgradeDb,
              metricBaseBaseline,
            ),
          ),
          getOathCrystalEffectsTotal(simulator.baseOathUpgrades),
        ),
      ),
    );
    delete effectDelta.finalDamage;
    const delta = normalizeSimulatorDamageDelta(
      effectDelta,
      metricBaseBaseline,
    );
    const nonTitleMultiplier = estimateDamageMultiplier(delta, metricBaseBaseline)
      * getEnchantFinalDamageChangeMultiplier(
        simulator.baseEnchants,
        simulator.simulatedEnchants,
      )
      * getFinalDamageReplacementMultiplier(
        simulator.baseAura?.effects || {},
        simulator.simulatedAura?.effects || {},
      )
      * (getSkillDamageMultiplier(simulator.simulatedAura) / getSkillDamageMultiplier(simulator.baseAura))
      * getFinalDamageReplacementMultiplier(
        simulator.baseCreature?.effects || {},
        simulator.simulatedCreature?.effects || {},
      )
      * (getSkillDamageMultiplier(simulator.simulatedCreature) / getSkillDamageMultiplier(simulator.baseCreature))
      * getCreatureArtifactReplacementMultiplier(
        simulator.baseCreatureArtifacts,
        simulator.simulatedCreatureArtifacts,
      )
      * getEquipmentBodyFinalDamageChangeMultiplier(
        simulator.baseEquipmentUpgrades,
        simulator.simulatedEquipmentUpgrades,
      )
      * getEquipmentProgressionFinalDamageChangeMultiplier(
        simulator.baseEquipmentUpgrades,
        simulator.simulatedEquipmentUpgrades,
        simulator.upgradeDb,
        metricBaseBaseline,
      )
      * getEquipmentTuneDamageMultiplier(
        simulator.baseEquipmentUpgrades,
        simulator.simulatedEquipmentUpgrades,
      )
      * getOathCrystalFinalDamageChangeMultiplier(
        simulator.baseOathUpgrades,
        simulator.simulatedOathUpgrades,
      )
      * ((avatarEmblemMode === 'equipmentScore'
        ? getPlagueHeartEquipmentScoreMultiplier(simulator.simulatedEquipmentUpgrades)
        : getPlagueHeartDealerMultiplier(simulator.simulatedEquipmentUpgrades))
        / (avatarEmblemMode === 'equipmentScore'
          ? getPlagueHeartEquipmentScoreMultiplier(simulator.baseEquipmentUpgrades)
          : getPlagueHeartDealerMultiplier(simulator.baseEquipmentUpgrades)))
      * getOathTuneDamageMultiplier(
        simulator.oathTuneDb,
        simulator.baseOathUpgrades,
        simulator.simulatedOathUpgrades,
      );
    const titleReferenceBaseline = buildSimulatedDamageBaseline(
      simulator.baseDamageBaseline,
      simulator.baseEnchants,
      simulator.simulatedEnchants,
      simulator.baseAura,
      simulator.simulatedAura,
      simulator.baseCreature,
      simulator.simulatedCreature,
      simulator.baseTitle,
      simulator.baseTitle,
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
      simulator.baseAvatar,
      simulator.simulatedAvatar,
      avatarEmblemMode,
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
      simulator.upgradeDb,
    );
    const simulatedTitleRow = { sourceType: 'title', ...(simulator.simulatedTitle || {}) };
    const adjustedTitleBaseline = getAdjustedElementBaselineForRecommendation(
      simulatedTitleRow,
      simulator.baseTitle,
      titleReferenceBaseline,
    );
    const titleDamagePercent = adjustedTitleBaseline
      ? getElementAdjustedReplacementIncrementalDamagePercent(
        simulatedTitleRow,
        simulator.baseTitle,
        titleReferenceBaseline,
        adjustedTitleBaseline,
      )
      : getReplacementIncrementalDamagePercent(
        simulatedTitleRow,
        simulator.baseTitle,
        titleReferenceBaseline,
      );
    return nonTitleMultiplier
      * (1 + titleDamagePercent / 100)
      * (avatarEmblemMode === 'equipmentScore'
        ? getDealerAvatarPlatinumEquipmentScoreMultiplier(simulator)
        : getAvatarPlatinumDamageMultiplier(simulator.avatarPlatinumChangesBySlot))
      * getBuffEnhancementMetricMultiplier(simulator, avatarEmblemMode);
  }

  return {
    buildSimulatedDamageBaseline,
    getSimulatorCumulativeDamageMultiplier,
  };
}
