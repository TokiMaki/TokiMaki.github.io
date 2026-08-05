export function getLoadoutRarityClass(itemOrRarity) {
  const rarity = typeof itemOrRarity === 'string'
    ? itemOrRarity.trim()
    : String(itemOrRarity?.itemRarity || '').trim();
  if (rarity.includes('레어')) return 'is-rare';
  if (rarity.includes('태초')) return 'is-primeval';
  if (rarity.includes('에픽')) return 'is-epic';
  if (rarity.includes('레전더리')) return 'is-legendary';
  if (rarity.includes('유니크')) return 'is-unique';
  return '';
}
