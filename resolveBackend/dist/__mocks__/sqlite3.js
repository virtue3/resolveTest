// __mocks__/sqlite3.ts
import { jest } from '@jest/globals';
class MockDatabase {
    constructor(arg1, cb) {
        this.open = jest.fn();
        this.close = jest.fn();
        this.run = jest.fn();
        this.get = jest.fn();
        this.all = jest.fn();
        setTimeout(() => { cb(); });
        // Add any other mock methods or properties you need
    }
}
export default {
    Database: MockDatabase,
    verbose: jest.fn()
};
