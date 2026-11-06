import { Router } from 'express';
import { createRoom, joinRoomByCode, getMyRooms, getRoomMembers } from '../controllers/roomController';
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

export default router;
