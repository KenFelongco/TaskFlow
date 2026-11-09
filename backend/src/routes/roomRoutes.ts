import { Router } from 'express';
import {
  createRoom,
  joinRoomByCode,
  getMyRooms,
  getRoomMembers,
  getRoomTasks,
  saveRoomTask,
} from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Create a private room (generates unique invite code)
router.post('/', authMiddleware, createRoom);

// Join a strictly private room by unique code
router.post('/join', authMiddleware, joinRoomByCode);

// Get all rooms the current user has joined or owns
router.get('/my-rooms', authMiddleware, getMyRooms);

// Get members of a specific room code
router.get('/:roomCode/members', authMiddleware, getRoomMembers);

// Get all shared tasks of a specific room code
router.get('/:roomCode/tasks', authMiddleware, getRoomTasks);

// Save or sync a shared task to a specific room code
router.post('/:roomCode/tasks', authMiddleware, saveRoomTask);

export default router;
