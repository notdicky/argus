import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'member', 'viewer']);
export const targetType = pgEnum('target_type', ['domain', 'ip', 'cidr']);
export const verificationStatus = pgEnum('verification_status', ['pending', 'verified', 'failed']);
export const scanStatus = pgEnum('scan_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export const scanTrigger = pgEnum('scan_trigger', ['manual', 'scheduled', 'rescan']);
export const assetType = pgEnum('asset_type', [
  'subdomain',
  'host',
  'port',
  'service',
  'url',
  'certificate',
]);
export const severity = pgEnum('severity', ['info', 'low', 'medium', 'high', 'critical']);
export const alertStatus = pgEnum('alert_status', ['open', 'acknowledged', 'resolved']);
export const diffChangeType = pgEnum('diff_change_type', ['added', 'removed', 'changed']);

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<'oauth' | 'oidc' | 'email' | 'webauthn'>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const organizations = pgTable('organization', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'membership',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (m) => [uniqueIndex('membership_org_user_idx').on(m.organizationId, m.userId)],
);

export const targets = pgTable(
  'target',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    type: targetType('type').notNull().default('domain'),
    verification: verificationStatus('verification').notNull().default('pending'),
    verificationToken: text('verification_token')
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    monitoringEnabled: boolean('monitoring_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('target_org_value_idx').on(t.organizationId, t.value),
    index('target_org_idx').on(t.organizationId),
  ],
);

export const scanRuns = pgTable(
  'scan_run',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => targets.id, { onDelete: 'cascade' }),
    status: scanStatus('status').notNull().default('queued'),
    trigger: scanTrigger('trigger').notNull().default('manual'),
    stats: jsonb('stats').$type<Record<string, number>>(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (s) => [index('scan_run_target_idx').on(s.targetId), index('scan_run_status_idx').on(s.status)],
);

export const assets = pgTable(
  'asset',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => targets.id, { onDelete: 'cascade' }),
    scanRunId: uuid('scan_run_id').references(() => scanRuns.id, { onDelete: 'set null' }),
    type: assetType('type').notNull(),
    value: text('value').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (a) => [
    uniqueIndex('asset_target_type_value_idx').on(a.targetId, a.type, a.value),
    index('asset_target_idx').on(a.targetId),
  ],
);

export const findings = pgTable(
  'finding',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => targets.id, { onDelete: 'cascade' }),
    scanRunId: uuid('scan_run_id').references(() => scanRuns.id, { onDelete: 'set null' }),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    severity: severity('severity').notNull().default('info'),
    name: text('name').notNull(),
    templateId: text('template_id'),
    description: text('description'),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (f) => [
    index('finding_target_idx').on(f.targetId),
    index('finding_severity_idx').on(f.severity),
  ],
);

export const snapshots = pgTable(
  'snapshot',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => targets.id, { onDelete: 'cascade' }),
    scanRunId: uuid('scan_run_id').references(() => scanRuns.id, { onDelete: 'set null' }),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (s) => [index('snapshot_target_idx').on(s.targetId)],
);

export const diffs = pgTable(
  'diff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => targets.id, { onDelete: 'cascade' }),
    fromSnapshotId: uuid('from_snapshot_id').references(() => snapshots.id, { onDelete: 'set null' }),
    toSnapshotId: uuid('to_snapshot_id').references(() => snapshots.id, { onDelete: 'set null' }),
    changes: jsonb('changes').$type<DiffChange[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (d) => [index('diff_target_idx').on(d.targetId)],
);

export const alerts = pgTable(
  'alert',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id').references(() => targets.id, { onDelete: 'cascade' }),
    severity: severity('severity').notNull().default('info'),
    status: alertStatus('status').notNull().default('open'),
    title: text('title').notNull(),
    body: text('body'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (a) => [index('alert_org_idx').on(a.organizationId), index('alert_status_idx').on(a.status)],
);

export const auditLogs = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (a) => [index('audit_log_org_idx').on(a.organizationId)],
);

export type DiffChange = {
  type: 'added' | 'removed' | 'changed';
  assetType: string;
  value: string;
  before?: unknown;
  after?: unknown;
};

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  accounts: many(accounts),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  targets: many(targets),
  alerts: many(alerts),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const targetsRelations = relations(targets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [targets.organizationId],
    references: [organizations.id],
  }),
  scanRuns: many(scanRuns),
  assets: many(assets),
  findings: many(findings),
}));

export const scanRunsRelations = relations(scanRuns, ({ one, many }) => ({
  target: one(targets, { fields: [scanRuns.targetId], references: [targets.id] }),
  assets: many(assets),
  findings: many(findings),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  target: one(targets, { fields: [assets.targetId], references: [targets.id] }),
  scanRun: one(scanRuns, { fields: [assets.scanRunId], references: [scanRuns.id] }),
}));

export const findingsRelations = relations(findings, ({ one }) => ({
  target: one(targets, { fields: [findings.targetId], references: [targets.id] }),
  scanRun: one(scanRuns, { fields: [findings.scanRunId], references: [scanRuns.id] }),
  asset: one(assets, { fields: [findings.assetId], references: [assets.id] }),
}));
