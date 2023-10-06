
import { default as sqlite3 } from "sqlite3";

// mock redis
jest.mock('redis');
jest.mock("./redisClient");

import { expect, describe, jest, test, afterEach, beforeEach} from '@jest/globals';
import { exportDBEntitiesAsJson,  loadDbFromDisk,  checkIfFetchIdInRedis, getFetchIdFromRedis } from "./helpers";


describe('Helpers Test Suite', () => {
  let consoleSpy;

  beforeEach(() => {
    if (typeof consoleSpy === "function") {
      consoleSpy.mockRestore();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  describe("DB operations", () => {
    test('Load DB From Disk Works', async () => {
      jest.spyOn(sqlite3, 'Database').mockImplementation((...args) => {
        // test code is not type -super- critical, ts-ignores are ok-ish if not super awful.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setTimeout(() => args[1]());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {} as any;
      });

      let db;

      await expect(
        db = loadDbFromDisk("dummy_path")
      ).resolves.not.toThrowError();

      expect(db).toBeDefined();
    });

    test('Load DB from Disk Throws on load error', async () => {
      // eat console error to have clean test output
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
      jest.spyOn(sqlite3, 'Database').mockImplementation((...args) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setTimeout(() => args[1](new Error("Mock Error")));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {} as any;
      });

      try {
        await loadDbFromDisk("dummy_path");
      } catch (err) {
        expect(err.message).toBe("Mock Error")
      }
    });
  });

  describe("Redis Operations", () => {
    test("checkIfFetchIdInRedis works", async () => {
      let checked = await checkIfFetchIdInRedis("TEST_KEY_VALID");
      expect(checked).toBeTruthy();

      checked = await checkIfFetchIdInRedis("TEST_KEY_INVALID");
      expect(checked).toBeFalsy();
    });

    test("check getFetchIdFromRedis works", async () => {
      const json = await getFetchIdFromRedis("TEST_KEY_DUMMY_OBJ_STR");
      expect(json).toEqual({ test: 'dummy' });
    })
  });

  describe("sqlite3 operations", () => {
    const dbAllEntityIds = [{ entity_id: 7001 }];

    const rowDatas = [
      {
        id: 1,
        name: 'name',
        category: '__name__',
        data_type: 20,
        data_type_context: null,
        description: null,
        display_name: null,
        flags: 0,
        display_precision: 0,
        attr_vals: 'Rectangular-Column [286350]'
      }
      , {
        id: 113,
        name: 'Image',
        category: 'Identity Data',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Image',
        flags: 0,
        display_precision: 0,
        attr_vals: ''
      }
      , {
        id: 117,
        name: 'Comments',
        category: 'Identity Data',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Comments',
        flags: 0,
        display_precision: 0,
        attr_vals: ''
      }
      , {
        id: 121,
        name: 'Mark',
        category: 'Identity Data',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Mark',
        flags: 0,
        display_precision: 0,
        attr_vals: ''
      }
      , {
        id: 148,
        name: 'Type Name',
        category: 'Identity Data',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Type Name',
        flags: 8,
        display_precision: 0,
        attr_vals: '400x500-fence'
      }
      , {
        id: 328,
        name: 'Base Level',
        category: 'Constraints',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Base Level',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Ground Floor'
      }
      , {
        id: 329,
        name: 'Base Offset',
        category: 'Constraints',
        data_type: 3,
        data_type_context: 'mm',
        description: null,
        display_name: 'Base Offset',
        flags: 0,
        display_precision: 0,
        attr_vals: '-700.0'
      }
      , {
        id: 344,
        name: 'Column Location Mark',
        category: 'Constraints',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Column Location Mark',
        flags: 8,
        display_precision: 0,
        attr_vals: 'B(225)-1(-14767)'
      }
      , {
        id: 345,
        name: 'Top Level',
        category: 'Constraints',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Top Level',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Ground Floor'
      }
      , {
        id: 346,
        name: 'Top Offset',
        category: 'Constraints',
        data_type: 3,
        data_type_context: 'mm',
        description: null,
        display_name: 'Top Offset',
        flags: 0,
        display_precision: 0,
        attr_vals: '3000'
      }
      , {
        id: 347,
        name: 'Column Style',
        category: 'Constraints',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Column Style',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Vertical'
      }
      , {
        id: 348,
        name: 'Moves With Grids',
        category: 'Constraints',
        data_type: 1,
        data_type_context: '',
        description: null,
        display_name: 'Moves With Grids',
        flags: 0,
        display_precision: 0,
        attr_vals: '1'
      }
      , {
        id: 349,
        name: 'Room Bounding',
        category: 'Constraints',
        data_type: 1,
        data_type_context: '',
        description: null,
        display_name: 'Room Bounding',
        flags: 0,
        display_precision: 0,
        attr_vals: '1'
      }
      , {
        id: 350,
        name: 'Enable Analytical Model',
        category: 'Structural',
        data_type: 1,
        data_type_context: '',
        description: null,
        display_name: 'Enable Analytical Model',
        flags: 0,
        display_precision: 0,
        attr_vals: '1'
      }
      , {
        id: 351,
        name: 'Rebar Cover - Top Face',
        category: 'Structural',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Rebar Cover - Top Face',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Rebar Cover 1 <25 mm>'
      }
      , {
        id: 352,
        name: 'Rebar Cover - Bottom Face',
        category: 'Structural',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Rebar Cover - Bottom Face',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Rebar Cover 1 <25 mm>'
      }
      , {
        id: 353,
        name: 'Rebar Cover - Other Faces',
        category: 'Structural',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Rebar Cover - Other Faces',
        flags: 0,
        display_precision: 0,
        attr_vals: 'Rebar Cover 1 <25 mm>'
      }
      , {
        id: 354,
        name: 'Volume',
        category: 'Dimensions',
        data_type: 3,
        data_type_context: 'm^3',
        description: null,
        display_name: 'Volume',
        flags: 8,
        display_precision: 0,
        attr_vals: '0.74'
      }
      , {
        id: 355,
        name: 'Phase Created',
        category: 'Phasing',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Phase Created',
        flags: 0,
        display_precision: 0,
        attr_vals: 'New Construction'
      }
      , {
        id: 356,
        name: 'Phase Demolished',
        category: 'Phasing',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Phase Demolished',
        flags: 0,
        display_precision: 0,
        attr_vals: 'None'
      }
      , {
        id: 357,
        name: 'Room Name',
        category: 'Other',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Room Name',
        flags: 9,
        display_precision: 0,
        attr_vals: ''
      }
      , {
        id: 358,
        name: 'Room Number',
        category: 'Other',
        data_type: 20,
        data_type_context: '',
        description: null,
        display_name: 'Room Number',
        flags: 9,
        display_precision: 0,
        attr_vals: ''
      }
    ]

    const mockDBWorking = {
      serialize: (cb) => cb(),
      all: (_sql, _params, cb) => {
        setTimeout(() => cb(null, dbAllEntityIds));
      },
      each: async (_sql, entityIds, rowCb, finalCb) => {
        const rowPromises = rowDatas.map(row => {
          return Promise.resolve(() => {
            rowCb(null, row);
          });
        });

        // await each promise then call the each() callback
        for (const p of rowPromises) {
          const func = await p;
          func();
        }

        //call the final callback to resolve the db.each interface
        finalCb();
      }
    }

    test("exportDBEntitiesAsJson works", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonBlob = await exportDBEntitiesAsJson(mockDBWorking as any);
      expect(jsonBlob).toMatchSnapshot();
    });
  })
});