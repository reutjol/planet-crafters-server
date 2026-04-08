'use strict';

/**
 * evaluateDeck – runs N simulations in parallel via Worker Threads and
 * returns the Success Rate (SR) as a percentage (0-100).
 *
 * Workers are created fresh per call (acceptable because deck generation
 * happens once per stage per user and the result is cached in MongoDB).
 *
 * NUM_WORKERS workers each handle  floor(numSimulations / NUM_WORKERS)  sims;
 * the remainder is added to the first worker to ensure the exact total is met.
 */

const { Worker } = require('worker_threads');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'simulatorWorker.js');
const NUM_WORKERS = 4;

/**
 * @param {object[]} deck          Array of tile objects { edges: string[], … }
 * @param {number}   targetScore
 * @param {number}   [numSimulations=1000]
 * @returns {Promise<number>}  Success Rate 0-100
 */
async function evaluateDeck(deck, targetScore, numSimulations = 1000) {
  // Strip tiles to the minimal shape needed by the simulator.
  const deckTiles = deck.map(t => ({ edges: t.edges }));

  const base = Math.floor(numSimulations / NUM_WORKERS);
  const remainder = numSimulations - base * NUM_WORKERS;

  const workerPromises = Array.from({ length: NUM_WORKERS }, (_, idx) => {
    const numSims = idx === 0 ? base + remainder : base;

    return new Promise((resolve, reject) => {
      const worker = new Worker(WORKER_PATH, {
        workerData: { deckTiles, targetScore, numSims },
      });

      worker.once('message', msg => {
        worker.terminate();
        resolve(msg.successes);
      });

      worker.once('error', err => {
        worker.terminate();
        reject(err);
      });
    });
  });

  const results = await Promise.all(workerPromises);
  const totalSuccesses = results.reduce((sum, n) => sum + n, 0);
  return (totalSuccesses / numSimulations) * 100;
}

module.exports = { evaluateDeck };
