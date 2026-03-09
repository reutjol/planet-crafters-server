const mongoose = require("mongoose");
const { StageStateSchema } = require("./StageState_model");
const { StageMetaSchema } = require("./StageMeta_model");

const PlanetStageSchema = new mongoose.Schema(
  {
    stageId: { type: String, required: true }, // "stage_01" etc.

    meta: { type: StageMetaSchema, default: () => ({}) },

    // This allows "returning to any point" - saved after each action
    state: { type: StageStateSchema, default: () => ({}) },
  },
  { _id: false }
);

module.exports = { PlanetStageSchema };
