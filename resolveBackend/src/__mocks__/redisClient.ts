// __mocks__/redis.ts
import { createClient } from "redis";
import { expect, jest, test } from '@jest/globals';

export function getRedisClient() {
  //mocked to avoid connecting
  const redisClient = createClient();

  return {
    redisClient,
    connect: jest.fn(),
    disconnect:  jest.fn(),
    isLockedWithKey:  jest.fn(),
    setLockWithKey:  jest.fn(),
    removeLockWithKey:  jest.fn(),
    multiSetAndRemoveLock:  jest.fn()
  };
}