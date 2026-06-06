import { z } from 'zod';
import { SEVERITIES } from './constants';

export const targetTypeSchema = z.enum(['domain', 'ip', 'cidr']);
export type TargetType = z.infer<typeof targetTypeSchema>;

export const severitySchema = z.enum(SEVERITIES);

const domainPattern = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export const createTargetSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .refine((v) => domainPattern.test(v), 'Enter a valid domain (e.g. example.com)'),
  type: targetTypeSchema.default('domain'),
});
export type CreateTargetInput = z.infer<typeof createTargetSchema>;

export const scanTriggerSchema = z.enum(['manual', 'scheduled', 'rescan']);
export type ScanTrigger = z.infer<typeof scanTriggerSchema>;

export const scanJobSchema = z.object({
  scanRunId: z.string().uuid(),
  targetId: z.string().uuid(),
  target: z.string().min(1),
  targetType: targetTypeSchema,
  trigger: scanTriggerSchema.default('manual'),
});
export type ScanJob = z.infer<typeof scanJobSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;
