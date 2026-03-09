const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const {
  getStageState,
  saveStageState,
  resetStageState,
  placeTile,
} = require("../../services/planetState.service");

// GET stage state (with creation if needed)
// GET stage state (without meta, in "flat" format)
router.get("/:planetId/:stageId", auth, async (req, res) => {
  try {
    const { planetId, stageId } = req.params;
    const userId = String(req.user.id);
    const deckSize = Number(req.query.deckSize || 30);

    const result = await getStageState({ userId, planetId, stageId, deckSize });

    // result comes as: { planetId, stageId, meta, state }
    const state = result.state || {};

    return res.json({
      planetId: result.planetId,
      stageId: result.stageId,
      map: state.map,
      hand: state.hand,
      deck: state.deck,
      progress: state.progress, 
    });
  } catch (e) {
    console.error("GET planetState error:", e);
    return res.status(500).json({ msg: e.message });
  }
});


// PUT save stage state
router.put("/:planetId/:stageId", auth, async (req, res) => {
  try {
    const { planetId, stageId } = req.params;
    const userId = String(req.user.id);
    const { state } = req.body;

    const result = await saveStageState({ userId, planetId, stageId, state });
    const saved = result.state || {};

    return res.json({
      planetId: result.planetId,
      stageId: result.stageId,
      map: saved.map,
      hand: saved.hand,
      deck: saved.deck,
      progress: saved.progress, 
    });
  } catch (e) {
    console.error("PUT planetState error:", e);
    return res.status(500).json({ msg: e.message });
  }
});

router.post("/:planetId/:stageId/reset", auth, async (req, res) => {
  try {
    const { planetId, stageId } = req.params;
    const userId = String(req.user.id);

    const result = await resetStageState({ userId, planetId, stageId });

    return res.json(result);
  } catch (e) {
    console.error("RESET planetState error:", e);
    return res.status(500).json({ msg: e.message });
  }
});


// POST place a tile (server validates and updates state)
router.post("/:planetId/:stageId/place-tile", auth, async (req, res) => {
  try {
    const { planetId, stageId } = req.params;
    const userId = String(req.user.id);
    const { tileId, coord, rotation } = req.body;

    if (!tileId || !coord || rotation === undefined) {
      return res.status(400).json({ msg: "tileId, coord, and rotation are required" });
    }

    const result = await placeTile({ userId, planetId, stageId, tileId, coord, rotation });
    return res.json(result);
  } catch (e) {
    console.error("PLACE-TILE error:", e);
    const clientErrors = ["not found", "not adjacent", "occupied", "slot 0", "(0,0)", "not initialized"];
    const isClientError = clientErrors.some(msg => e.message.includes(msg));
    return res.status(isClientError ? 400 : 500).json({ msg: e.message });
  }
});

module.exports = router;
