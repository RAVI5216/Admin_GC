import { Server as SocketIOServer } from 'socket.io';

export const initializeSocket = (httpServer, corsOptions, logger = console) => {
  const io = new SocketIOServer(httpServer, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    logger.info('Socket.IO client connected', { socketId: socket.id });
    socket.emit('connection-status', { status: 'connected' });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  const broadcastSmartbinData = (data) => {
  console.log("📤 Broadcasting:", data);
  io.emit("smartbin-data", data);
};

  return { io, broadcastSmartbinData };
};
