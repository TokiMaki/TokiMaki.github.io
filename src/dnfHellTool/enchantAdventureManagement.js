import { getCharacterPortraitMarkup } from './characterPresentation.js';

const VERIFY_INTERVAL_MS = 15_000;
const VERIFY_TIMEOUT_MS = 60_000;
const EQUIPMENT_STILL_EQUIPPED = '아직 지정 장비가 장착된 것으로 조회됩니다.';

export function createEnchantAdventureManagement({ els, state, apiBase, escapeHtml, parseApiJsonResponse, onSaved, onEditingChange, onEditingCancel }) {
  let dialog = null;
  let challengeToken = '';
  let editToken = '';
  let item = null;
  let roster = [];
  let order = [];
  let hidden = new Set();
  let busy = false;
  let checking = false;
  let verifyController = null;
  let busyLabel = '';
  let message = '';
  let generation = 0;
  let dragKey = '';

  const keyOf = (row) => `${String(row.serverId || '').toLowerCase()}:${String(row.characterId || '')}`;
  const adventureName = () => String(state.enchantAdventureSearchName || '').trim();

  async function post(action, payload, signal) {
    const response = await fetch(`${apiBase}/api/adventure-management/${action}`, {
      method: 'POST',
      cache: 'no-store',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseApiJsonResponse(response, '모험단 관리 요청에 실패했습니다.');
  }

  function render() {
    if (!dialog) return;
    const statusText = busy ? busyLabel : message;
    const status = statusText ? `<p class="enchant-adventure-manage-status${checking ? ' is-checking' : ''}" role="status">${checking ? '<span class="enchant-adventure-manage-spinner" aria-hidden="true"></span>' : ''}${escapeHtml(statusText)}</p>` : '';
    let content = '';
    if (challengeToken) {
      content = `<div class="enchant-adventure-manage-character">
          <span class="supply-detail-portrait enchant-candidate-portrait enchant-adventure-manage-portrait">
            ${getCharacterPortraitMarkup({ serverId: item?.serverId, characterId: item?.characterId, name: item?.characterName }, { zoom: 1, showName: false })}
          </span>
          <span class="enchant-adventure-manage-identity"><small>${escapeHtml(item?.serverName || item?.serverId || '')}</small><strong>${escapeHtml(item?.characterName || '')}</strong></span>
        </div>
        <p class="enchant-adventure-manage-section-label">해제할 장비</p>
        <div class="enchant-adventure-manage-item">
          <img src="${escapeHtml(item?.itemIconUrl || '')}" alt="" width="48" height="48" />
          <span><small>${escapeHtml(item?.slotName || '')}</small><strong>${escapeHtml(item?.itemName || '')}</strong></span>
        </div>
        <ol class="enchant-adventure-manage-steps">
          <li>게임에서 위 캐릭터의 지정 장비를 해제해 주세요.</li>
          <li>채널을 이동하거나 캐릭터 선택창으로 갔다가 다시 접속해 주세요.</li>
          <li>장비를 해제했다면 아래에서 확인을 시작해 주세요.</li>
        </ol>
        <button type="button" class="enchant-adventure-manage-primary" data-adventure-verify>${checking ? '확인 중' : '장비 해제 확인'}</button>`;
    } else {
      content = busy ? '' : '<button type="button" class="enchant-adventure-manage-primary" data-adventure-start>다시 시도</button>';
    }
    dialog.innerHTML = `<div class="enchant-adventure-manage-heading">
      <h2>모험단 관리</h2>
      <button type="button" data-adventure-close aria-label="닫기" title="닫기">×</button>
    </div>${content}${status}`;
    dialog.querySelectorAll('button').forEach((button) => { if (busy && !button.hasAttribute('data-adventure-close')) button.disabled = true; });
  }

  function renderEditing(focusKey = '', focusAction = '') {
    if (!editToken) return;
    const byKey = new Map(roster.map((candidate) => [keyOf(candidate), candidate]));
    onEditingChange(order.map((key) => byKey.get(key)).filter(Boolean), hidden, { saving: busy, editMessage: message });
    if (focusKey) {
      const buttons = els.enchantCandidatePanel?.querySelectorAll('[data-adventure-move], [data-adventure-hide]') || [];
      [...buttons].find((button) =>
        (button.dataset.adventureKey || button.dataset.adventureHide) === focusKey
        && (button.dataset.adventureMove || 'hide') === focusAction)?.focus();
    }
  }

  function reset() {
    generation += 1;
    verifyController?.abort();
    verifyController = null;
    if (challengeToken) void post('cancel', { challengeToken }).catch(() => {});
    if (editToken) void post('revoke', { editToken }).catch(() => {});
    if (dialog?.open) dialog.close();
    dialog?.remove();
    dialog = null;
    challengeToken = '';
    editToken = '';
    item = null;
    roster = [];
    order = [];
    hidden = new Set();
    dragKey = '';
    busy = false;
    checking = false;
    busyLabel = '';
    message = '';
  }

  async function run(action, payload, complete) {
    const currentGeneration = generation;
    busy = true;
    busyLabel = action === 'start' ? '인증할 캐릭터와 장비를 조회하고 있습니다.' : '설정을 저장하고 있습니다.';
    message = '';
    render();
    try {
      const result = await post(action, payload);
      if (dialog && currentGeneration === generation) complete(result);
      else if (action === 'start' && result.challengeToken) void post('cancel', { challengeToken: result.challengeToken }).catch(() => {});
    } catch (error) {
      if (dialog && currentGeneration === generation) message = String(error?.serverMessage || error?.message || '요청에 실패했습니다.');
    } finally {
      if (currentGeneration === generation) {
        busy = false;
        busyLabel = '';
        render();
      }
    }
  }

  async function verifyUntilTimeout() {
    const currentGeneration = generation;
    const token = challengeToken;
    const deadline = Date.now() + VERIFY_TIMEOUT_MS;
    const controller = new AbortController();
    verifyController = controller;
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    busy = true;
    checking = true;
    busyLabel = '장비 해제를 확인하고 있습니다.';
    message = '';
    render();
    try {
      while (dialog && currentGeneration === generation && challengeToken === token) {
        try {
          const result = await post('verify', { challengeToken: token }, controller.signal);
          if (dialog && currentGeneration === generation) {
            challengeToken = '';
            editToken = result.editToken;
            roster = result.candidates || [];
            const keys = roster.map(keyOf);
            order = [...(result.settings?.order || []).filter((key) => keys.includes(key)), ...keys.filter((key) => !result.settings?.order?.includes(key))];
            hidden = new Set((result.settings?.hidden || []).filter((key) => keys.includes(key)));
            const authenticatedDialog = dialog;
            dialog = null;
            authenticatedDialog.close();
            authenticatedDialog.remove();
            busy = false;
            checking = false;
            busyLabel = '';
            renderEditing();
          } else if (result.editToken) {
            void post('revoke', { editToken: result.editToken }).catch(() => {});
          }
          return;
        } catch (error) {
          if (!dialog || currentGeneration !== generation) return;
          if (controller.signal.aborted && Date.now() >= deadline) break;
          const serverMessage = String(error?.serverMessage || '');
          if (!serverMessage.startsWith(EQUIPMENT_STILL_EQUIPPED)) {
            message = serverMessage || String(error?.message || '요청에 실패했습니다.');
            return;
          }
          const remaining = deadline - Date.now();
          if (remaining <= 0) break;
          await new Promise((resolve) => setTimeout(resolve, Math.min(VERIFY_INTERVAL_MS, remaining)));
          if (Date.now() >= deadline) break;
        }
      }
      if (dialog && currentGeneration === generation) {
        message = '장비 해제가 확인되지 않았습니다. 장비 상태를 확인한 뒤 다시 시도해 주세요.';
      }
    } finally {
      clearTimeout(timeout);
      if (verifyController === controller) verifyController = null;
      if (currentGeneration === generation) {
        busy = false;
        checking = false;
        busyLabel = '';
        render();
      }
    }
  }

  function open() {
    if (editToken) return;
    if (!adventureName() || !state.enchantSearchCandidates?.length) return;
    if (dialog) { dialog.showModal(); return; }
    dialog = document.createElement('dialog');
    dialog.className = 'enchant-adventure-manage-dialog';
    dialog.setAttribute('aria-label', '모험단 관리');
    dialog.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-adventure-close')) { dialog.close(); return; }
      if (busy) return;
      if (button.hasAttribute('data-adventure-start')) {
        void run('start', { adventureName: adventureName() }, (result) => {
          challengeToken = result.challengeToken;
          item = result;
        });
      } else if (button.hasAttribute('data-adventure-verify')) {
        void verifyUntilTimeout();
      }
    });
    const currentDialog = dialog;
    currentDialog.addEventListener('close', () => {
      if (dialog === currentDialog) reset();
    });
    document.body.append(currentDialog);
    if (!challengeToken && !editToken) {
      void run('start', { adventureName: adventureName() }, (result) => {
        challengeToken = result.challengeToken;
        item = result;
      });
    } else render();
    dialog.showModal();
  }

  async function saveEditing() {
    if (!editToken || busy) return;
    const currentGeneration = generation;
    const name = adventureName();
    busy = true;
    message = '';
    renderEditing();
    try {
      await post('save', { adventureName: name, editToken, order, hidden: [...hidden] });
      if (currentGeneration !== generation) return;
      reset();
      onSaved(name);
    } catch (error) {
      if (currentGeneration === generation) {
        message = String(error?.serverMessage || error?.message || '설정을 저장하지 못했습니다.');
      }
    } finally {
      if (currentGeneration === generation) {
        busy = false;
        renderEditing();
      }
    }
  }

  function cancelEditing() {
    if (!editToken || busy) return;
    reset();
    onEditingCancel();
  }

  function moveCard(key, targetIndex, focusAction = '') {
    const index = order.indexOf(key);
    if (index < 0 || targetIndex < 0 || targetIndex >= order.length || index === targetIndex) return;
    order.splice(index, 1);
    order.splice(targetIndex, 0, key);
    message = '';
    renderEditing(key, focusAction);
  }

  function getDropPlacement(event) {
    if (!dragKey) return null;
    let card = event.target.closest('[data-adventure-card-key]');
    if (!card) {
      const grid = event.target.closest('.enchant-candidate-grid');
      if (!grid) return null;
      let nearestDistance = 12 * 12;
      for (const candidate of grid.querySelectorAll('[data-adventure-card-key]')) {
        const bounds = candidate.getBoundingClientRect();
        const dx = Math.max(bounds.left - event.clientX, 0, event.clientX - bounds.right);
        const dy = Math.max(bounds.top - event.clientY, 0, event.clientY - bounds.bottom);
        const distance = dx * dx + dy * dy;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          card = candidate;
        }
      }
    }
    if (!card) return null;
    const sourceIndex = order.indexOf(dragKey);
    const targetIndex = order.indexOf(card.dataset.adventureCardKey);
    if (sourceIndex < 0 || targetIndex < 0) return null;
    const bounds = card.getBoundingClientRect();
    const after = event.clientX >= bounds.left + bounds.width / 2;
    const insertionIndex = targetIndex + Number(after);
    const destinationIndex = insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex;
    return { card, after, destinationIndex };
  }

  els.enchantCandidatePanel?.addEventListener('click', (event) => {
    if (!editToken || busy) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-adventure-manage-save')) {
      void saveEditing();
    } else if (button.hasAttribute('data-adventure-manage-cancel')) {
      cancelEditing();
    } else if (button.dataset.adventureMove) {
      const key = button.dataset.adventureKey;
      const delta = button.dataset.adventureMove === 'left' ? -1 : 1;
      moveCard(key, order.indexOf(key) + delta, button.dataset.adventureMove);
    } else if (button.dataset.adventureHide) {
      const key = button.dataset.adventureHide;
      if (!order.includes(key)) return;
      if (hidden.has(key)) { hidden.delete(key); message = ''; }
      else if (hidden.size < order.length - 1) { hidden.add(key); message = ''; }
      else message = '인증을 위해 캐릭터 한 명은 목록에 남겨 주세요.';
      renderEditing(key, 'hide');
    }
  });

  els.enchantCandidatePanel?.addEventListener('dragstart', (event) => {
    if (!editToken || busy || event.target.closest('button')) return;
    const card = event.target.closest('[data-adventure-card-key]');
    if (!card) return;
    dragKey = card.dataset.adventureCardKey;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragKey);
    card.classList.add('is-dragging');
  });
  els.enchantCandidatePanel?.addEventListener('dragover', (event) => {
    if (!dragKey) return;
    els.enchantCandidatePanel.querySelectorAll('.is-drop-before, .is-drop-after').forEach((row) => row.classList.remove('is-drop-before', 'is-drop-after'));
    const placement = getDropPlacement(event);
    if (!placement) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (placement.destinationIndex !== order.indexOf(dragKey)) {
      placement.card.classList.add(placement.after ? 'is-drop-after' : 'is-drop-before');
    }
  });
  els.enchantCandidatePanel?.addEventListener('drop', (event) => {
    const placement = getDropPlacement(event);
    if (!placement) return;
    event.preventDefault();
    moveCard(dragKey, placement.destinationIndex);
    dragKey = '';
    els.enchantCandidatePanel.querySelectorAll('.is-drop-before, .is-drop-after, .is-dragging').forEach((row) => row.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging'));
  });
  els.enchantCandidatePanel?.addEventListener('dragend', () => {
    dragKey = '';
    els.enchantCandidatePanel.querySelectorAll('.is-drop-before, .is-drop-after, .is-dragging').forEach((row) => row.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging'));
  });

  return { open, reset };
}
