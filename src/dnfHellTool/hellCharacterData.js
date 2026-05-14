export function normalizeCharacters(parsed) {
  if (!Array.isArray(parsed)) {
    throw new Error('캐릭터 데이터는 배열이어야 합니다.');
  }

  return parsed.map((character, characterIndex) => {
    const serverId = String(character.serverId ?? '').trim().toLowerCase();
    const characterId = String(character.characterId ?? '').trim();
    const name = String(character.displayName ?? character.name ?? `캐릭 ${characterIndex + 1}`);
    const jobId = String(character.jobId ?? character.job_id ?? '').trim();
    const jobName = String(character.jobName ?? character.job_name ?? '').trim();
    const jobGrowId = String(character.jobGrowId ?? character.job_grow_id ?? '').trim();
    const jobGrowName = String(character.jobGrowName ?? character.job_grow_name ?? '').trim();
    const key = String(
      character.key
      ?? (serverId && characterId ? `${serverId}:${characterId}` : '')
      ?? name
    ).trim() || name;

    if (!Array.isArray(character.sets) || character.sets.length === 0) {
      throw new Error(`${name}의 sets 배열이 비어 있습니다.`);
    }

    const sets = character.sets.map((item, setIndex) => {
      const setName = String(item.name ?? `세트 ${setIndex + 1}`);
      const taecho = Number(item.taecho ?? 0);
      const epic = Number(item.epic ?? 0);

      if (!Number.isFinite(taecho) || !Number.isFinite(epic)) {
        throw new Error(`${name} - ${setName}의 값이 숫자가 아닙니다.`);
      }
      if (taecho < 0 || epic < 0) {
        throw new Error(`${name} - ${setName}의 값이 올바르지 않습니다. taecho와 epic은 0 이상이어야 합니다.`);
      }

      return { name: setName, taecho, epic };
    });
    const setNameSet = new Set(sets.map((set) => set.name));
    const providedAliveSetNames = Array.isArray(character.aliveSetNames) ? character.aliveSetNames : null;
    const aliveSetNames = providedAliveSetNames
      ? [...new Set(providedAliveSetNames.map((name) => String(name)).filter((name) => setNameSet.has(name)))]
      : sets.map((set) => set.name);

    return {
      key,
      serverId,
      characterId,
      name,
      jobId,
      jobName,
      jobGrowId,
      jobGrowName,
      sets,
      aliveSetNames: aliveSetNames.length ? aliveSetNames : sets.map((set) => set.name),
    };
  });
}
