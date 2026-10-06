import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding STRATZ-style Dota 2 personal stats...')

  // 1. Heroes
  const heroesData = [
    { heroId: 1, name: 'antimage', localizedName: 'Anti-Mage', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png' },
    { heroId: 2, name: 'axe', localizedName: 'Axe', primaryAttr: 'str', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/axe.png' },
    { heroId: 8, name: 'juggernaut', localizedName: 'Juggernaut', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/juggernaut.png' },
    { heroId: 10, name: 'morphling', localizedName: 'Morphling', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/morphling.png' },
    { heroId: 11, name: 'nevermore', localizedName: 'Shadow Fiend', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png' },
    { heroId: 14, name: 'pudge', localizedName: 'Pudge', primaryAttr: 'str', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/pudge.png' },
    { heroId: 41, name: 'faceless_void', localizedName: 'Faceless Void', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/faceless_void.png' },
    { heroId: 44, name: 'phantom_assassin', localizedName: 'Phantom Assassin', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/phantom_assassin.png' },
    { heroId: 74, name: 'invoker', localizedName: 'Invoker', primaryAttr: 'all', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/invoker.png' },
    { heroId: 86, name: 'rubick', localizedName: 'Rubick', primaryAttr: 'int', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/rubick.png' },
    { heroId: 95, name: 'troll_warlord', localizedName: 'Troll Warlord', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/troll_warlord.png' },
    { heroId: 109, name: 'terrorblade', localizedName: 'Terrorblade', primaryAttr: 'agi', iconUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/terrorblade.png' },
  ]

  const heroMap = new Map()
  for (const h of heroesData) {
    const created = await prisma.hero.create({ data: h })
    heroMap.set(h.name, created.id)
  }

  // 2. Main Steam Profile (Default personal profile)
  const profile = await prisma.steamProfile.create({
    data: {
      steamId: '86745912',
      personaName: 'Raddan (Yatoro)',
      avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
      rankTier: 80, // Immortal
      leaderboardRank: 18,
      currentMmr: 12850,
      wins: 3410,
      losses: 2520,
    },
  })

  // 3. Matches history with MMR tracking (+25 / -25), KDA, items, STRATZ IMP rating
  let runningMmr = 12625

  const matchesData = [
    {
      matchId: '7984102145',
      heroName: 'morphling',
      won: true,
      isRadiant: true,
      mmrChange: 26,
      kills: 17,
      deaths: 1,
      assists: 11,
      duration: 2140, // 35:40
      role: 'Safe Lane',
      goldPerMin: 890,
      xpPerMin: 960,
      netWorth: 31500,
      impScore: 48,
      isMvp: true,
      items: 'power_treads,manta,butterfly,skadi,satanic,swift_blink',
      neutralItem: 'apex',
      startTime: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
    {
      matchId: '7983941820',
      heroName: 'nevermore',
      won: true,
      isRadiant: false,
      mmrChange: 25,
      kills: 14,
      deaths: 3,
      assists: 9,
      duration: 1890, // 31:30
      role: 'Mid',
      goldPerMin: 810,
      xpPerMin: 880,
      netWorth: 25800,
      impScore: 35,
      isMvp: true,
      items: 'power_treads,dragon_lance,black_king_bar,greater_crit,satanic,butterfly',
      neutralItem: 'ninja_gear',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    },
    {
      matchId: '7983652190',
      heroName: 'faceless_void',
      won: false,
      isRadiant: true,
      mmrChange: -24,
      kills: 6,
      deaths: 7,
      assists: 5,
      duration: 2640, // 44:00
      role: 'Safe Lane',
      goldPerMin: 620,
      xpPerMin: 690,
      netWorth: 27100,
      impScore: -14,
      isMvp: false,
      items: 'power_treads,mask_of_madness,maelstrom,black_king_bar,skadi,refresher',
      neutralItem: 'mind_breaker',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    },
    {
      matchId: '7983109401',
      heroName: 'terrorblade',
      won: true,
      isRadiant: false,
      mmrChange: 25,
      kills: 12,
      deaths: 2,
      assists: 8,
      duration: 2280, // 38:00
      role: 'Safe Lane',
      goldPerMin: 840,
      xpPerMin: 910,
      netWorth: 32000,
      impScore: 28,
      isMvp: false,
      items: 'power_treads,dragon_lance,manta,skadi,butterfly,satanic',
      neutralItem: 'leveller',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
    },
    {
      matchId: '7982841029',
      heroName: 'juggernaut',
      won: true,
      isRadiant: true,
      mmrChange: 25,
      kills: 15,
      deaths: 2,
      assists: 14,
      duration: 2010, // 33:30
      role: 'Safe Lane',
      goldPerMin: 780,
      xpPerMin: 850,
      netWorth: 26400,
      impScore: 32,
      isMvp: true,
      items: 'phase_boots,maelstrom,manta,aghanims_shard,butterfly,abyssal_blade',
      neutralItem: 'elven_tunic',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 26), // yesterday
    },
    {
      matchId: '7982401844',
      heroName: 'antimage',
      won: false,
      isRadiant: false,
      mmrChange: -25,
      kills: 4,
      deaths: 6,
      assists: 3,
      duration: 1980, // 33:00
      role: 'Safe Lane',
      goldPerMin: 590,
      xpPerMin: 640,
      netWorth: 19500,
      impScore: -22,
      isMvp: false,
      items: 'power_treads,battle_fury,manta,black_king_bar',
      neutralItem: 'vambrace',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 32),
    },
    {
      matchId: '7981920481',
      heroName: 'pudge',
      won: true,
      isRadiant: true,
      mmrChange: 27,
      kills: 11,
      deaths: 4,
      assists: 19,
      duration: 2450, // 40:50
      role: 'Offlane',
      goldPerMin: 570,
      xpPerMin: 720,
      netWorth: 23100,
      impScore: 19,
      isMvp: false,
      items: 'phase_boots,aghanims_scepter,blink,black_king_bar,heart,shivas_guard',
      neutralItem: 'ceremonial_robe',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    },
    {
      matchId: '7981309124',
      heroName: 'invoker',
      won: true,
      isRadiant: false,
      mmrChange: 25,
      kills: 18,
      deaths: 3,
      assists: 16,
      duration: 2700, // 45:00
      role: 'Mid',
      goldPerMin: 760,
      xpPerMin: 890,
      netWorth: 34200,
      impScore: 41,
      isMvp: true,
      items: 'travel_boots,hand_of_midas,black_king_bar,aghanims_scepter,octarine_core,refresher',
      neutralItem: 'timeless_relic',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 55),
    },
    {
      matchId: '7980841249',
      heroName: 'phantom_assassin',
      won: false,
      isRadiant: true,
      mmrChange: -25,
      kills: 7,
      deaths: 8,
      assists: 4,
      duration: 2340, // 39:00
      role: 'Safe Lane',
      goldPerMin: 640,
      xpPerMin: 710,
      netWorth: 24800,
      impScore: -16,
      isMvp: false,
      items: 'power_treads,battle_fury,desolator,black_king_bar,nullifier',
      neutralItem: 'paladin_sword',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    },
    {
      matchId: '7980129481',
      heroName: 'troll_warlord',
      won: true,
      isRadiant: false,
      mmrChange: 26,
      kills: 13,
      deaths: 2,
      assists: 10,
      duration: 1950, // 32:30
      role: 'Safe Lane',
      goldPerMin: 830,
      xpPerMin: 870,
      netWorth: 26900,
      impScore: 31,
      isMvp: false,
      items: 'phase_boots,battle_fury,sange_and_yasha,black_king_bar,satanic',
      neutralItem: 'enchanted_quiver',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 80),
    },
  ]

  // Insert matches chronological order and calculate running MMR
  // Reverse so older matches come first for calculating mmrAfter
  const reversed = [...matchesData].reverse()
  let calcMmr = 12625

  for (const m of reversed) {
    calcMmr += m.mmrChange
    const heroId = heroMap.get(m.heroName) || 1

    await prisma.playerMatch.create({
      data: {
        matchId: m.matchId,
        profileId: profile.id,
        heroId: heroId,
        won: m.won,
        isRadiant: m.isRadiant,
        mmrChange: m.mmrChange,
        mmrAfter: calcMmr,
        kills: m.kills,
        deaths: m.deaths,
        assists: m.assists,
        duration: m.duration,
        role: m.role,
        goldPerMin: m.goldPerMin,
        xpPerMin: m.xpPerMin,
        netWorth: m.netWorth,
        impScore: m.impScore,
        isMvp: m.isMvp,
        items: m.items,
        neutralItem: m.neutralItem,
        startTime: m.startTime,
      },
    })
  }

  // Update profile current MMR to final
  await prisma.steamProfile.update({
    where: { id: profile.id },
    data: { currentMmr: calcMmr },
  })

  console.log(`STRATZ seed completed successfully! Current MMR: ${calcMmr}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
