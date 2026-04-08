// models/schemas/stageState.schemas.js
const mongoose = require("mongoose");

/**
 * Visual data for a single face slot on a placed tile
 */
const FaceDataSchema = new mongoose.Schema(
  {
    resource: { type: String, default: "" },
    variant:  { type: Number, default: 1 },  // 1 or 2
    level:    { type: Number, default: 1, min: 1, max: 3 },
  },
  { _id: false }
);

/**
 * Visual data for the center of a placed tile
 */
const CenterDataSchema = new mongoose.Schema(
  {
    resource: { type: String, default: "" },
    level:    { type: Number, default: 1, min: 1, max: 3 },
  },
  { _id: false }
);

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
    faces:  { type: [FaceDataSchema],  default: [] },
    center: { type: CenterDataSchema,  default: () => ({}) },
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
      connectionsByResource: {
        rock:    { type: Number, default: 0 },
        gold:    { type: Number, default: 0 },
        bio:     { type: Number, default: 0 },
        crystal: { type: Number, default: 0 },
      },
    },
  },
  { _id: false }
);

module.exports = { PlacedTileSchema, StageStateSchema };
