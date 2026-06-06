import { Queue } from 'bullmq';
import { SCAN_QUEUE } from './constants';
import { createRedisConnection } from './redis';
import type { ScanJob } from './schemas';

let scanQueue: Queue<ScanJob> | undefined;

export function getScanQueue(): Queue<ScanJob> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJob>(SCAN_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return scanQueue;
}

export async function enqueueScan(job: ScanJob) {
  const queue = getScanQueue();
  return queue.add('scan', job, { jobId: job.scanRunId });
}
