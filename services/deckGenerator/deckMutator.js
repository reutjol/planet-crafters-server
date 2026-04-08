'use strict';

const { getTileWeight } = require('./tileUtils');

/**
 * Replace one tile in `deck` to nudge difficulty in the requested direction.
 *
 * SR landscape insight (shuffle-simulation model):
 *   - W=2 tiles (4+2 same-resource split): moderate SR, versatile placements.
 *   - W=5 tiles (2+2+2 three-resource):    individually hard to match; in small
 *     quantities they *mix badly* with W=2 and drop SR sharply.  In large
 *     quantities (pure-W=5 deck) the greedy agent finds symmetric matches and
 *     SR rises again — an unexpected valley at ~20-30 % W=5 content.
 *   - W=1 MIXED mono tiles:                SR → 0 % (different resources never
 *     match each other under shuffle).  DO NOT use for 'ease'.
 *   - W=1 SAME-resource mono tiles:        trivially easy (SR ≈ 100 %).
 *
 * Safe mutations:
 *   'harden' (SR too high → need harder deck):
 *     Replace a W=2 tile with a W=5 tile.  Adding even a few W=5 tiles to a
 *     W=2 deck drives SR down sharply into the mid-range windows.
 *   'ease' (SR too low → need easier deck):
 *     Replace a W=5 tile with a W=2 tile.  W=2 tiles are more forgiving than
 *     W=5 (dominant resource matches many neighbours regardless of draw order).
 *     Never replace with W=1 mono — mixed-resource mono decks are very hard.
 *
 * Returns a new array (deck is never mutated in-place).
 *
 * @param {object[]} deck       Current deck (tile objects with _id + edges)
 * @param {'harden'|'ease'} direction
 * @param {object[]} tilePool   Full tile catalog (26 templates)
 * @returns {object[]}          New deck of the same length
 */
function mutateDeck(deck, direction, tilePool) {
  const newDeck = deck.slice(); // shallow copy

  if (direction === 'harden') {
    // Swap OUT one W=2 tile (or W=3 as fallback) and swap IN one W=5.
    // Increasing W=5 content adds resource diversity that is hard to match
    // across random draw orders.
    const targets = newDeck
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => getTileWeight(t) <= 2);

    if (targets.length === 0) {
      // Fall back: W=3 → W=5
      const w3 = newDeck.map((t, i) => ({ t, i })).filter(({ t }) => getTileWeight(t) === 3);
      if (w3.length === 0) return newDeck;
      targets.push(...w3);
    }

    const heavyPool = tilePool.filter(t => getTileWeight(t) === 5);
    if (heavyPool.length === 0) return newDeck;

    const { i } = targets[Math.floor(Math.random() * targets.length)];
    newDeck[i] = heavyPool[Math.floor(Math.random() * heavyPool.length)];

  } else { // 'ease'
    // Swap OUT one W=5 tile (or W=3 as fallback) and swap IN one W=2 tile.
    // W=2 tiles (4+2 same-resource) are more likely to match neighbours across
    // draw orders than W=5 tiles.  NEVER swap in W=1 mono — a mixed-resource
    // mono deck drives SR to near 0 % (mono tiles only match tiles of the
    // same mono type, so resource diversity makes placements impossible).
    const targets = newDeck
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => getTileWeight(t) >= 5);

    if (targets.length === 0) {
      // Fall back: W=3 → W=2
      const w3 = newDeck.map((t, i) => ({ t, i })).filter(({ t }) => getTileWeight(t) === 3);
      if (w3.length === 0) return newDeck;
      targets.push(...w3);
    }

    const easyPool = tilePool.filter(t => getTileWeight(t) === 2);
    if (easyPool.length === 0) return newDeck;

    const { i } = targets[Math.floor(Math.random() * targets.length)];
    newDeck[i] = easyPool[Math.floor(Math.random() * easyPool.length)];
  }

  return newDeck;
}

module.exports = { mutateDeck };
