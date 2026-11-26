/**
 * Test Device-to-User Binding on VPS Database
 */
const { PrismaClient } = require('/var/www/fundedgiants/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testBinding() {
  console.log('=== Verifying Device to User Binding ===');

  // Find a test user (e.g. any existing customer)
  const testUser = await prisma.user.findFirst({
    where: { role: 'CUSTOMER' },
    select: { id: true, email: true, firstName: true },
  });

  if (!testUser) {
    console.error('No customer user found to test binding.');
    process.exit(1);
  }

  console.log(`Using customer account: ${testUser.firstName} (${testUser.email}, ID: ${testUser.id})`);

  // Count unbound messages for 'fg_guest_test_device_888'
  const beforeCount = await prisma.liveChatMessage.count({
    where: {
      deviceId: 'fg_guest_test_device_888',
      userId: null,
    },
  });

  console.log(`Unbound guest messages on device 'fg_guest_test_device_888': ${beforeCount}`);

  // Perform binding
  const updateResult = await prisma.liveChatMessage.updateMany({
    where: {
      deviceId: 'fg_guest_test_device_888',
      userId: null,
    },
    data: {
      userId: testUser.id,
    },
  });

  console.log(`Binding query executed. Rows updated: ${updateResult.count}`);

  // Verify that messages for this user now include the bound messages
  const userChatCount = await prisma.liveChatMessage.count({
    where: {
      userId: testUser.id,
      deviceId: 'fg_guest_test_device_888',
    },
  });

  console.log(`Messages now linked to user ${testUser.email}: ${userChatCount}`);

  if (userChatCount >= 2) {
    console.log('SUCCESS: Device-to-user chat binding verified in database!');
  } else {
    console.error('FAILED: Messages were not properly bound.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

testBinding().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
