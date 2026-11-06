import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (e) {
  console.warn('Prisma client initialization notice:', e);
  prisma = new PrismaClient();
}

export let isDatabaseConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL database connected successfully.');
    isDatabaseConnected = true;
    return true;
  } catch (error: any) {
    isDatabaseConnected = false;
    console.warn('⚠️ PostgreSQL offline: Running in ultra-fast in-memory store mode.');
    console.warn('💡 Tip: Set your cloud PostgreSQL connection string in backend/.env when ready.');
    return false;
  }
}

export { prisma };
