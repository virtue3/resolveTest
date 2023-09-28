import { fileURLToPath } from "url";
import axios from "axios";
import { default as sqlite3 } from "sqlite3";
import fs from "fs";
import path from "path";
import { getRedisClient } from "./redisClient.js";
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export function getRowAttrsToGQLAttrs(row) {
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
export function fetchEntityRow(db, entityId) {
    return new Promise((resolve, reject) => {
        const entJSON = { entityName: "", categories: {} };
        db.each(
        // do as much work in sqlite as we can as it's faster and we've already paid the cost of loading it.
        `SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
    FROM _objects_attr oa
    JOIN _objects_eav oe ON oa.id = oe.attribute_id
    LEFT JOIN _objects_val ov ON oe.value_id = ov.id
    WHERE oe.entity_id = ${entityId}
    GROUP BY oa.id;
    `, (err, row) => {
            if (err) {
                console.error(`error fetching entityID ${entityId}`);
                return reject(err);
            }
            const category = row.category;
            if (category === "__name__") {
                entJSON.entityName = row.attr_vals;
            }
            // filter all categories starting with "__" (internal)
            if (!category.match(/^__/)) {
                if (category in entJSON.categories === false) {
                    entJSON.categories[category] = [row];
                }
                else {
                    entJSON.categories[category].push(row);
                }
            }
        }, (err, _count) => {
            if (err) {
                console.error(`error in db each for fetching entites ${entityId}`);
                return reject(err);
            }
            return resolve(entJSON);
        });
    });
}
export async function exportDBEntitiesAsJson(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.all('SELECT DISTINCT entity_id FROM _objects_eav;', [], (err, entityIds) => {
                if (err) {
                    return reject(err);
                }
                // building up the giant json of all the entities to dump into redis.
                const entityFetchPromises = [];
                entityIds.forEach((entityId) => {
                    entityFetchPromises.push(fetchEntityRow(db, entityId.entity_id));
                });
                Promise.all(entityFetchPromises).then((values) => {
                    resolve(values);
                }).catch((err) => {
                    console.error(`Error fetching entities ${err.message}`);
                    reject(err);
                });
            });
        });
    });
}
export async function checkIfFetchIdInRedis(fetchId) {
    const dbCached = await getRedisClient().redisClient.exists(fetchId);
    // if dbCached is > 0 then the key exists in redis.
    return dbCached > 0;
}
export async function getFetchIdFromRedis(fetchId) {
    const dbFromRedis = JSON.parse(await getRedisClient().redisClient.get(fetchId));
    return dbFromRedis;
}
export async function downloadFileToDisk(url, outPath) {
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
        });
    });
}
export async function deleteFilefromDisk(filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(path.resolve(__dirname, filePath), (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
export async function loadDbFromDisk(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(path.resolve(__dirname, dbPath), (err) => {
            if (err) {
                console.error("error loading db from disk");
                return reject(err);
            }
            resolve(db);
        });
    });
}
