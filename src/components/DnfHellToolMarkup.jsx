import logoImage from '../../이미지/로고/logo.png';
import gmailImage from '../../이미지/로고/Gmail.svg';
import neopleBiImage from '../../이미지/BI/BI.png';

import HellCalculatorTab from './HellCalculatorTab';
import RevelationManagerTab from './RevelationManagerTab';
const ENABLE_DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_MODE === '1';
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL?.trim() || 'dunpilot.feedback@gmail.com';

export default function DnfHellToolMarkup() {
  return (
    <div className={'wrap'}>
      <section className={'landing-page'} id={'landingPage'}>
        <div className={'landing-orbit landing-orbit-one'} aria-hidden={'true'}></div>
        <div className={'landing-orbit landing-orbit-two'} aria-hidden={'true'}></div>
        <main className={'landing-card'}>
          <div className={'landing-kicker'}>DUNGEON &amp; FIGHTER SPEC GUIDE</div>
          <h1 className={'landing-logo-heading'}>
            <img className={'landing-logo-image'} src={logoImage} alt={'던파일럿'} />
          </h1>
          <p className={'landing-copy'}>
            <span>던파일럿이 캐릭터에 맞는 스펙업 순서를</span>
            <span>골드 효율 기준으로 추천해줄게양.</span>
          </p>
          <div className={'landing-search-row'} data-nosnippet>
            <label className={'landing-field'}>
              <span className={'sr-only'}>서버</span>
              <select id={'landingServerIdInput'} defaultValue={'all'}>
                <option value={'all'}>전체</option>
                <option value={'adventure'}>모험단</option>
                <option value={'cain'}>카인</option>
                <option value={'diregie'}>디레지에</option>
                <option value={'siroco'}>시로코</option>
                <option value={'prey'}>프레이</option>
                <option value={'casillas'}>카시야스</option>
                <option value={'hilder'}>힐더</option>
                <option value={'anton'}>안톤</option>
                <option value={'bakal'}>바칼</option>
              </select>
            </label>
            <label className={'landing-field landing-name-field'}>
              <span className={'sr-only'}>캐릭터명</span>
              <input id={'landingCharacterNameInput'} type={'search'} placeholder={'캐릭터명을 입력하세요'} autoComplete={'off'} enterKeyHint={'search'} />
            </label>
            <button type={'button'} className={'landing-search-button'} id={'landingSearchButton'}>스펙업 분석</button>
          </div>
          <div className={'landing-search-status'} id={'landingSearchStatus'}></div>
          <section className={'landing-recent'} id={'landingRecentSearches'} hidden>
            <div className={'landing-recent-title'}>최근 검색</div>
            <div className={'landing-recent-list'} id={'landingRecentSearchList'}></div>
          </section>
          <aside className={'landing-notice'}>
            <span>NOTICE</span>
            <div className={'landing-notice-list'} id={'landingNoticeList'}>
              <p>공지사항을 불러오는 중...</p>
            </div>
          </aside>
        </main>
      </section>
      <div className={'tool-shell'} id={'toolShell'} hidden>
      <section className={'hero'}>
        <h1 className={'site-logo-heading'}>
          <button type={'button'} className={'site-logo-home-button'} id={'siteLogoHomeButton'} aria-label={'메인으로'}>
            <img className={'site-logo-image'} src={logoImage} alt={'던파일럿'} />
          </button>
        </h1>
        <div className={'hero-actions'}>
          <div className={'tab-bar dev-only'} role={'tablist'} aria-label={'계산기 탭'}>
            <button type={'button'} className={'tab-button active'} id={'enchantTabButton'} data-tab-target={'enchantPanel'} aria-selected={'true'}>스펙업 순서</button>
            <button type={'button'} className={'tab-button dev-only'} id={'hellTabButton'} data-tab-target={'hellPanel'} aria-selected={'false'}>헬 계산기</button>
            <button type={'button'} className={'tab-button dev-only'} id={'supplyTabButton'} data-tab-target={'supplyPanel'} aria-selected={'false'}>계시 관리</button>
          </div>
        </div>
      </section>
      <HellCalculatorTab />
      <section className={'grid tab-panel'} id={'enchantPanel'}>
        <aside className={'panel enchant-search-panel'}>
          <div className={'loader-row supply-input-row enchant-input-row'}>
            <div className={'field'}>
              <label className={'sr-only'} htmlFor={'enchantServerIdInput'}>서버</label>
              <select id={'enchantServerIdInput'} defaultValue={'all'}>
                <option value={'all'}>전체</option>
                <option value={'adventure'}>모험단</option>
                <option value={'cain'}>카인</option>
                <option value={'diregie'}>디레지에</option>
                <option value={'siroco'}>시로코</option>
                <option value={'prey'}>프레이</option>
                <option value={'casillas'}>카시야스</option>
                <option value={'hilder'}>힐더</option>
                <option value={'anton'}>안톤</option>
                <option value={'bakal'}>바칼</option>
              </select>
            </div>
            <div className={'field'}>
              <label className={'sr-only'} htmlFor={'enchantCharacterNameInput'}>캐릭터명</label>
              <input id={'enchantCharacterNameInput'} type={'search'} placeholder={'캐릭터명'} autoComplete={'off'} enterKeyHint={'search'} />
            </div>
            <button type={'button'} className={'ghost-button enchant-search-button'} id={'loadEnchantCharacterButton'}>검색</button>
          </div>
        </aside>
        <section className={'panel enchant-include-card'} id={'enchantIncludeCard'}>
          <div className={'enchant-include-title'}>포함 항목</div>
          <div className={'enchant-include-controls'} id={'enchantIncludeControls'}></div>
          <div className={'enchant-route-options'}>
            <label className={'enchant-include-option enchant-route-option'}>
              <input id={'enchantTitleBeadOnlyToggle'} type={'checkbox'} defaultChecked />
              칭호 보주 포함 추천
            </label>
            <label className={'enchant-include-option enchant-route-option'} data-tooltip={'경매장에서 구매할 수 있는 모든 재료들를 경매장가로 비용에 포함합니다.'}>
              <input id={'enchantMaterialCostToggle'} type={'checkbox'} defaultChecked />
              재료값 포함
            </label>
          </div>
          <label className={'enchant-amplification-mode'}>
            <span>안전 증폭</span>
            <select id={'safeAmplificationModeSelect'} defaultValue={'normal'}>
              <option value={'normal'}>일반 안전 증폭</option>
              <option value={'event'}>안전 증폭 지원 이벤트</option>
            </select>
          </label>
        </section>
        <section className={'panel enchant-analysis-loading'} id={'enchantAnalysisLoading'} hidden aria-live={'polite'}>
          <div className={'enchant-analysis-loading-title'}>
            <span>분석중이에양</span>
            <span className={'enchant-analysis-loading-dots'} aria-hidden={'true'}>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          <div className={'enchant-analysis-loading-sub'}>캐릭터 장비와 스펙업 효율을 계산하고 있어양.</div>
        </section>
        <section className={'panel enchant-candidate-panel'} id={'enchantCandidatePanel'} hidden aria-live={'polite'}></section>
        <main className={'enchant-recommend-layout'} id={'enchantResultLayout'}>
          <div className={'card supply-detail-portrait-card enchant-character-portrait-card'} id={'enchantCharacterPortrait'}>
            <div className={'table-empty-cell'}>캐릭터 검색을 해주세요.</div>
          </div>
          <section className={'panel section enchant-recommend-stack'}>
            <div className={'enchant-recommend-head'}>
              <h2>
                <span>스펙업 순서 추천</span>
                <span className={'enchant-efficiency-help'} tabIndex={0} aria-label={'효율 색상 기준'}>?</span>
              </h2>
              <div className={'enchant-efficiency-legend'} id={'enchantEfficiencyLegend'}></div>
            </div>
            <div className={'enchant-recommend-grid'} id={'enchantRecommendList'}>
              <div className={'table-empty-cell'}>캐릭터 검색을 해주세요.</div>
            </div>
          </section>
        </main>
      </section>
      <RevelationManagerTab />
      {ENABLE_DEV_MODE ? (
        <div className={'utility-footer'}>
          <button type={'button'} className={'ghost-button footer-dev-toggle'} id={'devModeToggle'} aria-pressed={'false'}>개발자 모드</button>
        </div>
      ) : null}
      </div>
      <footer className={'neople-bi-footer'}>
        <div className={'feedback-footer'} aria-label={'오류 제보 및 피드백'}>
          <button
            type={'button'}
            className={'feedback-mail-button'}
            id={'feedbackEmailCopyButton'}
            data-feedback-email={FEEDBACK_EMAIL}
            disabled={!FEEDBACK_EMAIL}
            aria-describedby={'feedbackEmailCopyStatus'}
          >
            <span className={'feedback-mail-icon'} aria-hidden={'true'}>
              <img src={gmailImage} alt={''} />
            </span>
            <span className={'sr-only'}>오류 제보 및 피드백 메일 주소 복사</span>
          </button>
          <span className={'feedback-mail-label'}>오류 제보 및 피드백</span>
          <span className={'feedback-mail-status'} id={'feedbackEmailCopyStatus'} role={'status'} aria-live={'polite'}></span>
        </div>
        <a href={'https://developers.neople.co.kr'} target={'_blank'} rel={'noopener noreferrer'}>
          <img src={neopleBiImage} alt={'Neople 오픈 API'} />
        </a>
      </footer>
    </div>
  );
}
