/**
 * Stage completion target configuration.
 * DEFAULT_TARGET: number of matching edge connections needed to complete a stage.
 * In the future, add per-stage or per-level overrides here.
 */
const DEFAULT_TARGET = 20;

// Per-stage overrides: { stageId: targetScore }
// const STAGE_TARGETS = {};

function getTargetScore(stageId) {
  // return STAGE_TARGETS[stageId] ?? DEFAULT_TARGET;
  return DEFAULT_TARGET;
}

module.exports = { getTargetScore, DEFAULT_TARGET };
