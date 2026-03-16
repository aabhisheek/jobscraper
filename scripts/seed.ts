import { getPrismaClient, disconnectPrisma } from '../src/database/client.js';
import { createChildLogger } from '../src/common/logger.js';

const log = createChildLogger('seed');

async function main() {
  const prisma = getPrismaClient();

  log.info('Seeding database...');

  // Seed companies
  const companies = [
    {
      name: 'Stripe',
      careerPage: 'https://stripe.com/jobs',
      techStack: ['ruby', 'go', 'typescript', 'react'],
    },
    {
      name: 'Vercel',
      careerPage: 'https://vercel.com/careers',
      techStack: ['typescript', 'node', 'react', 'next.js'],
    },
    {
      name: 'Cloudflare',
      careerPage: 'https://cloudflare.com/careers',
      techStack: ['go', 'rust', 'typescript', 'react'],
    },
    {
      name: 'Discord',
      careerPage: 'https://discord.com/jobs',
      techStack: ['rust', 'python', 'react', 'typescript'],
    },
    {
      name: 'Notion',
      careerPage: 'https://notion.so/careers',
      techStack: ['typescript', 'react', 'kotlin', 'postgresql'],
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { name: company.name },
      create: company,
      update: company,
    });
  }

  log.info({ count: companies.length }, 'Companies seeded');

  // Seed sample jobs
  const jobs = [
    {
      title: 'Senior Backend Engineer',
      company: 'stripe',
      location: 'Remote',
      description: 'Build payment infrastructure with TypeScript, Node.js, and PostgreSQL.',
      skills: ['typescript', 'node', 'postgresql', 'redis', 'docker'],
      applyLink: 'https://boards.greenhouse.io/stripe/jobs/sample-1',
      applyType: 'greenhouse',
      source: 'greenhouse',
      sourceId: 'sample-1',
      status: 'ranked',
      score: 19,
    },
    {
      title: 'Frontend Engineer',
      company: 'vercel',
      location: 'Remote',
      description: 'Build the Next.js ecosystem with React and TypeScript.',
      skills: ['typescript', 'react', 'node', 'css'],
      applyLink: 'https://boards.greenhouse.io/vercel/jobs/sample-2',
      applyType: 'greenhouse',
      source: 'greenhouse',
      sourceId: 'sample-2',
      status: 'ranked',
      score: 14,
    },
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { source_sourceId: { source: job.source, sourceId: job.sourceId } },
      create: job,
      update: job,
    });
  }

  log.info({ count: jobs.length }, 'Sample jobs seeded');
  await disconnectPrisma();
  log.info('Seed complete');
}

main().catch((error: unknown) => {
  log.error({ error }, 'Seed failed');
  process.exit(1);
});
