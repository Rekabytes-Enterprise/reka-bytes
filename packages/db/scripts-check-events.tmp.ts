import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/index.js';
const p = new PrismaClient();
const events = await p.blockEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
console.log('BlockEvent count:', await p.blockEvent.count());
for (const e of events) console.log(` kind=${e.kind} payload=${JSON.stringify(e.payload)} at=${e.createdAt.toISOString()}`);
await p.$disconnect();
