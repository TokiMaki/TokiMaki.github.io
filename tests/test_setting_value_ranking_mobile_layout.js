import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/components/SettingValueRankingPage.jsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../src/styles/setting-value-ranking.css', import.meta.url),
  'utf8',
);

assert.match(source, /useLayoutEffect/);
assert.match(source, /new ResizeObserver\(updateZoom\)/);
assert.match(source, /--setting-value-loadout-zoom/);
assert.match(source, /className=\{'setting-value-loadout-content'\}/);

assert.match(
  styles,
  /grid-template-areas:\s*'rank character metrics'\s*'loadout loadout loadout'/,
);
assert.match(
  styles,
  /grid-template-columns: 34px minmax\(110px, 132px\) minmax\(122px, 1fr\)/,
);
assert.match(styles, /\.setting-value-loadout-content\s*\{[^}]*zoom: var\(--setting-value-loadout-zoom, 1\)/s);
assert.match(styles, /\.setting-value-gold strong\s*\{[^}]*white-space: normal/s);
assert.match(styles, /\.setting-value-row\s*\{[^}]*min-width: 0/s);
assert.match(styles, /\.setting-value-ranking-list\s*\{[^}]*overflow-x: visible/s);
assert.match(source, /window\.matchMedia\('\(max-width: 956px\)'\)/);
assert.match(source, /const RANKING_COMPACT_STACKED_MIN_WIDTH = 266/);
assert.match(source, /const RANKING_ROW_ZOOM_GUTTER = 2/);
assert.match(source, /const MIN_READABLE_LOADOUT_ZOOM = 0\.75/);
assert.match(source, /isStacked = singleLineZoom <= MIN_READABLE_LOADOUT_ZOOM/);
assert.match(source, /classList\.toggle\('is-stacked-loadout', isStacked && singleLineQuery\.matches\)/);
assert.match(source, /const reliableNaturalWidth = content\.scrollWidth/);
assert.match(source, /const shouldZoomRow = containerWidth < requiredLogicalWidth/);
assert.match(source, /const availableRowWidth = containerWidth/);
assert.match(source, /logicalRowWidth = Math\.max\(availableRowWidth, requiredLogicalWidth\)/);
assert.match(source, /setCustomProperty\(rowElement, '--setting-value-row-zoom', rowZoom\)/);
assert.match(source, /className=\{'setting-value-row-viewport'\}/);
assert.doesNotMatch(source, /setting-value-row-scale|setting-value-row-height/);
assert.match(source, /--setting-value-row-width', nextRowWidth/);
assert.match(styles, /@media \(max-width: 750px\)/);
assert.match(styles, /@media \(min-width: 751px\) and \(max-width: 956px\)/);
assert.match(
  styles,
  /grid-template-columns: 44px 150px 166px minmax\(0, 1fr\)/,
);
assert.match(styles, /grid-template-areas: 'rank character metrics loadout'/);
assert.match(
  styles,
  /\.setting-value-loadout\s*\{[^}]*display: grid;[^}]*align-items: center;/,
);
assert.match(
  styles,
  /@media \(min-width: 751px\) and \(max-width: 956px\)[\s\S]*?\.setting-value-loadout-content\s*\{[^}]*zoom: var\(--setting-value-loadout-zoom, 1\)/,
);
assert.match(
  styles,
  /\.setting-value-row\.is-stacked-loadout\s*\{[^}]*grid-template-areas:\s*'rank character metrics'\s*'loadout loadout loadout'/s,
);
assert.match(styles, /\.setting-value-row\.is-stacked-loadout \.setting-value-loadout-content\s*\{[^}]*margin: 0 auto/s);
assert.doesNotMatch(styles, /@media \(min-width: 751px\) and \(max-width: 956px\)[\s\S]*?\.setting-value-loadout-strips\s*\{[^}]*display: flex/);
assert.match(
  styles,
  /width: var\(--setting-value-row-width, 100%\);[\s\S]*?zoom: var\(--setting-value-row-zoom, 1\)/,
);
assert.doesNotMatch(styles, /--setting-value-row-side-padding/);
assert.doesNotMatch(styles, /\.setting-value-row-viewport\.is-row-zoomed/);
assert.match(styles, /\.setting-value-row\.is-stacked-loadout \.setting-value-loadout\s*\{[^}]*padding: 10px 10px 12px;/s);
assert.doesNotMatch(styles, /transform: scale\(var\(--setting-value-row-scale/);
assert.match(source, /reliableNaturalWidth \* MIN_READABLE_LOADOUT_ZOOM[\s\S]*?\+ RANKING_ROW_ZOOM_GUTTER/);
assert.doesNotMatch(source, /rowPaddingWidth|rowSidePadding|is-row-zoomed/);
assert.match(source, /\(availableRowWidth - RANKING_ROW_ZOOM_GUTTER\) \/ logicalRowWidth/);
assert.match(source, /loadoutZoom = shouldZoomRow[\s\S]*?\? MIN_READABLE_LOADOUT_ZOOM/);

console.log('setting value ranking mobile layout tests passed');
