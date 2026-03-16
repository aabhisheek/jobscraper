const KNOWN_SKILLS = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'c++',
  'c#',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'react',
  'angular',
  'vue',
  'svelte',
  'next.js',
  'nuxt',
  'node',
  'node.js',
  'express',
  'fastify',
  'nestjs',
  'django',
  'flask',
  'spring',
  'rails',
  'laravel',
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'elasticsearch',
  'dynamodb',
  'cassandra',
  'sqlite',
  'aws',
  'gcp',
  'azure',
  'docker',
  'kubernetes',
  'terraform',
  'ansible',
  'jenkins',
  'github actions',
  'circleci',
  'graphql',
  'rest',
  'grpc',
  'kafka',
  'rabbitmq',
  'sql',
  'nosql',
  'html',
  'css',
  'tailwind',
  'sass',
  'webpack',
  'vite',
  'git',
  'linux',
  'ci/cd',
  'machine learning',
  'deep learning',
  'pytorch',
  'tensorflow',
  'llm',
  'ai',
  'data engineering',
  'spark',
  'airflow',
  'dbt',
  'snowflake',
  'bigquery',
  'prisma',
  'playwright',
  'cypress',
  'jest',
  'vitest',
  'mocha',
] as const;

const SKILL_ALIASES: Record<string, string> = {
  'node.js': 'node',
  nodejs: 'node',
  postgres: 'postgresql',
  'react.js': 'react',
  reactjs: 'react',
  'vue.js': 'vue',
  vuejs: 'vue',
  'next.js': 'nextjs',
  nextjs: 'nextjs',
  k8s: 'kubernetes',
  tf: 'terraform',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
};

export function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of KNOWN_SKILLS) {
    const pattern = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
    if (pattern.test(lowerText)) {
      const canonical = SKILL_ALIASES[skill] ?? skill;
      found.add(canonical);
    }
  }

  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
    if (pattern.test(lowerText)) {
      found.add(canonical);
    }
  }

  return [...found].sort();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
