import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Worker } from 'bullmq';
import { SCAN_QUEUE, createRedisConnection, scanJobSchema } from '@argus/core';
import { runScan } from './pipeline';

config({ path: resolve(process.cwd(), '../../.env') });

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? '4');

const worker = new Worker(
  SCAN_QUEUE,
  async (job) => {
    const parsed = scanJobSchema.parse(job.data);
    return runScan(parsed);
  },
  { connection: createRedisConnection(), concurrency },
);

worker.on('completed', (job) => {
  console.log(`[argus] scan completed: ${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`[argus] scan failed: ${job?.id ?? 'unknown'} — ${error.message}`);
});

console.log(`[argus] worker listening on "${SCAN_QUEUE}" with concurrency ${concurrency}`);

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
