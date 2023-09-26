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

async function createDb(fileName: string): Promise<sqlite3.Database> {
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
): Promise<[string, { [key: string]: EntityAtttributeRow[] }]> {
  return new Promise((resolve, reject) => {
    const retData: { [key: string]: EntityAtttributeRow[] } = {};
    let name;

    db.serialize(() => {
      // because we are sending back a graphql model lets just assume it's a view model being passed back to client to be displayed directly

      // there is probably a way to get the types directly from the sqlite db... im assuming these are standarized somewhere
      db.each(
        // do as much work in sqlite as we can as it's faster and we've already paid the cost of loading it.
        `SELECT oa.*, GROUP_CONCAT(ov.value) as attr_vals
        FROM _objects_attr oa
        JOIN _objects_eav oe ON oa.id = oe.attribute_id
        LEFT JOIN _objects_val ov ON oe.value_id = ov.id
        WHERE oe.entity_id = ${parseInt(entityId)}
        GROUP BY oa.id;
        `,
        (err, row: EntityAtttributeRow) => {
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
        },
        () => {
          resolve([name, retData]);
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
        // This is a pretty ridiculous way to do this.  It definitely would need at least some sort of semaphore to make this even remotely feasible.
        //   I'm imagining you have a lot of sqlite databases hanging out in an S3 bucket or some such and we fetch them down to deal with the objects on a
        //     per need basis.  I imagine that your use case is not supporting too many customers at the same time; or worse yet -> completely different customers
        //     with different data sets.  So realistically; downloading them from S3/redis to disk would work.
        //
        //     I'd ideally have some sort of LRU caching of the databases either in memory or on local disk.  A local redis instance would work for that.
        //       I cant really extrapolate without a discussion around what the sqlite db's look like (are they all around the same size?, etc).
        //
        //     I did specifically set this up to clear out the db after the request;
        await downloadFile();
        console.log("downloaded, loading file");
      }

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
