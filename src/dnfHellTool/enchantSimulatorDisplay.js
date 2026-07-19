import {
  getEfficiencyBand,
  getEfficiencyColor,
  getBufferEfficiencyBand,
  getBufferEfficiencyColor,
} from './enchantEfficiencyScale.js';

const EQUIPMENT_SCORE_ICON_URL = new URL('../../이미지/equipmentScore.png', import.meta.url).href;

function getSimulatedEquipmentScore(baseScore, cumulativeDamageMultiplier) {
  const score = Number(baseScore);
  const multiplier = Number(cumulativeDamageMultiplier);
  if (!Number.isFinite(score) || score <= 0 || !Number.isFinite(multiplier) || multiplier <= 0) return null;
  return Math.round(score * multiplier);
}

export function createEnchantSimulatorDisplay({
  escapeHtml,
  calculateBufferScore,
  getSimulatorCumulativeDamageMultiplier,
  formatCompactGold,
  formatKoreanGoldUnits,
  getDisplayContext,
  bufferScoreIconUrl,
}) {
  function renderDealerSimulatorActions() {
    const {
      simulator,
      simulatorHintElement,
      simulatorActionsElement,
    } = getDisplayContext();
    const hasChanges = Object.keys(simulator?.activeSelectionByGroup || {}).length > 0;
    if (simulatorHintElement) {
      simulatorHintElement.hidden = !simulator || hasChanges;
    }
    if (simulatorActionsElement) {
      simulatorActionsElement.hidden = !hasChanges;
    }
  }

  function renderBufferSimulatorMeta(originalCharacterMeta = '') {
    const {
      simulator,
      currentBufferBaseline,
      currentOfficialBufferScore,
    } = getDisplayContext();
    const internalBaseScore = Number(simulator?.baseBufferScore || calculateBufferScore(currentBufferBaseline));
    const internalCurrentScore = Number(simulator?.currentBufferScore || internalBaseScore);
    const officialBaseScore = Number(currentOfficialBufferScore);
    const usesOfficialBaseScore = Number.isFinite(officialBaseScore) && officialBaseScore > 0;
    const baseScore = usesOfficialBaseScore
      ? officialBaseScore
      : internalBaseScore;
    const scoreDelta = internalCurrentScore - internalBaseScore;
    const currentScore = baseScore + scoreDelta;
    const hasSimulationChanges = simulator?.role === 'buffer'
      && Object.keys(simulator.activeSelectionByGroup || {}).length > 0;
    const baseScoreText = Number.isFinite(baseScore) && baseScore > 0
      ? Math.round(baseScore).toLocaleString('ko-KR')
      : '확인 불가';
    if (!hasSimulationChanges) {
      return `
        <div class="enchant-portrait-buffer-score">
          <strong><img src="${escapeHtml(bufferScoreIconUrl)}" alt="" loading="lazy" decoding="async" />${escapeHtml(baseScoreText)}</strong>
        </div>
        ${originalCharacterMeta}
      `;
    }
    const increasePercent = baseScore > 0 ? (currentScore / baseScore - 1) * 100 : 0;
    const scoreDeltaText = Math.abs(scoreDelta) < 0.5
      ? '변동 없음'
      : `${scoreDelta > 0 ? '▲' : '▼'}${Math.abs(Math.round(scoreDelta)).toLocaleString('ko-KR')}`;
    const increaseText = `${increasePercent > 0 ? '+' : ''}${increasePercent.toFixed(2)}%`;
    const totalGold = Number.isFinite(Number(simulator.totalGold))
      ? Math.round(Number(simulator.totalGold))
      : 0;
    const costPerHundredPoints = scoreDelta > 0
      ? totalGold * 100 / scoreDelta
      : null;
    const efficiencyBand = Number.isFinite(costPerHundredPoints)
      ? getBufferEfficiencyBand(costPerHundredPoints)
      : '';
    const efficiencyColor = efficiencyBand === 'scale'
      ? getBufferEfficiencyColor(costPerHundredPoints)
      : '';
    const efficiencyText = Number.isFinite(costPerHundredPoints)
      ? costPerHundredPoints === 0
        ? '0'
        : formatCompactGold(costPerHundredPoints)
      : '-';
    const totalGoldFullText = `${totalGold.toLocaleString('ko-KR')} 골드`;
    return `
      <div class="enchant-portrait-info-split">
        <div class="enchant-portrait-info-simulation">
          <span class="enchant-portrait-info-label">예상 버프점수</span>
          <div class="enchant-portrait-buffer-score is-simulated">
            <strong tabindex="0" data-tooltip="현재 적용 중인 버퍼 시뮬레이션 결과입니다."><img src="${escapeHtml(bufferScoreIconUrl)}" alt="" loading="lazy" decoding="async" />${escapeHtml(Math.round(currentScore).toLocaleString('ko-KR'))}</strong>
          </div>
          <span class="enchant-portrait-score-delta">${escapeHtml(scoreDeltaText)}</span>
          <span class="enchant-portrait-damage-increase">버프점수 상승률 <strong>${escapeHtml(increaseText)}</strong></span>
          <span class="enchant-simulator-summary" tabindex="0" data-full-gold="${escapeHtml(totalGoldFullText)}" aria-label="누적 골드 ${escapeHtml(totalGoldFullText)}">누적 골드 <strong>${escapeHtml(formatKoreanGoldUnits(totalGold))}</strong></span>
          <span class="enchant-simulator-efficiency${efficiencyBand === 'rainbow' ? ' is-rainbow' : ''}"${efficiencyColor ? ` style="--simulator-efficiency-color: ${escapeHtml(efficiencyColor)}"` : ''}>100점당 <strong>${escapeHtml(efficiencyText)}</strong></span>
        </div>
        <div class="enchant-portrait-info-original">
          <span class="enchant-portrait-info-label">현재 버프점수</span>
          <div class="enchant-portrait-buffer-score">
            <strong><img src="${escapeHtml(bufferScoreIconUrl)}" alt="" loading="lazy" decoding="async" />${escapeHtml(baseScoreText)}</strong>
          </div>
          ${originalCharacterMeta}
        </div>
      </div>
    `;
  }

  function renderDealerSimulatorMeta(originalCharacterMeta = '') {
    const {
      simulator,
      currentOfficialEquipmentScore,
      currentOfficialEquipmentScoreStatus,
    } = getDisplayContext();
    const score = Number(currentOfficialEquipmentScore);
    const scoreReady = Number.isFinite(score) && score > 0;
    const hasSimulationChanges = Object.keys(simulator?.activeSelectionByGroup || {}).length > 0;
    const currentScoreText = currentOfficialEquipmentScoreStatus === 'loading'
      ? '확인 중'
      : scoreReady
        ? score.toLocaleString('ko-KR')
        : '확인 불가';
    if (!hasSimulationChanges) {
      return `
        <div class="enchant-portrait-equipment-score">
          <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(currentScoreText)}</strong>
        </div>
        ${originalCharacterMeta}
      `;
    }
    const cumulativeMultiplier = getSimulatorCumulativeDamageMultiplier(simulator, 'actual');
    const equipmentScoreMultiplier = getSimulatorCumulativeDamageMultiplier(simulator, 'equipmentScore');
    const simulatedScore = getSimulatedEquipmentScore(score, equipmentScoreMultiplier);
    const scoreDelta = Number.isFinite(simulatedScore) && scoreReady
      ? simulatedScore - score
      : null;
    const scoreDeltaText = Number.isFinite(scoreDelta)
      ? scoreDelta === 0
        ? '변동 없음'
        : `${scoreDelta > 0 ? '▲' : '▼'}${Math.abs(scoreDelta).toLocaleString('ko-KR')}`
      : '확인 불가';
    const simulatedScoreText = Number.isFinite(simulatedScore)
      ? simulatedScore.toLocaleString('ko-KR')
      : currentScoreText;
    const rawDamageIncreasePercent = Number.isFinite(cumulativeMultiplier)
      ? (cumulativeMultiplier - 1) * 100
      : 0;
    const damageIncreasePercent = Math.abs(rawDamageIncreasePercent) < 0.005
      ? 0
      : rawDamageIncreasePercent;
    const damageIncreaseText = `${damageIncreasePercent > 0 ? '+' : ''}${damageIncreasePercent.toFixed(2)}%`;
    const totalGold = Number.isFinite(Number(simulator?.totalGold))
      ? Math.round(Number(simulator.totalGold))
      : 0;
    const costPerPointOnePercent = damageIncreasePercent > 0
      ? totalGold * 0.1 / damageIncreasePercent
      : null;
    const efficiencyBand = Number.isFinite(costPerPointOnePercent)
      ? getEfficiencyBand(costPerPointOnePercent)
      : '';
    const efficiencyColor = efficiencyBand === 'scale'
      ? getEfficiencyColor(costPerPointOnePercent)
      : '';
    const efficiencyText = Number.isFinite(costPerPointOnePercent)
      ? costPerPointOnePercent === 0
        ? '0'
        : formatCompactGold(costPerPointOnePercent)
      : '-';
    const totalGoldFullText = `${totalGold.toLocaleString('ko-KR')} 골드`;
    return `
      <div class="enchant-portrait-info-split">
        <div class="enchant-portrait-info-simulation">
          <span class="enchant-portrait-info-label">예상 장비점수</span>
          <div class="enchant-portrait-equipment-score is-simulated">
            <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(simulatedScoreText)}</strong>
          </div>
          <span class="enchant-portrait-score-delta">${escapeHtml(scoreDeltaText)}</span>
          <span class="enchant-portrait-damage-increase">딜 상승률 <strong>${escapeHtml(damageIncreaseText)}</strong></span>
          <span class="enchant-simulator-summary" tabindex="0" data-full-gold="${escapeHtml(totalGoldFullText)}" aria-label="누적 골드 ${escapeHtml(totalGoldFullText)}">누적 골드 <strong>${escapeHtml(formatKoreanGoldUnits(totalGold))}</strong></span>
          <span class="enchant-simulator-efficiency${efficiencyBand === 'rainbow' ? ' is-rainbow' : ''}"${efficiencyColor ? ` style="--simulator-efficiency-color: ${escapeHtml(efficiencyColor)}"` : ''}>0.1%당 <strong>${escapeHtml(efficiencyText)}</strong></span>
        </div>
        <div class="enchant-portrait-info-original">
          <span class="enchant-portrait-info-label">현재 장비점수</span>
          <div class="enchant-portrait-equipment-score">
            <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(currentScoreText)}</strong>
          </div>
          ${originalCharacterMeta}
        </div>
      </div>
    `;
  }

  return {
    renderDealerSimulatorActions,
    renderBufferSimulatorMeta,
    renderDealerSimulatorMeta,
  };
}
