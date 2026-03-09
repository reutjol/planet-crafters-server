/**
 * migrateStages.js
 *
 * Adds missing stages to all existing planets without touching existing stage data.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node seed/migrateStages.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Planet = require("../model/Planet_model");
const { createInitialStagesWithCoords } = require("../services/planet.service");

const TOTAL_STAGES = 37; // <-- change this to your new total

async function main() {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const planets = await Planet.find({ planetId: "planet_01" });
  console.log(`🪐 Found ${planets.length} planet(s) to migrate`);

  // Build the full stage template for the new total
  const allStages = createInitialStagesWithCoords(TOTAL_STAGES);

  for (const planet of planets) {
    const existingIds = new Set(planet.stages.map(s => s.stageId));

    // Find stages that don't exist yet on this planet
    const missing = allStages.filter(s => !existingIds.has(s.stageId));

    if (missing.length === 0) {
      console.log(`  userId=${planet.userId} — already up to date (${planet.stages.length} stages)`);
      continue;
    }

    // Push missing stages (locked, empty state)
    planet.stages.push(...missing);
    await planet.save();

    console.log(`  userId=${planet.userId} — added ${missing.length} stage(s), now ${planet.stages.length} total`);
  }

  await mongoose.disconnect();
  console.log("✅ Migration complete");
}

main().catch(e => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
