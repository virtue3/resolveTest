import { Database, default as sqlite3 } from "sqlite3";
import axios from "axios";
import fs from "fs";
import path from "path";

import { __dirname } from "./helpers.js";
import {
  EntityCategory,
  EntityCategoryAttribute,
} from "./__generated__/graphql.js";

sqlite3.verbose();

const dbFilePath = path.join(__dirname, "props.db");

async function downloadFile() {
  const fileUrl =
    "https://resolve-dev-public.s3.amazonaws.com/sample-data/interview/props.db";

  try {
    const response = await axios.get(fileUrl, { responseType: "stream" });

    // Create a write stream to save the file
    const writer = fs.createWriteStream(dbFilePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Download failed:", error);
  }
}

async function createDb(fileName: string): Promise<sqlite3.Database | Error> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFilePath, (errMessage) => {
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

async function getAttributes(
  db: sqlite3.Database,
  entityId
): Promise<{ [key: string]: EntityAtttributeRow[] }> {
  return new Promise((resolve, reject) => {
    const retData: { [key: string]: EntityAtttributeRow[] } = {};

    db.serialize(() => {
      // because we are sending back a graphql model lets just assume it's a view model being passed back to client to be displayed directly

      // there is probably a way to get the types directly from the sqlite db... im assuming these are standarized somewhere
      db.each(
        // exclude hidden categories in sql select
        `SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
        FROM _objects_attr oa
        JOIN _objects_eav oe ON oa.id = oe.attribute_id
        LEFT JOIN _objects_val ov ON oe.value_id = ov.id
        WHERE oe.entity_id = ${entityId}
        GROUP BY oa.id;
        `,
        (err, row: EntityAtttributeRow) => {
          if (err) {
            console.error(err);
            reject(err);
          }

          const category = row.category;

          // filter all categories starting with "__" (internal)
          if (!category.match(/^__/)) {
            if (category in retData === false) {
              retData[category] = [];
            }

            retData[category].push(row);
          }
        },
        () => {
          resolve(retData);
        }
      );
    });
  });
}

// Resolvers define how to fetch the types defined in your schema.
export const resolvers = {
  Query: {
    // async here should trigger "loading" status on graphql clients during long awais... aka downloading DB
    entity: async (parent, args: { id: number }, contextValue, info) => {
      // assume args.id is equal to our entity ID.
      const startTime = Date.now();
      //
      let dbData;


      try {
        // checking if database is downloaded already
        dbData = await fs.promises.access(dbFilePath);
      } catch (err) {
        // doesn't exist we should download
        // this is an absolutely awful idea to stornpm rue this on local file system.
        // at the very least I should have some sort of global locking mechanism here but we're only going to have 1 client so...
        //  better design would involve probably storing these into some sort of redis db with FILO type caching or some such.
        await downloadFile();
        console.log("downloaded, loading file");
      }

      try {
        const db = await createDb(dbFilePath);

        if (db instanceof sqlite3.Database) {
          const dbData = await getAttributes(db, args.id);

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
            categories,
          };
        } else {
          console.error("Could not open DB after downloading.");
        }
      } catch (err) {
        console.log("get error creating db, ", err);
      }
    },
  },
};
