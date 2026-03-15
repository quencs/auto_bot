const HEROES = [
  {
    key: 'axe',
    name: 'Axe',
    roles: ['offlane', 'initiator'],
    strongAgainst: ['Phantom Assassin', 'Slark', 'Troll Warlord'],
    weakAgainst: ['Viper', 'Necrophos', 'Timbersaw'],
    wardHints: {
      safe: 'Deep ward behind enemy safe lane tier-1 to catch support pulls and TP rotations.',
      mid: 'River high-ground ward near power rune to set up Blink Call rotations.',
      off: 'Aggressive cliff ward near enemy ancient camp to track stacks and jungle pathing.',
    },
  },
  {
    key: 'crystal-maiden',
    name: 'Crystal Maiden',
    roles: ['support', 'roamer'],
    strongAgainst: ['Storm Spirit', 'Ember Spirit', 'Bristleback'],
    weakAgainst: ['Juggernaut', 'Lifestealer', 'Silencer'],
    wardHints: {
      safe: 'Defensive lane ward near your pull camp to protect against smoke wraps.',
      mid: 'Observer near your triangle ramp to guard stacks and mid rotations.',
      off: 'Cliff ward between lane and bounty rune to spot telegraphed dives.',
    },
  },
  {
    key: 'earthshaker',
    name: 'Earthshaker',
    roles: ['support', 'initiator'],
    strongAgainst: ['Phantom Lancer', 'Naga Siren', 'Meepo'],
    weakAgainst: ['Viper', 'Ursa', 'Silencer'],
    wardHints: {
      safe: 'Ward enemy support path from lane to pull to line up Fissure blocks.',
      mid: 'Ward one side rune and play fog angles for Fissure into rotation stun.',
      off: 'Aggressive ward near enemy wisdom rune to scout supports moving for XP.',
    },
  },
  {
    key: 'juggernaut',
    name: 'Juggernaut',
    roles: ['carry'],
    strongAgainst: ['Lina', 'Pugna', 'Ancient Apparition'],
    weakAgainst: ['Axe', 'Winter Wyvern', 'Underlord'],
    wardHints: {
      safe: 'Lane ward that sees enemy offlane pull-through routes for spin kills.',
      mid: 'Ward near enemy triangle entrance before your first Omnislash rotation.',
      off: 'Deep ward near outpost to chain Omnislash with support smoke movement.',
    },
  },
  {
    key: 'invoker',
    name: 'Invoker',
    roles: ['mid'],
    strongAgainst: ['Necrophos', 'Timbersaw', 'Underlord'],
    weakAgainst: ['Nyx Assassin', 'Storm Spirit', 'Clockwerk'],
    wardHints: {
      safe: 'Observer that sees TP point behind your safe lane tower for Sun Strike punishes.',
      mid: 'Classic mid high-ground ward to secure rune control and Cold Snap setups.',
      off: 'Ward around enemy ancients for Cataclysm setup vision after minute 20.',
    },
  },
  {
    key: 'puck',
    name: 'Puck',
    roles: ['mid', 'initiator'],
    strongAgainst: ['Queen of Pain', 'Sniper', 'Drow Ranger'],
    weakAgainst: ['Silencer', 'Night Stalker', 'Lion'],
    wardHints: {
      safe: 'Ward tree line flank to phase-shift bait into support turnaround.',
      mid: 'Rune ward and opposite cliff sentry to maintain Dream Coil gank tempo.',
      off: 'Deep ward at enemy jungle fork to isolate farming cores with Coil.',
    },
  },
  {
    key: 'lion',
    name: 'Lion',
    roles: ['support', 'disable'],
    strongAgainst: ['Storm Spirit', 'Anti-Mage', 'Puck'],
    weakAgainst: ['Juggernaut', 'Lifestealer', 'Abaddon'],
    wardHints: {
      safe: 'Observer near lane side entrance so you can chain Hex + Earth Spike first.',
      mid: 'Ward enemy small camp high ground to punish support rotations mid.',
      off: 'Ward near tormentor approach to catch grouped movements with instant disable.',
    },
  },
  {
    key: 'phantom-assassin',
    name: 'Phantom Assassin',
    roles: ['carry'],
    strongAgainst: ['Sniper', 'Drow Ranger', 'Shadow Fiend'],
    weakAgainst: ['Axe', 'Legion Commander', 'Bloodseeker'],
    wardHints: {
      safe: 'Defensive ward near your jungle entrance to avoid early anti-carry ganks.',
      mid: 'Triangle approach ward before first Desolator timing to commit fights safely.',
      off: 'Aggressive ward behind enemy tier-1 for Blur-initiated pickoffs.',
    },
  },
  {
    key: 'shadow-shaman',
    name: 'Shadow Shaman',
    roles: ['support', 'push'],
    strongAgainst: ['Puck', 'Anti-Mage', 'Ember Spirit'],
    weakAgainst: ['Nyx Assassin', 'Clockwerk', 'Silencer'],
    wardHints: {
      safe: 'Observer near enemy glyph-defense wrap point to protect Serpent Wards push.',
      mid: 'Ward one screen behind enemy mid tower to scout shackles opportunities.',
      off: 'Lane-to-jungle ward for smoke into objective with Serpent Wards.',
    },
  },
  {
    key: 'tidehunter',
    name: 'Tidehunter',
    roles: ['offlane', 'teamfight'],
    strongAgainst: ['Phantom Lancer', 'Naga Siren', 'Chaos Knight'],
    weakAgainst: ['Ursa', 'Slark', 'Viper'],
    wardHints: {
      safe: 'Ward enemy pull intersection to stop lane recovery and secure anchor pressure.',
      mid: 'Rune-adjacent high-ground ward for Blink Ravage counter-initiation.',
      off: 'Deep ward near enemy ancients before smoke with Ravage ready.',
    },
  },
  {
    key: 'witch-doctor',
    name: 'Witch Doctor',
    roles: ['support'],
    strongAgainst: ['Huskar', 'Chaos Knight', 'Bristleback'],
    weakAgainst: ['Clockwerk', 'Spirit Breaker', 'Nyx Assassin'],
    wardHints: {
      safe: 'Ward behind lane trees to channel Death Ward from fog.',
      mid: 'Observer near mid side ramp for smoke into Cask + Maledict combos.',
      off: 'Cliff ward near enemy outpost to avoid blind Death Ward channels.',
    },
  },
  {
    key: 'vengeful-spirit',
    name: 'Vengeful Spirit',
    roles: ['support', 'save'],
    strongAgainst: ['Faceless Void', 'Legion Commander', 'Sniper'],
    weakAgainst: ['Silencer', 'Nyx Assassin', 'Riki'],
    wardHints: {
      safe: 'Defensive observer at lane staircase to prep swap saves.',
      mid: 'Mid-lane side ward for swap catches on overextended cores.',
      off: 'Aggressive ward near enemy triangle edge for vision-assisted swaps.',
    },
  },
  {
    key: 'storm-spirit',
    name: 'Storm Spirit',
    roles: ['mid', 'tempo'],
    strongAgainst: ['Sniper', 'Zeus', 'Drow Ranger'],
    weakAgainst: ['Anti-Mage', 'Nyx Assassin', 'Lion'],
    wardHints: {
      safe: 'Observer that sees enemy TP support responses before long zips.',
      mid: 'Both rune vision and cliff deward are critical before level 6 jump timing.',
      off: 'Deep ward by enemy jungle fork to zip isolate farming supports.',
    },
  },
  {
    key: 'anti-mage',
    name: 'Anti-Mage',
    roles: ['carry', 'split-push'],
    strongAgainst: ['Storm Spirit', 'Medusa', 'Outworld Destroyer'],
    weakAgainst: ['Axe', 'Legion Commander', 'Bloodseeker'],
    wardHints: {
      safe: 'Defensive observer near your ancient entry to farm triangle safely.',
      mid: 'Observer on enemy high ground before blink-cutting waves mid game.',
      off: 'Deep ward near side lane shrine path for safe split-push exits.',
    },
  },
  {
    key: 'sniper',
    name: 'Sniper',
    roles: ['mid', 'carry'],
    strongAgainst: ['Ursa', 'Sven', 'Tidehunter'],
    weakAgainst: ['Storm Spirit', 'Spectre', 'Phantom Assassin'],
    wardHints: {
      safe: 'Long-range defensive ward that keeps jump heroes visible early.',
      mid: 'High-ground ward behind your mid tower to avoid smoke wrap ganks.',
      off: 'Observer on lane flank so you can hit safely during objective sieges.',
    },
  },
  {
    key: 'legion-commander',
    name: 'Legion Commander',
    roles: ['offlane', 'pickoff'],
    strongAgainst: ['Phantom Assassin', 'Anti-Mage', 'Puck'],
    weakAgainst: ['Winter Wyvern', 'Oracle', 'Shadow Demon'],
    wardHints: {
      safe: 'Observer near enemy safe lane jungle edge to convert Duel pickoffs.',
      mid: 'River and enemy ramp vision to guarantee smoke Duel openings.',
      off: 'Deep ward near enemy triangle camp stack to punish greedy cores.',
    },
  },
];

const HERO_ALIAS_MAP = HEROES.reduce((acc, hero) => {
  acc[hero.key] = hero;
  acc[hero.name.toLowerCase()] = hero;
  return acc;
}, {});

function laneLabel(lane) {
  const labels = {
    safe: 'safe lane',
    mid: 'mid lane',
    off: 'off lane',
  };
  return labels[lane] || lane;
}

export function getHeroChoices() {
  return HEROES.slice(0, 25).map((hero) => ({
    name: hero.name,
    value: hero.key,
  }));
}

export function getLaneChoices() {
  return [
    { name: 'Safe lane', value: 'safe' },
    { name: 'Mid lane', value: 'mid' },
    { name: 'Off lane', value: 'off' },
  ];
}

export function getHeroByInput(input) {
  if (!input) {
    return null;
  }
  return HERO_ALIAS_MAP[String(input).toLowerCase()] || null;
}

export function buildWardAdvice(heroInput, lane, minute = 8) {
  const hero = getHeroByInput(heroInput);
  if (!hero) {
    return `I do not have scouting data for "${heroInput}" yet. Try one of the registered heroes.`;
  }

  const hint = hero.wardHints[lane] || hero.wardHints.mid;
  const timing = Number.isFinite(Number(minute)) ? Number(minute) : 8;

  return [
    `Observer Ward call for **${hero.name}** (${laneLabel(lane)} around minute ${timing}):`,
    hint,
    `Prioritize one sentry with this ward if enemy supports are missing from map.`,
  ].join('\n');
}

export function buildCounterAdvice(heroInput) {
  const hero = getHeroByInput(heroInput);
  if (!hero) {
    return `I cannot find hero data for "${heroInput}".`;
  }

  const counters = hero.weakAgainst.map((name) => `- ${name}`).join('\n');
  const favorable = hero.strongAgainst.map((name) => `- ${name}`).join('\n');

  return [
    `Draft notes for **${hero.name}**:`,
    `Watch out for:`,
    counters,
    `Strong into:`,
    favorable,
  ].join('\n');
}

export function buildDraftAdvice(allyInput, enemyInput) {
  const ally = getHeroByInput(allyInput);
  const enemy = getHeroByInput(enemyInput);

  if (!ally || !enemy) {
    return 'Draft assistant could not resolve one or both heroes.';
  }

  const allyFavored = ally.strongAgainst.includes(enemy.name);
  const enemyFavored = ally.weakAgainst.includes(enemy.name);

  let matchupLine = 'This lane looks skill-based and vision-dependent.';
  if (allyFavored) {
    matchupLine = `Edge to **${ally.name}** if you force early skirmishes with vision.`;
  }
  if (enemyFavored) {
    matchupLine = `Caution: **${enemy.name}** has a natural edge versus **${ally.name}**.`;
  }

  return [
    `Observer Ward draft read: **${ally.name}** vs **${enemy.name}**`,
    matchupLine,
    `Suggested setup: ${ally.wardHints.mid}`,
  ].join('\n');
}

export function buildObserverIntro() {
  return [
    'Observer Ward online.',
    'Use `/ward` for lane vision plans, `/counter` for matchup notes, and `/draft` for quick draft reads.',
  ].join('\n');
}
