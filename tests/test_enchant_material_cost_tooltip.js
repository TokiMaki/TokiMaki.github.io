import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function read(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

function formatEok(value) {
  const eok = Number(value) / 100_000_000;
  return `${Number.isInteger(eok) ? eok : eok.toLocaleString('ko-KR')}억`;
}

const markup = read('../src/components/DnfHellToolMarkup.jsx');
const styles = read('../src/styles/supply.css');
const relicCraftDb = JSON.parse(read('../Docs/relic_craft_db.json'));
const expectedManualMaterials = relicCraftDb.crafts.flatMap((recipe) => {
  const manualPrices = recipe.manualPrices || {};
  return Object.entries(manualPrices).map(([key, price]) => {
    const material = recipe.baseCraft?.materials?.find((candidate) => candidate.key === key);
    return {
      itemId: material?.itemId || '',
      itemName: material?.label || '',
      priceLabel: formatEok(price.unitPrice),
    };
  });
});

assert.deepEqual(expectedManualMaterials, [
  {
    itemId: '679cacdbd935ea441d207501ebe4b0cb',
    itemName: '힘을 잃은 기품의 향수병',
    priceLabel: '12억',
  },
  {
    itemId: '5a6fffbe89d6d4ffc92b606dfce09b77',
    itemName: '힘을 잃은 날씨의 큐브',
    priceLabel: '35억',
  },
]);

assert.match(markup, /import relicCraftDb from '\.\.\/\.\.\/Docs\/relic_craft_db\.json';/);
assert.match(markup, /Object\.entries\(craft\.manualPrices \|\| \{\}\)/);
assert.match(markup, /formatUniqueCraftBasePrice\(price\.unitPrice\)/);
assert.match(markup, /className=\{'enchant-material-cost-option-wrap'\}/);
assert.match(markup, /aria-describedby=\{'enchantMaterialCostTooltip'\}/);
assert.match(markup, /id=\{'enchantMaterialCostTooltip'\} role=\{'tooltip'\}/);
assert.match(markup, /경매장에서 구매할 수 있는 모든 재료를 경매장가로 비용에 포함합니다\./);
assert.match(markup, /유일 제작 재료 기준가/);
assert.match(markup, /UNIQUE_CRAFT_BASE_PRICE_ITEMS\.map/);

assert.match(markup, /https:\/\/img-api\.neople\.co\.kr\/df\/items\/\$\{encodeURIComponent\(item\.itemId\)\}/);
assert.match(styles, /\.enchant-material-cost-tooltip \{/);
assert.match(styles, /\.enchant-material-cost-base-price img \{/);
assert.match(styles, /\.enchant-material-cost-option-wrap:hover \.enchant-material-cost-tooltip/);
assert.match(styles, /\.enchant-material-cost-option-wrap:focus-within \.enchant-material-cost-tooltip/);

console.log('enchant material cost tooltip: ok');
