import { default as sqlite3 } from "sqlite3";
import axios from "axios";
import { checkIfFetchIdInRedis, downloadFileToDisk, exportDBEntitiesAsJson, getFetchIdFromRedis, loadDbFromDisk } from "./helpers.js";
sqlite3.verbose();
const DEFAULT_FILE_URL = "https://resolve-dev-public.s3.amazonaws.com/sample-data/interview/props.db";
const DEFAULT_FILE_KEY = "PROPS";
export async function getFileFromUrl(url) {
    try {
        return await axios.get(url);
    }
    catch (error) {
        console.error("Download failed:", error);
    }
}
const sqlGetAttributeRows = `
  SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
  FROM _objects_attr oa
  JOIN _objects_eav oe ON oa.id = oe.attribute_id
  LEFT JOIN _objects_val ov ON oe.value_id = ov.id
  WHERE oe.entity_id = ?
  GROUP BY oa.id;
`;
export async function getAttributes(db, entityId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // entityId has to come in as an ID from graphql
            db.all(sqlGetAttributeRows, [entityId], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                const retData = {};
                let name;
                for (const row of rows) {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }
                    const category = row.category;
                    if (category === "__name__") {
                        name = row.attr_vals;
                    }
                    // filter all categories starting with "__" (internal)
                    if (!category.match(/^__/)) {
                        if (category in retData === false) {
                            retData[category] = [];
                        }
                        retData[category].push(row);
                    }
                }
                // finish parsing everything resolve the promise with the data.
                resolve([name, retData]);
            });
            // because we are sending back a graphql model lets just assume it's a view model being passed back to client to be displayed directly
            // there is probably a way to get the types directly from the sqlite db... im assuming these are standarized somewhere
            // db.each(
            //   // do as much work in sqlite as we can as it's faster and we've already paid the cost of loading it.
            //   `SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
            //   FROM _objects_attr oa
            //   JOIN _objects_eav oe ON oa.id = oe.attribute_id
            //   LEFT JOIN _objects_val ov ON oe.value_id = ov.id
            //   WHERE oe.entity_id = ${entityId}
            //   GROUP BY oa.id;
            //   `,
            //   (err, row: EntityAtttributeRow) => {
            //     if (err) {
            //       console.error(err);
            //       reject(err);
            //     }
            //     const category = row.category;
            //     if (category === "__name__") {
            //       name = row.attr_vals;
            //     }
            //     // filter all categories starting with "__" (internal)
            //     if (!category.match(/^__/)) {
            //       if (category in retData === false) {
            //         retData[category] = [];
            //       }
            //       retData[category].push(row);
            //     }
            //   },
            //   () => {
            //     resolve([name, retData]);
            //   }
            // );
        });
    });
}
export async function getFetchIDJson(redis, fileKey) {
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
    const locked = await redis.isLockedWithKey(fileKey);
    console.log("is locked?", locked);
    if (!locked) {
        try {
            // step 2 if we don't have the entity in redis download the file to disk
            await downloadFileToDisk(DEFAULT_FILE_URL, fileKey);
            // step 3 after the file is downloaded load up the sqlite db from the file
            const db = await loadDbFromDisk(fileKey);
            // step 4 parse the entities and get the json blob
            const jsonBlob = await exportDBEntitiesAsJson(db);
            // step 5 upload the json blob to redis under the fetchID
            return jsonBlob;
            //undo locks...
        }
        catch (err) {
            console.log(`Error downloading db and redis handover ${err} - unsetting lock`);
        }
        finally {
            await redis.removeLockWithKey(fileKey);
        }
    }
    else { //not locked, we want to block and wait for the data to be set in redis
        // we are semaphored out (we aren't the one downloading... so wait for the db key to be set)
        await redis.redisClient.bzmPop(30, fileKey, "MAX");
    }
    // step 6 return the json blob to be parsed for entity attributes
}
// Resolvers define how to fetch the types defined in your schema.
export const resolvers = {
    Query: {
        // async here should trigger "loading" status on graphql clients during long awais... aka downloading DB
        entity: async (parent, args, contextValue, _info) => {
            const redisAbs = contextValue.redisClient;
            // assume args.id is equal to our entity ID.
            const startTime = Date.now();
            // CONVERT TO USE getFetchIDJson()
            // const dbCached = await redis.redisClient.exists(DEFAULT_FILE_KEY);
            // console.log("db cached:", dbCached);
            // // if dbCached is < 1 then the key doesn't exist in redis and we need to populate it.
            // if (dbCached < 1) {
            //   // semaphore to make sure we are the only server to download the sqlite db
            //   const locked = await redis.isLockedWithKey(DEFAULT_FILE_KEY);
            //   console.log("is locked?", locked);
            //   if (!locked) {
            //     try {
            //       // semaphore lock engage
            //       console.log("setting lock");
            //       await redis.setLockWithKey(DEFAULT_FILE_KEY);
            //       console.log("downloading file");
            //       const sqliteDbFile = await getFileFromUrl(DEFAULT_FILE_URL);
            //       console.log("file downloaded");
            //       console.log(sqliteDbFile);
            //       console.log("putting file into redis");
            //       await redis.redisClient.set(DEFAULT_FILE_KEY, sqliteDbFile.data);
            //       console.log("file put into redis.");
            //     } catch (err) {
            //       console.log(
            //         `Error downloading db and redis handover ${err} - unsetting lock`
            //       );
            //     } finally {
            //       // make sure we always remove the lock even if things go wrong so we can try and re-download.
            //       await redis.removeLockWithKey(DEFAULT_FILE_KEY);
            //     }
            //   } else {
            //     // we are semaphored out (we aren't the one downloading... so wait for the db key to be set)
            //     await redis.redisClient.bzmPop(30, DEFAULT_FILE_KEY, "MAX");
            //   }
            // }
            // default file key would be the scene key / sqlite db key
            const jsonBlob = await getFetchIDJson(redisAbs, DEFAULT_FILE_KEY);
            console.log('JSON BLOB IS:');
            console.log(jsonBlob);
            return null;
            // try {
            //   const db = await createDbFromMemory(dbFromRedis);
            //   console.log("SUCCESSFULLY CREATED DB:", db);
            //   const [entityName, dbData] = await getAttributes(db, args.id);
            //   let categories: [EntityCategory];
            //   for (const cat in dbData) {
            //     const catInData = dbData[cat];
            //     if (!categories) {
            //       categories = [
            //         {
            //           name: catInData[0].category,
            //           attributes: catInData.map(getRowAttrsToGQLAttrs),
            //         },
            //       ];
            //     } else {
            //       categories.push({
            //         name: catInData[0].category,
            //         attributes: catInData.map(getRowAttrsToGQLAttrs),
            //       });
            //     }
            //   }
            //   const endTime = Date.now();
            //   console.log(`returning entity - ${args.id}, ${endTime - startTime}ms`);
            //   return {
            //     id: args.id,
            //     name: entityName,
            //     categories,
            //   };
            // } catch (err) {
            //   console.log("get error creating db, ", err);
            // }
        },
    },
};
