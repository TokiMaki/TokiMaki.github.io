import neopleBiImage from '../../이미지/BI/BI.png';

export default function SiteLegalFooter() {
  return (
    <>
      <a href={'https://developers.neople.co.kr'} target={'_blank'} rel={'noopener noreferrer'}>
        <img src={neopleBiImage} alt={'Neople 오픈 API'} />
      </a>
      <p className={'footer-copyright'}>Copyright © dunpilot All rights reserved.</p>
      <nav className={'footer-page-links'} aria-label={'사이트 안내'}>
        <a href={'/privacy'}>개인정보 처리방침</a>
        <span aria-hidden={'true'}>|</span>
        <a href={'/about'}>이용 가이드</a>
      </nav>
    </>
  );
}
