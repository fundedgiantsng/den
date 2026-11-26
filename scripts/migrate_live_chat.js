const { PrismaClient } = require('/var/www/fundedgiants/packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Applying database schema update for LiveChatMessage (deviceId, isAi, optional userId)...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "LiveChatMessage" ALTER COLUMN "userId" DROP NOT NULL;`);
  console.log('-> userId is now nullable');
  await prisma.$executeRawUnsafe(`ALTER TABLE "LiveChatMessage" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;`);
  console.log('-> deviceId column added/verified');
  await prisma.$executeRawUnsafe(`ALTER TABLE "LiveChatMessage" ADD COLUMN IF NOT EXISTS "isAi" BOOLEAN DEFAULT false;`);
  console.log('-> isAi column added/verified');
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LiveChatMessage_deviceId_idx" ON "LiveChatMessage"("deviceId");`);
  console.log('-> deviceId index created/verified');
  console.log('Schema migration complete!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
