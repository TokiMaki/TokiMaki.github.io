const ENCHANT_PORTRAIT_SLOT_LAYOUT = [
  { slot: '머리어깨', key: 'shoulder', side: 'left' },
  { slot: '상의', key: 'top', side: 'left' },
  { slot: '하의', key: 'pants', side: 'left' },
  { slot: '벨트', key: 'belt', side: 'left' },
  { slot: '신발', key: 'shoes', side: 'left' },
  { slot: '오라', key: 'aura', side: 'left' },
  { slot: '크리쳐', key: 'creature', side: 'left' },
  { slot: '무기', key: 'weapon', side: 'right' },
  { slot: '칭호', key: 'title', side: 'right' },
  { slot: '팔찌', key: 'bracelet', side: 'right' },
  { slot: '목걸이', key: 'necklace', side: 'right' },
  { slot: '보조장비', key: 'support', side: 'right' },
  { slot: '반지', key: 'ring', side: 'right' },
  { slot: '귀걸이', key: 'earring', side: 'right' },
  { slot: '마법석', key: 'magic-stone', side: 'right' },
];

export function createEnchantEquipmentLoadoutBoard(deps) {
  const {
    escapeHtml,
    formatEffectNumber,
    formatEffectValue,
    formatEffects,
    getBufferSelectedStatEffect,
    getReinforceSkillLevel,
    getCreatureArtifactDisplayEffects,
    getLoadoutRarityClass,
    slotOrder,
    sweepDurationMs,
    now,
    getSweepEntry,
    getEquipmentLoadoutBoardContext,
  } = deps;

  function formatItemBuffLevelRanges(itemBuff = {}) {
    return (itemBuff?.reinforceSkill || []).flatMap((job) => (job?.levelRange || [])
      .filter((range) => Number(range?.value || 0) > 0)
      .map((range) => {
        const minimum = Number(range.minLevel || 0);
        const maximum = Number(range.maxLevel || 0);
        const levelText = minimum === maximum ? `${minimum}Lv` : `${minimum}~${maximum}Lv`;
        return `${levelText} 모든 스킬 Lv +${formatEffectNumber(Number(range.value))}`;
      }))
      .join(' / ');
  }

  function formatTitleMajorEffects(effects = {}, isBuffer = false, hasSingleElement = false) {
    const keys = isBuffer
      ? ['buffAmplification', 'allStat']
      : ['attackAmplification', 'elementAll', 'allStat'];
    return keys
      .filter((key) => Number.isFinite(effects?.[key]))
      .map((key) => (
        key === 'elementAll' && hasSingleElement
          ? `속강 +${formatEffectNumber(effects[key])}`
          : formatEffectValue(key, effects[key])
      ))
      .join(' / ');
  }

  function extractActiveSkillOptionText(text = '') {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const match = normalized.match(/(\d+)(?:\s*~\s*\d+)?\s*(?:Lv|레벨)[^%]*?액티브\s*스킬[^%]*?(\d+(?:\.\d+)?)%\s*증가/i);
    if (!match) return '';
    return `${match[1]}레벨 액티브 스킬 공격력 ${formatEffectNumber(Number(match[2]))}% 증가`;
  }

  function formatTitleDetailMainOption(title = {}) {
    const explainText = extractActiveSkillOptionText(title.itemExplain || '');
    if (explainText) return explainText;
    const levelTag = Number(title.levelTag || 0);
    const skillDamagePercent = Number(title.skillDamagePercent || 0);
    if (levelTag > 0 && skillDamagePercent > 0) {
      return `${levelTag}레벨 액티브 스킬 공격력 ${formatEffectNumber(skillDamagePercent)}% 증가`;
    }
    return '';
  }

  function formatCreatureDetailMainOption(creature = {}) {
    const explainText = extractActiveSkillOptionText(creature.itemExplain || '');
    if (explainText) return explainText;
    const levelTag = Number(creature.levelTag || 0);
    const skillDamagePercent = Number(creature.skillDamagePercent || 0);
    if (levelTag > 0 && skillDamagePercent > 0) {
      return `${levelTag}레벨 액티브 스킬 공격력 ${formatEffectNumber(skillDamagePercent)}% 증가`;
    }
    return '';
  }

  function getUpgradeDetailLine(equipment = {}) {
    const level = Number(equipment.reinforce || 0);
    if (!Number.isFinite(level) || level <= 0) return null;
    if (equipment.isAmplified) {
      return {
        text: `+${level} ${String(equipment.amplificationName || '').trim() || '증폭'}`,
        className: 'enchant-portrait-detail-line-amplify',
      };
    }
    return {
      text: `+${level} 강화`,
      className: 'enchant-portrait-detail-line-reinforce',
    };
  }

  function getUpgradeBadge(equipment = {}) {
    const level = Number(equipment.reinforce || 0);
    if (!Number.isFinite(level) || level <= 0) return null;
    if (equipment.isAmplified) {
      return { text: `+${level}`, kind: 'amplify' };
    }
    return { text: `+${level}`, kind: 'reinforce' };
  }

  function getEquipmentTuneBadge(equipment = {}) {
    const level = Number(equipment.tuneLevel || 0);
    if (!Number.isFinite(level) || level <= 0) return null;
    const displayLevel = Math.max(1, Math.min(3, Math.floor(level)));
    return {
      level,
      displayLevel,
      label: `조율 ${level}회`,
    };
  }

  function getEnchantBadge(effects = {}, reinforceSkill = [], bufferBaseline = null) {
    if (bufferBaseline?.isBuffer) {
      const parts = [];
      const primaryStat = getBufferSelectedStatEffect(effects, bufferBaseline);
      const skillLevels = getReinforceSkillLevel(reinforceSkill, bufferBaseline.jobName || '');
      if (Number.isFinite(primaryStat) && primaryStat > 0) parts.push(formatEffectNumber(primaryStat));
      if (Number.isFinite(skillLevels) && skillLevels > 0) parts.push(`${formatEffectNumber(skillLevels)}Lv`);
      return parts.length ? { text: parts.join('/') } : null;
    }
    const parts = [];
    const attackAmplification = Number(effects.attackAmplification || 0);
    const finalDamage = Number(effects.finalDamage || 0);
    const elementAll = Number(effects.elementAll || 0);
    if (Number.isFinite(attackAmplification) && attackAmplification > 0) {
      parts.push(`${attackAmplification}%`);
    }
    if (Number.isFinite(finalDamage) && finalDamage > 0) {
      parts.push(`${finalDamage}%`);
    }
    if (Number.isFinite(elementAll) && elementAll > 0) {
      parts.push(`${elementAll}`);
    }
    if (!parts.length) return null;
    return { text: parts.join('/') };
  }

  function getRoleEquipmentBadge(effects = {}, isBuffer = false) {
    const parts = isBuffer
      ? [
        Number.isFinite(effects.buffAmplification) && Number(effects.buffAmplification) > 0
          ? `${formatEffectNumber(Number(effects.buffAmplification))}%`
          : '',
        Number.isFinite(effects.allStat) && Number(effects.allStat) > 0
          ? formatEffectNumber(Number(effects.allStat))
          : '',
      ]
      : [
        Number.isFinite(effects.attackAmplification) && Number(effects.attackAmplification) > 0
          ? `${formatEffectNumber(Number(effects.attackAmplification))}%`
          : '',
        Number.isFinite(effects.elementAll) && Number(effects.elementAll) > 0
          ? formatEffectNumber(Number(effects.elementAll))
          : '',
      ];
    const text = parts.filter(Boolean).join('/');
    return text ? { text } : null;
  }

  function formatReinforceSkills(reinforceSkill = [], jobName = '') {
    return (reinforceSkill || []).flatMap((job) => {
      if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
      return (job?.skills || [])
        .filter((skill) => skill?.name && Number(skill?.value || 0) > 0)
        .map((skill) => `${skill.name} Lv +${formatEffectNumber(Number(skill.value))}`);
    }).join(' / ');
  }

  function formatMatchedReinforceSkills(skills = []) {
    return (skills || [])
      .filter((skill) => skill?.name && Number(skill?.value || 0) > 0)
      .map((skill) => `${skill.name} Lv +${formatEffectNumber(Number(skill.value))}`)
      .join(' / ');
  }

  function buildEnchantPortraitSlotData(context) {
    const {
      activeEquipmentUpgrades,
      baseEquipmentUpgrades,
      currentEquipmentUpgrades,
      activeEnchants,
      activeTitle,
      activeCreature,
      activeCreatureArtifacts,
      activeAura,
      currentBufferBaseline,
    } = context;
    const equipmentBySlot = new Map(
      (activeEquipmentUpgrades || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );
    const baseEquipmentBySlot = new Map(
      (baseEquipmentUpgrades || currentEquipmentUpgrades || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );
    const enchantBySlot = new Map(
      (activeEnchants || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );

    const slotData = {};

    slotOrder.forEach((slot) => {
      if (equipmentBySlot.has(slot)) {
        const equipment = equipmentBySlot.get(slot) || {};
        const enchant = enchantBySlot.get(slot) || {};
        const reinforceSkillText = formatReinforceSkills(
          enchant.reinforceSkill || [],
          currentBufferBaseline?.jobName || '',
        );
        const enchantDetailText = [
          formatEffects(enchant.effects || {}),
          reinforceSkillText,
        ].filter(Boolean).join(' / ') || '없음';
        const enchantBadge = getEnchantBadge(
          enchant.effects || {},
          enchant.reinforceSkill || [],
          currentBufferBaseline,
        );
        const baseTuneLevel = Number(baseEquipmentBySlot.get(slot)?.tuneLevel || 0);
        const simulatedTuneLevel = Number(equipment.tuneLevel || 0);
        const isSimulatedTune = simulatedTuneLevel !== baseTuneLevel;
        const baseProgression = baseEquipmentBySlot.get(slot) || {};
        const isSimulatedProgression = (
          Number(equipment.reinforce || 0) !== Number(baseProgression.reinforce || 0)
          || Boolean(equipment.isAmplified) !== Boolean(baseProgression.isAmplified)
        );
        const tuneBadge = getEquipmentTuneBadge(equipment);
        if (tuneBadge) {
          tuneBadge.baseDisplayLevel = Math.max(
            0,
            Math.min(tuneBadge.displayLevel, Math.floor(baseTuneLevel)),
          );
        }
        slotData[slot] = {
          label: slot,
          iconUrl: equipment.iconUrl || '',
          itemName: equipment.itemName || slot,
          itemRarity: equipment.itemRarity || '',
          enchantBadge,
          isSimulatedEnchant: Boolean(enchant.simulatedEnchantItemName),
          upgradeBadge: getUpgradeBadge(equipment),
          isSimulatedProgression,
          tuneBadge,
          isSimulatedTune,
          hoverLines: [
            { text: enchantDetailText, className: 'enchant-portrait-detail-line-effect' },
            getUpgradeDetailLine(equipment),
          ].filter(Boolean),
        };
      }
    });

    const title = activeTitle || {};
    const titleMainOption = formatTitleDetailMainOption(title);
    const titleBufferOption = currentBufferBaseline?.isBuffer
      ? String(title.itemBuff?.explain || '').replace(/\s+/g, ' ').trim()
      : '';
    const titleAllSkillOption = formatItemBuffLevelRanges(title.itemBuff || {});
    const titleStatOption = formatTitleMajorEffects(
      title.effects || {},
      currentBufferBaseline?.isBuffer,
      Boolean(title.titleEnchantElement),
    );
    slotData.칭호 = {
      label: '칭호',
      iconUrl: title.iconUrl || '',
      itemName: title.itemName || '칭호',
      itemRarity: title.itemRarity || '',
      enchantBadge: getRoleEquipmentBadge(title.effects || {}, currentBufferBaseline?.isBuffer),
      hoverLines: [
        titleMainOption ? { text: titleMainOption, className: 'enchant-portrait-detail-line-effect' } : null,
        titleBufferOption ? { text: titleBufferOption, className: 'enchant-portrait-detail-line-effect' } : null,
        titleAllSkillOption ? { text: titleAllSkillOption, className: 'enchant-portrait-detail-line-effect' } : null,
        { text: titleStatOption || '없음', className: 'enchant-portrait-detail-line-effect' },
      ],
    };

    const creature = activeCreature || {};
    const creatureMainOption = formatCreatureDetailMainOption(creature);
    const creatureNamedSkillOption = formatMatchedReinforceSkills(creature.reinforceSkills || []);
    const creatureBufferOption = currentBufferBaseline?.isBuffer
      ? String(creature.itemBuff?.explain || '').replace(/\s+/g, ' ').trim()
      : '';
    const creatureAllSkillOption = formatItemBuffLevelRanges(creature.itemBuff || {});
    const creatureStatOption = formatTitleMajorEffects(
      creature.effects || {},
      currentBufferBaseline?.isBuffer,
    );
    const creatureHoverLines = [
      creatureMainOption,
      creatureBufferOption,
      creatureAllSkillOption,
      creatureNamedSkillOption,
      creatureStatOption,
    ].filter(Boolean);
    slotData.크리쳐 = {
      label: '크리쳐',
      iconUrl: creature.iconUrl || '',
      itemName: creature.itemName || '크리쳐',
      itemRarity: creature.itemRarity || '',
      artifacts: activeCreatureArtifacts,
      enchantBadge: getRoleEquipmentBadge(creature.effects || {}, currentBufferBaseline?.isBuffer),
      hoverLines: (creatureHoverLines.length ? creatureHoverLines : ['없음'])
        .map((text) => ({ text, className: 'enchant-portrait-detail-line-effect' })),
    };

    const aura = activeAura || {};
    const auraNamedSkillOption = formatMatchedReinforceSkills(aura.reinforceSkills || []);
    const auraStatOption = formatTitleMajorEffects(
      aura.effects || {},
      currentBufferBaseline?.isBuffer,
    );
    const auraHoverLines = [auraNamedSkillOption, auraStatOption].filter(Boolean);
    slotData.오라 = {
      label: '오라',
      iconUrl: aura.iconUrl || '',
      itemName: aura.itemName || '오라',
      itemRarity: aura.itemRarity || '',
      enchantBadge: getRoleEquipmentBadge(aura.effects || {}, currentBufferBaseline?.isBuffer),
      hoverLines: (auraHoverLines.length ? auraHoverLines : ['없음'])
        .map((text) => ({ text, className: 'enchant-portrait-detail-line-effect' })),
    };

    return slotData;
  }

  function renderCreatureArtifactRail(artifacts = [], context) {
    const { activeDamageBaseline } = context;
    const artifactByColor = new Map(
      artifacts
        .filter((artifact) => ['RED', 'BLUE', 'GREEN'].includes(String(artifact?.slotColor || '').trim().toUpperCase()))
        .map((artifact) => [String(artifact.slotColor).trim().toUpperCase(), artifact]),
    );
    return `
      <span class="enchant-creature-artifact-rail" aria-label="크리쳐 아티팩트">
        ${[
          ['RED', 'creatureArtifactRed'],
          ['BLUE', 'creatureArtifactBlue'],
          ['GREEN', 'creatureArtifactGreen'],
        ].map(([color, key]) => {
          const artifact = artifactByColor.get(color) || null;
          const itemName = String(artifact?.itemName || '').trim();
          const iconUrl = String(artifact?.iconUrl || '').trim();
          const rarityClass = getLoadoutRarityClass(artifact);
          const activeSweep = getSweepEntry(`creatureArtifact:${color}`);
          const sweepElapsedMs = activeSweep ? now() - activeSweep.startedAt : sweepDurationMs;
          const hasActiveSweep = sweepElapsedMs >= 0 && sweepElapsedMs < sweepDurationMs;
          const sweepStyle = hasActiveSweep ? ` style="--simulator-sweep-delay: -${Math.floor(sweepElapsedMs)}ms"` : '';
          const mainOptionText = artifact
            ? formatEffects(getCreatureArtifactDisplayEffects(
              { sourceType: 'creatureArtifact', ...artifact },
              activeDamageBaseline,
              artifact.element,
            ))
            : '';
          const detailLines = itemName
            ? [{
              text: mainOptionText || '표시할 효과가 없습니다.',
              className: mainOptionText
                ? 'enchant-portrait-detail-line-effect'
                : 'enchant-portrait-detail-line-sub',
            }]
            : [];
          return `
            <span class="enchant-character-slot enchant-creature-artifact-slot enchant-creature-artifact-slot-${color.toLowerCase()}${itemName ? '' : ' is-empty'}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}${hasActiveSweep ? ' is-simulator-sweep' : ''}" data-creature-artifact-slot-key="${key}"${sweepStyle}${itemName ? ` tabindex="0" aria-label="${escapeHtml(itemName)}" data-detail-title="${escapeHtml(itemName)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"` : ` aria-label="${color} 아티팩트 비어 있음"`}>
              ${iconUrl
                ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
                : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
            </span>
          `;
        }).join('')}
      </span>
    `;
  }

  function renderEnchantPortraitSlotMarkup(layout, slotData, context) {
    const { slot, key, side } = layout;
    const data = slotData?.[slot];
    const isEmpty = !data?.iconUrl;
    const title = data?.itemName || slot;
    const rarityClass = getLoadoutRarityClass(data?.itemRarity);
    const hoverLines = [title, ...((data?.hoverLines || []).filter(Boolean))];
    if (isEmpty) {
      hoverLines.splice(1, hoverLines.length - 1, { text: '장착 정보 없음', className: 'enchant-portrait-detail-line-sub' });
    }
    const detailLines = hoverLines.slice(1).map((line) => (typeof line === 'string' ? { text: line, className: '' } : line));
    const activeSweep = getSweepEntry(slot);
    const sweepElapsedMs = activeSweep ? now() - activeSweep.startedAt : sweepDurationMs;
    const hasActiveSweep = sweepElapsedMs >= 0 && sweepElapsedMs < sweepDurationMs;
    const sweepStyle = hasActiveSweep ? ` style="--simulator-sweep-delay: -${Math.floor(sweepElapsedMs)}ms"` : '';
    return `
      <span class="enchant-character-slot-wrap enchant-character-slot-wrap-${escapeHtml(key)} enchant-character-slot-wrap-${escapeHtml(side)}${hasActiveSweep ? ' is-simulator-sweep' : ''}"${sweepStyle}>
        <span class="enchant-character-slot${isEmpty ? ' is-empty' : ''}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}" tabindex="0" aria-label="${escapeHtml(title)}" data-detail-title="${escapeHtml(title)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}">
          ${data?.iconUrl
            ? `<img src="${escapeHtml(data.iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : `<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>`}
          ${data?.enchantBadge
            ? `<span class="enchant-character-slot-enchant-badges"><span class="enchant-character-slot-enchant-badge${data.isSimulatedEnchant ? ' is-simulated' : ''}">${escapeHtml(data.enchantBadge.text)}</span></span>`
            : ''}
        </span>
        ${data?.upgradeBadge
          ? `<span class="enchant-character-slot-badge enchant-character-slot-badge-${escapeHtml(data.upgradeBadge.kind)}${data.isSimulatedProgression ? ' is-simulated' : ''}">${escapeHtml(data.upgradeBadge.text)}</span>`
          : ''}
        ${data?.tuneBadge
          ? `<span class="enchant-character-slot-tune-mark${data.isSimulatedTune ? ' is-simulated-equipment-tune' : ''}" role="img" title="${escapeHtml(data.tuneBadge.label)}" aria-label="${escapeHtml(data.tuneBadge.label)}">${Array.from({ length: data.tuneBadge.displayLevel }).map((_, index) => `<span class="enchant-character-slot-tune-bar${index >= Number(data.tuneBadge.baseDisplayLevel || 0) ? ' is-simulated' : ''}" aria-hidden="true"></span>`).join('')}</span>`
          : ''}
        ${slot === '크리쳐' ? renderCreatureArtifactRail(data?.artifacts || [], context) : ''}
      </span>
    `;
  }

  function buildEnchantPortraitSlotMarkup() {
    const context = getEquipmentLoadoutBoardContext();
    const slotData = buildEnchantPortraitSlotData(context);
    return ENCHANT_PORTRAIT_SLOT_LAYOUT.map((layout) => renderEnchantPortraitSlotMarkup(layout, slotData, context)).join('');
  }

  return { buildEnchantPortraitSlotMarkup };
}
