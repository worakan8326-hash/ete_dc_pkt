import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'PENDING' },
    include: { transactions: true }
  });
  console.dir(jobs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
