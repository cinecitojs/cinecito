import { Server as IOServer } from 'socket.io';

export function attachSignaling(io: IOServer) {
  io.on('connection', (socket) => {
    socket.on('signal', (data) => {
      const { to, payload } = data;
      socket.to(to).emit('signal', { from: socket.id, payload });
    });
  });
}
