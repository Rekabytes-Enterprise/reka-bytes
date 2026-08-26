import 'dotenv/config';
import { prisma } from './src/index';

async function main() {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.rekabytes.test' } } });
  console.log('Deleted e2e test users');
}
main().finally(() => prisma.$disconnect());
