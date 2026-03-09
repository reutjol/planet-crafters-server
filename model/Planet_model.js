// models/Planet_model.js
const mongoose = require("mongoose");
const { PlanetStageSchema } = require("./PlanetStage_model");

const PlanetSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Comes from JWT
      required: true,
      index: true,
    },

    planetId: {
      type: String, // "planet_01" or UUID
      required: true,
      index: true,
    },

    stages: {
      type: [PlanetStageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// One planet per userId+planetId
PlanetSchema.index({ userId: 1, planetId: 1 }, { unique: true });

// (Optional but recommended) Speeds up search by stageId within array
PlanetSchema.index({ userId: 1, planetId: 1, "stages.stageId": 1 });

module.exports = mongoose.model("Planet", PlanetSchema);
