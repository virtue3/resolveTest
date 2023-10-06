
import { fileURLToPath } from "url";
import axios from "axios";
import { default as sqlite3 } from "sqlite3";
import fs from "fs";
import path from "path";

import { getRedisClient } from "./redisClient";

import {
  Entity,
  EntityCategory,
  EntityCategoryAttribute,
  Maybe,
} from "./__generated__/graphql";

sqlite3.verbose();

// import.meta.url es2020 having issues with jest / how project is configured, quick fix.
//   really hosed myself with build targets / project settings here and this is not an easy fix for
let metaUrl;
if (process.env.NODE_ENV === "test") {
  metaUrl = "file://";
} else {
  metaUrl = import.meta.url;
}
export const __filename = fileURLToPath(metaUrl);
export const __dirname = path.dirname(__filename);

export type EntityAtttributeRow = {
  entity_name: string;
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

export function getRowAttrsToGQLAttrs(
  row: EntityAtttributeRow
): EntityCategoryAttribute {
  return {
    entityName: row.entity_name,
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

export type EntityWithNameAndAttributes = {
  entityName: string,
  entityId: string,
  categories: { [key: string]: EntityCategoryAttribute[] }
}

// must be called inside db.serialize block!!!
export function fetchEntityRow(db: sqlite3.Database, entityId: string): Promise<EntityWithNameAndAttributes> {
  return new Promise((resolve, reject) => {
    const entJSON: EntityWithNameAndAttributes = { entityName: "", entityId, categories: {} };
    db.each(
      // do as much work in sqlite as we can as it's faster and we've already paid the cost of loading it.
      `SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
    FROM _objects_attr oa
    JOIN _objects_eav oe ON oa.id = oe.attribute_id
    LEFT JOIN _objects_val ov ON oe.value_id = ov.id
    WHERE oe.entity_id = ?
    GROUP BY oa.id;
    `, [entityId],
      (err, row: EntityAtttributeRow) => {
        if (err) {
          console.error(`error fetching entityID ${entityId}`);
          return reject(err);
        }

        const category = row.category;

        if (category === "__name__") {
          entJSON.entityName = row.attr_vals;
          // filter all categories starting with "__" (internal)
        } else if (!category.match(/^__/)) {
          // let's immediately conver to GQL data to work with
          const GQLRow = getRowAttrsToGQLAttrs(row);
          if (category in entJSON.categories === false) {
            entJSON.categories[category] = [GQLRow];
          } else {
            entJSON.categories[category].push(GQLRow);
          }
        }

      }, (err, _count) => {
        if (err) {
          console.error(`error in db each for fetching entites ${entityId}`)
          return reject(err);
        }
        return resolve(entJSON);
      }
    );
  });
}

export async function exportDBEntitiesAsJson(db: sqlite3.Database): Promise<{ [key: string]: Entity }> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all('SELECT DISTINCT entity_id FROM _objects_eav;', [], (err, entityIds: [{ entity_id: string }]) => {
        if (err) {
          return reject(err);
        }

        // building up the giant json of all the entities to dump into redis.
        const entityFetchPromises: [Promise<EntityWithNameAndAttributes>?] = [];

        // iterate through every entity id and create a fetch rows promise for each entity_id
        entityIds.forEach((entityId: { entity_id: string }) => {
          entityFetchPromises.push(fetchEntityRow(db, entityId.entity_id));
        });

        // if this was ~10x bigger we'd have to probably created a seperate redis db
        //  for each "scene file" that we download and load the entities into it via 
        //  hset on each entityID with the same expiry.  Then just do the database reload when the
        //  data is stale.
        Promise.all(entityFetchPromises).then((values) => {
          // convert keyedByEntityId to GQL format so when we store it we do 0 conversion after fetching
          //  if we are going to pay to JSON encode / decode we should pre-process as much as possible
          const GQLEntityHash: { [key: string]: Entity } = {};
          values.forEach((entity) => {
            if(!entity) {
              return;
            }

            const categories = entity.categories;
            const GQLEntityCategories: Maybe<EntityCategory>[] = [];

            for (const key in categories) {
              GQLEntityCategories.push({
                name: key,
                attributes: entity.categories[key]
              });
            }

            GQLEntityHash[entity.entityId] = {
              id: entity.entityId,
              name: entity.entityName,
              categories: GQLEntityCategories
            }
          })

          resolve(GQLEntityHash);
        }).catch((err) => {
          console.error(`Error fetching entities ${err}`);
          reject(err);
        });
      });
    });
  });
}


export async function checkIfFetchIdInRedis(fetchId: string) {
  const dbCached = await getRedisClient()?.redisClient?.exists(fetchId);
  // if dbCached is > 0 then the key exists in redis.
  if(dbCached) {
    return dbCached > 0
  }
  return false;
}

export async function getFetchIdFromRedis(fetchId: string) {
  const dbFromRedis = JSON.parse(await getRedisClient().redisClient?.get(fetchId) ?? "") as { [key: string]: Entity };
  return dbFromRedis;
}

export async function downloadFileToDisk(url: string, outPath: string): Promise<void> {

  const fileStream = fs.createWriteStream(path.resolve(__dirname, outPath));

  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url,
      responseType: 'stream',
    })
      .then((response) => {
        // Pipe the response data to the writable stream
        response.data.pipe(fileStream);

        // When the stream finishes (file is completely written), close the file stream
        response.data.on('end', () => {
          // file is written to disk nothing to return since it's on disk.
          resolve();
        });
        response.data.on('error', (err) => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      })
  })
}

export async function deleteFilefromDisk(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(path.resolve(__dirname, filePath), (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  })
}

export async function loadDbFromDisk(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.resolve(__dirname, dbPath), (err) => {
      if (err) {
        console.error("error loading db from disk", err);
        return reject(err);
      }

      resolve(db);
    });
  })
}