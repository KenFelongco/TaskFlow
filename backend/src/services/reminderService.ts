import cron from 'node-cron';
import { prisma, isDatabaseConnected } from '../config/db';
import { broadcastToUser } from '../socket/socketHandler';
import { FCMService } from './fcmService';

let dbNoticePrinted = false;

export function startReminderScheduler(): void {
  // Check every minute
  cron.schedule('* * * * *', async () => {
    if (!isDatabaseConnected) {
      if (!dbNoticePrinted) {
        console.log('ℹ️ Reminder worker waiting for PostgreSQL connection before polling scheduled reminders.');
        dbNoticePrinted = true;
      }
      return;
    }
    try {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      // Find tasks where reminder is due right now and not completed
      const pendingReminders = await prisma.task.findMany({
        where: {
          reminderAt: {
            lte: oneMinuteLater,
            gte: new Date(now.getTime() - 5 * 60 * 1000), // within 5 mins tolerance
          },
          isCompleted: false,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          title: true,
          dueDate: true,
          priority: true,
          reminderAt: true,
        },
      });

      for (const task of pendingReminders) {
        // Broadcast reminder alert directly to the user's active sockets
        broadcastToUser(task.userId, 'reminder:triggered', {
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
          triggeredAt: new Date().toISOString(),
        });

        // If priority is URGENT or HIGH, dispatch Firebase Cloud Messaging push alert
        if (task.priority === 'URGENT' || task.priority === 'HIGH') {
          FCMService.sendMilestoneAlert(task.userId, null, {
            title: `Urgent Milestone: ${task.title}`,
            body: `Deadline approaching! Scheduled for ${task.dueDate ? new Date(task.dueDate).toLocaleTimeString() : 'now'}.`,
            priority: 'high',
            data: { taskId: task.id },
          });
        }
      }
    } catch (error: any) {
      if (!dbNoticePrinted) {
        console.log('ℹ️ Reminder worker waiting for PostgreSQL connection before polling scheduled reminders.');
        dbNoticePrinted = true;
      }
    }
  });

  console.log('⏰ Reminder background scheduler initialized.');
}
