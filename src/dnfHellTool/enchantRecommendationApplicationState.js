export function createEnchantRecommendationApplicationState({
  getSimulatorExclusiveGroupKey,
  getSimulatorCandidateSignature,
  getOathAcquisitionSelectionDescriptors,
  getActiveOathAcquisitionMethodCounts,
  getEquipmentProgressionType,
  isAppliedOathAcquisitionRecommendation,
}) {
  function decorateEnchantRecommendationApplicationState(recommendations, simulator) {
    return recommendations.map((row) => {
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
  }

  return { decorateEnchantRecommendationApplicationState };
}
