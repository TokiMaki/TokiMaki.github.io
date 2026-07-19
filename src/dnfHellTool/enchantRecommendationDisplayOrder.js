export function createEnchantRecommendationDisplayOrder({
  tuneSourceTypes,
  oathDecisionVariantSourceTypes,
  getDealerSimulatorRecommendationId,
  compareBufferRecommendationOrder,
  compareDealerRecommendationOrder,
  getDisplayOrderState,
  setLastRecommendationDisplayOrder,
  setFrozenRecommendationDisplayKey,
  setFrozenRecommendationDisplayIndex,
}) {
  function getRecommendationDisplayOrderKey(row = {}) {
    if (row.sourceType === 'oathAcquisitionCombined') {
      return `oathCombined:${row.oathAcquisitionPairKey}`;
    }
    if (tuneSourceTypes.has(row.sourceType)) return `tune:${row.sourceType}`;
    if (oathDecisionVariantSourceTypes.has(row.sourceType) && row.variantGroupKey) {
      return `oathDecision:${row.variantGroupKey}`;
    }
    return getDealerSimulatorRecommendationId(row);
  }

  function orderEnchantRecommendationDisplay(recommendations) {
    const {
      isBuffer,
      equipmentTunePopoverOpen,
      frozenRecommendationDisplayKey,
      frozenRecommendationDisplayIndex,
    } = getDisplayOrderState();
    let displayRecommendations = isBuffer
      ? recommendations.sort(compareBufferRecommendationOrder)
      : recommendations.sort(compareDealerRecommendationOrder);
    if (equipmentTunePopoverOpen && frozenRecommendationDisplayKey) {
      const frozenRowIndex = displayRecommendations.findIndex(
        (row) => getRecommendationDisplayOrderKey(row) === frozenRecommendationDisplayKey,
      );
      if (frozenRowIndex >= 0) {
        const [frozenRow] = displayRecommendations.splice(frozenRowIndex, 1);
        const targetIndex = Math.max(
          0,
          Math.min(
            displayRecommendations.length,
            Number(frozenRecommendationDisplayIndex || 0),
          ),
        );
        displayRecommendations.splice(targetIndex, 0, frozenRow);
      }
    }
    setLastRecommendationDisplayOrder(displayRecommendations.map(
      getRecommendationDisplayOrderKey,
    ));
    return displayRecommendations;
  }

  function freezeRecommendationOrderWhileEditing(sourceType = '') {
    const {
      lastRecommendationDisplayOrder,
      frozenRecommendationDisplayKey,
    } = getDisplayOrderState();
    if (frozenRecommendationDisplayKey) return;
    const candidateKeys = [
      `tune:${sourceType}`,
      `oathCombined:${sourceType}`,
      `oathDecision:${sourceType}`,
    ];
    const displayOrder = lastRecommendationDisplayOrder || [];
    const key = candidateKeys.find((candidate) => displayOrder.includes(candidate)) || '';
    if (!key) return;
    setFrozenRecommendationDisplayKey(key);
    setFrozenRecommendationDisplayIndex(displayOrder.indexOf(key));
  }

  function releaseRecommendationOrderAfterEditing() {
    setFrozenRecommendationDisplayKey('');
    setFrozenRecommendationDisplayIndex(-1);
  }

  return {
    orderEnchantRecommendationDisplay,
    freezeRecommendationOrderWhileEditing,
    releaseRecommendationOrderAfterEditing,
  };
}
