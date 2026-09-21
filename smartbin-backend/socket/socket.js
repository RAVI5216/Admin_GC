import { Server as SocketIOServer } from 'socket.io';

export const initializeSocket = (httpServer, corsOptions, logger = console) => {
  let latestSmartbinData = null;

  const io = new SocketIOServer(httpServer, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    logger.info('Socket.IO client connected', { socketId: socket.id });
    socket.emit('connection-status', { status: 'connected' });
    if (latestSmartbinData) {
      socket.emit('smartbin-data', latestSmartbinData);
    }

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  const broadcastSmartbinData = (data) => {
    latestSmartbinData = data;
    logger.debug('Broadcasting smartbin-data', { deviceId: data?.deviceId });
    io.emit('smartbin-data', data);
  };

  return { io, broadcastSmartbinData };
};
