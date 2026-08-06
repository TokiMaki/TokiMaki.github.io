import { useEffect, useMemo, useState } from 'react';
import logoImage from '../../이미지/로고/logo.png';
import equipmentScoreIcon from '../../이미지/equipmentScore.png';
import bufferScoreIcon from '../../이미지/bufferScore.png';
import fameIcon from '../../이미지/fame.png';
import { getCharacterAvatarClass, getCharacterAvatarUrl } from '../dnfHellTool/characterPresentation.js';
import { getEnchantLoadoutBadge } from '../dnfHellTool/enchantEquipmentLoadoutBoard.js';
import { getEquipmentUpgradeVisualClass } from '../dnfHellTool/equipmentUpgradeVisual.js';
import { getLoadoutRarityClass } from '../dnfHellTool/loadoutRarity.js';
import { getLocalOathSymbolIconUrl } from '../dnfHellTool/enchantOathLoadoutBoard.js';
import { API_BASE } from '../dnfHellTool/storageKeys.js';
import SiteLegalFooter from './SiteLegalFooter.jsx';
import '../styles/setting-value-ranking.css';

const PAGE_SIZE = 20;

const SERVER_LABELS = {
  cain: '카인',
  diregie: '디레지에',
  siroco: '시로코',
  prey: '프레이',
  casillas: '카시야스',
  hilder: '힐더',
  anton: '안톤',
  bakal: '바칼',
};

function itemIconUrl(itemId) {
  return itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(itemId)}` : '';
}

function formatSettingValue(value) {
  const gold = Math.max(0, Math.floor(Number(value) || 0));
  const eok = Math.floor(gold / 100000000);
  const man = Math.floor((gold % 100000000) / 10000);
  if (eok > 0) return `${eok.toLocaleString('ko-KR')}억${man ? ` ${man.toLocaleString('ko-KR')}만` : ''} 골드`;
  if (man > 0) return `${man.toLocaleString('ko-KR')}만 골드`;
  return `${gold.toLocaleString('ko-KR')} 골드`;
}

function CharacterFace({ row }) {
  const character = {
    serverId: row.serverId,
    characterId: row.characterId,
    name: row.characterName,
    jobName: row.jobName,
    jobGrowName: row.jobGrowName,
  };
  const avatarUrl = getCharacterAvatarUrl(character, 1);
  return (
    <span
      className={`character-avatar-shell smallIcon ${getCharacterAvatarClass(character)} setting-value-character-avatar`}
      style={{ backgroundImage: `url("${avatarUrl}")` }}
      aria-hidden={'true'}
    ></span>
  );
}

function EquipmentIcon({ equipment, bufferBaseline }) {
  const displayTuneLevel = Math.max(0, Math.min(3, Number(equipment.tuneLevel || 0)));
  const upgradeVisualClass = getEquipmentUpgradeVisualClass(equipment);
  const highlightClass = `${equipment.isRelic ? ' is-relic' : ''}${equipment.isRelic && Number(equipment.precisionPercent) >= 100 ? ' is-relic-precision-max' : ''}${upgradeVisualClass ? ` ${upgradeVisualClass}` : ''}`;
  const rarityClass = getLoadoutRarityClass(equipment.itemRarity);
  const iconUrl = equipment.iconUrl || itemIconUrl(equipment.itemId);
  const enchant = equipment.enchant || null;
  const enchantBadge = enchant
    ? getEnchantLoadoutBadge(enchant.effects || {}, enchant.reinforceSkill || [], bufferBaseline)
    : null;
  const title = [
    equipment.slot,
    equipment.itemName,
    enchant?.effectText ? `마법부여: ${enchant.effectText}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <span className={`setting-value-equipment-item equipment-loadout-item equipment-upgrade-visual${highlightClass}`} title={title}>
      <span className={`enchant-character-slot${rarityClass ? ` ${rarityClass}` : ''}`} aria-label={equipment.slot}>
        {iconUrl ? <img src={iconUrl} alt={''} loading={'lazy'} decoding={'async'} /> : null}
        {enchantBadge ? (
          <span className={'enchant-character-slot-enchant-badges'}>
            <span
              className={`enchant-character-slot-enchant-badge${enchant?.isEnd || enchant?.tier === '종결' ? ' is-end' : ''}`}
              title={enchant?.effectText || '마법부여 적용'}
            >
              {enchantBadge.text}
            </span>
          </span>
        ) : null}
      </span>
      {Number(equipment.reinforce || 0) > 0 ? (
        <span className={`enchant-character-slot-badge enchant-character-slot-badge-${equipment.isAmplified ? 'amplify' : 'reinforce'}`}>
          +{equipment.reinforce}
        </span>
      ) : null}
      {displayTuneLevel > 0 ? (
        <span className={'enchant-character-slot-tune-mark'} title={`조율 ${displayTuneLevel}단계`}>
          {Array.from({ length: displayTuneLevel }, (_, index) => (
            <span className={'enchant-character-slot-tune-bar'} aria-hidden={'true'} key={index}></span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function OathIcon({ oath, index }) {
  const isOathBody = oath.kind === 'oath';
  const rarityClass = getLoadoutRarityClass(oath.itemRarity);
  const iconUrl = isOathBody
    ? getLocalOathSymbolIconUrl(oath) || oath.iconUrl || itemIconUrl(oath.itemId)
    : oath.iconUrl || itemIconUrl(oath.itemId);
  const displayTuneLevel = isOathBody
    ? 0
    : Math.max(0, Math.min(3, Math.floor(Number(oath.tuneLevel || 0))));
  const title = isOathBody
    ? [
        oath.itemName || '서약',
        oath.setOptionName || oath.setName,
        Number(oath.setPoint || 0) > 0 ? `세트 포인트 ${Number(oath.setPoint).toLocaleString('ko-KR')}` : '',
      ].filter(Boolean).join(' · ')
    : oath.itemName || `서약 결정 ${index + 1}`;
  return (
    <span
      className={`enchant-oath-slot${rarityClass ? ` ${rarityClass}` : ''}${isOathBody ? ' setting-value-oath-body' : ''}`}
      title={title}
    >
      {iconUrl ? (
        <img src={iconUrl} alt={''} loading={'lazy'} decoding={'async'} />
      ) : isOathBody ? (
        <span className={'setting-value-oath-body-fallback'} aria-hidden={'true'}>서약</span>
      ) : null}
      {displayTuneLevel > 0 ? (
        <span className={'enchant-character-slot-tune-mark'} title={`조율 ${displayTuneLevel}회`}>
          {Array.from({ length: displayTuneLevel }, (_, tuneIndex) => (
            <span className={'enchant-character-slot-tune-bar'} aria-hidden={'true'} key={tuneIndex}></span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function AccessoryIcon({ item, label }) {
  const rarityClass = getLoadoutRarityClass(item?.itemRarity);
  const iconUrl = item?.iconUrl || itemIconUrl(item?.itemId);
  const itemName = item?.itemName || '';
  return (
    <span
      className={`enchant-character-slot setting-value-accessory-slot${rarityClass ? ` ${rarityClass}` : ''}${iconUrl ? '' : ' is-empty'}`}
      title={[label, itemName].filter(Boolean).join(' · ')}
      aria-label={itemName ? `${label}: ${itemName}` : `${label}: 정보 없음`}
    >
      {iconUrl ? <img src={iconUrl} alt={''} loading={'lazy'} decoding={'async'} /> : null}
    </span>
  );
}

function RankingRow({ row, role }) {
  const score = role === 'buffer' ? row.buffScore : row.equipmentScore;
  const scoreLabel = role === 'buffer' ? '버프점수' : '장비점수';
  const scoreIcon = role === 'buffer' ? bufferScoreIcon : equipmentScoreIcon;
  const characterHref = `/?${new URLSearchParams({
    server: row.serverId || 'all',
    name: row.characterName || '',
  }).toString()}`;
  const bufferBaseline = role === 'buffer'
    ? { isBuffer: true, statName: row.statName, jobName: row.jobName }
    : null;
  return (
    <article className={`setting-value-row is-rank-${row.rank}`}>
      <div className={'setting-value-rank'}>{row.rank}</div>
      <a
        className={'setting-value-character'}
        href={characterHref}
        title={`${row.characterName} 스펙업 순서 보기`}
      >
        <CharacterFace row={row} />
        <div className={'setting-value-character-copy'}>
          <strong>{row.characterName}</strong>
          <span>{SERVER_LABELS[row.serverId] || row.serverId}</span>
          <span>{row.jobGrowName || row.jobName}</span>
        </div>
      </a>
      <div className={'setting-value-metrics'}>
        <div className={'setting-value-equipment-score'} title={scoreLabel}>
          <img src={scoreIcon} alt={''} />
          <strong>{Number(score) > 0 ? Number(score).toLocaleString('ko-KR') : '-'}</strong>
        </div>
        <div className={'setting-value-fame'} title={'명성'}>
          <img src={fameIcon} alt={''} />
          <strong>{Number(row.fame || 0).toLocaleString('ko-KR')}</strong>
        </div>
        <div className={'setting-value-gold'}>
          <span>세팅 추정 가치</span>
          <strong>{formatSettingValue(row.settingValue?.totalGold)}</strong>
        </div>
      </div>
      <div className={'setting-value-loadout'}>
        <div className={'setting-value-accessory-stack'} aria-label={'오라, 칭호, 크리쳐'}>
          <AccessoryIcon item={row.aura} label={'오라'} />
          <AccessoryIcon item={row.title} label={'칭호'} />
          <AccessoryIcon item={row.creature} label={'크리쳐'} />
        </div>
        <div className={'setting-value-loadout-strips'}>
          <div className={'setting-value-loadout-line'}>
            <div className={'setting-value-equipment-strip'} aria-label={'장비'}>
              {(row.equipment || []).map((equipment) => (
                <EquipmentIcon
                  equipment={equipment}
                  bufferBaseline={bufferBaseline}
                  key={equipment.slotId || equipment.slot}
                />
              ))}
            </div>
          </div>
          <div className={'setting-value-loadout-line'}>
            <div className={'setting-value-oath-strip'} aria-label={'서약'}>
              {(row.oath || []).map((oath, index) => <OathIcon oath={oath} index={index} key={`${oath.itemId || oath.itemName}-${index}`} />)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SettingValueRankingPage() {
  const selectedCharacter = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    return {
      serverId: query.get('serverId') || '',
      characterId: query.get('characterId') || '',
      characterName: query.get('characterName') || '',
    };
  }, []);
  const analysisHref = selectedCharacter.serverId && selectedCharacter.characterName
    ? `/?${new URLSearchParams({
        server: selectedCharacter.serverId,
        name: selectedCharacter.characterName,
      }).toString()}`
    : '/';
  const [role, setRole] = useState('dealer');
  const [sort, setSort] = useState('score');
  const [job, setJob] = useState('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, totalCount: 0 });
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    const query = new URLSearchParams({
      role,
      sort,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (job !== 'all') query.set('job', job);
    if (selectedCharacter.serverId) query.set('serverId', selectedCharacter.serverId);
    if (selectedCharacter.characterId) query.set('characterId', selectedCharacter.characterId);
    if (selectedCharacter.characterName) query.set('characterName', selectedCharacter.characterName);
    fetch(`${API_BASE}/api/setting-value-ranking?${query.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || '랭킹을 불러오지 못했습니다.');
        return payload;
      })
      .then((payload) => {
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
        setSelectedRow(payload.selectedRow || null);
        setPagination({
          page: Number(payload.page || 1),
          totalPages: Number(payload.totalPages || 0),
          totalCount: Number(payload.totalCount || 0),
        });
        if (payload.selectedRow?.role && payload.selectedRow.role !== role) {
          setRole(payload.selectedRow.role);
          setPage(1);
          return;
        }
        setStatus('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setRows([]);
        setStatus('error');
      });
    return () => controller.abort();
  }, [job, page, role, selectedCharacter, sort]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages;
    if (totalPages <= 1) return [];
    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pagination.page, pagination.totalPages]);

  return (
    <div className={'wrap setting-value-page'}>
      <header className={'hero setting-value-hero'}>
        <h1 className={'site-logo-heading'}>
          <a className={'site-logo-home-button'} href={'/'} aria-label={'던파일럿 메인으로'}>
            <img className={'site-logo-image'} src={logoImage} alt={'던파일럿'} />
          </a>
        </h1>
        <nav className={'tab-bar site-header-tabs'} aria-label={'주요 메뉴'}>
          <a className={'tab-button site-header-tab setting-value-nav-link'} href={analysisHref}>스펙업 순서</a>
          <a className={'tab-button site-header-tab active setting-value-nav-link'} href={'/stats/'} aria-current={'page'}>랭킹</a>
        </nav>
      </header>

      <main className={'setting-value-main'}>
        {selectedRow ? (
          <section className={'setting-value-selected'} aria-label={'현재 검색 캐릭터 순위'}>
            <div className={'setting-value-section-label'}>현재 검색 캐릭터</div>
            <RankingRow row={selectedRow} role={selectedRow.role || role} />
          </section>
        ) : null}

        <section className={'panel setting-value-filter-panel'} aria-label={'랭킹 필터'}>
          <div className={'setting-value-filter-group'}>
            <span>역할</span>
            <div className={'setting-value-role-buttons'}>
              <button type={'button'} className={role === 'dealer' ? 'is-active' : ''} onClick={() => { setRole('dealer'); setJob('all'); setPage(1); }}>딜러</button>
              <button type={'button'} className={role === 'buffer' ? 'is-active' : ''} onClick={() => { setRole('buffer'); setJob('all'); setPage(1); }}>버퍼</button>
            </div>
          </div>
          <label className={'setting-value-filter-group'}>
            <span>직업</span>
            <select value={job} onChange={(event) => { setJob(event.target.value); setPage(1); }}>
              <option value={'all'}>전체 직업</option>
              {jobs.map((jobName) => <option value={jobName} key={jobName}>{jobName}</option>)}
            </select>
          </label>
          <label className={'setting-value-filter-group'}>
            <span>정렬</span>
            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
              <option value={'score'}>{role === 'buffer' ? '버프점수' : '장비점수'} 순</option>
              <option value={'value'}>세팅 추정 가치 순</option>
              <option value={'fame'}>명성 순</option>
            </select>
          </label>
        </section>

        <section className={'setting-value-ranking-list'} aria-label={'랭킹'}>
          <div className={'setting-value-section-label'}>전체 랭킹 · {pagination.totalCount.toLocaleString('ko-KR')}명</div>
          {status === 'loading' ? <div className={'panel'}>랭킹을 불러오는 중...</div> : null}
          {status === 'error' ? <div className={'panel'}>랭킹을 불러오지 못했습니다.</div> : null}
          {status === 'ready' && !rows.length ? <div className={'panel'}>아직 저장된 캐릭터가 없습니다.</div> : null}
          {status === 'ready' ? rows.map((row) => <RankingRow row={row} role={role} key={`${row.serverId}:${row.characterId}`} />) : null}
        </section>

        {status === 'ready' && pageNumbers.length ? (
          <nav className={'setting-value-pagination'} aria-label={'랭킹 페이지'}>
            <button type={'button'} disabled={pagination.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>이전</button>
            {pageNumbers.map((pageNumber) => (
              <button
                type={'button'}
                className={pageNumber === pagination.page ? 'is-active' : ''}
                aria-current={pageNumber === pagination.page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
                key={pageNumber}
              >
                {pageNumber}
              </button>
            ))}
            <button type={'button'} disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>다음</button>
          </nav>
        ) : null}

      </main>

      <footer className={'neople-bi-footer setting-value-footer'}>
        <SiteLegalFooter />
      </footer>
    </div>
  );
}
