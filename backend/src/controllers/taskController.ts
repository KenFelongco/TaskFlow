import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { broadcastToUser } from '../socket/socketHandler';

const createTaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional().default('TODO'),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1),
        isCompleted: z.boolean().optional().default(false),
      })
    )
    .optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { priority, status, isCompleted, search, categoryId } = req.query;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (priority) where.priority = priority as string;
    if (status) where.status = status as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted === 'true';
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
        subtasks: { where: { deletedAt: null }, orderBy: { orderIndex: 'asc' } },
      },
      orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
}

export async function getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        category: true,
        subtasks: { where: { deletedAt: null }, orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch task' });
  }
}

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const parseResult = createTaskSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const data = parseResult.data;

    const task = await prisma.task.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        userId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        categoryId: data.categoryId,
        subtasks: data.subtasks
          ? {
              create: data.subtasks.map((st, idx) => ({
                title: st.title,
                isCompleted: st.isCompleted,
                orderIndex: idx,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        subtasks: true,
      },
    });

    // Broadcast real-time event to other sessions
    broadcastToUser(userId, 'task:created', task);

    res.status(201).json({ task });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parseResult = updateTaskSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const existing = await prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const data = parseResult.data;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.isCompleted !== undefined ? { isCompleted: data.isCompleted } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.reminderAt !== undefined ? { reminderAt: data.reminderAt ? new Date(data.reminderAt) : null } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        subtasks: { where: { deletedAt: null } },
      },
    });

    broadcastToUser(userId, 'task:updated', updatedTask);

    res.json({ task: updatedTask });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const softDeleted = await prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: existing.version + 1,
      },
    });

    broadcastToUser(userId, 'task:deleted', { id, deletedAt: softDeleted.deletedAt });

    res.json({ message: 'Task deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
}
