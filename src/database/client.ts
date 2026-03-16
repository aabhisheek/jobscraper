import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadConfig } from '../../config/default.js';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const config = loadConfig();
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  prismaInstance = new PrismaClient({ adapter });

  return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
