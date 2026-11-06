import { Router } from 'express';
import { register, login, getMe, googleAuth, getDemoAccounts } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/demo-accounts', getDemoAccounts);
router.get('/me', authMiddleware, getMe);

export default router;
