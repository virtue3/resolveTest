import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'node', // Use the Node.js environment for testing
  extensionsToTreatAsEsm: ['.ts'],
  // preset: 'ts-jest',
  rootDir: "./src",
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: {
          ignoreCodes: [1343]
        },
        astTransformers: {
          before: [
            {
              path: 'node_modules/ts-jest-mock-import-meta',  // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
              options: { metaObjectReplacement: { url: 'https://www.url.com' } }
            }
          ]
        }
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};

export default config;