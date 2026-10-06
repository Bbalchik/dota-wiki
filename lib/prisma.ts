import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Configure SQLite for high concurrency (WAL mode + 5s busy timeout)
if (typeof process !== 'undefined' && process.env.DATABASE_URL?.startsWith('file:')) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch(() => {});
}
