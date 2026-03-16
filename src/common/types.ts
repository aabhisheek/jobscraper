export const JOB_SOURCES = ['greenhouse', 'lever', 'linkedin', 'wellfound', 'naukri'] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const APPLY_PLATFORMS = ['greenhouse', 'lever', 'linkedin_easy', 'external'] as const;
export type ApplyPlatform = (typeof APPLY_PLATFORMS)[number];

export const JOB_STATUSES = ['scraped', 'ranked', 'queued', 'applied', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = [
  'not_applied',
  'applied',
  'rejected',
  'interview',
  'offer',
  'no_response',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface NormalizedJob {
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly description: string;
  readonly skills: readonly string[];
  readonly experience: string | null;
  readonly salary: string | null;
  readonly applyLink: string;
  readonly applyType: ApplyPlatform;
  readonly source: JobSource;
  readonly sourceId: string;
}

export interface RankingRules {
  readonly titleKeywords: readonly string[];
  readonly desiredSkills: readonly string[];
  readonly preferRemote: boolean;
  readonly targetCompanies: readonly string[];
  readonly maxExperienceYears: number;
  readonly minimumScore: number;
}

export interface ScrapeConfig {
  readonly source: JobSource;
  readonly companies: readonly string[];
  readonly maxPages?: number;
}

export interface Profile {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly linkedinUrl: string;
  readonly githubUrl: string;
  readonly portfolioUrl: string;
  readonly resumePath: string;
  readonly currentTitle: string;
  readonly yearsOfExperience: number;
  readonly skills: readonly string[];
  readonly preferredLocations: readonly string[];
}
