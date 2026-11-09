import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { addOrUpdateRoomTask, deleteRoomTask } from '../controllers/roomController';

export interface RoomMember {
  id: string;
  socketId: string;
  name: string;
  role: string;
  avatarUrl: string;
  joinedAt: string;
  isOnline: boolean;
}

let ioInstance: SocketIOServer | null = null;

// Track active members in each roomCode: roomCode -> Map<socketId, RoomMember>
const roomMembersMap = new Map<string, Map<string, RoomMember>>();

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.clientOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const devUserId = socket.handshake.auth?.devUserId || socket.handshake.query?.devUserId;

    if (devUserId) {
      socket.data.userId = devUserId;
      return next();
    }

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 Client connected to Socket.IO. SocketID: ${socket.id}, UserID: ${userId}`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // --- Room Code Join Handler ---
    socket.on('room:join', (data: { roomCode: string; user?: Partial<RoomMember> }) => {
      const roomCode = (data.roomCode || 'SPRINT-2025').trim().toUpperCase();
      const roomKey = `room:${roomCode}`;

      // Clean up previous room membership if switching rooms
      const oldRoomCode = socket.data.currentRoomCode;
      if (oldRoomCode && oldRoomCode !== roomCode && roomMembersMap.has(oldRoomCode)) {
        socket.leave(`room:${oldRoomCode}`);
        const oldRoomMap = roomMembersMap.get(oldRoomCode)!;
        oldRoomMap.delete(socket.id);
        io.to(`room:${oldRoomCode}`).emit('room:members_updated', {
          roomCode: oldRoomCode,
          members: Array.from(oldRoomMap.values()),
        });
      }

      socket.join(roomKey);
      socket.data.currentRoomCode = roomCode;

      if (!roomMembersMap.has(roomCode)) {
        roomMembersMap.set(roomCode, new Map());
      }

      const member: RoomMember = {
        id: data.user?.id || userId || `user-${socket.id.substring(0, 5)}`,
        socketId: socket.id,
        name: data.user?.name || 'You',
        role: data.user?.role || 'Lead Engineer',
        avatarUrl:
          data.user?.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
        joinedAt: new Date().toISOString(),
        isOnline: true,
      };

      roomMembersMap.get(roomCode)!.set(socket.id, member);

      const membersList = Array.from(roomMembersMap.get(roomCode)!.values());

      console.log(`👥 User ${member.name} joined Room [${roomCode}]. Active members: ${membersList.length}`);

      // Broadcast updated member list to everyone in this room
      io.to(roomKey).emit('room:members_updated', {
        roomCode,
        members: membersList,
        joinedUser: member,
      });

      socket.emit('room:joined_success', {
        roomCode,
        members: membersList,
      });
    });

    // --- Room Code Task Broadcast Handlers ---
    socket.on('room:task_created', (data: { roomCode: string; task: any }) => {
      const roomCode = (data.roomCode || 'SPRINT-2025').trim().toUpperCase();
      console.log(`📢 Real-time Task Created in Room [${roomCode}]: ${data.task?.title}`);
      if (data.task) {
        addOrUpdateRoomTask(roomCode, data.task);
      }
      socket.to(`room:${roomCode}`).emit('room:task_created', data.task);
    });

    socket.on('room:task_updated', (data: { roomCode: string; task: any }) => {
      const roomCode = (data.roomCode || 'SPRINT-2025').trim().toUpperCase();
      console.log(`📢 Real-time Task Updated in Room [${roomCode}]: ${data.task?.id}`);
      if (data.task) {
        addOrUpdateRoomTask(roomCode, data.task);
      }
      socket.to(`room:${roomCode}`).emit('room:task_updated', data.task);
    });

    socket.on('room:task_deleted', (data: { roomCode: string; taskId: string }) => {
      const roomCode = (data.roomCode || 'SPRINT-2025').trim().toUpperCase();
      console.log(`📢 Real-time Task Deleted in Room [${roomCode}]: ${data.taskId}`);
      if (data.taskId) {
        deleteRoomTask(roomCode, data.taskId);
      }
      socket.to(`room:${roomCode}`).emit('room:task_deleted', { id: data.taskId });
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      const roomCode = socket.data.currentRoomCode;

      if (roomCode && roomMembersMap.has(roomCode)) {
        const roomMap = roomMembersMap.get(roomCode)!;
        roomMap.delete(socket.id);

        const updatedMembers = Array.from(roomMap.values());
        io.to(`room:${roomCode}`).emit('room:members_updated', {
          roomCode,
          members: updatedMembers,
        });
      }
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  ioInstance = io;
  return io;
}

export function broadcastToUser(userId: string, event: string, data: any): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, data);
}

export function broadcastToRoom(roomCode: string, event: string, data: any): void {
  if (!ioInstance) return;
  ioInstance.to(`room:${roomCode.trim().toUpperCase()}`).emit(event, data);
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
