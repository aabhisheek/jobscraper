import type { NormalizedJob, RankingRules } from '../common/types.js';

export function rankJob(job: NormalizedJob, rules: RankingRules): number {
  let score = 0;

  // +5 if title contains priority keywords
  const lowerTitle = job.title.toLowerCase();
  for (const keyword of rules.titleKeywords) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      score += 5;
      break; // only count once
    }
  }

  // +3 per matching skill (max 15)
  let skillScore = 0;
  for (const desiredSkill of rules.desiredSkills) {
    if (job.skills.some((s) => s.toLowerCase() === desiredSkill.toLowerCase())) {
      skillScore += 3;
    }
  }
  score += Math.min(skillScore, 15);

  // +2 if location is remote
  if (rules.preferRemote && job.location.toLowerCase().includes('remote')) {
    score += 2;
  }

  // +2 if company is a target company
  const lowerCompany = job.company.toLowerCase();
  if (rules.targetCompanies.some((c) => c.toLowerCase() === lowerCompany)) {
    score += 2;
  }

  // +1 if experience requirement is within range
  if (job.experience) {
    const yearsMatch = job.experience.match(/(\d+)/);
    if (yearsMatch?.[1]) {
      const years = parseInt(yearsMatch[1], 10);
      if (years <= rules.maxExperienceYears) {
        score += 1;
      }
    }
  }

  return score;
}

export function meetsThreshold(score: number, rules: RankingRules): boolean {
  return score >= rules.minimumScore;
}
