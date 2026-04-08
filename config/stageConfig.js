/**
 * Stage completion target configuration.
 *
 * TARGET_BY_LEVEL maps difficulty level (1-5) to the minimum number of
 * matching edge connections a player needs to complete a stage.
 *
 * These values were calibrated against the Greedy Agent simulator so that
 * the resulting Success Rates fall within each level's SR window:
 *
 *   Level 1 (90-100% SR) →  50 connections  (~97 % SR)
 *   Level 2 (65-80%  SR) →  54 connections  (~74 % SR)
 *   Level 3 (40-60%  SR) →  57 connections  (~45 % SR)
 *   Level 4 (20-35%  SR) →  59 connections  (~27 % SR)
 *   Level 5 ( 5-15%  SR) →  61 connections  (~10 % SR)
 *
 * Calibrated for the shuffle-simulation model: each greedy sim shuffles the
 * 30-tile deck before play, so SR measures the fraction of draw-order
 * permutations that lead to a win.  Targets were measured empirically over
 * 3 × 1 000 shuffled simulations of random catalog decks.
 *
 * DEFAULT_TARGET (20) is kept as a legacy fallback for stages that have not
 * yet been assigned a difficulty level.
 */

const DEFAULT_TARGET = 20;

const TARGET_BY_LEVEL = {
  1: 50,
  2: 54,
  3: 57,
  4: 59,
  5: 61,
};

/**
 * Returns the target score for a given stageId.
 * Currently delegates to the level-based table via getLevelFromStageId.
 *
 * @param {string} stageId  e.g. "stage_01"
 * @returns {number}
 */
function getTargetScore(stageId) {
  const level = getLevelFromStageId(stageId);
  return TARGET_BY_LEVEL[level] ?? DEFAULT_TARGET;
}

/**
 * Derive difficulty level from the numeric part of stageId.
 * This is the single source of truth for level → stageId mapping.
 * The same helper exists in planetState.service.js for deck generation.
 *
 * @param {string} stageId
 * @returns {1|2|3|4|5}
 */
function getLevelFromStageId(stageId) {
  const match = stageId && stageId.match(/\d+/);
  if (!match) return 3;
  const n = parseInt(match[0], 10);
  if (n <= 5)  return 1;
  if (n <= 12) return 2;
  if (n <= 19) return 3;
  if (n <= 27) return 4;
  return 5;
}

module.exports = { getTargetScore, getLevelFromStageId, TARGET_BY_LEVEL, DEFAULT_TARGET };
