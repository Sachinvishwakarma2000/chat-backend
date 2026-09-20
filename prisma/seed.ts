import { PrismaClient, ChatType, MemberRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data for clean idempotent run
  await prisma.chatMember.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Users
  const alice = await prisma.user.create({
    data: {
      id: 'usr_alice_001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'usr_bob_002',
      name: 'Bob Smith',
      email: 'bob@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      id: 'usr_charlie_003',
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
    },
  });

  console.log('✅ Created users:', [alice.name, bob.name, charlie.name]);

  // 2. Create a Sample 1:1 Direct Chat between Alice and Bob
  const directChat = await prisma.chat.create({
    data: {
      id: 'chat_direct_alice_bob',
      type: ChatType.DIRECT,
      members: {
        create: [
          { userId: alice.id, role: MemberRole.MEMBER },
          { userId: bob.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  console.log('✅ Created sample direct chat:', directChat.id);

  // 3. Create a Sample Group Chat
  const groupChat = await prisma.chat.create({
    data: {
      id: 'chat_group_project_alpha',
      type: ChatType.GROUP,
      name: 'Project Alpha Team',
      members: {
        create: [
          { userId: alice.id, role: MemberRole.ADMIN },
          { userId: bob.id, role: MemberRole.MEMBER },
          { userId: charlie.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  console.log('✅ Created sample group chat:', groupChat.id);
  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
