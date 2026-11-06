import { prisma } from '../config/db';
import { broadcastToUser } from '../socket/socketHandler';

export interface ClientMutation {
  id: string; // Task or entity UUID
  entityType: 'TASK' | 'CATEGORY' | 'SUBTASK';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  version: number;
  logicalTimestamp?: number; // Row-level Lamport logical clock
  clientTimestamp: string;
}

export interface SyncPushResult {
  appliedCount: number;
  conflicts: Array<{ id: string; reason: string; serverEntity: any }>;
  serverTimestamp: string;
}

export class SyncService {
  /**
   * Pulls all changes for a user/team that occurred after `sinceDate`.
   */
  static async getDeltaChanges(userId: string, sinceDate?: Date) {
    const whereClause: any = { userId };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      whereClause.updatedAt = { gt: sinceDate };
    }

    const [tasks, categories] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: { subtasks: true },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.category.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    return {
      tasks,
      categories,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Applies an array of client mutations with Row-Level Logical Timestamp bidirectional conflict resolution.
   */
  static async applyMutations(
    userId: string,
    mutations: ClientMutation[],
    deviceId?: string
  ): Promise<SyncPushResult> {
    const conflicts: Array<{ id: string; reason: string; serverEntity: any }> = [];
    let appliedCount = 0;

    for (const mutation of mutations) {
      const { id, entityType, action, payload, version, logicalTimestamp = 1 } = mutation;

      try {
        if (entityType === 'TASK') {
          if (action === 'CREATE') {
            const existing = await prisma.task.findUnique({ where: { id } });
            if (!existing) {
              const newTask = await prisma.task.create({
                data: {
                  id,
                  userId,
                  teamId: payload.teamId || null,
                  assignee: payload.assignee || null,
                  title: payload.title || 'Untitled Task',
                  description: payload.description || null,
                  priority: payload.priority || 'MEDIUM',
                  status: payload.status || 'TODO',
                  isCompleted: Boolean(payload.isCompleted),
                  dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                  reminderAt: payload.reminderAt ? new Date(payload.reminderAt) : null,
                  categoryId: payload.categoryId || null,
                  version: 1,
                  logicalTimestamp: Math.max(1, logicalTimestamp),
                },
                include: { subtasks: true },
              });

              await this.logSyncEvent(userId, 'TASK', id, 'CREATE', newTask, 1, newTask.logicalTimestamp);
              appliedCount++;
            }
          } else if (action === 'UPDATE') {
            const existing = await prisma.task.findFirst({
              where: { id, userId },
              include: { subtasks: true },
            });

            if (!existing) {
              // Upsert if not yet on server
              const upserted = await prisma.task.create({
                data: {
                  id,
                  userId,
                  teamId: payload.teamId || null,
                  assignee: payload.assignee || null,
                  title: payload.title || 'Untitled Task',
                  description: payload.description || null,
                  priority: payload.priority || 'MEDIUM',
                  status: payload.status || 'TODO',
                  isCompleted: Boolean(payload.isCompleted),
                  dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                  reminderAt: payload.reminderAt ? new Date(payload.reminderAt) : null,
                  categoryId: payload.categoryId || null,
                  version: Math.max(1, version || 1),
                  logicalTimestamp: Math.max(1, logicalTimestamp),
                },
                include: { subtasks: true },
              });
              await this.logSyncEvent(userId, 'TASK', id, 'UPDATE', upserted, upserted.version, upserted.logicalTimestamp);
              appliedCount++;
            } else {
              // Row-level logical timestamp conflict check
              if (logicalTimestamp < existing.logicalTimestamp) {
                // Stale client mutation; server row logical clock is strictly ahead
                conflicts.push({
                  id,
                  reason: `Stale logical timestamp: client (${logicalTimestamp}) < server (${existing.logicalTimestamp})`,
                  serverEntity: existing,
                });
                continue;
              }

              // Advance row-level logical timestamp
              const nextLogicalTimestamp = Math.max(existing.logicalTimestamp, logicalTimestamp) + 1;
              const nextVersion = existing.version + 1;

              const updated = await prisma.task.update({
                where: { id },
                data: {
                  title: payload.title !== undefined ? payload.title : existing.title,
                  description: payload.description !== undefined ? payload.description : existing.description,
                  priority: payload.priority !== undefined ? payload.priority : existing.priority,
                  status: payload.status !== undefined ? payload.status : existing.status,
                  assignee: payload.assignee !== undefined ? payload.assignee : existing.assignee,
                  teamId: payload.teamId !== undefined ? payload.teamId : existing.teamId,
                  isCompleted: payload.isCompleted !== undefined ? Boolean(payload.isCompleted) : existing.isCompleted,
                  dueDate: payload.dueDate !== undefined ? (payload.dueDate ? new Date(payload.dueDate) : null) : existing.dueDate,
                  reminderAt: payload.reminderAt !== undefined ? (payload.reminderAt ? new Date(payload.reminderAt) : null) : existing.reminderAt,
                  categoryId: payload.categoryId !== undefined ? payload.categoryId : existing.categoryId,
                  version: nextVersion,
                  logicalTimestamp: nextLogicalTimestamp,
                  updatedAt: new Date(),
                },
                include: { subtasks: true },
              });

              await this.logSyncEvent(userId, 'TASK', id, 'UPDATE', updated, nextVersion, nextLogicalTimestamp);
              appliedCount++;
            }
          } else if (action === 'DELETE') {
            const existing = await prisma.task.findFirst({ where: { id, userId } });
            if (existing && !existing.deletedAt) {
              const nextLogicalTimestamp = existing.logicalTimestamp + 1;
              const deleted = await prisma.task.update({
                where: { id },
                data: {
                  deletedAt: new Date(),
                  version: existing.version + 1,
                  logicalTimestamp: nextLogicalTimestamp,
                },
              });
              await this.logSyncEvent(userId, 'TASK', id, 'DELETE', { id, deletedAt: deleted.deletedAt }, deleted.version, nextLogicalTimestamp);
              appliedCount++;
            }
          }
        }
      } catch (err: any) {
        console.error(`Sync error applying mutation for ${id}:`, err);
        conflicts.push({ id, reason: err.message, serverEntity: null });
      }
    }

    // Broadcast sync notification to other devices of this user
    if (appliedCount > 0) {
      broadcastToUser(userId, 'sync:delta_available', {
        timestamp: new Date().toISOString(),
        sourceDeviceId: deviceId,
      });
    }

    return {
      appliedCount,
      conflicts,
      serverTimestamp: new Date().toISOString(),
    };
  }

  private static async logSyncEvent(
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    payload: any,
    version: number,
    logicalTimestamp: number
  ) {
    try {
      await prisma.syncLog.create({
        data: {
          userId,
          entityType,
          entityId,
          action,
          payload,
          version,
          logicalTimestamp,
        },
      });
    } catch (e) {
      console.warn('Could not write sync log:', e);
    }
  }
}
