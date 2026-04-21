import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    orderBy: { created_at: 'desc' },
    take: 10
  });
  console.log(jobs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
