export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
}

export interface Task {
  id: string;
  userId?: string;
  teamId?: string | null;
  teamName?: string;
  roomId?: string | null;
  roomCode?: string | null;
  assignee?: string | null;
  assigneeAvatarUrl?: string | null;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  isCompleted: boolean;
  dueDate?: string | null;
  reminderAt?: string | null;
  categoryId?: string | null;
  categoryName?: string;
  categoryColor?: string;
  subtasks: Subtask[];
  version: number;
  logicalTimestamp: number; // Row-level logical clock for bidirectional conflict resolution
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isPendingSync?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string; // Background color for fallback
  avatarUrl: string; // High-resolution photo
  initials: string;
}

export interface SyncMutation {
  id: string;
  entityType: 'TASK' | 'CATEGORY' | 'SUBTASK';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  version: number;
  logicalTimestamp: number;
  clientTimestamp: string;
}

export type NetworkStatus = 'online' | 'offline' | 'syncing';

export interface BenchmarkMetrics {
  lastWriteLatencyMs: number;
  simulatedDropoutsRun: number;
  totalOfflineMutationsQueued: number;
  totalSyncedWithoutLoss: number;
  deltaPacketSizeBytes: number;
  fullSyncEquivalentBytes: number;
}
