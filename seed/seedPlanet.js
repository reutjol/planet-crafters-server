// seed/seedPlanets.js
require("dotenv").config();
const mongoose = require("mongoose");

const Planet = require("../model/Planet_model");
const User = require("../model/User_model"); // to fetch existing userId's

function createInitialStages() {
  return [
    {
      stageId: "stage_01",
      meta: {
        isUnlocked: true,
        isStarted: false,
        isCompleted: false,
      },
      state: {
        map: { placedTiles: [] },
        hand: {
          maxHandSize: 3,
          tilesInHand: [],
        },
        deck: {
          remainingTiles: [],
        },
        progress: {
          developedPercent: 0,
          score: 0,
          isCompleted: false,
        },
      },
    },
  ];
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Fetch all existing users (that were already seeded)
  const users = await User.find({}, { _id: 1, activePlanetId: 1 }).lean();
  console.log(`👤 Found users: ${users.length}`);

  // Option A: Delete only planet_01 of all users (recommended)
  const del = await Planet.deleteMany({ planetId: "planet_01" });
  console.log(`🧹 Deleted planets (planet_01): ${del.deletedCount}`);

  // Create a planet for each user
  for (const u of users) {
    const planet = new Planet({
      userId: u._id,            // Important: ObjectId of the user
      planetId: "planet_01",
      stages: createInitialStages(),
    });

    await planet.save();
    console.log(`✅ Planet created for user=${u._id} planetId=${planet.planetId}`);
  }

  console.log(`✅ Inserted planets: ${users.length}`);

  await mongoose.disconnect();
  console.log("✅ Disconnected");
}

main().catch((e) => {
  console.error("❌ seedPlanets failed:", e);
  process.exit(1);
});
