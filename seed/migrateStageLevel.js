// seed/migrateStageLevel.js
// One-time migration: backfill meta.level on all existing stage documents
// that are missing it, using axial ring distance from center (0, 0).
//
// Run with: node seed/migrateStageLevel.js

require("dotenv").config();
const mongoose = require("mongoose");
const Planet = require("../model/Planet_model");

function axialDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

function levelFromRing(ring) {
  if (ring <= 0) return 1;
  if (ring === 1) return 2;
  if (ring === 2) return 3;
  if (ring === 3) return 4;
  return 5;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const planets = await Planet.find({}).lean();
  console.log(`🪐 Found planets: ${planets.length}`);

  let stagesUpdated = 0;
  let stagesSkipped = 0;

  for (const planet of planets) {
    const updates = {};

    for (let i = 0; i < planet.stages.length; i++) {
      const stage = planet.stages[i];

      if (stage.meta?.level != null) {
        stagesSkipped++;
        continue;
      }

      const q = stage.meta?.coord?.q;
      const r = stage.meta?.coord?.r;

      if (q == null || r == null) {
        console.warn(
          `  ⚠️  planet=${planet.planetId} userId=${planet.userId} stage=${stage.stageId} — missing coord, skipping`
        );
        stagesSkipped++;
        continue;
      }

      const level = levelFromRing(axialDistance(q, r));
      updates[`stages.${i}.meta.level`] = level;
      stagesUpdated++;
    }

    if (Object.keys(updates).length === 0) continue;

    await Planet.updateOne({ _id: planet._id }, { $set: updates });
  }

  console.log(`\n✅ Migration complete`);
  console.log(`   Stages updated : ${stagesUpdated}`);
  console.log(`   Stages skipped : ${stagesSkipped} (already had level or missing coord)`);

  await mongoose.disconnect();
  console.log("✅ Disconnected");
}

main().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
