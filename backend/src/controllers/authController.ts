import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma, isDatabaseConnected } from '../config/db';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  avatarUrl: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleAuthSchema = z.object({
  idToken: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  googleId: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// Clean state: No pre-seeded demo accounts in production
export const DEMO_ACCOUNTS: any[] = [];

// In-memory fallback users cache
const memoryUsers = new Map<string, any>();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const { email, password, displayName, avatarUrl } = parseResult.data;

    // Check memory or DB
    let existingUser = memoryUsers.get(email);
    if (!existingUser && isDatabaseConnected) {
      try {
        existingUser = await prisma.user.findUnique({ where: { email } });
      } catch (e) {
        // DB offline fallback
      }
    }

    if (existingUser) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const defaultAvatar =
      avatarUrl ||
      `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=160&q=80`;

    const newUser = {
      id: userId,
      email,
      displayName,
      avatarUrl: defaultAvatar,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    memoryUsers.set(email, newUser);

    if (isDatabaseConnected) {
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email,
            passwordHash,
            displayName,
            avatarUrl: defaultAvatar,
          },
        });
      } catch (e) {
        // Memory fallback active
      }
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, displayName: newUser.displayName },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatarUrl,
        createdAt: newUser.createdAt,
      },
      token,
      message: 'Account created successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const { email, password } = parseResult.data;

    let user = memoryUsers.get(email);
    if (!user && isDatabaseConnected) {
      try {
        user = await prisma.user.findUnique({ where: { email } });
      } catch (e) {
        // DB fallback
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check demo accounts bypass or bcrypt
    const isDemo = DEMO_ACCOUNTS.some((d) => d.email === email);
    const isMatch = isDemo || (user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, displayName: user.displayName },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to log in' });
  }
}

/**
 * POST /api/auth/google
 * Authenticate with Google account (Google Sign-In).
 * Automatically provisions account if first-time user.
 */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    let email = parseResult.data.email;
    let displayName = parseResult.data.displayName;
    let avatarUrl = parseResult.data.avatarUrl;
    let googleId = parseResult.data.googleId;
    const idToken = parseResult.data.idToken;

    // Cryptographic verification with Google OAuth2 TokenInfo API if idToken provided
    if (idToken) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!verifyRes.ok) {
          const errData: any = await verifyRes.json().catch(() => ({}));
          res.status(401).json({
            error: 'Google token verification failed',
            details: errData.error_description || 'Invalid or expired Google ID token',
          });
          return;
        }

        const verified: any = await verifyRes.json();
        email = verified.email;
        displayName = verified.name || verified.given_name || (verified.email ? verified.email.split('@')[0] : 'Google User');
        avatarUrl = verified.picture;
        googleId = verified.sub;
      } catch (verifyErr: any) {
        console.error('Google tokeninfo fetch error:', verifyErr);
        res.status(502).json({ error: 'Failed to connect to Google authentication servers' });
        return;
      }
    }

    if (!email || !displayName) {
      res.status(400).json({ error: 'Email and displayName could not be verified' });
      return;
    }

    let user = memoryUsers.get(email);
    if (!user && isDatabaseConnected) {
      try {
        user = await prisma.user.findUnique({ where: { email } });
      } catch (e) {
        // Fallback
      }
    }

    if (!user) {
      // First-time Google user -> create account
      const userId = 'usr_g_' + (googleId || Math.random().toString(36).substring(2, 9));
      user = {
        id: userId,
        email,
        displayName,
        avatarUrl:
          avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
        googleId: googleId || userId,
        createdAt: new Date().toISOString(),
      };
      memoryUsers.set(email, user);

      if (isDatabaseConnected) {
        try {
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              googleId: user.googleId,
            },
          });
        } catch (e) {
          // DB fallback
        }
      }
    } else {
      // Update profile info if user logged in with Google again
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (displayName) user.displayName = displayName;
      if (googleId) user.googleId = googleId;
      memoryUsers.set(email, user);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
      message: 'Authenticated with Google successfully',
    });
  } catch (error: any) {
    console.error('Google Auth error:', error);
    res.status(500).json({ error: error.message || 'Failed Google authentication' });
  }
}

/**
 * GET /api/auth/demo-accounts
 * Get pre-configured team accounts for instant 1-tap testing
 */
export async function getDemoAccounts(_req: Request, res: Response): Promise<void> {
  res.json({ demoAccounts: [] });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let user: any = null;
    for (const u of memoryUsers.values()) {
      if (u.id === req.userId) {
        user = u;
        break;
      }
    }

    if (!user && isDatabaseConnected) {
      try {
        user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            createdAt: true,
          },
        });
      } catch (e) {
        // DB fallback
      }
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
}
