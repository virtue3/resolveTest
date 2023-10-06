import { expect, describe, jest, test, afterEach } from '@jest/globals';
// only tested helpers...
describe("Resolvers Test Suite", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    test("It works", () => {
        expect(true).toBe(true);
    });
});
