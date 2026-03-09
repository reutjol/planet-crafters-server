const soloRooms = {}; // roomId = playerId or uuid

module.exports = {
  handleJoin(io, socket, data) {
    const { playerId, initialState } = data || {};
    if (!playerId) return;

    const roomId = `solo_${playerId}`;
    socket.join(roomId);

    soloRooms[socket.id] = {
      roomId,
      playerId,
      state: initialState || {}
    };

    socket.emit('soloRoomJoined', {
      roomId,
      yourSocketId: socket.id,
      state: soloRooms[socket.id].state
    });
  },

  handleState(io, socket, data) {
    const { state } = data || {};
    const solo = soloRooms[socket.id];
    if (!solo) return;

    solo.state = state;

    // If you want – you can send some update from the server
    // socket.emit('soloStateAck', { ok: true });
  },

  handleDisconnect(io, socket) {
    if (soloRooms[socket.id]) {
      delete soloRooms[socket.id];
    }
  }
};
