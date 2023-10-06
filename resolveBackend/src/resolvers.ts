import axios from "axios";

import { checkIfFetchIdInRedis, deleteFilefromDisk, downloadFileToDisk, exportDBEntitiesAsJson, getFetchIdFromRedis, loadDbFromDisk } from "./helpers.js";
import { RedisAbstraction } from "./redisClient";
import { Entity } from "./__generated__/graphql";

const DEFAULT_FILE_URL =
  "https://resolve-dev-public.s3.amazonaws.com/sample-data/interview/props.db";
const DEFAULT_FILE_KEY = "PROPS";

export async function getFileFromUrl(url: string) {
  try {
    return await axios.get<string>(url);
  } catch (error) {
    console.error("Download failed:", error);
  }
}

export async function getFetchIDJson(redisAbs: RedisAbstraction, fileKey: string): Promise<{
  [key: string]: Entity;
} | undefined> {
  // step 1
  // check if we have the fetchID in redis
  const isInRedis = await checkIfFetchIdInRedis(fileKey);

  // step 1b if we have the fetchID in redis return the json blob
  if (isInRedis) {
    // just fetch the blob and return
    const fetchedJson = await getFetchIdFromRedis(fileKey);
    return fetchedJson;
  }

  // lock out so that we are the only server that downloads and loads to redis
  const locked = await redisAbs.isLockedWithKey(fileKey);

  if (!locked) {
    try {
      await redisAbs.setLockWithKey(fileKey);
      // step 2 if we don't have the entity in redis download the file to disk
      await downloadFileToDisk(DEFAULT_FILE_URL, fileKey);

      // step 3 after the file is downloaded load up the sqlite db from the file
      const db = await loadDbFromDisk(fileKey);

      // step 4 parse the entities and get the json blob
      const jsonBlob = await exportDBEntitiesAsJson(db);
      // step 5 upload the json blob to redis under the fetchID
      const stringifiedJsonBlob = JSON.stringify(jsonBlob);

      redisAbs.multiSetAndRemoveLock(fileKey, stringifiedJsonBlob, fileKey);

      // now that we have downloaded the db and uploaded the data to redis we can 
      //  delete the db from disk
      await deleteFilefromDisk(fileKey);

      return jsonBlob;
    } catch (err) {
      console.log(
        `Error downloading db and redis handover ${err} - unsetting lock`
      );
    } finally {
      // super make sure to undo lock in case the redis.multi above fails
      try {
        await redisAbs.removeLockWithKey(fileKey);
      } catch (err) {
        // swallow error here because we are just doing an extra del 'just in case'
      }
    }
  } else { //not locked, we want to block and wait for the data to be set in redis
    try {
      // we are semaphored out (we aren't the one downloading... so wait for the db key to be set)
      await redisAbs.redisClient?.bzmPop(30, fileKey, "MAX");
    } catch (err) {
      console.error(`Error waiting for other server to fetch ${fileKey} - ${err}`);
      throw err;
    }

    // double fetch to just go through same interface (could be optimized to deal with set fetch above)
    const fetchedJson = await getFetchIdFromRedis(fileKey);
    return fetchedJson;
  }
}

// Resolvers define how to fetch the types defined in your schema.
export const resolvers = {
  Query: {
    // async here should trigger "loading" status on graphql clients during long awais... aka downloading DB
    entity: async (parent, args: { id: number }, contextValue, _info) => {

      const redisAbs: RedisAbstraction = contextValue.redisClient;

      const startTime = Date.now();

      const jsonBlob = await getFetchIDJson(redisAbs, DEFAULT_FILE_KEY);

      if(!jsonBlob) {
        throw new Error(`could not fetch data for - ${DEFAULT_FILE_KEY}`)
      }

      const entity = jsonBlob[`${args.id}`];

      const endTime = Date.now();
      console.log(`returning entity - ${args.id}, ${endTime - startTime}ms`);
      return entity;
    },
  },
};
