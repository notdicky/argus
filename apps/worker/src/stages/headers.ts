import type { Severity } from '@argus/core';

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

export interface HeaderGrade {
  grade: string;
  score: number;
  present: string[];
  missing: string[];
}

export function gradeHeaders(headers: Record<string, string>): HeaderGrade {
  const lower = new Set(Object.keys(headers).map((key) => key.toLowerCase()));
  const present = SECURITY_HEADERS.filter((header) => lower.has(header));
  const missing = SECURITY_HEADERS.filter((header) => !lower.has(header));
  const score = Math.round((present.length / SECURITY_HEADERS.length) * 100);

  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 30) grade = 'D';

  return { grade, score, present, missing };
}

export function headerSeverity(missing: string[]): Severity {
  if (missing.includes('content-security-policy') || missing.includes('strict-transport-security')) {
    return 'medium';
  }
  return missing.length > 0 ? 'low' : 'info';
}
