import { execSync } from 'node:child_process';

execSync('npx prisma migrate reset --force --skip-generate', { stdio: 'inherit' });
execSync('npm run prisma:generate', { stdio: 'inherit' });
execSync('npm run seed', { stdio: 'inherit' });
console.log('Database reset + generated + seeded.');
