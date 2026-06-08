import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Worker } from 'bullmq';
import { SCAN_QUEUE, createRedisConnection, scanJobSchema } from '@argus/core';
import { runScan } from './pipeline';
import { scheduleDueScans } from './scheduler';

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

const schedulerTick = async () => {
  try {
    await scheduleDueScans();
  } catch (error) {
    console.error(`[argus] scheduler error: ${error instanceof Error ? error.message : error}`);
  }
};

const scheduler = setInterval(schedulerTick, 60_000);
void schedulerTick();

async function shutdown() {
  clearInterval(scheduler);
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
