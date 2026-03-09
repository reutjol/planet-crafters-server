const mongoose = require("mongoose");
/**
 * HexTileTemplate:
 * This is a "catalog" of fixed hexagon types (Templates).
 * Important: position is not stored here! Position belongs to user State (StageState).
 */
const HexTileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    center: {
      type: String,
      required: true,
      // Resource type in the center: "rock", "gold", "bio", "crystal"
    },

    edges: {
      type: [String],
      required: true,
      // Array of 6 strings in fixed direction order: ["gold","gold","rock","rock","rock","rock"]
      // Later: use rotation to know which edge is in which actual direction.
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length === 6;
        },
        message: "edges must contain exactly 6 values",
      },
    },

    level: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Note: model name remains "hexTileTemplate" to avoid breaking existing code
module.exports = mongoose.model("hexTileTemplate", HexTileSchema);
