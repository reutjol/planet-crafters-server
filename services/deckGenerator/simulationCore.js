'use strict';

/**
 * Pure, synchronous simulation logic.
 * No DB access, no Node-specific APIs (safe to run inside Worker Threads).
 *
 * Edge formula derivation (mirrors planetState.service.js):
 *   "Face 2 in the 3D model points East (axial dir 0)"
 *   → faceIdx(dir) = (dir + 2) % 6
 *   → adjusted for rotation: edges[(dir + 2 - rotation + 6) % 6]
 *   ≡ edges[(dir - rotation + 8) % 6]
 *
 * Axial directions (flat-top hex, identical order to EDGE_DIRS in planetState.service.js):
 *   dir 0: (dq=+1, dr= 0)  East
 *   dir 1: (dq=+1, dr=-1)  North-East
 *   dir 2: (dq= 0, dr=-1)  North-West
 *   dir 3: (dq=-1, dr= 0)  West
 *   dir 4: (dq=-1, dr=+1)  South-West
 *   dir 5: (dq= 0, dr=+1)  South-East
 */

const DSU = require('./DSU');

// [dq, dr] for each of the 6 axial directions.
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/**
 * Get the edge of `tile` (at `rotation`) that faces axial direction `dir`.
 *
 * @param {string[]} edges     6-element edges array from the tile template
 * @param {number}   rotation  0-5
 * @param {number}   dir       0-5
 * @returns {string}  resource name
 */
function getEdge(edges, rotation, dir) {
  return edges[(dir - rotation + 8) % 6];
}

/**
 * Collect all empty cells that share an edge with any placed tile.
 *
 * @param {Map<string, *>} board  "q,r" → placed-tile entry
 * @returns {Set<string>}
 */
function getPerimeter(board) {
  const perimeter = new Set();
  for (const key of board.keys()) {
    const comma = key.indexOf(',');
    const q = parseInt(key, 10);
    const r = parseInt(key.slice(comma + 1), 10);
    for (const [dq, dr] of DIRS) {
      const nk = `${q + dq},${r + dr}`;
      if (!board.has(nk)) perimeter.add(nk);
    }
  }
  return perimeter;
}

/**
 * Count matching connections when placing `tile` at (q, r) with `rotation`.
 * A connection is valid when both touching edges carry the same resource.
 *
 * @param {Map}      board
 * @param {number}   q
 * @param {number}   r
 * @param {object}   tile       { edges: string[] }
 * @param {number}   rotation   0-5
 * @returns {number}
 */
function countConnections(board, q, r, tile, rotation) {
  let connections = 0;
  for (let dir = 0; dir < 6; dir++) {
    const [dq, dr] = DIRS[dir];
    const neighbor = board.get(`${q + dq},${r + dr}`);
    if (!neighbor) continue;

    const oppDir = (dir + 3) % 6;
    if (
      getEdge(tile.edges, rotation, dir) ===
      getEdge(neighbor.tile.edges, neighbor.rotation, oppDir)
    ) {
      connections++;
    }
  }
  return connections;
}

/**
 * Estimate the EvolutionBonus for placing `tile` at (q, r).
 *
 * For each resource cluster that would merge with the new tile:
 *   combined size ≥ 6  → +4 points
 *   combined size ≥ 4  → +2 points
 *
 * Merges multiple clusters of the same resource before computing.
 *
 * @param {Map}      board
 * @param {object}   dsus     { rock: DSU, gold: DSU, bio: DSU, crystal: DSU }
 * @param {number}   q
 * @param {number}   r
 * @param {object}   tile
 * @param {number}   rotation
 * @returns {number}
 */
function evolutionBonus(board, dsus, q, r, tile, rotation) {
  const resourceMerge = Object.create(null);

  for (let dir = 0; dir < 6; dir++) {
    const [dq, dr] = DIRS[dir];
    const neighbor = board.get(`${q + dq},${r + dr}`);
    if (!neighbor) continue;

    const oppDir = (dir + 3) % 6;
    const myEdge = getEdge(tile.edges, rotation, dir);
    const neighborEdge = getEdge(neighbor.tile.edges, neighbor.rotation, oppDir);
    if (myEdge !== neighborEdge) continue;

    const dsu = dsus[myEdge];
    if (!dsu) continue;

    const nk = `${q + dq},${r + dr}`;
    const root = dsu.find(nk);

    if (!resourceMerge[myEdge]) {
      resourceMerge[myEdge] = { roots: new Set(), size: 1 };
    }
    const entry = resourceMerge[myEdge];
    if (!entry.roots.has(root)) {
      entry.roots.add(root);
      entry.size += dsu.getSize(nk);
    }
  }

  let bonus = 0;
  for (const res of Object.keys(resourceMerge)) {
    const combined = resourceMerge[res].size;
    if (combined >= 6) bonus += 4;
    else if (combined >= 4) bonus += 2;
  }
  return bonus;
}

/**
 * Union DSU entries for the newly placed tile with all matching neighbours.
 */
function updateDSUs(board, dsus, q, r, tile, rotation) {
  const key = `${q},${r}`;
  for (let dir = 0; dir < 6; dir++) {
    const [dq, dr] = DIRS[dir];
    const nk = `${q + dq},${r + dr}`;
    const neighbor = board.get(nk);
    if (!neighbor) continue;

    const oppDir = (dir + 3) % 6;
    const myEdge = getEdge(tile.edges, rotation, dir);
    const neighborEdge = getEdge(neighbor.tile.edges, neighbor.rotation, oppDir);
    if (myEdge !== neighborEdge) continue;

    const dsu = dsus[myEdge];
    if (dsu) dsu.union(key, nk);
  }
}

/**
 * Core greedy simulation loop — single source of truth for the agent logic.
 *
 * @param {{ edges: string[], type?: string }[]} deckTiles
 * @param {((move: object) => void) | null} onMove
 *   Optional callback invoked after each placement with:
 *   { tileIdx, q, r, rotation, connections, runningTotal }
 * @returns {{ board: Map, score: number }}
 */
function _runGreedy(deckTiles, onMove) {
  const board = new Map();
  const dsus = {
    rock:    new DSU(),
    gold:    new DSU(),
    bio:     new DSU(),
    crystal: new DSU(),
  };
  let score = 0;

  // First tile: origin, rotation 0 (game rule).
  board.set('0,0', { tile: deckTiles[0], rotation: 0 });
  if (onMove) onMove({ tileIdx: 0, q: 0, r: 0, rotation: 0, connections: 0, runningTotal: 0 });

  for (let deckIdx = 1; deckIdx < deckTiles.length; deckIdx++) {
    const tile = deckTiles[deckIdx];
    const perimeter = getPerimeter(board);

    let bestValue = -Infinity;
    let bestQ = 0, bestR = 0, bestRot = 0, bestConnections = 0;

    for (const cellKey of perimeter) {
      const comma = cellKey.indexOf(',');
      const q = parseInt(cellKey, 10);
      const r = parseInt(cellKey.slice(comma + 1), 10);

      for (let rot = 0; rot < 6; rot++) {
        const c = countConnections(board, q, r, tile, rot);
        const b = evolutionBonus(board, dsus, q, r, tile, rot);
        if (c + b > bestValue) {
          bestValue = c + b;
          bestQ = q; bestR = r; bestRot = rot; bestConnections = c;
        }
      }
    }

    board.set(`${bestQ},${bestR}`, { tile, rotation: bestRot });
    score += bestConnections;
    updateDSUs(board, dsus, bestQ, bestR, tile, bestRot);

    if (onMove) onMove({ tileIdx: deckIdx, q: bestQ, r: bestR, rotation: bestRot, connections: bestConnections, runningTotal: score });
  }

  return { board, score };
}

/**
 * Simulate one complete game with a Greedy Agent.
 *
 * Scoring mirrors the real rules engine: 1 point per matching edge, cumulative.
 *
 * @param {{ edges: string[] }[]} deckTiles  30-tile deck (edges arrays only)
 * @param {number}                targetScore
 * @returns {{ success: boolean, finalScore: number }}
 */
function simulateGame(deckTiles, targetScore) {
  const { score } = _runGreedy(deckTiles, null);
  return { success: score >= targetScore, finalScore: score };
}

/**
 * Like simulateGame but also returns a full move log and the final board Map.
 * Used by the test script for detailed per-move output and ASCII rendering.
 *
 * @param {{ edges: string[], type?: string }[]} deckTiles
 * @param {number} targetScore
 * @returns {{
 *   moves: { tileIdx:number, q:number, r:number, rotation:number,
 *            connections:number, runningTotal:number }[],
 *   board: Map,
 *   success: boolean,
 *   finalScore: number
 * }}
 */
function simulateGameVerbose(deckTiles, targetScore) {
  const moves = [];
  const { board, score } = _runGreedy(deckTiles, move => moves.push({ ...move }));
  return { moves, board, success: score >= targetScore, finalScore: score };
}

module.exports = { simulateGame, simulateGameVerbose };
