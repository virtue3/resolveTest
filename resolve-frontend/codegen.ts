import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    // would normally point this at our production instance or just download it as shared module etc etc.
  schema: '../resolveBackend/schema.graphql',
  documents: ["./src/graphql/queries.graphql"],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      }
    }
  },
  ignoreNoDocuments: false,
};

export default config;