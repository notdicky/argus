import { PIPELINE_STAGES, type PipelineStage } from './constants';

export interface StageDefinition {
  id: PipelineStage;
  label: string;
  description: string;
  tool: string | null;
  dependsOn: PipelineStage[];
}

export const PIPELINE: Record<PipelineStage, StageDefinition> = {
  'subdomain-enum': {
    id: 'subdomain-enum',
    label: 'Subdomain enumeration',
    description: 'Discover candidate hostnames for the target.',
    tool: 'subfinder',
    dependsOn: [],
  },
  'dns-resolve': {
    id: 'dns-resolve',
    label: 'DNS resolution',
    description: 'Resolve discovered hosts to live records.',
    tool: 'dnsx',
    dependsOn: ['subdomain-enum'],
  },
  'port-scan': {
    id: 'port-scan',
    label: 'Port & service scan',
    description: 'Find open ports on resolved hosts.',
    tool: 'naabu',
    dependsOn: ['dns-resolve'],
  },
  'http-probe': {
    id: 'http-probe',
    label: 'HTTP probe & fingerprint',
    description: 'Probe web services for status, title, and technologies.',
    tool: 'httpx',
    dependsOn: ['port-scan'],
  },
  'tls-analysis': {
    id: 'tls-analysis',
    label: 'TLS & certificate analysis',
    description: 'Inspect certificates, expiry, and weak ciphers.',
    tool: null,
    dependsOn: ['http-probe'],
  },
  'header-grade': {
    id: 'header-grade',
    label: 'Security header grading',
    description: 'Grade HTTP security headers per endpoint.',
    tool: null,
    dependsOn: ['http-probe'],
  },
  'vuln-scan': {
    id: 'vuln-scan',
    label: 'Vulnerability scan',
    description: 'Run vulnerability templates against live endpoints.',
    tool: 'nuclei',
    dependsOn: ['http-probe'],
  },
  'persist-diff': {
    id: 'persist-diff',
    label: 'Persist & diff',
    description: 'Snapshot results and diff against the previous run.',
    tool: null,
    dependsOn: ['tls-analysis', 'header-grade', 'vuln-scan'],
  },
};

export function stagesInOrder(): PipelineStage[] {
  const visited = new Set<PipelineStage>();
  const order: PipelineStage[] = [];

  const visit = (stage: PipelineStage) => {
    if (visited.has(stage)) return;
    visited.add(stage);
    for (const dep of PIPELINE[stage].dependsOn) {
      visit(dep);
    }
    order.push(stage);
  };

  for (const stage of PIPELINE_STAGES) {
    visit(stage);
  }

  return order;
}
