import { EventEmitter } from 'events';
class MockClient extends EventEmitter {
    constructor() {
        super();
    }
    get(key) {
        // Mock the behavior of client.get
        // Simulate success or failure as needed for your tests
        switch (key) {
            case 'TEST_KEY_VALID': {
                return Promise.resolve('mockedValue');
            }
            case 'LOCK_TEST_KEY_VALID': {
                return Promise.resolve('mockedValue');
            }
            case 'TEST_KEY_DUMMY_OBJ_STR': {
                return Promise.resolve(JSON.stringify({ test: "dummy" }));
            }
            default:
                return Promise.resolve(null);
        }
    }
    exists(key) {
        switch (key) {
            case 'TEST_KEY_VALID': {
                return Promise.resolve(1);
            }
            default: {
                return Promise.resolve(0);
            }
        }
    }
}
function createClient() {
    // Return an instance of the MockClient
    return new MockClient();
}
module.exports = {
    createClient,
};
