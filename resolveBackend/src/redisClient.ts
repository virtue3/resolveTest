import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

const redisServer = "localhost:6379";

let redisClient: undefined | RedisClient;

export function getRedisClient() {
  return {
    redisClient,
    connect: _connect,
    disconnect: _disconnect,
    checkLockKey: _checkLockKey,
    setLockKey: _setLockKey,
    removeLockKey: _removeLockKey,
  };
}

// helper type assertions to make sure redis client is valid before using.
function checkRedisClient(_redisClient): asserts _redisClient is RedisClient {
  if (!redisClient) {
    throw "Connect redis client before using.";
  }
}

async function _connect() {
  redisClient = await createClient({ url: redisServer })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();
}

async function _disconnect() {
  redisClient.disconnect();
}

// Use for setting non LRU values that we want to persist the key
//   a seperate DB to store the semaphores for downloading that have some sort of sane expiry or another date model
//   to handle timeouts and failed downloads would have been good here.
async function _setLockKey(key: string) {
  checkRedisClient(redisClient);
  try {
    await redisClient.set(`LOCK_${key}`, Date.now());
    await redisClient.persist(`LOCK_${key}`);
  } catch (err) {
    console.error(`Error setting lock key ${key} in redis: ${err}`);
  }
}

async function _checkLockKey(key: string) {
  checkRedisClient(redisClient);
  try {
    return await redisClient.get(`LOCK_${key}`);
  } catch (err) {
    console.error(`Error fetching checkLockKey ${key} in redis: ${err}`);
  }
}

async function _removeLockKey(key: string) {
  checkRedisClient(redisClient);
  try {
    await redisClient.del(`LOCK_${key}`);
  } catch (err) {
    console.error(`Error deleting lock key ${key} in redis: ${err}`);
  }
}
