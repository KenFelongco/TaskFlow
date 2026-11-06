import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../config/api';

class ClientSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentRoomCode: string = 'SPRINT-2025';
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(userId: string = 'dev-user-01', userProfile?: any) {
    if (this.socket) {
      return;
    }

    try {
      this.socket = io(BACKEND_URL, {
        auth: { devUserId: userId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log(`🔌 Connected to backend. Joining room: ${this.currentRoomCode}`);
        this.joinRoom(this.currentRoomCode, userProfile);
        this.notify('connection_change', { status: 'connected' });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.notify('connection_change', { status: 'disconnected' });
      });

      // User & room events
      this.socket.on('task:created', (data) => this.notify('task:created', data));
      this.socket.on('task:updated', (data) => this.notify('task:updated', data));
      this.socket.on('task:deleted', (data) => this.notify('task:deleted', data));
      this.socket.on('sync:delta_available', (data) => this.notify('sync:delta_available', data));
      this.socket.on('reminder:triggered', (data) => this.notify('reminder:triggered', data));
      this.socket.on('fcm:notification', (data) => this.notify('fcm:notification', data));

      // Live Room Code collaboration events
      this.socket.on('room:members_updated', (data) => this.notify('room:members_updated', data));
      this.socket.on('room:joined_success', (data) => this.notify('room:joined_success', data));
      this.socket.on('room:task_created', (data) => this.notify('room:task_created', data));
      this.socket.on('room:task_updated', (data) => this.notify('room:task_updated', data));
      this.socket.on('room:task_deleted', (data) => this.notify('room:task_deleted', data));
    } catch (err) {
      console.warn('Socket connection error:', err);
    }
  }

  joinRoom(roomCode: string, user?: any) {
    this.currentRoomCode = (roomCode || 'SPRINT-2025').trim().toUpperCase();
    if (this.socket && this.socket.connected) {
      this.socket.emit('room:join', {
        roomCode: this.currentRoomCode,
        user,
      });
    }
  }

  broadcastTaskCreated(task: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('room:task_created', {
        roomCode: this.currentRoomCode,
        task,
      });
    }
  }

  broadcastTaskUpdated(task: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('room:task_updated', {
        roomCode: this.currentRoomCode,
        task,
      });
    }
  }

  broadcastTaskDeleted(taskId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('room:task_deleted', {
        roomCode: this.currentRoomCode,
        taskId,
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get roomCode(): string {
    return this.currentRoomCode;
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
}

export const socketService = new ClientSocketService();
