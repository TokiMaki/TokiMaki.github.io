import { useEffect, useRef, useState } from 'react';
import logoImage from '../../이미지/로고/logo.png';
import SiteLegalFooter from './SiteLegalFooter';

const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL?.trim() || 'dunpilot.feedback@gmail.com';

const SUMMARY_ITEMS = [
  ['캐릭터 기준', '정해진 추천표가 아니라 현재 캐릭터의 세팅을 기준으로 계산합니다.'],
  ['역할별 계산', '딜러와 버퍼의 스펙업 효과를 서로 다른 기준으로 비교합니다.'],
  ['비용 반영', '경매장 시세와 제작·성장에 필요한 재료비를 함께 계산합니다.'],
];

const FEATURE_ITEMS = [
  ['스펙업 순서 추천', '여러 스펙업 후보의 상승량과 비용을 비교해 효율이 좋은 순서로 보여줍니다.'],
  ['점수와 예상 변화', '현재 장비점수 또는 버프점수와 스펙업 후 예상 변화를 함께 확인할 수 있습니다.'],
  ['로드아웃 확인', '장비, 서약, 아바타와 버프강화 상태를 탭으로 나누어 확인할 수 있습니다.'],
  ['스펙업 시뮬레이터', '여러 추천을 조합해 변경된 로드아웃과 누적 골드를 미리 확인할 수 있습니다.'],
  ['포함 항목 선택', '원하는 스펙업 종류만 골라 추천 목록과 순서를 다시 비교할 수 있습니다.'],
  ['캐릭터 랭킹', '장비점수·버프점수, 명성, 세팅 추정 가치 기준으로 캐릭터 세팅을 비교할 수 있습니다.'],
];

const ANALYSIS_ITEMS = [
  '마법부여',
  '강화·증폭',
  '장비 조율',
  '서약 조율·초월·정가',
  '칭호·보주',
  '크리쳐·아티팩트',
  '오라',
  '버프강화',
  '아바타·엠블렘',
  '흑아',
  '유일 장비 제작·정밀',
];

const GUIDE_STEPS = [
  ['캐릭터 검색', '서버와 캐릭터명을 입력합니다. 전체 서버 검색이나 저장된 모험단 검색도 사용할 수 있습니다.'],
  ['현재 세팅 확인', '상단 점수와 로드아웃 탭에서 현재 장비, 서약, 아바타와 버프강화 상태를 확인합니다.'],
  ['추천 범위 선택', '포함 항목에서 비교할 스펙업 종류를 고릅니다. 선택한 범위에 맞춰 추천 순서가 정리됩니다.'],
  ['시뮬레이션', '추천 카드를 눌러 예상 결과를 적용합니다. 다른 후보로 교체하거나 같은 카드를 다시 눌러 되돌릴 수 있습니다.'],
  ['결과 확인', '예상 점수, 변경된 로드아웃과 누적 골드를 확인합니다. 전체 초기화를 누르면 검색 직후 상태로 돌아갑니다.'],
];

const RESULT_ITEMS = [
  ['상승량', '딜러는 예상 딜 상승률, 버퍼는 버프점수 상승량을 중심으로 표시합니다.'],
  ['추천 순서와 색상', '딜러는 딜 0.1%당 골드, 버퍼는 버프점수 100점당 골드가 낮을수록 효율적입니다. 카드 색상은 범례와 같은 기준을 사용합니다.'],
  ['예상 비용', '카드 상세에서 아이템 가격과 필요한 재료를 확인할 수 있습니다. 시뮬레이션 중에는 적용한 항목의 누적 골드도 함께 표시됩니다.'],
];

function InfoCard({ title, description }) {
  return (
    <article className={'about-info-card'}>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

export default function AboutPage() {
  const [feedbackCopyStatus, setFeedbackCopyStatus] = useState('');
  const feedbackStatusTimerRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(feedbackStatusTimerRef.current);
  }, []);

  const handleFeedbackEmailCopy = async () => {
    let message = '메일 주소가 복사되었습니다';
    try {
      await copyTextToClipboard(FEEDBACK_EMAIL);
    } catch {
      message = FEEDBACK_EMAIL;
    }
    window.clearTimeout(feedbackStatusTimerRef.current);
    setFeedbackCopyStatus(message);
    feedbackStatusTimerRef.current = window.setTimeout(() => setFeedbackCopyStatus(''), 1800);
  };

  return (
    <main className={'about-page'}>
      <header className={'about-header'}>
        <a className={'about-home-link'} href={'/'} aria-label={'던파일럿 메인으로'}>
          <img className={'about-logo-image'} src={logoImage} alt={'던파일럿'} />
        </a>
      </header>

      <div className={'about-content'}>
        <section className={'about-hero'} aria-labelledby={'about-title'}>
          <div>
            <p className={'about-eyebrow'}>DUNPILOT GUIDE</p>
            <h1 id={'about-title'}>던파일럿 이용 가이드</h1>
            <p>내 캐릭터의 스펙업 순서와 적용 결과를 확인하는 방법</p>
          </div>
          <a className={'about-primary-action'} href={'/'}>내 캐릭터 분석하기</a>
        </section>

        <section className={'about-section'} aria-labelledby={'about-service-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-service-title'}>던파일럿이란?</h2>
            <p>던파일럿은 던전앤파이터 캐릭터의 현재 세팅을 분석해 골드 대비 효율이 좋은 스펙업을 순서대로 보여주는 서비스입니다.</p>
            <p>딜러와 버퍼의 계산 기준을 구분하고, 추천을 직접 적용해 점수·로드아웃·누적 비용이 어떻게 달라지는지 미리 확인할 수 있습니다.</p>
          </div>
          <div className={'about-summary-grid'}>
            {SUMMARY_ITEMS.map(([title, description]) => (
              <InfoCard key={title} title={title} description={description} />
            ))}
          </div>
        </section>

        <section className={'about-section'} aria-labelledby={'about-features-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-features-title'}>주요 기능</h2>
          </div>
          <div className={'about-feature-grid'}>
            {FEATURE_ITEMS.map(([title, description]) => (
              <InfoCard key={title} title={title} description={description} />
            ))}
          </div>
        </section>

        <section className={'about-section'} aria-labelledby={'about-analysis-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-analysis-title'}>분석 항목</h2>
          </div>
          <div className={'about-analysis-grid'}>
            {ANALYSIS_ITEMS.map((item) => (
              <span className={'about-analysis-item'} key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className={'about-section'} aria-labelledby={'about-guide-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-guide-title'}>이용 방법</h2>
          </div>
          <ol className={'about-step-list'}>
            {GUIDE_STEPS.map(([title, description], index) => (
              <li className={'about-step'} key={title}>
                <span className={'about-step-number'} aria-hidden={'true'}>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={'about-section'} aria-labelledby={'about-results-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-results-title'}>결과를 보는 방법</h2>
          </div>
          <div className={'about-result-grid'}>
            {RESULT_ITEMS.map(([title, description]) => (
              <InfoCard key={title} title={title} description={description} />
            ))}
          </div>
        </section>

        <section className={'about-section about-contact'} aria-labelledby={'about-contact-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-contact-title'}>피드백 및 문의</h2>
            <p>이용 중 오류를 발견했거나 추가되었으면 하는 기능이 있다면 알려주세요.</p>
          </div>
          <div className={'about-contact-actions'}>
            <button className={'about-secondary-action'} type={'button'} onClick={handleFeedbackEmailCopy}>문의 이메일 복사</button>
            <a className={'about-primary-action'} href={'/'}>던파일럿으로 돌아가기</a>
          </div>
        </section>
      </div>
      <span className={`feedback-mail-status${feedbackCopyStatus ? ' is-visible' : ''}`} role={'status'} aria-live={'polite'}>
        {feedbackCopyStatus}
      </span>
      <footer className={'neople-bi-footer document-page-footer'}>
        <SiteLegalFooter />
      </footer>
    </main>
  );
}
