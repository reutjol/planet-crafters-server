// routes/api/planets.js
const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const { getOrCreateActivePlanet } = require("../../services/planet.service");

/**
 * GET /api/planets/active
 */
router.get("/active", auth, async (req, res) => {
  try {
    const userId = String(req.user.id);

    const planet = await getOrCreateActivePlanet({
      userId,
      planetId: "planet_01",
      totalStages: 37,
    });

    return res.json({
      planetId: planet.planetId,
      stages: planet.stages, 
    });
  } catch (e) {
    console.error("GET ACTIVE PLANET ERROR:", e);
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
