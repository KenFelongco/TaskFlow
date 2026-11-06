import { Router } from 'express';
import authRoutes from './authRoutes';
import taskRoutes from './taskRoutes';
import syncRoutes from './syncRoutes';
import roomRoutes from './roomRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'TaskFlow Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/sync', syncRoutes);
router.use('/rooms', roomRoutes);

export default router;
