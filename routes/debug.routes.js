'use strict';

const express = require('express');
const router = express.Router();

const HexTile    = require('../model/HexTile_model');
const { TARGET_BY_LEVEL } = require('../config/stageConfig');
const { generateInitialDeck, getTileWeight } = require('../services/deckGenerator/tileUtils');
const { evaluateDeck }  = require('../services/deckGenerator/evaluateDeck');
const { mutateDeck }    = require('../services/deckGenerator/deckMutator');
const { simulateGame }  = require('../services/deckGenerator/simulationCore');

// Mirrors the windows in deckGenerator/index.js (not exported from there).
const DIFFICULTY_WINDOWS = {
  1: { min: 90, max: 100 },
  2: { min: 65, max: 80  },
  3: { min: 40, max: 60  },
  4: { min: 20, max: 35  },
  5: { min: 5,  max: 15  },
};

const MAX_ITERATIONS  = 20;
const NUM_SIMULATIONS = 1000;

/**
 * Run the same Phase A → B → C hill-climbing loop as generateStageDeck,
 * but also return convergence metadata needed by the debug endpoints.
 *
 * @returns {{ deck: object[], simulatedSR: number, convergedInIterations: number }}
 */
async function buildDeckWithMeta({ level, targetScore, tiles, deckSize = 30 }) {
  const window = DIFFICULTY_WINDOWS[level] ?? DIFFICULTY_WINDOWS[3];

  let deck = generateInitialDeck(deckSize, tiles, {});
  let bestDeck = deck;
  let bestDistance = Infinity;
  let finalSR = 0;
  let convergedInIterations = MAX_ITERATIONS;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const sr = await evaluateDeck(deck, targetScore, NUM_SIMULATIONS);
    const dist =
      sr < window.min ? window.min - sr :
      sr > window.max ? sr - window.max : 0;

    if (dist < bestDistance) {
      bestDistance = dist;
      bestDeck     = deck;
      finalSR      = sr;
    }

    if (dist === 0) {
      convergedInIterations = iter + 1;
      break;
    }

    deck = mutateDeck(deck, sr > window.max ? 'harden' : 'ease', tiles);
  }

  return { deck: bestDeck, simulatedSR: Math.round(finalSR), convergedInIterations };
}

/** Fisher-Yates shuffle (copy). */
function shuffled(arr) {
  const d = arr.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ---------------------------------------------------------------------------
// GET /api/debug/deck?level=3&stageId=test_stage_01
// ---------------------------------------------------------------------------
router.get('/deck', async (req, res) => {
  const start  = Date.now();
  const level  = Math.min(5, Math.max(1, parseInt(req.query.level, 10) || 3));
  const targetScore = TARGET_BY_LEVEL[level];
  const window = DIFFICULTY_WINDOWS[level] ?? DIFFICULTY_WINDOWS[3];

  try {
    const tiles = await HexTile.find({}).lean();
    if (!tiles.length) return res.status(500).json({ error: 'No tiles in catalog' });

    const { deck, simulatedSR, convergedInIterations } =
      await buildDeckWithMeta({ level, targetScore, tiles });

    const deckSummary = { W1: 0, W2: 0, W3: 0, W5: 0 };
    const deckDetails = deck.map((tile, index) => {
      const w = getTileWeight(tile);
      deckSummary[`W${w}`] = (deckSummary[`W${w}`] || 0) + 1;
      return {
        index,
        type:   tile.type,
        weight: w,
        edges:  tile.edges,
        center: tile.center,
      };
    });

    res.json({
      level,
      targetScore,
      srWindow:              `${window.min}-${window.max}%`,
      simulatedSR,
      convergedInIterations,
      deck:                  deckDetails,
      deckSummary,
      generationTimeMs:      Date.now() - start,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/debug/simulate?level=3
// ---------------------------------------------------------------------------
router.get('/simulate', async (req, res) => {
  const level       = Math.min(5, Math.max(1, parseInt(req.query.level, 10) || 3));
  const targetScore = TARGET_BY_LEVEL[level];

  try {
    const tiles = await HexTile.find({}).lean();
    if (!tiles.length) return res.status(500).json({ error: 'No tiles in catalog' });

    const { deck } = await buildDeckWithMeta({ level, targetScore, tiles });
    const deckTiles = deck.map(t => ({ edges: t.edges }));

    const NUM_SIMS = 500;
    const scores   = [];
    let   successes = 0;

    for (let i = 0; i < NUM_SIMS; i++) {
      const { finalScore, success } = simulateGame(shuffled(deckTiles), targetScore);
      scores.push(finalScore);
      if (success) successes++;
    }

    const simulatedSR = Math.round((successes / NUM_SIMS) * 100);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = Math.round((scores.reduce((s, x) => s + x, 0) / NUM_SIMS) * 10) / 10;

    // Bucket scores into groups of 5, sorted numerically.
    const rawHistogram = {};
    for (const score of scores) {
      const lo  = Math.floor(score / 5) * 5;
      const key = `${lo}-${lo + 4}`;
      rawHistogram[key] = (rawHistogram[key] || 0) + 1;
    }
    const histogram = Object.fromEntries(
      Object.entries(rawHistogram).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    );

    res.json({
      level,
      targetScore,
      simulatedSR,
      scoreStats: { min, max, avg },
      histogram,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
