import heroAbilitiesData from './constants/hero_abilities.json';
import abilitiesData from './constants/abilities.json';
import abilityIdsData from './constants/ability_ids.json';

const heroAbilitiesMap = heroAbilitiesData as Record<
  string,
  { abilities: string[]; talents?: { name: string; level: number }[] }
>;

const abilitiesMap = abilitiesData as Record<
  string,
  { dname: string; img?: string }
>;

const abilityIdsMap = abilityIdsData as Record<string, string>;

export type HeroAbilityInfo = {
  name: string;
  dname: string;
  iconUrl: string;
  isUltimate: boolean;
  isInnate?: boolean;
};

export function getAbilityIconUrl(abilityName: string): string {
  if (!abilityName || abilityName === 'generic_hidden') {
    return 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/generic_hidden.png';
  }
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${abilityName}.png`;
}

export function getAbilityDname(abilityName: string): string {
  return abilitiesMap[abilityName]?.dname || abilityName.replace(/_/g, ' ');
}

export function getHeroAbilities(heroName: string): HeroAbilityInfo[] {
  const normHeroName = heroName.startsWith('npc_dota_hero_')
    ? heroName
    : `npc_dota_hero_${heroName}`;

  const data = heroAbilitiesMap[normHeroName];
  if (!data || !Array.isArray(data.abilities)) {
    return [];
  }

  // Filter out hidden abilities and sub-abilities
  const valid = data.abilities.filter(
    (a) =>
      a !== 'generic_hidden' &&
      !a.includes('_sub_') &&
      !a.includes('_ad_')
  );

  return valid.map((name, idx) => {
    const isUltimate = idx === 3 || name.includes('ultimate') || idx === valid.length - 1;
    const isInnate = name.includes('innate');
    return {
      name,
      dname: getAbilityDname(name),
      iconUrl: getAbilityIconUrl(name),
      isUltimate,
      isInnate,
    };
  });
}

/**
 * Returns the exact 1-25 ability progression for a hero.
 * If realProgression (array of ability IDs from OpenDota match data) is provided,
 * it resolves each ability ID into the real ability/talent name.
 */
export function getAbilityProgression(
  heroName: string,
  maxLevel = 25,
  realProgression?: (number | string)[]
): { level: number; abilityName: string; isTalent: boolean }[] {
  // If real progression from match data is available
  if (Array.isArray(realProgression) && realProgression.length > 0) {
    return realProgression.slice(0, 25).map((val, idx) => {
      const abilName =
        typeof val === 'number'
          ? abilityIdsMap[String(val)] || `ability_${val}`
          : String(val);
      const isTalent = abilName.startsWith('special_bonus_') || abilName === 'talent';
      return {
        level: idx + 1,
        abilityName: isTalent ? 'talent' : abilName,
        isTalent,
      };
    });
  }

  const abilities = getHeroAbilities(heroName);
  if (abilities.length === 0) return [];

  const basicAbilities = abilities.filter((a) => !a.isUltimate && !a.isInnate);
  const ultimate = abilities.find((a) => a.isUltimate) || abilities[abilities.length - 1];

  const q = basicAbilities[0]?.name || abilities[0]?.name;
  const w = basicAbilities[1]?.name || abilities[1]?.name || q;
  const e = basicAbilities[2]?.name || abilities[2]?.name || w;
  const r = ultimate?.name || q;

  const defaultPattern: { [lvl: number]: { abilityName: string; isTalent: boolean } } = {
    1: { abilityName: q, isTalent: false },
    2: { abilityName: w, isTalent: false },
    3: { abilityName: q, isTalent: false },
    4: { abilityName: e, isTalent: false },
    5: { abilityName: q, isTalent: false },
    6: { abilityName: r, isTalent: false },
    7: { abilityName: q, isTalent: false },
    8: { abilityName: w, isTalent: false },
    9: { abilityName: w, isTalent: false },
    10: { abilityName: 'talent', isTalent: true },
    11: { abilityName: w, isTalent: false },
    12: { abilityName: r, isTalent: false },
    13: { abilityName: e, isTalent: false },
    14: { abilityName: e, isTalent: false },
    15: { abilityName: 'talent', isTalent: true },
    16: { abilityName: e, isTalent: false },
    17: { abilityName: q, isTalent: false },
    18: { abilityName: r, isTalent: false },
    19: { abilityName: w, isTalent: false },
    20: { abilityName: 'talent', isTalent: true },
    21: { abilityName: e, isTalent: false },
    22: { abilityName: q, isTalent: false },
    23: { abilityName: w, isTalent: false },
    24: { abilityName: e, isTalent: false },
    25: { abilityName: 'talent', isTalent: true },
  };

  const result: { level: number; abilityName: string; isTalent: boolean }[] = [];
  const limit = Math.min(25, Math.max(1, maxLevel));

  for (let lvl = 1; lvl <= limit; lvl++) {
    const item = defaultPattern[lvl];
    if (item) {
      result.push({ level: lvl, ...item });
    }
  }

  return result;
}
