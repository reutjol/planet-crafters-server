'use strict';

/**
 * Derives tile weight (complexity) from its 6 edges.
 *
 * W=1  mono    – all 6 edges same resource     (allRock, allGold, …)
 * W=2  moreX   – 2 unique types, 4+2 split
 * W=3  halfX   – 2 unique types, 3+3 split
 * W=5  tripleX – 3 unique types, 2+2+2 split
 *
 * @param {{ edges: string[] }} tile
 * @returns {1|2|3|5}
 */
function getTileWeight(tile) {
  const counts = {};
  for (const e of tile.edges) counts[e] = (counts[e] || 0) + 1;
  const vals = Object.values(counts).sort((a, b) => b - a); // descending

  if (vals.length === 1) return 1; // mono
  if (vals.length >= 3) return 5; // 3+ unique types (2+2+2)

  // Exactly 2 unique types
  const [major] = vals;
  if (major === 4) return 2; // 4+2
  if (major === 3) return 3; // 3+3
  return 2; // safety fallback
}

/**
 * Weighted random pick.  Assumes weights are all > 0.
 *
 * @param {any[]} arr
 * @param {number[]} weights  – same length as arr
 * @returns {any}
 */
function weightedPick(arr, weights) {
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

/**
 * Build a plain random pick (equal weight) helper.
 *
 * @param {any[]} arr
 * @returns {any}
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate an initial candidate deck of `size` tiles drawn (with replacement)
 * from `tilePool`, weighted by `stageTheme`.
 *
 * stageTheme format: { rock: 0.6, bio: 0.4 }  – resource → relative weight.
 * If empty / omitted, all tiles have equal probability.
 *
 * @param {number}   size
 * @param {object[]} tilePool  – full tile objects { _id, edges, … }
 * @param {object}   [stageTheme]
 * @returns {object[]}  array of tile objects (length === size)
 */
function generateInitialDeck(size, tilePool, stageTheme = {}) {
  const hasTheme = stageTheme && Object.keys(stageTheme).length > 0;

  const weights = tilePool.map(tile => {
    if (!hasTheme) return 1;
    let w = 0;
    for (const [resource, themeWeight] of Object.entries(stageTheme)) {
      w += tile.edges.filter(e => e === resource).length * themeWeight;
    }
    return w > 0 ? w : 1; // ensure > 0
  });

  return Array.from({ length: size }, () => weightedPick(tilePool, weights));
}

module.exports = { getTileWeight, weightedPick, randomPick, generateInitialDeck };
