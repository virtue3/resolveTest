import { createClient } from "redis";
import _ from "lodash";
const REDIS_SERVER = "redis://localhost:6379";
let redisClient;
export function getRedisClient() {
    return {
        redisClient,
        connect: _connect,
        disconnect: _disconnect,
        isLockedWithKey: _isLockedWithKey,
        setLockWithKey: _setLockWithKey,
        removeLockWithKey: _removeLockWithKey,
    };
}
// helper type assertions to make sure redis client is valid before using.
function checkRedisClient(_redisClient) {
    if (!redisClient) {
        throw "Connect redis client before using.";
    }
}
async function _connect() {
    if (redisClient) {
        return;
    }
    redisClient = await createClient({ url: REDIS_SERVER })
        .on("error", (err) => console.log("Redis Client Error", err))
        .connect();
    console.log("connected to redis.");
}
async function _disconnect() {
    console.log("disconnected from redis.");
    redisClient.disconnect();
    redisClient = undefined;
}
// Use for setting non LRU values that we want to persist the key
//   a seperate DB to store the semaphores for downloading that have some sort of sane expiry or another date model
//   to handle timeouts and failed downloads would have been good here.
async function _setLockWithKey(key) {
    checkRedisClient(redisClient);
    try {
        await redisClient.set(`LOCK_${key}`, Date.now().toString());
        await redisClient.persist(`LOCK_${key}`);
    }
    catch (err) {
        console.error(`Error setting lock key ${key} in redis: ${err}`);
    }
}
async function _isLockedWithKey(key) {
    checkRedisClient(redisClient);
    try {
        return await _.isEmpty(redisClient.get(`LOCK_${key}`)) === false;
    }
    catch (err) {
        console.error(`Error fetching checkLockKey ${key} in redis: ${err}`);
    }
}
async function _removeLockWithKey(key) {
    checkRedisClient(redisClient);
    try {
        await redisClient.del(`LOCK_${key}`);
    }
    catch (err) {
        console.error(`Error deleting lock key ${key} in redis: ${err}`);
    }
}
