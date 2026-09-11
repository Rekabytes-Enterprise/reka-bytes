import 'dotenv/config';
import { prisma } from './src/index';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true },
  });
  console.log('Users in DB:', users.length);
  users.forEach((u) => console.log(` - ${u.email} (${u.role})`));
}
main().finally(() => prisma.$disconnect());
