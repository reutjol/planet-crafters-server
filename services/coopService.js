const rooms = {}; // only for coop

function ensureRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      type: 'coop',
      players: {}
    };
  }
  return rooms[roomId];
}

module.exports = {
  handleJoin(io, socket, data) {
    const { roomId, playerId, initialState } = data || {};
    if (!roomId || !playerId) return;

    const room = ensureRoom(roomId);
    socket.join(roomId);

    room.players[socket.id] = {
      playerId,
      state: initialState || {}
    };

    // Other players
    const others = Object.entries(room.players)
      .filter(([id]) => id !== socket.id)
      .map(([id, p]) => ({ socketId: id, playerId: p.playerId, state: p.state }));

    socket.emit('coopRoomJoined', {
      roomId,
      yourSocketId: socket.id,
      players: others
    });

    socket.to(roomId).emit('coopPlayerJoined', {
      socketId: socket.id,
      playerId,
      state: room.players[socket.id].state
    });
  },

  handlePlayerState(io, socket, data) {
    const { roomId, playerId, state } = data || {};
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) return;

    room.players[socket.id].state = state;

    socket.to(roomId).emit('coopPlayerState', {
      socketId: socket.id,
      playerId,
      state
    });
  },

  handlePlayerAction(io, socket, data) {
    const { roomId, playerId, actionType, payload } = data || {};
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) return;

    // Possible future logic here

    socket.to(roomId).emit('coopPlayerAction', {
      socketId: socket.id,
      playerId,
      actionType,
      payload
    });
  },

  handleDisconnect(io, socket) {
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        const player = room.players[socket.id];
        delete room.players[socket.id];

        socket.to(roomId).emit('coopPlayerLeft', {
          socketId: socket.id,
          playerId: player.playerId
        });

        if (Object.keys(room.players).length === 0) {
          delete rooms[roomId];
        }
      }
    }
  }
};
