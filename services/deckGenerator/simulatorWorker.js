'use strict';

/**
 * Worker Thread entry point.
 *
 * Receives via workerData:
 *   { deckTiles: { edges: string[] }[], targetScore: number, numSims: number }
 *
 * Posts back:
 *   { successes: number, numSims: number }
 */

const { workerData, parentPort } = require('worker_threads');
const { simulateGame } = require('./simulationCore');

const { deckTiles, targetScore, numSims } = workerData;

/** Fisher-Yates in-place shuffle of a copy. */
function shuffled(arr) {
  const d = arr.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
  }
  return d;
}

// Each simulation shuffles the deck to model a different draw order,
// giving the stochastic variance needed for SR to be meaningful.
let successes = 0;
for (let i = 0; i < numSims; i++) {
  if (simulateGame(shuffled(deckTiles), targetScore).success) successes++;
}

parentPort.postMessage({ successes, numSims });
