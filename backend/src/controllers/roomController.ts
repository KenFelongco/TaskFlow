import { Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma, isDatabaseConnected } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { broadcastToRoom } from '../socket/socketHandler';

// In-memory fallback cache for private rooms when local Postgres is offline
export interface InMemoryRoom {
  id: string;
  name: string;
  inviteCode: string;
  isPrivate: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    roomId: string;
    userId: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    role: string;
    joinedAt: string;
  }>;
}

const memoryRooms = new Map<string, InMemoryRoom>();

// Disk persistence for in-memory fallback rooms so data persists across server restarts
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms_store.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

function loadRoomsFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(ROOMS_FILE)) {
      const data = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const list: InMemoryRoom[] = JSON.parse(data);
      if (Array.isArray(list)) {
        list.forEach((r) => {
          if (r.inviteCode) {
            memoryRooms.set(r.inviteCode.toUpperCase(), r);
          }
        });
        console.log(`💾 Loaded ${list.length} persisted private room(s) from disk store.`);
      }
    }
  } catch (err) {
    console.warn('Failed to load rooms store from disk:', err);
  }
}

function saveRoomsToDisk() {
  try {
    ensureDataDir();
    const list = Array.from(memoryRooms.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save rooms store to disk:', err);
  }
}

// Load persisted rooms on module initialization
loadRoomsFromDisk();

// Generate unique 5-char alphanumeric code (e.g. TF-7K9A2)
export function generateUniqueInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  do {
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `TF-${randomPart}`;
  } while (memoryRooms.has(code));

  return code;
}

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(60, 'Room name is too long'),
  inviteCode: z.string().min(3).max(30).optional(),
});

const joinRoomSchema = z.object({
  inviteCode: z.string().min(3, 'Invite code is required'),
  name: z.string().optional(),
  roomName: z.string().optional(),
});

/**
 * POST /api/rooms
 * Creates or synchronizes a private room with a unique invite code.
 * The creator is assigned as OWNER.
 */
export async function createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const { name } = parseResult.data;
    const userId = req.userId || 'dev-user-01';
    const userEmail = req.userEmail || (req.body.user && req.body.user.email) || 'user@taskflow.dev';
    const displayName = req.displayName || (req.body.user && req.body.user.name) || 'Team Member';
    const avatarUrl =
      req.avatarUrl ||
      (req.body.user && req.body.user.avatarUrl) ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

    const rawCode = (parseResult.data.inviteCode || generateUniqueInviteCode()).trim().toUpperCase();
    const inviteCode = rawCode.startsWith('TF-') ? rawCode : `TF-${rawCode}`;
    const roomId = 'room_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    // Check if room already exists
    let existingRoom = memoryRooms.get(inviteCode);
    if (!existingRoom && isDatabaseConnected) {
      try {
        const dbRoom = await prisma.room.findUnique({
          where: { inviteCode },
          include: { members: { include: { user: true } } },
        });
        if (dbRoom) {
          existingRoom = {
            id: dbRoom.id,
            name: dbRoom.name,
            inviteCode: dbRoom.inviteCode,
            isPrivate: dbRoom.isPrivate,
            ownerId: dbRoom.ownerId,
            createdAt: dbRoom.createdAt.toISOString(),
            updatedAt: dbRoom.updatedAt.toISOString(),
            members: dbRoom.members.map((m) => ({
              id: m.id,
              roomId: m.roomId,
              userId: m.userId,
              displayName: m.user.displayName,
              email: m.user.email,
              avatarUrl: m.user.avatarUrl || undefined,
              role: m.role,
              joinedAt: m.joinedAt.toISOString(),
            })),
          };
          memoryRooms.set(inviteCode, existingRoom);
        }
      } catch (e) {}
    }

    if (existingRoom) {
      let mem = existingRoom.members.find((m) => m.userId === userId || (userEmail && m.email === userEmail));
      if (!mem) {
        mem = {
          id: 'rm_' + Math.random().toString(36).substring(2, 9),
          roomId: existingRoom.id,
          userId,
          displayName,
          email: userEmail,
          avatarUrl,
          role: 'OWNER',
          joinedAt: now,
        };
        existingRoom.members.push(mem);
        saveRoomsToDisk();
      }
      res.status(200).json({
        room: {
          id: existingRoom.id,
          name: existingRoom.name,
          inviteCode: existingRoom.inviteCode,
          isPrivate: existingRoom.isPrivate,
          ownerId: existingRoom.ownerId,
          createdAt: existingRoom.createdAt,
        },
        members: existingRoom.members,
        inviteCode: existingRoom.inviteCode,
        message: 'Private room synced successfully.',
      });
      return;
    }

    const newRoom: InMemoryRoom = {
      id: roomId,
      name,
      inviteCode,
      isPrivate: true,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          id: 'rm_' + Math.random().toString(36).substring(2, 9),
          roomId,
          userId,
          displayName,
          email: userEmail,
          avatarUrl,
          role: 'OWNER',
          joinedAt: now,
        },
      ],
    };

    memoryRooms.set(inviteCode, newRoom);
    saveRoomsToDisk();

    // Persist to Prisma DB if available
    try {
      await prisma.room.create({
        data: {
          id: roomId,
          name,
          inviteCode,
          isPrivate: true,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
        },
      });
    } catch (dbErr: any) {
      // In dev fallback, gracefully stored in memory and disk
    }

    res.status(201).json({
      room: {
        id: newRoom.id,
        name: newRoom.name,
        inviteCode: newRoom.inviteCode,
        isPrivate: newRoom.isPrivate,
        ownerId: newRoom.ownerId,
        createdAt: newRoom.createdAt,
      },
      members: newRoom.members,
      inviteCode,
      message: 'Private room created successfully. Share your invite code with collaborators.',
    });
  } catch (error: any) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
}

/**
 * POST /api/rooms/join
 * Join an existing strictly private room by its unique invite code.
 * Ensures zero false-restriction across accounts.
 */
export async function joinRoomByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = joinRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const rawCode = parseResult.data.inviteCode.trim().toUpperCase();
    const inviteCode = rawCode.startsWith('TF-') ? rawCode : `TF-${rawCode}`;
    const userId = req.userId || 'dev-user-01';
    const userEmail = req.userEmail || (req.body.user && req.body.user.email) || 'teammate@taskflow.dev';
    const displayName =
      req.displayName ||
      (req.body.user && req.body.user.name) ||
      (req.body.user && req.body.user.displayName) ||
      'Teammate';
    const avatarUrl =
      req.avatarUrl ||
      (req.body.user && req.body.user.avatarUrl) ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80';

    // Look for exact code or stripped code
    let room = memoryRooms.get(inviteCode) || memoryRooms.get(rawCode);

    // If not in memory, check Prisma DB
    if (!room) {
      try {
        const dbRoom = await prisma.room.findFirst({
          where: {
            OR: [{ inviteCode }, { inviteCode: rawCode }],
          },
          include: {
            members: { include: { user: true } },
          },
        });

        if (dbRoom) {
          room = {
            id: dbRoom.id,
            name: dbRoom.name,
            inviteCode: dbRoom.inviteCode,
            isPrivate: dbRoom.isPrivate,
            ownerId: dbRoom.ownerId,
            createdAt: dbRoom.createdAt.toISOString(),
            updatedAt: dbRoom.updatedAt.toISOString(),
            members: dbRoom.members.map((m) => ({
              id: m.id,
              roomId: m.roomId,
              userId: m.userId,
              displayName: m.user.displayName,
              email: m.user.email,
              avatarUrl: m.user.avatarUrl || undefined,
              role: m.role,
              joinedAt: m.joinedAt.toISOString(),
            })),
          };
          memoryRooms.set(room.inviteCode, room);
          saveRoomsToDisk();
        }
      } catch (e) {
        // DB lookup optional fallback
      }
    }

    // If still not registered in backend (e.g. created on client while offline or before restart),
    // auto-register the room seamlessly so the other account is never restricted!
    if (!room) {
      const roomName = (
        parseResult.data.roomName ||
        parseResult.data.name ||
        req.body.name ||
        `Private Workspace [${inviteCode}]`
      ).trim();
      const roomId = 'room_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      room = {
        id: roomId,
        name: roomName,
        inviteCode,
        isPrivate: true,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
        members: [],
      };
      memoryRooms.set(inviteCode, room);
      saveRoomsToDisk();
      console.log(`✨ Auto-registered private room [${inviteCode}] for incoming collaborator.`);
    }

    // Check if user is already a member
    let member = room.members.find((m) => m.userId === userId || (userEmail && m.email === userEmail));
    if (!member) {
      member = {
        id: 'rm_' + Math.random().toString(36).substring(2, 9),
        roomId: room.id,
        userId,
        displayName,
        email: userEmail,
        avatarUrl,
        role: room.members.length === 0 ? 'OWNER' : 'MEMBER',
        joinedAt: new Date().toISOString(),
      };
      room.members.push(member);
      saveRoomsToDisk();

      try {
        await prisma.roomMember.create({
          data: {
            roomId: room.id,
            userId,
            role: member.role,
          },
        });
      } catch (e) {
        // DB fallback
      }

      // Notify other active room members via Socket.IO
      broadcastToRoom(inviteCode, 'room:member_joined', {
        roomCode: inviteCode,
        member,
      });
    }

    res.json({
      room: {
        id: room.id,
        name: room.name,
        inviteCode: room.inviteCode,
        isPrivate: room.isPrivate,
        ownerId: room.ownerId,
        createdAt: room.createdAt,
      },
      members: room.members,
      message: `Successfully entered private room "${room.name}"`,
    });
  } catch (error: any) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: error.message || 'Failed to join room' });
  }
}

/**
 * GET /api/rooms/my-rooms
 * Returns all private rooms the authenticated user has created or joined.
 */
export async function getMyRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId || 'dev-user-01';
    const userEmail = req.userEmail;

    const roomsMap = new Map<string, any>();

    // 1. Fetch from Prisma DB if accessible
    try {
      const dbRooms = await prisma.room.findMany({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        include: {
          members: true,
        },
      });

      for (const r of dbRooms) {
        const mem = r.members.find((m) => m.userId === userId);
        roomsMap.set(r.inviteCode, {
          id: r.id,
          name: r.name,
          inviteCode: r.inviteCode,
          isPrivate: r.isPrivate,
          ownerId: r.ownerId,
          role: mem ? mem.role : r.ownerId === userId ? 'OWNER' : 'MEMBER',
          memberCount: r.members.length,
          createdAt: r.createdAt.toISOString(),
        });
      }
    } catch (e) {
      // DB offline fallback
    }

    // 2. Fetch from memory store
    for (const room of memoryRooms.values()) {
      const userMembership = room.members.find(
        (m) => m.userId === userId || (userEmail && m.email === userEmail)
      );
      if (userMembership || room.ownerId === userId) {
        roomsMap.set(room.inviteCode, {
          id: room.id,
          name: room.name,
          inviteCode: room.inviteCode,
          isPrivate: room.isPrivate,
          ownerId: room.ownerId,
          role: userMembership ? userMembership.role : 'OWNER',
          memberCount: room.members.length,
          createdAt: room.createdAt,
        });
      }
    }

    res.json({ rooms: Array.from(roomsMap.values()) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list rooms' });
  }
}

/**
 * GET /api/rooms/:roomCode/members
 * Get current registered members of a private room.
 */
export async function getRoomMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rawCode = req.params.roomCode.trim().toUpperCase();
    const roomCode = rawCode.startsWith('TF-') ? rawCode : `TF-${rawCode}`;
    const room = memoryRooms.get(roomCode) || memoryRooms.get(rawCode);

    if (!room) {
      const userId = req.userId || 'dev-user-01';
      const displayName = req.displayName || 'You';
      res.json({
        roomCode,
        members: [
          {
            id: userId,
            roomId: roomCode,
            userId,
            displayName,
            email: req.userEmail || 'user@taskflow.dev',
            avatarUrl: req.avatarUrl,
            role: 'OWNER',
            joinedAt: new Date().toISOString(),
          },
        ],
      });
      return;
    }

    res.json({
      roomCode,
      members: room.members,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch members' });
  }
}
