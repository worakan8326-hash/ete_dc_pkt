import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const zones = await prisma.zone.findMany();
  console.log('Available Zones:', zones.map(z => z.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
