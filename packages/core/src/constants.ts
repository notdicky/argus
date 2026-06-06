export const SCAN_QUEUE = 'argus:scan';

export const PIPELINE_STAGES = [
  'subdomain-enum',
  'dns-resolve',
  'port-scan',
  'http-probe',
  'tls-analysis',
  'header-grade',
  'vuln-scan',
  'persist-diff',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
