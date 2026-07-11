import { useEffect, useRef, useState } from 'react';
import logoImage from '../../이미지/로고/logo.png';
import SiteLegalFooter from './SiteLegalFooter';

const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL?.trim() || 'dunpilot.feedback@gmail.com';
const PAGE_TITLE = '던파일럿 소개 - 던파 스펙업 순서와 골드 효율 분석';
const PAGE_DESCRIPTION = '던파일럿은 던전앤파이터 캐릭터의 현재 세팅을 분석해 골드 대비 효율이 좋은 스펙업 순서를 추천합니다.';

const SUMMARY_ITEMS = [
  ['캐릭터 맞춤 분석', '현재 착용 장비와 세팅을 기준으로 분석합니다.'],
  ['골드 효율 비교', '예상 비용과 실제 상승량을 함께 계산합니다.'],
  ['추천 순서 제공', '효율이 좋은 스펙업부터 한눈에 확인할 수 있습니다.'],
];

const FEATURE_ITEMS = [
  ['통합 스펙업 분석', '마법부여, 증폭, 칭호, 크리쳐, 오라 등 여러 스펙업 요소를 한 번에 비교합니다.'],
  ['캐릭터 맞춤 추천', '정해진 추천표가 아니라 현재 캐릭터의 장비와 스펙을 기준으로 계산합니다.'],
  ['예상 상승량 비교', '각 스펙업으로 증가하는 예상 딜 또는 버프 상승량을 확인할 수 있습니다.'],
  ['골드 효율 계산', '딜 상승량 또는 버프점수 상승량과 필요한 골드를 비교합니다.'],
  ['경매장 시세 반영', '거래 가능한 아이템은 확인된 경매장 가격을 비용 계산에 반영합니다.'],
  ['상세 계산 확인', '추천 항목 위에 마우스를 올리면 예상 비용과 상승량 등 자세한 정보를 확인할 수 있습니다.'],
];

const ANALYSIS_ITEMS = [
  '마법부여',
  '증폭',
  '칭호',
  '크리쳐',
  '오라',
  '버프강화',
  '짙은 심연의 편린',
  '플래티넘 엠블렘',
  '스위칭 아바타',
  '장비 조율',
  '흑아',
];

const GUIDE_STEPS = [
  ['캐릭터 검색', '서버와 캐릭터명을 입력해 분석할 캐릭터를 검색합니다.'],
  ['캐릭터 분석', '현재 장비와 스펙업 상태를 불러와 비교 가능한 항목을 계산합니다.'],
  ['추천 순서 확인', '골드 대비 효율이 좋은 스펙업부터 추천 목록으로 확인합니다.'],
  ['상세 정보 확인', '항목을 선택해 예상 비용과 상승량, 계산 기준을 자세히 확인합니다.'],
];

const RESULT_ITEMS = [
  ['앞에 있을수록 효율적', '추천 목록에서 위쪽과 왼쪽에 있는 항목일수록 현재 캐릭터 기준 골드 효율이 좋습니다.'],
  ['시세에 따라 달라지는 추천', '경매장 시세가 변하면 예상 비용과 추천 순서도 달라질 수 있습니다.'],
  ['상황에 맞게 선택', '추천 결과는 효율을 비교하기 위한 기준이며, 플레이 방향과 보유 재료에 따라 선택이 달라질 수 있습니다.'],
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

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const previousDescription = descriptionMeta?.getAttribute('content') || '';
    const previousCanonical = canonicalLink?.getAttribute('href') || '';

    document.title = PAGE_TITLE;
    descriptionMeta?.setAttribute('content', PAGE_DESCRIPTION);
    canonicalLink?.setAttribute('href', 'https://www.dunpilot.com/about');

    return () => {
      window.clearTimeout(feedbackStatusTimerRef.current);
      document.title = previousTitle;
      descriptionMeta?.setAttribute('content', previousDescription);
      canonicalLink?.setAttribute('href', previousCanonical);
    };
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
            <h1 id={'about-title'}>던파일럿 소개</h1>
            <p>내 캐릭터의 스펙업 순서와 골드 효율을 한눈에 분석해주는 서비스</p>
          </div>
          <a className={'about-primary-action'} href={'/'}>내 캐릭터 분석하기</a>
        </section>

        <section className={'about-section'} aria-labelledby={'about-service-title'}>
          <div className={'about-section-heading'}>
            <h2 id={'about-service-title'}>던파일럿이란?</h2>
            <p>던파일럿은 던전앤파이터 캐릭터의 현재 세팅을 분석해 골드 대비 효율이 좋은 스펙업을 순서대로 보여주는 서비스입니다.</p>
            <p>마법부여, 증폭, 칭호, 크리쳐, 오라, 버프강화 등 여러 스펙업 요소를 같은 기준으로 비교합니다.</p>
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
