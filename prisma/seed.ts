import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding missing system settings...');

  const settings = [
    { key: 'TG_BOT_TOKEN', value: 'INSERT_YOUR_TELEGRAM_BOT_TOKEN_HERE' },
    { key: 'TG_CHAT_ID', value: 'INSERT_YOUR_TELEGRAM_CHAT_ID_HERE' },
    { key: 'APP_VERSION', value: '1.2.0' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('✅ Settings seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });