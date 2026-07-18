const CHARACTER_FAME_ICON_URL = new URL('../../이미지/fame.png', import.meta.url).href;

export function createEnchantSearchPanels({
  els,
  state,
  escapeHtml,
  bindCharacterAvatars,
  getCharacterPortraitMarkup,
}) {
  function setEnchantAnalysisPanel(mode, message = '') {
    const isLoading = mode === 'loading';
    const isError = mode === 'error';
    const showMessage = isLoading || isError;
    if (els.enchantIncludeCard) {
      els.enchantIncludeCard.hidden = showMessage;
    }
    if (els.enchantResultLayout) {
      els.enchantResultLayout.hidden = showMessage;
    }
    if (els.enchantCandidatePanel) {
      els.enchantCandidatePanel.hidden = true;
    }
    if (!els.enchantAnalysisLoading) return;
    els.enchantAnalysisLoading.hidden = !showMessage;
    els.enchantAnalysisLoading.classList.toggle('is-error', isError);
    const title = els.enchantAnalysisLoading.querySelector('.enchant-analysis-loading-title');
    const sub = els.enchantAnalysisLoading.querySelector('.enchant-analysis-loading-sub');
    if (isLoading) {
      if (title) {
        title.innerHTML = '<span>분석중이에양</span><span class="enchant-analysis-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
      }
      if (sub) sub.textContent = '스펙업 효율을 계산하고 있어양.';
    } else if (isError) {
      if (title) title.textContent = message || '분석에 실패했습니다.';
      if (sub) sub.textContent = getEnchantAnalysisErrorSubtext(message);
    }
  }

  function getEnchantAnalysisErrorSubtext(message) {
    const text = String(message || '');
    if (/점검|503|DNF980/.test(text)) {
      return '던파 점검 중이에양. 끝나고 찾아오세양.';
    }
    if (/서버 연결|API 서버/.test(text)) {
      return '서버 업데이트나 재시작 중일 수 있습니다. 잠시만 양해 부탁드립니다.';
    }
    return '캐릭터명이나 서버를 확인한 뒤 다시 검색해 주세요.';
  }

  function showEnchantAnalysisLoading() {
    setEnchantAnalysisPanel('loading');
  }

  function showEnchantAnalysisError(message) {
    setEnchantAnalysisPanel('error', message);
  }

  function showEnchantAnalysisResults() {
    setEnchantAnalysisPanel('ready');
  }

  function setEnchantCandidatePanel(mode, candidates = [], message = '') {
    if (els.enchantIncludeCard) {
      els.enchantIncludeCard.hidden = true;
    }
    if (els.enchantResultLayout) {
      els.enchantResultLayout.hidden = true;
    }
    if (els.enchantAnalysisLoading) {
      els.enchantAnalysisLoading.hidden = true;
    }
    if (!els.enchantCandidatePanel) return;
    els.enchantCandidatePanel.hidden = false;
    els.enchantCandidatePanel.classList.toggle('is-error', mode === 'error');
    els.enchantCandidatePanel.classList.toggle('is-message', mode !== 'ready' || !candidates.length);
    if (mode === 'loading') {
      els.enchantCandidatePanel.innerHTML = `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">
            <span>캐릭터 찾는 중이에양</span><span class="enchant-analysis-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
          </div>
          <div class="enchant-analysis-loading-sub">검색어와 일치하는 캐릭터를 찾고 있습니다.</div>
        </div>
      `;
      return;
    }
    if (mode === 'error') {
      els.enchantCandidatePanel.innerHTML = `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">${escapeHtml(message || '캐릭터를 찾지 못했습니다.')}</div>
          <div class="enchant-analysis-loading-sub">잠시 후 다시 시도해 주세요.</div>
        </div>
      `;
      return;
    }
    els.enchantCandidatePanel.innerHTML = renderEnchantSearchCandidates(candidates, message);
    bindCharacterAvatars(els.enchantCandidatePanel);
  }

  function showEnchantCandidateLoading() {
    setEnchantCandidatePanel('loading');
  }

  function renderEnchantSearchCandidates(candidates = [], searchText = '') {
    const rows = Array.isArray(candidates) ? candidates : [];
    if (!rows.length) {
      const isAdventureSearch = state.enchantCandidateLookupType === 'adventure';
      return `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">${isAdventureSearch ? '캐릭터를 찾지 못했어요.' : '캐릭터를 찾지 못했습니다.'}</div>
          <div class="enchant-analysis-loading-sub">${isAdventureSearch ? '모험단 검색은 한 번 조회된 캐릭터 기록을 기준으로 보여줍니다.' : '검색어를 확인한 뒤 다시 시도해 주세요.'}</div>
        </div>
      `;
    }
    const searchLabel = String(searchText || '').trim();
    const searchTypeLabel = state.enchantCandidateLookupType === 'adventure' ? '모험단' : '전체 서버';
    return `
      <div class="enchant-candidate-head">
        <p>
          <span class="enchant-candidate-result-type">${escapeHtml(searchTypeLabel)}</span>
          ${searchLabel ? `<span class="enchant-candidate-search-keyword">${escapeHtml(searchLabel)}</span>` : ''}
          <span class="enchant-candidate-result-suffix">검색 결과</span>
        </p>
      </div>
      <div class="enchant-candidate-grid">
        ${rows.map((candidate) => {
          const serverId = String(candidate.serverId || '').trim().toLowerCase();
          const serverName = String(candidate.serverName || serverId).trim();
          const characterName = String(candidate.characterName || '').trim();
          const adventureName = String(candidate.adventureName || '').trim();
          const jobLabel = String(candidate.jobGrowName || candidate.jobName || '').trim();
          const fame = Number(candidate.fame || 0);
          const hasFame = candidate.fame !== undefined && candidate.fame !== null && String(candidate.fame).trim() !== '';
          const candidateCharacter = {
            serverId,
            characterId: String(candidate.characterId || '').trim(),
            name: characterName,
            characterName,
            adventureName: candidate.adventureName || '',
            jobName: candidate.jobName || '',
            jobGrowName: candidate.jobGrowName || '',
            fame: Number(candidate.fame || 0),
          };
          return `
            <button type="button" class="enchant-candidate-card" data-candidate-server-id="${escapeHtml(serverId)}" data-candidate-character-name="${escapeHtml(characterName)}">
              <span class="enchant-candidate-server">${escapeHtml(serverName)}</span>
              <span class="supply-detail-portrait enchant-candidate-portrait">
                ${getCharacterPortraitMarkup(candidateCharacter, { zoom: 1, showName: false })}
              </span>
              <span class="enchant-candidate-info">
                ${hasFame ? `<span class="enchant-candidate-fame" title="명성 ${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}" aria-label="명성 ${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}"><img src="${escapeHtml(CHARACTER_FAME_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}</span>` : ''}
                <span class="enchant-candidate-name">${escapeHtml(characterName)}</span>
                ${adventureName ? `<span class="enchant-candidate-adventure">${escapeHtml(adventureName)}</span>` : ''}
                ${jobLabel ? `<span class="enchant-candidate-job">${escapeHtml(jobLabel)}</span>` : ''}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  return {
    showEnchantAnalysisLoading,
    showEnchantAnalysisError,
    showEnchantAnalysisResults,
    setEnchantCandidatePanel,
    showEnchantCandidateLoading,
  };
}
