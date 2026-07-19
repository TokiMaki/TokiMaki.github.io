export function createEnchantTitleRecommendationSource(deps) {
  const {
    cloneSimulatorValue,
    addEffects,
    subtractEffects,
    getEffectSignature,
  } = deps;

  function buildSimulatedTitleTarget(row = {}) {
    return {
      ...cloneSimulatorValue(row),
      itemName: row.titleItemName || row.candidateName || row.itemName || '',
      iconUrl: row.titleIconUrl || row.iconUrl || '',
      effects: cloneSimulatorValue(row.titlePackageEffects || row.effects || {}),
      enchantEffects: cloneSimulatorValue(
        row.targetTitleEnchantEffects || row.enchantEffects || {},
      ),
    };
  }

  function getTitleRows(groups, currentTitle) {
    const titleRows = (groups || []).flatMap((group) => (group.candidates || [])
      .map((candidate) => ({
        sourceType: 'title',
        slot: '칭호',
        tier: candidate.variant || '일반',
        itemId: candidate.itemId,
        itemName: candidate.itemName || candidate.name,
        titleItemName: candidate.itemName || candidate.name,
        itemRarity: candidate.itemRarity || '레어',
        fame: candidate.fame,
        iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
        titleIconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
        effects: candidate.effects || {},
        titlePackageEffects: candidate.effects || {},
        itemReinforceSkill: candidate.itemReinforceSkill || [],
        itemBuff: candidate.itemBuff || {},
        itemExplain: candidate.itemExplain || '',
        auction: candidate.auction || {},
        candidateName: candidate.name,
        groupName: group.groupName,
        levelTag: candidate.levelTag,
        skillDamagePercent: candidate.skillDamagePercent,
        priceItem: candidate.priceItem || null,
        titleEnchantElement: candidate.titleEnchantElement || '',
        enchantEffects: candidate.enchantEffects || {},
        purchaseRoute: candidate.purchaseRoute || '',
        purchaseRouteLabel: candidate.purchaseRouteLabel || '',
        titleBead: candidate.titleBead || null,
      })));
    return [
      ...titleRows,
      ...getCurrentTitleBeadRows(titleRows, currentTitle),
    ];
  }

  function getTitleBaseEffectSignature(title) {
    return getEffectSignature(subtractEffects(title?.effects || {}, title?.enchantEffects || {}));
  }

  function getCurrentTitleBeadRows(titleRows = [], currentTitle = null) {
    if (!currentTitle?.itemId) return [];
    const beadByElement = new Map();
    titleRows.forEach((row) => {
      const bead = row?.titleBead;
      const element = bead?.element || row?.titleEnchantElement || '';
      const auction = bead?.auction || {};
      if (!element || !bead?.itemId || !Number.isFinite(auction.minUnitPrice) || auction.minUnitPrice <= 0) return;
      const previous = beadByElement.get(element);
      if (!previous || auction.minUnitPrice < ((previous.auction || {}).minUnitPrice || Number.POSITIVE_INFINITY)) {
        beadByElement.set(element, bead);
      }
    });
    const currentBaseEffects = subtractEffects(currentTitle.effects || {}, currentTitle.enchantEffects || {});
    return [...beadByElement.values()].map((bead) => ({
      sourceType: 'title',
      slot: '칭호',
      tier: currentTitle.variant || currentTitle.tier || '일반',
      itemId: currentTitle.itemId,
      itemName: bead.itemName,
      titleItemName: currentTitle.itemName,
      itemRarity: currentTitle.itemRarity || '레어',
      fame: currentTitle.fame,
      iconUrl: bead.iconUrl || currentTitle.iconUrl || '',
      titleIconUrl: currentTitle.iconUrl || '',
      effects: addEffects(currentBaseEffects, bead.effects || {}),
      titlePackageEffects: addEffects(currentBaseEffects, bead.effects || {}),
      itemReinforceSkill: currentTitle.itemReinforceSkill || [],
      itemBuff: currentTitle.itemBuff || {},
      itemExplain: currentTitle.itemExplain || '',
      auction: bead.auction || {},
      candidateName: currentTitle.itemName,
      groupName: '칭호 보주',
      levelTag: currentTitle.levelTag,
      skillDamagePercent: currentTitle.skillDamagePercent,
      priceItem: {
        itemId: bead.itemId,
        itemName: bead.itemName,
        iconUrl: bead.iconUrl,
      },
      titleEnchantElement: bead.element || '',
      enchantEffects: bead.effects || {},
      currentTitleEnchantElement: currentTitle.titleEnchantElement || '',
      currentTitleEnchantEffects: currentTitle.enchantEffects || {},
      targetTitleEnchantEffects: bead.effects || {},
      purchaseRoute: 'titleBeadOnly',
      purchaseRouteLabel: '칭호 보주 교체',
      titleBead: bead,
    }));
  }

  function isSameTitleBase(row, currentTitle) {
    if (row?.sourceType !== 'title' || !currentTitle) return false;
    if ((row.tier || '일반') !== (currentTitle.variant || currentTitle.tier || '일반')) return false;
    if (Number(row.levelTag || 0) !== Number(currentTitle.levelTag || 0)) return false;
    if (Number(row.skillDamagePercent || 0) !== Number(currentTitle.skillDamagePercent || 0)) return false;
    return getTitleBaseEffectSignature(row) === getTitleBaseEffectSignature(currentTitle);
  }

  function getTitleBeadOnlyRow(row, currentTitle) {
    if (
      !isSameTitleBase(row, currentTitle) ||
      !row.titleBead?.auction
    ) {
      return row;
    }
    return {
      ...row,
      itemId: currentTitle.itemId,
      titleItemName: currentTitle.itemName,
      titleIconUrl: currentTitle.iconUrl || '',
      titlePackageEffects: addEffects(
        subtractEffects(currentTitle.effects || {}, currentTitle.enchantEffects || {}),
        row.titleBead.effects || row.enchantEffects || {},
      ),
      auction: row.titleBead.auction,
      priceItem: {
        itemId: row.titleBead.itemId,
        itemName: row.titleBead.itemName,
        iconUrl: row.titleBead.iconUrl,
      },
      currentTitleEnchantElement: currentTitle.titleEnchantElement || '',
      currentTitleEnchantEffects: currentTitle.enchantEffects || {},
      targetTitleEnchantEffects: row.titleBead.effects || row.enchantEffects || {},
      purchaseRoute: 'titleBeadOnly',
      purchaseRouteLabel: '칭호 보주 교체',
    };
  }

  return {
    buildSimulatedTitleTarget,
    getTitleRows,
    isSameTitleBase,
    getTitleBeadOnlyRow,
  };
}
