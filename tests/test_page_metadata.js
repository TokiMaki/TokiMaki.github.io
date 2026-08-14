import assert from 'node:assert/strict';
import { getPageMetadataForLocation } from '../src/seo/pageMetadata.js';

const root = getPageMetadataForLocation({ pathname: '/', search: '' });
assert.equal(root.robots, 'index,follow');
assert.equal(root.canonical, 'https://www.dunpilot.com/');
assert.match(root.title, /던파 스펙업 순서/);
assert.match(root.description, /가성비 좋은 스펙업 순서/);
assert.match(root.description, /장비점수·버프점수 변화/);
assert.doesNotMatch(root.description, /공식/);

const characterResult = getPageMetadataForLocation({
  pathname: '/',
  search: '?server=cain&name=%ED%85%8C%EC%8A%A4%ED%8A%B8',
});
assert.equal(characterResult.robots, 'index,follow');
assert.equal(characterResult.canonical, 'https://www.dunpilot.com/?server=cain&name=%ED%85%8C%EC%8A%A4%ED%8A%B8');
assert.equal(characterResult.openGraph.url, 'https://www.dunpilot.com/?server=cain&name=%ED%85%8C%EC%8A%A4%ED%8A%B8');
assert.match(characterResult.title, /테스트 캐릭터 분석 결과/);

const candidateSearch = getPageMetadataForLocation({
  pathname: '/',
  search: '?server=all&name=%ED%85%8C%EC%8A%A4%ED%8A%B8',
});
assert.equal(candidateSearch.robots, 'noindex,follow');
assert.equal(candidateSearch.canonical, 'https://www.dunpilot.com/');

const restoredRoot = getPageMetadataForLocation({ pathname: '/', search: '' });
assert.deepEqual(restoredRoot, root, 'returning to the landing URL must restore root metadata');

const about = getPageMetadataForLocation({ pathname: '/about/', search: '' });
assert.equal(about.robots, 'index,follow');
assert.equal(about.canonical, 'https://www.dunpilot.com/about/');
assert.notEqual(about.title, root.title);

const ranking = getPageMetadataForLocation({ pathname: '/ranking/', search: '' });
assert.equal(ranking.robots, 'index,follow');
assert.equal(ranking.canonical, 'https://www.dunpilot.com/ranking/');
assert.equal(ranking.title, '랭킹 | 던파일럿');

const privacy = getPageMetadataForLocation({ pathname: '/privacy/', search: '' });
assert.equal(privacy.robots, 'noindex,follow');
assert.equal(privacy.canonical, 'https://www.dunpilot.com/privacy/');
assert.match(privacy.title, /개인정보 처리방침/);

const unknown = getPageMetadataForLocation({ pathname: '/missing-page', search: '' });
assert.equal(unknown.robots, 'noindex,follow');
assert.equal(unknown.canonical, 'https://www.dunpilot.com/missing-page');
assert.match(unknown.title, /페이지를 찾을 수 없습니다/);

console.log('page metadata tests passed');
