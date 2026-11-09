import { Task, Category, SyncMutation, TeamMember } from '../types';

declare const window: any;

const STORAGE_KEYS = {
  TASKS: 'taskflow_tasks_v4',
  CATEGORIES: 'taskflow_categories_v4',
  MUTATIONS: 'taskflow_mutations_v4',
  LAST_SYNC: 'taskflow_last_sync_v4',
  ROOMS: 'taskflow_rooms_v4',
  ACTIVE_ROOM: 'taskflow_active_room_v4',
  LAST_GOOGLE_ACCOUNT: 'taskflow_last_google_account_v4',
  OFFLINE_USER: 'taskflow_offline_user_v4',
};

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-work', name: 'Work', color: '#6366F1', icon: 'briefcase' },
  { id: 'cat-personal', name: 'Personal', color: '#10B981', icon: 'user' },
  { id: 'cat-urgent', name: 'Urgent', color: '#EF4444', icon: 'alert-triangle' },
  { id: 'cat-ideas', name: 'Ideas', color: '#F59E0B', icon: 'lightbulb' },
];

class LocalStorageEngine {
  private currentUserId: string | null = null;
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    this.cleanLegacyStorage();
  }

  private cleanLegacyStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('taskflow_tasks_v3');
      }
    } catch {}
  }

  /**
   * Set active user scope. Scopes all task, category, mutation, and room storage keys
   * to this user, preventing data leakage across different accounts on the same device.
   */
  setUserScope(userId: string | null): void {
    this.currentUserId = userId && userId.trim() ? userId.trim() : null;
  }

  getUserScope(): string | null {
    return this.currentUserId;
  }

  /**
   * Generates a safe scoped key for the current account.
   * If logged out or unauthenticated, scopes to 'guest'.
   */
  private getScopedKey(baseKey: string): string {
    const scope = this.currentUserId
      ? this.currentUserId.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'guest';
    return `${baseKey}_${scope}`;
  }

  private getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return this.memoryCache.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    this.memoryCache.set(key, value);
  }

  // --- Tasks API (Isolated per user account) ---
  getTasks(): Task[] {
    const raw = this.getItem(this.getScopedKey(STORAGE_KEYS.TASKS));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t: Task) => !t.id.startsWith('task-10'));
      }
      return [];
    } catch {
      return [];
    }
  }

  saveTasks(tasks: Task[]): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.TASKS), JSON.stringify(tasks));
  }

  // --- Shared Room Tasks API (Persistent across accounts for the same room) ---
  getRoomTasks(roomCode: string): Task[] {
    if (!roomCode) return [];
    const key = `taskflow_room_tasks_${roomCode.trim().toUpperCase()}`;
    const raw = this.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveRoomTasks(roomCode: string, tasks: Task[]): void {
    if (!roomCode) return;
    const key = `taskflow_room_tasks_${roomCode.trim().toUpperCase()}`;
    this.setItem(key, JSON.stringify(tasks));
  }

  // --- Categories API (Isolated per user account) ---
  getCategories(): Category[] {
    const raw = this.getItem(this.getScopedKey(STORAGE_KEYS.CATEGORIES));
    if (!raw) return INITIAL_CATEGORIES;
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  saveCategories(categories: Category[]): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.CATEGORIES), JSON.stringify(categories));
  }

  // --- Mutation Queue API (Isolated per user account) ---
  getMutations(): SyncMutation[] {
    const raw = this.getItem(this.getScopedKey(STORAGE_KEYS.MUTATIONS));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveMutations(mutations: SyncMutation[]): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.MUTATIONS), JSON.stringify(mutations));
  }

  addMutation(mutation: SyncMutation): void {
    const list = this.getMutations();
    list.push(mutation);
    this.saveMutations(list);
  }

  removeMutations(mutationIds: string[]): void {
    const idSet = new Set(mutationIds);
    const remaining = this.getMutations().filter((m) => !idSet.has(m.id));
    this.saveMutations(remaining);
  }

  // --- Sync Timestamp (Isolated per user account) ---
  getLastSyncTimestamp(): string | null {
    return this.getItem(this.getScopedKey(STORAGE_KEYS.LAST_SYNC));
  }

  setLastSyncTimestamp(timestamp: string): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.LAST_SYNC), timestamp);
  }

  // --- Persistent Private Rooms API (Isolated per user account) ---
  getRooms(): Array<{ id: string; name: string; inviteCode: string; role?: string }> {
    const raw = this.getItem(this.getScopedKey(STORAGE_KEYS.ROOMS));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveRooms(rooms: Array<{ id: string; name: string; inviteCode: string; role?: string }>): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.ROOMS), JSON.stringify(rooms));
  }

  /**
   * Search across all stored rooms on this device (regardless of active account scope)
   * to resolve invite codes shared across accounts.
   */
  findRoomByCode(code: string): { id: string; name: string; inviteCode: string; role?: string } | null {
    if (!code) return null;
    const formatted = code.trim().toUpperCase();
    const withoutPrefix = formatted.replace(/^TF-/, '');
    const withPrefix = formatted.startsWith('TF-') ? formatted : `TF-${formatted}`;

    // 1. Check current user's rooms
    const currentRooms = this.getRooms();
    const currentMatch = currentRooms.find(
      (r) =>
        r.inviteCode.toUpperCase() === formatted ||
        r.inviteCode.toUpperCase() === withPrefix ||
        r.inviteCode.toUpperCase().replace(/^TF-/, '') === withoutPrefix
    );
    if (currentMatch) return currentMatch;

    // 2. Search all account room keys in localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(STORAGE_KEYS.ROOMS)) {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find(
                  (r: any) =>
                    r.inviteCode &&
                    (r.inviteCode.toUpperCase() === formatted ||
                      r.inviteCode.toUpperCase() === withPrefix ||
                      r.inviteCode.toUpperCase().replace(/^TF-/, '') === withoutPrefix)
                );
                if (found) return found;
              }
            }
          }
        }
      }
    } catch {}

    // 3. Search in-memory cache
    for (const [k, raw] of this.memoryCache.entries()) {
      if (k.startsWith(STORAGE_KEYS.ROOMS)) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.find(
              (r: any) =>
                r.inviteCode &&
                (r.inviteCode.toUpperCase() === formatted ||
                  r.inviteCode.toUpperCase() === withPrefix ||
                  r.inviteCode.toUpperCase().replace(/^TF-/, '') === withoutPrefix)
            );
            if (found) return found;
          }
        } catch {}
      }
    }

    return null;
  }

  // --- Active Selected Room Code (Isolated per user account) ---
  getActiveRoomCode(): string | null {
    return this.getItem(this.getScopedKey(STORAGE_KEYS.ACTIVE_ROOM));
  }

  saveActiveRoomCode(code: string): void {
    this.setItem(this.getScopedKey(STORAGE_KEYS.ACTIVE_ROOM), code);
  }

  // --- Phone Google Account Persistence (Device-level) ---
  getLastGoogleAccount(): { email: string; displayName?: string } | null {
    const raw = this.getItem(STORAGE_KEYS.LAST_GOOGLE_ACCOUNT);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveLastGoogleAccount(account: { email: string; displayName?: string }): void {
    this.setItem(STORAGE_KEYS.LAST_GOOGLE_ACCOUNT, JSON.stringify(account));
  }

  // --- Standalone Offline User ---
  getOfflineUser(): any | null {
    const raw = this.getItem(STORAGE_KEYS.OFFLINE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveOfflineUser(user: any): void {
    this.setItem(STORAGE_KEYS.OFFLINE_USER, JSON.stringify(user));
  }
}

export const localDB = new LocalStorageEngine();
