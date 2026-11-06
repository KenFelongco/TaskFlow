import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SyncService, ClientMutation } from '../services/syncService';

export async function pullDelta(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const sinceParam = req.query.since as string | undefined;
    const sinceDate = sinceParam ? new Date(sinceParam) : undefined;

    const delta = await SyncService.getDeltaChanges(userId, sinceDate);

    res.json(delta);
  } catch (error: any) {
    console.error('Error pulling delta sync:', error);
    res.status(500).json({ error: error.message || 'Failed to pull delta sync' });
  }
}

export async function pushMutations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { mutations, deviceId } = req.body as {
      mutations: ClientMutation[];
      deviceId?: string;
    };

    if (!Array.isArray(mutations)) {
      res.status(400).json({ error: 'Payload must contain a mutations array' });
      return;
    }

    const result = await SyncService.applyMutations(userId, mutations, deviceId);

    res.json(result);
  } catch (error: any) {
    console.error('Error pushing sync mutations:', error);
    res.status(500).json({ error: error.message || 'Failed to push sync mutations' });
  }
}
