const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../../model/User_model");
const auth = require("../../middleware/auth");

/**
 * GET /api/users/me
 * Return the logged-in user's profile
 */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({
      id: user._id,
      name: user.name,
      userName: user.userName,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/users/me
 * Update the logged-in user's name, userName, or email
 */
router.put("/me", auth, async (req, res) => {
  const { name, userName, email } = req.body;

  try {
    const updates = {};
    if (name) updates.name = String(name).trim();
    if (userName) updates.userName = String(userName).trim();
    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ msg: "Email already in use" });
      updates.email = normalizedEmail;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: user._id,
      name: user.name,
      userName: user.userName,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/:id
 * (Debug) Return user by ID without password
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/users
 * Register:
 * - Creates new user
 * - Important: don't do bcrypt.hash here!
 *   Because User model has pre('save') that does automatic hashing.
 * - Creates accessToken + refreshToken and saves refreshToken in DB
 */
router.post("/", async (req, res) => {
  const { name, email, userName, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "Please fill in required details" });
  }

  try {
    // Normalize email to prevent uppercase/whitespace issues
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const normalizedUserName = String(userName).trim();
    // Check existing user
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ msg: "Email already exists" });

    // Create new user
    // Here password is saved as plain, but during save automatic hashing occurs (pre-save)
    const user = await User.create({
      name: normalizedName,
      userName: normalizedUserName,
      email: normalizedEmail,
      password,
    });

    // Create tokens
    const accessToken = jwt.sign(
      { id: user.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Save refresh token in DB to validate it later
    user.refreshToken = refreshToken;
    await user.save(); // password didn't change => won't re-hash

    // Response to client (without password)
    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);

    // If unique is set on email in model - sometimes we get duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    return res.status(500).json({ msg: "Server error" });
  }
});

/**
 * DELETE /api/users/:id
 * (Optional - not implemented)
 */
router.delete("/:id", (req, res) => {
  return res.status(501).json({ msg: "Not implemented" });
});

module.exports = router;
