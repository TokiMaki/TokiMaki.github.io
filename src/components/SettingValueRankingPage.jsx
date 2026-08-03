import logoImage from '../../이미지/로고/logo.png';
import equipmentScoreIcon from '../../이미지/equipmentScore.png';
import fameIcon from '../../이미지/fame.png';
import fairyPrimeval from '../../이미지/Oath/02fairy/primeval.webp';
import goldPrimeval from '../../이미지/Oath/03gold/primeval.webp';
import dragonPrimeval from '../../이미지/Oath/04dragon/primeval.webp';
import fairyEpic from '../../이미지/Oath/02fairy/epic.png';
import goldEpic from '../../이미지/Oath/03gold/epic.png';
import dragonEpic from '../../이미지/Oath/04dragon/epic.png';
import shadowEpic from '../../이미지/Oath/01shadow/epic.png';
import natureEpic from '../../이미지/Oath/08nature/epic.png';
import wolfEpic from '../../이미지/Oath/11wolf/epic.png';
import fairyLegendary from '../../이미지/Oath/02fairy/legendary.png';
import fairyUnique from '../../이미지/Oath/02fairy/unique.png';
import { SETTING_VALUE_RANKING_ROWS } from '../data/settingValueRankingMockData.js';
import { getCharacterAvatarClass, getCharacterAvatarUrl } from '../dnfHellTool/characterPresentation.js';
import SiteLegalFooter from './SiteLegalFooter.jsx';
import '../styles/setting-value-ranking.css';

const OATH_ICONS = [
  ['로열 페어리 태초 결정', 'primeval', fairyPrimeval],
  ['황금향 태초 결정', 'primeval', goldPrimeval],
  ['용제 태초 결정', 'primeval', dragonPrimeval],
  ['로열 페어리 에픽 결정', 'epic', fairyEpic],
  ['황금향 에픽 결정', 'epic', goldEpic],
  ['용제 에픽 결정', 'epic', dragonEpic],
  ['그림자 에픽 결정', 'epic', shadowEpic],
  ['자연 에픽 결정', 'epic', natureEpic],
  ['늑대 에픽 결정', 'epic', wolfEpic],
  ['로열 페어리 레전더리 결정', 'legendary', fairyLegendary],
  ['로열 페어리 유니크 결정', 'unique', fairyUnique],
].map(([name, rarity, iconUrl]) => ({ name, rarity, iconUrl }));

function itemIconUrl(itemId) {
  return `https://img-api.neople.co.kr/df/items/${encodeURIComponent(itemId)}`;
}

function getOathRow(offset) {
  return [...OATH_ICONS.slice(offset), ...OATH_ICONS.slice(0, offset)];
}

function CharacterFace({ character }) {
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
  const enchantTierClass = equipment.enchantTier === 'end' ? ' is-end' : '';
  return (
    <span className={`setting-value-equipment-item${highlightClass}`} title={equipment.slot}>
      <span className={`enchant-character-slot is-${equipment.rarity}`} aria-label={equipment.slot}>
        <img src={itemIconUrl(equipment.itemId)} alt={''} loading={'lazy'} decoding={'async'} />
        <span className={'enchant-character-slot-enchant-badges'}>
          <span
            className={`enchant-character-slot-enchant-badge${enchantTierClass}`}
            title={equipment.enchantTier === 'end' ? '종결 마법부여' : '마법부여'}
          >
            {equipment.enchantBadge}
          </span>
        </span>
      </span>
      <span className={`enchant-character-slot-badge enchant-character-slot-badge-${equipment.isAmplified ? 'amplify' : 'reinforce'}`}>
        +{equipment.reinforce}
      </span>
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

function RankingRow({ row }) {
  const oathRow = getOathRow(row.oathOffset);
  return (
    <article className={`setting-value-row is-rank-${row.rank}`}>
      <div className={'setting-value-rank'}>{row.rank}</div>
      <div className={'setting-value-character'}>
        <CharacterFace character={row.character} />
        <div className={'setting-value-character-copy'}>
          <strong>{row.character.name}</strong>
          <span>{row.serverLabel}</span>
          <span>{row.character.jobGrowName}</span>
        </div>
      </div>
      <div className={'setting-value-metrics'}>
        <div className={'setting-value-equipment-score'} title={'장비점수'}>
          <img src={equipmentScoreIcon} alt={''} />
          <strong>{row.equipmentScore.toLocaleString('ko-KR')}</strong>
        </div>
        <div className={'setting-value-fame'} title={'명성'}>
          <img src={fameIcon} alt={''} />
          <strong>{row.fame.toLocaleString('ko-KR')}</strong>
        </div>
        <div className={'setting-value-gold'}>
          <span>세팅 추정 가치</span>
          <strong>{row.settingValue}</strong>
        </div>
      </div>
      <div className={'setting-value-loadout'}>
        <div className={'setting-value-loadout-line'}>
          <span className={'setting-value-loadout-label'}>장비</span>
          <div className={'setting-value-equipment-strip'}>
            {row.equipment.map((equipment) => <EquipmentIcon equipment={equipment} key={equipment.slot} />)}
          </div>
        </div>
        <div className={'setting-value-loadout-line'}>
          <span className={'setting-value-loadout-label'}>서약</span>
          <div className={'setting-value-oath-strip'}>
            {oathRow.map((oath, index) => (
              <span className={`enchant-oath-slot is-${oath.rarity}`} title={oath.name} key={`${oath.name}-${index}`}>
                <img src={oath.iconUrl} alt={''} loading={'lazy'} decoding={'async'} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SettingValueRankingPage() {
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
            <p>가격 산정 가능 항목의 현재가 기준 추정 가치와 캐릭터 세팅을 함께 봅니다.</p>
          </div>
          <span className={'setting-value-draft-badge'}>프론트 배치 시안</span>
        </section>

        <section className={'panel setting-value-filter-panel'} aria-label={'랭킹 필터'}>
          <div className={'setting-value-filter-group'}>
            <span>역할</span>
            <div className={'setting-value-role-buttons'}>
              <button type={'button'} className={'is-active'}>딜러</button>
              <button type={'button'}>버퍼</button>
            </div>
          </div>
          <label className={'setting-value-filter-group'}>
            <span>직업</span>
            <select defaultValue={'all'}>
              <option value={'all'}>전체 직업</option>
              <option value={'rogue'}>眞 로그</option>
              <option value={'mechanic'}>眞 메카닉</option>
            </select>
          </label>
          <label className={'setting-value-filter-group'}>
            <span>정렬</span>
            <select defaultValue={'value'}>
              <option value={'value'}>세팅 추정 가치 순</option>
              <option value={'score'}>장비점수 순</option>
              <option value={'fame'}>명성 순</option>
            </select>
          </label>
        </section>

        <section className={'setting-value-ranking-list'} aria-label={'세팅 가치 랭킹'}>
          {SETTING_VALUE_RANKING_ROWS.map((row) => <RankingRow row={row} key={row.rank} />)}
        </section>

        <p className={'setting-value-footnote'}>
          현재 수치와 세팅 추정 가치는 프론트 배치 확인용 목업입니다.
        </p>
      </main>

      <footer className={'neople-bi-footer setting-value-footer'}>
        <SiteLegalFooter />
      </footer>
    </div>
  );
}
