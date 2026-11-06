import { Router } from 'express';
import { pullDelta, pushMutations } from '../controllers/syncController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/pull', pullDelta);
router.post('/push', pushMutations);

export default router;
