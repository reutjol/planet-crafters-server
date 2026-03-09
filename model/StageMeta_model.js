// models/schemas/stageMeta.schemas.js
const mongoose = require("mongoose");

const StageMetaSchema = new mongoose.Schema(
  {
    coord: {
          q: { type: Number, required: true },
          r: { type: Number, required: true },
    },
    isUnlocked: { type: Boolean, default: false }, // Available/unlocked
    isStarted: { type: Boolean, default: false },  // Whether started
    isCompleted: { type: Boolean, default: false },// Whether completed
    lastPlayedAt: { type: Date, default: null },
  },
  { _id: false }
);

module.exports = { StageMetaSchema };
