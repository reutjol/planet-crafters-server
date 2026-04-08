'use strict';

/**
 * generateStageDeck – Phase A → B → C loop.
 *
 * Phase A: Draw 30 tiles at random from the catalog, weighted by stageTheme.
 * Phase B: Run 1 000 greedy simulations (via Worker Threads) → Success Rate.
 * Phase C: If SR is outside the difficulty window, mutate one tile and repeat.
 *
 * Difficulty → target SR window:
 *   1: 90-100 %   (almost always winnable)
 *   2: 65-80 %
 *   3: 40-60 %   (default)
 *   4: 20-35 %
 *   5:  5-15 %   (very hard)
 *
 * Returns an array of 30 MongoDB ObjectId strings (tile IDs) ready to be
 * sliced into hand + deck by the caller.
 *
 * @param {object}   opts
 * @param {number}   [opts.level=3]        Difficulty 1-5
 * @param {number}   [opts.targetScore=20] Matching-edge connections needed
 * @param {object}   [opts.stageTheme={}]  { rock: 0.6, bio: 0.4, … }
 * @param {object[]} opts.tiles            Full tile objects { _id, edges, … }
 * @param {number}   [opts.deckSize=30]
 * @returns {Promise<string[]>}  30 tile ID strings
 */

const { generateInitialDeck } = require('./tileUtils');
const { evaluateDeck }        = require('./evaluateDeck');
const { mutateDeck }          = require('./deckMutator');

const DIFFICULTY_WINDOWS = {
  1: { min: 90, max: 100 },
  2: { min: 65, max: 80  },
  3: { min: 40, max: 60  },
  4: { min: 20, max: 35  },
  5: { min: 5,  max: 15  },
};

const MAX_ITERATIONS   = 20;
const NUM_SIMULATIONS  = 1000;

async function generateStageDeck({
  level       = 3,
  targetScore = 20,
  stageTheme  = {},
  tiles,
  deckSize    = 30,
} = {}) {
  if (!tiles || tiles.length === 0) {
    throw new Error('generateStageDeck: tiles catalog is empty');
  }

  const window = DIFFICULTY_WINDOWS[level] ?? DIFFICULTY_WINDOWS[3];

  // ── Phase A ───────────────────────────────────────────────────────────────
  // Always start with a uniform random deck; hill-climbing (Phase B+C) handles
  // difficulty targeting.  Difficulty-biased initial draws are avoided because
  // they cause the 'ease' mutator to over-correct (e.g. adding W=1 mono chaos).
  let deck = generateInitialDeck(deckSize, tiles, stageTheme);

  // ── Phase B + C ───────────────────────────────────────────────────────────
  // Track the best deck seen so that if MAX_ITERATIONS is hit without full
  // convergence we still return the closest result found.
  let bestDeck = deck;
  let bestDistance = Infinity;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const sr = await evaluateDeck(deck, targetScore, NUM_SIMULATIONS);

    // Distance to the target window (0 if inside).
    const dist = sr < window.min ? window.min - sr : sr > window.max ? sr - window.max : 0;
    if (dist < bestDistance) { bestDistance = dist; bestDeck = deck; }

    if (dist === 0) break; // converged

    const direction = sr > window.max ? 'harden' : 'ease';
    deck = mutateDeck(deck, direction, tiles);
  }

  // Return MongoDB ObjectId strings; the caller slices into hand + deck.
  return bestDeck.map(t => String(t._id));
}

module.exports = { generateStageDeck };
