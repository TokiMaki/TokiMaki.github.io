import { useEffect, useMemo, useState } from 'react';
import logoImage from '../../이미지/로고/logo.png';
import equipmentScoreIcon from '../../이미지/equipmentScore.png';
import bufferScoreIcon from '../../이미지/bufferScore.png';
import fameIcon from '../../이미지/fame.png';
import { getCharacterAvatarClass, getCharacterAvatarUrl } from '../dnfHellTool/characterPresentation.js';
import { API_BASE } from '../dnfHellTool/storageKeys.js';
import SiteLegalFooter from './SiteLegalFooter.jsx';
import '../styles/setting-value-ranking.css';

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

function getRarityClass(rarity) {
  return {
    커먼: 'common',
    언커먼: 'uncommon',
    레어: 'rare',
    유니크: 'unique',
    레전더리: 'legendary',
    에픽: 'epic',
    태초: 'primeval',
  }[String(rarity || '').trim()] || String(rarity || 'unknown').trim().toLowerCase();
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

function getAmplificationLevelClass(equipment) {
  if (!equipment.isAmplified) return '';
  const level = Math.floor(Number(equipment.reinforce || 0));
  if (!Number.isFinite(level) || level < 12) return '';
  return ` is-amplification-${Math.min(17, level)}`;
}

function EquipmentIcon({ equipment }) {
  const displayTuneLevel = Math.max(0, Math.min(3, Number(equipment.tuneLevel || 0)));
  const amplificationClass = getAmplificationLevelClass(equipment);
  const highlightClass = `${equipment.isRelic ? ' is-relic' : ''}${amplificationClass ? ` is-high-amplification${amplificationClass}` : ''}`;
  const rarityClass = getRarityClass(equipment.itemRarity);
  const iconUrl = equipment.iconUrl || itemIconUrl(equipment.itemId);
  return (
    <span className={`setting-value-equipment-item${highlightClass}`} title={`${equipment.slot}${equipment.itemName ? ` · ${equipment.itemName}` : ''}`}>
      <span className={`enchant-character-slot is-${rarityClass}`} aria-label={equipment.slot}>
        {iconUrl ? <img src={iconUrl} alt={''} loading={'lazy'} decoding={'async'} /> : null}
        {equipment.hasEnchant ? (
          <span className={'enchant-character-slot-enchant-badges'}>
            <span className={'enchant-character-slot-enchant-badge'} title={'마법부여 적용'}>마부</span>
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
  const iconUrl = oath.iconUrl || itemIconUrl(oath.itemId);
  return (
    <span
      className={`enchant-oath-slot is-${getRarityClass(oath.itemRarity)}`}
      title={oath.itemName || `서약 결정 ${index + 1}`}
    >
      {iconUrl ? <img src={iconUrl} alt={''} loading={'lazy'} decoding={'async'} /> : null}
    </span>
  );
}

function RankingRow({ row, role }) {
  const score = role === 'buffer' ? row.buffScore : row.equipmentScore;
  const scoreLabel = role === 'buffer' ? '버프점수' : '장비점수';
  const scoreIcon = role === 'buffer' ? bufferScoreIcon : equipmentScoreIcon;
  return (
    <article className={`setting-value-row is-rank-${row.rank}`}>
      <div className={'setting-value-rank'}>{row.rank}</div>
      <div className={'setting-value-character'}>
        <CharacterFace row={row} />
        <div className={'setting-value-character-copy'}>
          <strong>{row.characterName}</strong>
          <span>{SERVER_LABELS[row.serverId] || row.serverId}</span>
          <span>{row.jobGrowName || row.jobName}</span>
        </div>
      </div>
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
        <div className={'setting-value-loadout-line'}>
          <span className={'setting-value-loadout-label'}>장비</span>
          <div className={'setting-value-equipment-strip'}>
            {(row.equipment || []).map((equipment) => <EquipmentIcon equipment={equipment} key={equipment.slotId || equipment.slot} />)}
          </div>
        </div>
        <div className={'setting-value-loadout-line'}>
          <span className={'setting-value-loadout-label'}>서약</span>
          <div className={'setting-value-oath-strip'}>
            {(row.oath || []).map((oath, index) => <OathIcon oath={oath} index={index} key={`${oath.itemId || oath.itemName}-${index}`} />)}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SettingValueRankingPage() {
  const [role, setRole] = useState('dealer');
  const [sort, setSort] = useState('value');
  const [job, setJob] = useState('all');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    const query = new URLSearchParams({ role, sort, limit: '100' });
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
        setStatus('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setRows([]);
        setStatus('error');
      });
    return () => controller.abort();
  }, [role, sort]);

  const jobs = useMemo(() => [...new Set(rows.map((row) => row.jobGrowName || row.jobName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [rows]);
  const visibleRows = useMemo(() => (
    job === 'all' ? rows : rows.filter((row) => (row.jobGrowName || row.jobName) === job)
  ), [job, rows]);

  useEffect(() => {
    if (job !== 'all' && !jobs.includes(job)) setJob('all');
  }, [job, jobs]);

  return (
    <div className={'wrap setting-value-page'}>
      <header className={'hero setting-value-hero'}>
        <h1 className={'site-logo-heading'}>
          <a className={'site-logo-home-button'} href={'/'} aria-label={'던파일럿 메인으로'}>
            <img className={'site-logo-image'} src={logoImage} alt={'던파일럿'} />
          </a>
        </h1>
        <nav className={'tab-bar'} aria-label={'주요 메뉴'}>
          <a className={'tab-button setting-value-nav-link'} href={'/'}>스펙업 순서</a>
          <a className={'tab-button active setting-value-nav-link'} href={'/stats/'} aria-current={'page'}>세팅 가치</a>
        </nav>
      </header>

      <main className={'setting-value-main'}>
        <section className={'setting-value-title-block'}>
          <div>
            <span className={'setting-value-kicker'}>DUNPILOT PUBLIC CONTENT</span>
            <h2>세팅 가치 랭킹</h2>
            <p>던파일럿에서 스펙업 순서를 조회한 캐릭터의 세팅 추정 가치를 비교합니다.</p>
          </div>
        </section>

        <section className={'panel setting-value-filter-panel'} aria-label={'랭킹 필터'}>
          <div className={'setting-value-filter-group'}>
            <span>역할</span>
            <div className={'setting-value-role-buttons'}>
              <button type={'button'} className={role === 'dealer' ? 'is-active' : ''} onClick={() => setRole('dealer')}>딜러</button>
              <button type={'button'} className={role === 'buffer' ? 'is-active' : ''} onClick={() => setRole('buffer')}>버퍼</button>
            </div>
          </div>
          <label className={'setting-value-filter-group'}>
            <span>직업</span>
            <select value={job} onChange={(event) => setJob(event.target.value)}>
              <option value={'all'}>전체 직업</option>
              {jobs.map((jobName) => <option value={jobName} key={jobName}>{jobName}</option>)}
            </select>
          </label>
          <label className={'setting-value-filter-group'}>
            <span>정렬</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value={'value'}>세팅 추정 가치 순</option>
              <option value={'score'}>{role === 'buffer' ? '버프점수' : '장비점수'} 순</option>
              <option value={'fame'}>명성 순</option>
            </select>
          </label>
        </section>

        <section className={'setting-value-ranking-list'} aria-label={'세팅 가치 랭킹'}>
          {status === 'loading' ? <div className={'panel'}>랭킹을 불러오는 중...</div> : null}
          {status === 'error' ? <div className={'panel'}>랭킹을 불러오지 못했습니다.</div> : null}
          {status === 'ready' && !visibleRows.length ? <div className={'panel'}>아직 저장된 캐릭터가 없습니다.</div> : null}
          {status === 'ready' ? visibleRows.map((row) => <RankingRow row={row} role={role} key={`${row.serverId}:${row.characterId}`} />) : null}
        </section>

        <p className={'setting-value-footnote'}>
          캐릭터가 스펙업 순서를 다시 조회하면 최신 분석 결과로 갱신됩니다.
        </p>
      </main>

      <footer className={'neople-bi-footer setting-value-footer'}>
        <SiteLegalFooter />
      </footer>
    </div>
  );
}
