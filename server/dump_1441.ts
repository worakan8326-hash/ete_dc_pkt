import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findUnique({
    where: { jobId: 'JOB-20260420-1441' },
    include: { LogisticsItems: true }
  });
  console.log(JSON.stringify(job?.LogisticsItems || [], null, 2));
}
run().finally(() => prisma.$disconnect());
