import { Redis, type RedisOptions } from 'ioredis';

export function createRedisConnection(url = process.env.REDIS_URL): Redis {
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  return new Redis(url, options);
}
