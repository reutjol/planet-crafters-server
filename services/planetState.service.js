const Planet = require("../model/Planet_model");
const HexTile = require("../model/HexTile_model");
const { DIRS } = require("./planet.service");
const { getTargetScore } = require("../config/stageConfig");

function emptyStageState() {
  return {
    map: { placedTiles: [] },
    hand: { maxHandSize: 3, tilesInHand: [] },
    deck: { remainingTiles: [] },
    progress: { developedPercent: 0, score: 0, isCompleted: false },
  };
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createDeckAndHand(deckSize, handSize = 3) {
  const tiles = await HexTile.find({}, { _id: 1 }).lean();
  if (!tiles.length) throw new Error("No HexTile templates");

  const ids = tiles.map(t => String(t._id));
  const pack = Array.from({ length: deckSize }, () => randomPick(ids));

  return {
    hand: {
      maxHandSize: handSize,
      tilesInHand: pack.slice(0, handSize),
    },
    deck: {
      remainingTiles: pack.slice(handSize),
    },
  };
}

async function getStageState({ userId, planetId, stageId, deckSize }) {
  const planet = await Planet.findOne(
    { userId, planetId, "stages.stageId": stageId },
    { stages: { $elemMatch: { stageId } }, planetId: 1 }
  ).lean();

  if (!planet || !planet.stages.length) {
    throw new Error("Stage not found");
  }

  const stage = planet.stages[0];
  let state = stage.state || emptyStageState();

  const hasDeck =
    state.deck &&
    Array.isArray(state.deck.remainingTiles) &&
    state.deck.remainingTiles.length > 0;

  if (!hasDeck) {
    const { hand, deck } = await createDeckAndHand(deckSize);

    state = { ...state, hand, deck };

    await Planet.updateOne(
      { userId, planetId, "stages.stageId": stageId },
      {
        $set: {
          "stages.$.state": state,
          "stages.$.meta.isStarted": true,
          "stages.$.meta.lastPlayedAt": new Date(),
        },
      }
    );
  } else {
    // Stage already has a deck — always mark as started when accessed
    await Planet.updateOne(
      { userId, planetId, "stages.stageId": stageId },
      {
        $set: {
          "stages.$.meta.isStarted": true,
          "stages.$.meta.lastPlayedAt": new Date(),
        },
      }
    );
  }

  return {
    planetId,
    stageId,
    meta: stage.meta,
    state,
  };
}

async function saveStageState({ userId, planetId, stageId, state }) {
  if (!state?.hand || !state?.deck) {
    throw new Error("Invalid state: hand/deck required");
  }

  const updated = await Planet.findOneAndUpdate(
    { userId, planetId, "stages.stageId": stageId },
    {
      $set: {
        "stages.$.state": state,
        "stages.$.meta.lastPlayedAt": new Date(),
      },
    },
    { new: true, projection: { stages: { $elemMatch: { stageId } } } }
  ).lean();

  if (!updated || !updated.stages.length) {
    throw new Error("Stage not found");
  }

  return {
    planetId,
    stageId,
    meta: updated.stages[0].meta,
    state: updated.stages[0].state,
  };
}

async function resetStageState({ userId, planetId, stageId }) {
  const emptyState = {
    map: { placedTiles: [] },
    hand: { maxHandSize: 3, tilesInHand: [] },
    deck: { remainingTiles: [] },
    progress: { developedPercent: 0, score: 0, isCompleted: false },
  };

  const updated = await Planet.findOneAndUpdate(
    { userId, planetId, "stages.stageId": stageId },
    {
      $set: {
        "stages.$.state": emptyState,
        "stages.$.meta.isStarted": false,
        "stages.$.meta.lastPlayedAt": null,
      },
    },
    { new: true, projection: { stages: { $elemMatch: { stageId } } } }
  ).lean();

  if (!updated || !updated.stages?.length) {
    throw new Error("Stage not found");
  }

  return {
    planetId,
    stageId,
    ...emptyState,
  };
}

function getAxialNeighbors(q, r) {
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

async function placeTile({ userId, planetId, stageId, tileId, coord, rotation }) {
  const planet = await Planet.findOne(
    { userId, planetId, "stages.stageId": stageId },
    { stages: { $elemMatch: { stageId } }, planetId: 1 }
  ).lean();

  if (!planet || !planet.stages.length) throw new Error("Stage not found");

  const stage = planet.stages[0];
  const state = stage.state;
  if (!state) throw new Error("Stage state not initialized. Load stage first.");

  const hand = state.hand?.tilesInHand ?? [];
  const deck = state.deck?.remainingTiles ?? [];
  const placedTiles = state.map?.placedTiles ?? [];

  // Validate tile is slot 0 of the hand
  if (hand.length === 0 || hand[0] !== tileId) {
    throw new Error("Tile must be in slot 0 of the hand");
  }

  const { q, r } = coord;
  const rot = ((rotation % 6) + 6) % 6;

  // Validate cell is not already occupied
  const isOccupied = placedTiles.some(t => t.coord.q === q && t.coord.r === r);
  if (isOccupied) throw new Error("Cell already occupied");

  // Validate placement adjacency (first tile must be at origin)
  if (placedTiles.length === 0) {
    if (q !== 0 || r !== 0) throw new Error("First tile must be placed at (0,0)");
  } else {
    const neighbors = getAxialNeighbors(q, r);
    const isAdjacent = neighbors.some(n =>
      placedTiles.some(t => t.coord.q === n.q && t.coord.r === n.r)
    );
    if (!isAdjacent) throw new Error("Cell is not adjacent to any placed tile");
  }

  // Remove tile from slot 0, shift hand
  const newHand = hand.slice(1);

  // Draw from deck if available
  const newDeck = [...deck];
  if (newDeck.length > 0) {
    const drawn = newDeck.shift();
    newHand.push(drawn);
  }

  // Add tile to map
  const newPlacedTiles = [...placedTiles, { tileId, coord: { q, r }, rotation: rot }];

  // Count new correct connections via edge matching.
  // Direction order matches Unity's HexMapManager.axialDirs:
  //   dir 0: (1,0), dir 1: (1,-1), dir 2: (0,-1), dir 3: (-1,0), dir 4: (-1,1), dir 5: (0,1)
  const EDGE_DIRS = [
    { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
    { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 },
  ];

  const idsToFetch = new Set([tileId]);
  for (const tile of placedTiles) {
    if (EDGE_DIRS.some(d => tile.coord.q === q + d.dq && tile.coord.r === r + d.dr)) {
      idsToFetch.add(tile.tileId);
    }
  }

  const rawTemplates = await HexTile.find({ _id: { $in: [...idsToFetch] } }, { edges: 1 }).lean();
  const templateMap = new Map(rawTemplates.map(t => [String(t._id), t]));

  const newTemplate = templateMap.get(tileId);
  let newConnections = 0;
  const scoredConnections = [];
  if (newTemplate) {
    // Face 2 in the 3D model points East (axial dir 0), so faceIdx(d) = (d+2)%6
    const faceIdx = d => (d + 2) % 6;

    for (let dir = 0; dir < 6; dir++) {
      const { dq, dr } = EDGE_DIRS[dir];
      const neighbor = placedTiles.find(t => t.coord.q === q + dq && t.coord.r === r + dr);
      if (!neighbor) continue;
      const neighborTemplate = templateMap.get(neighbor.tileId);
      if (!neighborTemplate) continue;

      const newEdge = newTemplate.edges[(faceIdx(dir) - rot + 6) % 6];
      const oppDir = (dir + 3) % 6;
      const neighborEdge = neighborTemplate.edges[(faceIdx(oppDir) - neighbor.rotation + 6) % 6];

      if (newEdge === neighborEdge) {
        newConnections++;
        scoredConnections.push({ q: neighbor.coord.q, r: neighbor.coord.r });
      }
    }
  }

  // Calculate progress
  const total = newPlacedTiles.length + newDeck.length + newHand.length;
  const developedPercent = total > 0 ? (newPlacedTiles.length / total) * 100 : 0;
  const score = (state.progress?.score ?? 0) + newConnections;
  const targetScore = getTargetScore(stageId);
  const isCompleted = score >= targetScore;

  const newState = {
    map: { placedTiles: newPlacedTiles },
    hand: { maxHandSize: state.hand?.maxHandSize ?? 3, tilesInHand: newHand },
    deck: { remainingTiles: newDeck },
    progress: { developedPercent, score, isCompleted },
  };

  const updateFields = {
    "stages.$.state": newState,
    "stages.$.meta.lastPlayedAt": new Date(),
  };
  if (isCompleted) updateFields["stages.$.meta.isCompleted"] = true;

  await Planet.updateOne(
    { userId, planetId, "stages.stageId": stageId },
    { $set: updateFields }
  );

  // On completion: unlock neighboring stages in the stage map
  if (isCompleted) {
    const stageCoord = stage.meta?.coord;
    if (stageCoord) {
      const neighborCoordKeys = DIRS.map(d =>
        `${stageCoord.q + d.q}_${stageCoord.r + d.r}`
      );

      const fullPlanet = await Planet.findOne(
        { userId, planetId },
        { "stages.stageId": 1, "stages.meta.coord": 1, "stages.meta.isUnlocked": 1 }
      ).lean();

      const stagesToUnlock = (fullPlanet?.stages ?? [])
        .filter(s =>
          s.meta?.coord &&
          neighborCoordKeys.includes(`${s.meta.coord.q}_${s.meta.coord.r}`) &&
          !s.meta.isUnlocked
        )
        .map(s => s.stageId);

      if (stagesToUnlock.length > 0) {
        await Planet.updateOne(
          { userId, planetId },
          { $set: { "stages.$[elem].meta.isUnlocked": true } },
          { arrayFilters: [{ "elem.stageId": { $in: stagesToUnlock } }] }
        );
      }
    }
  }

  return {
    planetId,
    stageId,
    map: newState.map,
    hand: newState.hand,
    deck: newState.deck,
    progress: newState.progress,
    scoredConnections,
  };
}

module.exports = {
  getStageState,
  saveStageState,
  resetStageState,
  placeTile,
};
