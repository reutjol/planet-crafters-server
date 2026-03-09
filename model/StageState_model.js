// models/schemas/stageState.schemas.js
const mongoose = require("mongoose");

/**
 * Tile placed on the map
 */
const PlacedTileSchema = new mongoose.Schema(
  {
    coord: {
      q: { type: Number, required: true },
      r: { type: Number, required: true },
    },
    rotation: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },
    tileId: {
      type: String, // ID of template / tile
      required: true,
    },
  },
  { _id: false }
);

/**
 * "Live" game state of a stage (what updates after each action)
 */
const StageStateSchema = new mongoose.Schema(
  {
    map: {
      placedTiles: {
        type: [PlacedTileSchema],
        default: [],
      },
    },

    hand: {
      maxHandSize: { type: Number, default: 3 },
      tilesInHand: { type: [String], default: [] }, // tileIds
    },

    deck: {
      remainingTiles: { type: [String], default: [] }, // tileIds
    },

    progress: {
      developedPercent: { type: Number, default: 0, min: 0, max: 100 },
      score: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

module.exports = { PlacedTileSchema, StageStateSchema };
