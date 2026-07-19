export function createEnchantDealerSimulatorRecommendationEligibility({
  getEnchantCandidateSignature,
  getAuraCandidateSignature,
  getCreatureCandidateSignature,
  getTitleCandidateSignature,
}) {
  function applyDealerSimulatorRecommendationEligibility(recommendations, dealerSimulator) {
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
  }

  return { applyDealerSimulatorRecommendationEligibility };
}
