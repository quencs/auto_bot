import 'dotenv/config';
import { getHeroChoices, getLaneChoices } from './dota.js';
import { InstallGlobalCommands } from './utils.js';

const OBSERVER_COMMAND = {
  name: 'observer',
  description: 'Observer Ward command overview',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const WARD_COMMAND = {
  name: 'ward',
  description: 'Get a warding recommendation for a hero and lane',
  options: [
    {
      type: 3,
      name: 'hero',
      description: 'Pick a hero',
      required: true,
      choices: getHeroChoices(),
    },
    {
      type: 3,
      name: 'lane',
      description: 'Choose lane context',
      required: true,
      choices: getLaneChoices(),
    },
    {
      type: 4,
      name: 'minute',
      description: 'Match minute (optional)',
      required: false,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const COUNTER_COMMAND = {
  name: 'counter',
  description: 'Show matchup notes and counters for a hero',
  options: [
    {
      type: 3,
      name: 'hero',
      description: 'Pick a hero',
      required: true,
      choices: getHeroChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const DRAFT_COMMAND = {
  name: 'draft',
  description: 'Compare an ally hero against an enemy hero',
  options: [
    {
      type: 3,
      name: 'ally',
      description: 'Your side hero',
      required: true,
      choices: getHeroChoices(),
    },
    {
      type: 3,
      name: 'enemy',
      description: 'Enemy hero',
      required: true,
      choices: getHeroChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [OBSERVER_COMMAND, WARD_COMMAND, COUNTER_COMMAND, DRAFT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
