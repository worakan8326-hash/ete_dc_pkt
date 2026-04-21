const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findUnique({
    where: { job_id: 'JOB-20260420-1441' },
    include: { transactions: true }
  });
  console.log(JSON.stringify(job?.transactions || [], null, 2));
}
run().finally(() => prisma.$disconnect());
