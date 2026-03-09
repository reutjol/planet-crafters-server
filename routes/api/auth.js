const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const auth = require("../../middleware/auth");
const User = require("../../model/User_model");

/**
 * POST /api/auth
 * Login:
 * - Checks email+password
 * - Creates short access token and long refresh token
 * - Saves refresh token in DB to validate it later
 */
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ msg: "Please fill in required details" });
  }

  try {
    // Normalize email to prevent uppercase/whitespace issues
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    // Compare password against hash (using model function)
    const isMatched = await user.comparePassword(password);
    if (!isMatched) return res.status(401).json({ msg: "Invalid credentials" });

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

    // Save refresh token for user in DB (so we can validate later)
    user.refreshToken = refreshToken;
    await user.save();

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
    return res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/auth/user
 * Returns the authenticated user (without password)
 */
router.get("/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ msg: "Server error" });
  }
});

/**
 * POST /api/auth/refresh
 * Receives refreshToken and returns new accessToken
 */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ msg: "Missing refresh token" });
  }

  try {
    // Verify that refreshToken is signed and not expired
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Also validate against DB (so not every "valid" refresh token works)
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ msg: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: user.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ msg: "Invalid refresh token" });
  }
});

/**
 * POST /api/auth/logout
 * Clears refreshToken in DB -> effectively disconnects the user
 */
router.post("/logout", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    return res.json({ msg: "Logged out" });
  } catch (err) {
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
