require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../model/User_model");

/**
 * Here we insert new users.
 * Important: We intentionally set password as plaintext here,
 * because the User model has pre('save') that does automatic hashing.
 */
const users = [
  { name: "Test One", email: "test1@mail.com", userName: "testone", password: "123456", activePlanetId: "planet_01" },
  { name: "Test Two", email: "test2@mail.com", userName: "testtwo", password: "123456", activePlanetId: "planet_01" },
];

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Delete old users to start clean
  const del = await User.deleteMany({});
  console.log(`🧹 Deleted users: ${del.deletedCount}`);

  // Create one by one so that pre('save') does hashing
  for (const u of users) {
    const user = new User({
      name: u.name.trim(),
      email: u.email.trim().toLowerCase(),
      userName: u.userName.trim(),
      password: u.password, // will be converted to hash on save
      activePlanetId: u.activePlanetId || null,
    });
    await user.save();
  }

  console.log(`✅ Inserted users: ${users.length}`);

  await mongoose.disconnect();
  console.log("✅ Disconnected");
}

main().catch((e) => {
  console.error("❌ seedUsers failed:", e);
  process.exit(1);
});
