import { localDB } from './storage';
import { disableGoogleAutoSelect } from './googleAuth';

import { API_URL, getCandidateHosts, setResolvedBackendHost, BACKEND_PORT } from '../config/api';

const getBackendUrl = () => API_URL;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  avatarUrl?: string;
}

export interface DemoAccount extends UserProfile {
  token: string;
}

const AUTH_STORAGE_KEY = 'taskflow_auth_session_v1';

class AuthService {
  private currentUser: UserProfile | null = null;
  private token: string | null = null;
  private listeners: Set<(user: UserProfile | null) => void> = new Set();

  constructor() {
    this.loadPersistedSession();
  }

  private loadPersistedSession() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.currentUser = parsed.user;
          this.token = parsed.token;
          localDB.setUserScope(this.currentUser?.id || null);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted auth session:', e);
    }

    // Default to null so user is prompted to sign in with their real account
    this.currentUser = null;
    this.token = null;
    localDB.setUserScope(null);
  }

  private persistSession(user: UserProfile, token: string) {
    this.currentUser = user;
    this.token = token;
    localDB.setUserScope(user.id);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
      }
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
    this.notify();
  }

  get user(): UserProfile | null {
    return this.currentUser;
  }

  get authToken(): string | null {
    return this.token;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  subscribe(listener: (user: UserProfile | null) => void) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  // --- Server Health Check ---
  async checkHealth(): Promise<boolean> {
    // 1. Try current resolved endpoint first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${getBackendUrl()}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) return true;
    } catch {
      // Primary attempt failed, try other candidates
    }

    // 2. Fallback probe across candidate hosts (handles emulator 10.0.2.2 vs Wi-Fi LAN IP)
    const candidates = getCandidateHosts();
    for (const host of candidates) {
      try {
        const testUrl = `http://${host}:${BACKEND_PORT}/api/health`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(testUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          console.log(`✅ [TaskFlow Health] Connected successfully to host: ${host}`);
          setResolvedBackendHost(host);
          return true;
        }
      } catch {}
    }

    return false;
  }

  // --- Google Sign-In (Direct Profile / Mobile Flow) ---
  async loginWithGoogle(profile?: { email: string; displayName: string; avatarUrl?: string; googleId?: string }) {
    const lastSaved = localDB.getLastGoogleAccount();
    const payload = profile || {
      email: lastSaved?.email || 'user@gmail.com',
      displayName: lastSaved?.displayName || 'Google Account User',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
      googleId: 'google_' + Math.random().toString(36).substring(2, 9),
    };

    try {
      const res = await fetch(`${getBackendUrl()}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google login failed');
      }

      this.persistSession(data.user, data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err: any) {
      console.warn('Backend unavailable during Google login, using offline session:', err);
      // In offline fallback, generate local session
      const fallbackUser: UserProfile = {
        id: 'usr_g_' + (payload.googleId || Math.random().toString(36).substring(2, 8)),
        email: payload.email,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        role: 'Collaborator',
      };
      this.persistSession(fallbackUser, 'mock_google_token_' + Date.now());
      return { success: true, user: fallbackUser, token: this.token! };
    }
  }

  // --- Email & Password Login ---
  async loginWithEmail(email: string, password: string) {
    try {
      const res = await fetch(`${getBackendUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      this.persistSession(data.user, data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err: any) {
      // If server is not responding, allow offline entry
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Network request failed') || err.name === 'TypeError') {
        console.warn('Server offline, logging in as local offline user');
        const localUser: UserProfile = {
          id: 'usr_loc_' + Math.random().toString(36).substring(2, 8),
          email: email.trim(),
          displayName: email.split('@')[0] || 'Local User',
          role: 'Owner',
        };
        this.persistSession(localUser, 'offline_token_' + Date.now());
        return { success: true, user: localUser, token: this.token! };
      }
      throw err;
    }
  }

  // --- Email & Password Registration ---
  async register(email: string, password: string, displayName: string, avatarUrl?: string) {
    try {
      const res = await fetch(`${getBackendUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      this.persistSession(data.user, data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err: any) {
      // If server is not responding, allow offline registration
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Network request failed') || err.name === 'TypeError') {
        console.warn('Server offline, creating local offline account');
        const localUser: UserProfile = {
          id: 'usr_loc_' + Math.random().toString(36).substring(2, 8),
          email: email.trim(),
          displayName: displayName.trim(),
          avatarUrl,
          role: 'Owner',
        };
        this.persistSession(localUser, 'offline_token_' + Date.now());
        return { success: true, user: localUser, token: this.token! };
      }
      throw err;
    }
  }

  // --- Standalone Guest / Instant Offline Mode Entry ---
  loginAsOfflineGuest(displayName: string = 'Workspace Guest') {
    const guestUser: UserProfile = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 8),
      email: 'guest@taskflow.local',
      displayName,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
      role: 'Owner',
    };
    this.persistSession(guestUser, 'guest_token_' + Date.now());
    return guestUser;
  }

  // --- Quick Account Switcher (For seamless multi-tab testing) ---
  switchAccount(user: UserProfile, token: string = 'token_' + user.id) {
    this.persistSession(user, token);
  }

  // --- Fetch Demo Accounts (Empty in production) ---
  async fetchDemoAccounts(): Promise<DemoAccount[]> {
    return [];
  }

  // --- Real Google Sign-In with Cryptographic ID Token ---
  async loginWithGoogleIdToken(idToken: string) {
    try {
      const res = await fetch(`${getBackendUrl()}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Google authentication failed');
      }

      this.persistSession(data.user, data.token);
      return { success: true, user: data.user, token: data.token };
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Network request failed')) {
        throw new Error(`Cannot reach server at ${getBackendUrl()}. Ensure the backend is running.`);
      }
      throw err;
    }
  }

  // --- Logout ---
  logout() {
    this.currentUser = null;
    this.token = null;
    localDB.setUserScope(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      disableGoogleAutoSelect();
    } catch (e) {}
    this.notify();
  }
}

export const authService = new AuthService();
