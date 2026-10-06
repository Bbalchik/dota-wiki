import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
if (!target || !['postgresql', 'sqlite'].includes(target)) {
  console.error('Usage: node scripts/switch-db.js [postgresql|sqlite]');
  process.exit(1);
}

const schemaPath = path.resolve('prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const regex = /datasource db \{\s*provider\s*=\s*"[^"]+"/;
if (!regex.test(schema)) {
  console.error('Could not find datasource provider in prisma/schema.prisma');
  process.exit(1);
}

schema = schema.replace(regex, `datasource db {\n  provider = "${target}"`);
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log(`✓ Prisma datasource provider successfully switched to: ${target}`);
