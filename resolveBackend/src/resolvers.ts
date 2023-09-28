import { default as sqlite3 } from "sqlite3";
import axios from "axios";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

import { __dirname } from "./helpers.js";
import {
  EntityCategory,
  EntityCategoryAttribute,
} from "./__generated__/graphql.js";
import { getRedisClient } from "./redisClient.js";

sqlite3.verbose();

const DEFAULT_FILE_URL =
  "https://resolve-dev-public.s3.amazonaws.com/sample-data/interview/props.db";
const DEFAULT_FILE_KEY = "PROPS";

const dbFilePath = path.join(__dirname, "props.db");

export async function getFileFromUrl(url: string) {
  try {
    return await axios.get<string>(url);
  } catch (error) {
    console.error("Download failed:", error);
  }
}

export async function createDb(fileName: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(fileName, (errMessage) => {
      if (errMessage) {
        reject(errMessage);
      }
      resolve(db);
    });
  });
}

function getRowAttrsToGQLAttrs(
  row: EntityAtttributeRow
): EntityCategoryAttribute {
  return {
    name: row.name,
    dataType: row.data_type,
    dataTypeContext: row.data_type_context,
    description: row.description ?? "",
    displayName: row.display_name,
    flags: row.flags,
    displayPrecision: row.display_precision,
    attrVals: row.attr_vals,
  };
}

type EntityAtttributeRow = {
  id: number;
  name: string;
  category: string;
  data_type: number;
  data_type_context: string;
  description: string;
  display_name: string;
  flags: number;
  display_precision: number;
  attr_vals: string;
};

const sqlGetAttributeRows = `
  SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
  FROM _objects_attr oa
  JOIN _objects_eav oe ON oa.id = oe.attribute_id
  LEFT JOIN _objects_val ov ON oe.value_id = ov.id
  WHERE oe.entity_id = ?
  GROUP BY oa.id;
`;

export async function getAttributes(
  db: sqlite3.Database,
  entityId
): Promise<[string, { [key: string]: EntityAtttributeRow[] }]> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // entityId has to come in as an ID from graphql
      db.all(
        sqlGetAttributeRows,
        [entityId],
        (err, rows: EntityAtttributeRow[]) => {
          if (err) {
            console.error(err);
            reject(err);
          }

          const retData: { [key: string]: EntityAtttributeRow[] } = {};
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
        }
      );

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

// Resolvers define how to fetch the types defined in your schema.
export const resolvers = {
  Query: {
    // async here should trigger "loading" status on graphql clients during long awais... aka downloading DB
    entity: async (parent, args: { id: number }, contextValue, _info) => {
      // assume args.id is equal to our entity ID.
      const startTime = Date.now();
      const redis: ReturnType<typeof getRedisClient> = contextValue.redisClient;

      const dbCached = await redis.redisClient.exists(DEFAULT_FILE_KEY);

      // if dbCached is < 1 then the key doesn't exist in redis and we need to populate it.
      if (dbCached < 1) {
        // semaphore to make sure we are the only server to download the sqlite db
        if (!redis.checkLockKey(DEFAULT_FILE_KEY)) {
          try {
            // semaphore lock engage
            await redis.setLockKey(DEFAULT_FILE_KEY);
            const sqliteDbFile = await getFileFromUrl(DEFAULT_FILE_URL);
            await redis.redisClient.set(DEFAULT_FILE_KEY, sqliteDbFile.data);
          } catch (err) {
            console.log(
              `Error downloading db and redis handover ${err} - unsetting lock`
            );
          } finally {
            // make sure we always remove the lock even if things go wrong so we can try and re-download.
            await redis.removeLockKey(DEFAULT_FILE_KEY);
          }
        } else {
          // we are semaphored out (we aren't the one downloading... so wait for the db key to be set)
          await redis.redisClient.bzmPop(10000, DEFAULT_FILE_KEY, "MAX");
        }
      }
      console.log("downloaded, loading file");

      try {
        const db = await createDb(dbFilePath);

        const [entityName, dbData] = await getAttributes(db, args.id);

        let categories: [EntityCategory];

        for (const cat in dbData) {
          const catInData = dbData[cat];
          if (!categories) {
            categories = [
              {
                name: catInData[0].category,
                attributes: catInData.map(getRowAttrsToGQLAttrs),
              },
            ];
          } else {
            categories.push({
              name: catInData[0].category,
              attributes: catInData.map(getRowAttrsToGQLAttrs),
            });
          }
        }

        const endTime = Date.now();
        console.log(`returning entity - ${args.id}, ${endTime - startTime}ms`);
        return {
          id: args.id,
          name: entityName,
          categories,
        };
      } catch (err) {
        console.log("get error creating db, ", err);
      }
    },
  },
};
