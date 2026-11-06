import { broadcastToUser } from '../socket/socketHandler';

export interface FCMPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
}

export class FCMService {
  private static isInitialized = false;

  static init() {
    if (this.isInitialized) return;
    console.log('🔔 Firebase Cloud Messaging (FCM) Service initialized (Dev Adapter Active).');
    this.isInitialized = true;
  }

  /**
   * Dispatches push notification for urgent milestones and tasks.
   */
  static async sendMilestoneAlert(
    userId: string,
    fcmToken: string | null | undefined,
    payload: FCMPayload
  ): Promise<boolean> {
    this.init();

    const timestamp = new Date().toISOString();

    console.log(`\n📢 [FCM PUSH DISPATCHED] to User: ${userId}`);
    console.log(`   Token: ${fcmToken || 'DEV_DEVICE_TOKEN_SIMULATED'}`);
    console.log(`   Title: ${payload.title}`);
    console.log(`   Body:  ${payload.body}`);
    console.log(`   Timestamp: ${timestamp}\n`);

    // Broadcast push notification event to active sockets for in-app alert banner
    broadcastToUser(userId, 'fcm:notification', {
      ...payload,
      timestamp,
      source: 'Firebase Cloud Messaging',
    });

    return true;
  }
}
