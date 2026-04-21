import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const userCount = await prisma.user.count();
  const firstUser = await prisma.user.findFirst();
  const itemCount = await prisma.masterItem.count();
  
  console.log('--- DB Audit ---');
  console.log('User Count:', userCount);
  console.log('First User:', firstUser ? firstUser.name : 'NONE');
  console.log('Item Count:', itemCount);
  console.log('--- End ---');
}

check().catch(console.error).finally(() => prisma.$disconnect());
