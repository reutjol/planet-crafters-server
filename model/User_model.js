// model/User_model.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true, 
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    activePlanetId: {
      type: String, // e.g. "planet_01"
      default: null,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/**
 * Before saving user:
 * If password was changed/created -> hash it.
 * If not changed -> don't touch it (to avoid double hashing).
 */
UserSchema.pre("save", async function () {
  // If password wasn't modified, don't re-hash
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Password comparison during Login:
 * Returns true/false
 */
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("user", UserSchema);
