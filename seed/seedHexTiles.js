require("dotenv").config();
const mongoose = require("mongoose");

const HexTileTemplate = require("../model/HexTile_model");

const tiles = [
  // =========================
  // 4–2 (12)
  // =========================
  { "type": "moreRockGold", "center": "rock", "edges": ["rock","rock","rock","rock","gold","gold"], "level": 1 },
  { "type": "moreRockBio", "center": "rock", "edges": ["rock","rock","rock","rock","bio","bio"], "level": 1 },
  { "type": "moreRockCrystal", "center": "rock", "edges": ["rock","rock","rock","rock","crystal","crystal"], "level": 1 },

  { "type": "moreGoldRock", "center": "gold", "edges": ["gold","gold","gold","gold","rock","rock"], "level": 1 },
  { "type": "moreGoldBio", "center": "gold", "edges": ["gold","gold","gold","gold","bio","bio"], "level": 1 },
  { "type": "moreGoldCrystal", "center": "gold", "edges": ["gold","gold","gold","gold","crystal","crystal"], "level": 1 },

  { "type": "moreBioRock", "center": "bio", "edges": ["bio","bio","bio","bio","rock","rock"], "level": 1 },
  { "type": "moreBioGold", "center": "bio", "edges": ["bio","bio","bio","bio","gold","gold"], "level": 1 },
  { "type": "moreBioCrystal", "center": "bio", "edges": ["bio","bio","bio","bio","crystal","crystal"], "level": 1 },

  { "type": "moreCrystalRock", "center": "crystal", "edges": ["crystal","crystal","crystal","crystal","rock","rock"], "level": 1 },
  { "type": "moreCrystalGold", "center": "crystal", "edges": ["crystal","crystal","crystal","crystal","gold","gold"], "level": 1 },
  { "type": "moreCrystalBio", "center": "crystal", "edges": ["crystal","crystal","crystal","crystal","bio","bio"], "level": 1 },

  // =========================
  // 3–3 (6)
  // =========================
  { "type": "halfRockGold", "center": "rock", "edges": ["rock","rock","rock","gold","gold","gold"], "level": 1 },
  { "type": "halfRockBio", "center": "rock", "edges": ["rock","rock","rock","bio","bio","bio"], "level": 1 },
  { "type": "halfRockCrystal", "center": "rock", "edges": ["rock","rock","rock","crystal","crystal","crystal"], "level": 1 },

  { "type": "halfGoldBio", "center": "gold", "edges": ["gold","gold","gold","bio","bio","bio"], "level": 1 },
  { "type": "halfGoldCrystal", "center": "gold", "edges": ["gold","gold","gold","crystal","crystal","crystal"], "level": 1 },
  { "type": "halfBioCrystal", "center": "bio", "edges": ["bio","bio","bio","crystal","crystal","crystal"], "level": 1 },

  // =========================
  // 2–2–2 (4)
  // =========================
  { "type": "tripleRockGoldBio", "center": "rock", "edges": ["rock","rock","gold","gold","bio","bio"], "level": 1 },
  { "type": "tripleRockGoldCrystal", "center": "rock", "edges": ["rock","rock","gold","gold","crystal","crystal"], "level": 1 },
  { "type": "tripleRockBioCrystal", "center": "rock", "edges": ["rock","rock","bio","bio","crystal","crystal"], "level": 1 },
  { "type": "tripleGoldBioCrystal", "center": "gold", "edges": ["gold","gold","bio","bio","crystal","crystal"], "level": 1 },

  // =========================
  // all (4)
  // =========================
  { "type": "allRock", "center": "rock", "edges": ["rock","rock","rock","rock","rock","rock"], "level": 1 },
  { "type": "allGold", "center": "gold", "edges": ["gold","gold","gold","gold","gold","gold"], "level": 1 },
  { "type": "allBio", "center": "bio", "edges": ["bio","bio","bio","bio","bio","bio"], "level": 1 },
  { "type": "allCrystal", "center": "crystal", "edges": ["crystal","crystal","crystal","crystal","crystal","crystal"], "level": 1 }
]


// Basic validation that every tile is valid
function validateTiles() {
  for (const t of tiles) {
    if (!t.type || !t.center || !Array.isArray(t.edges) || t.edges.length !== 6) {
      throw new Error("Invalid tile in seed list: " + JSON.stringify(t));
    }
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in .env");
  }

  validateTiles();

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Delete only the old catalog and insert new
  const del = await HexTileTemplate.deleteMany({});
  console.log(`🧹 Deleted hexTileTemplate docs: ${del.deletedCount}`);

  const inserted = await HexTileTemplate.insertMany(tiles);
  console.log(`✅ Inserted hex tiles: ${inserted.length}`);

  await mongoose.disconnect();
  console.log("✅ Disconnected");
}

main().catch((e) => {
  console.error("❌ seedHexTiles failed:", e);
  process.exit(1);
});
