import { io, type Socket } from 'socket.io-client';

type SocketEvent = 'connect' | 'disconnect' | 'smartbin-data' | 'connect_error';

const BACKEND_URL = 'http://localhost:5000';

class SocketService {
  socket: Socket | null = null;

  private initSocket() {
    if (this.socket) return;

    this.socket = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: { source: 'dashboard' },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  connect() {
    this.initSocket();
  }

  on<T extends SocketEvent>(event: T, callback: (...args: any[]) => void) {
    this.initSocket();
    this.socket?.on(event as any, callback as any);
  }

  off<T extends SocketEvent>(event: T, callback?: (...args: any[]) => void) {
    this.socket?.off(event as any, callback as any);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketService();
