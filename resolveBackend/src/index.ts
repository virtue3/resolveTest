import { ApolloServer } from "@apollo/server";
import gql from "graphql-tag";
import { startStandaloneServer } from "@apollo/server/standalone";

import fs from "fs";
import path from "path";

import { resolvers } from "./resolvers.js";
import { __dirname } from "./helpers.js";
import { getRedisClient } from "./redisClient.js";

// load schema file up to get our gql types
const schemaFile = fs.readFileSync(
  path.join(__dirname, "../schema.graphql"),
  "utf8"
);
const typeDefs = gql(schemaFile);

export interface ResolveContext {
  redisClient: ReturnType<typeof getRedisClient>
}

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer<ResolveContext>({
  typeDefs,
  resolvers,
});


// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: async () => {
    const redisClient = getRedisClient();
    await redisClient.connect();

    return {
      redisClient,
    };
  },
});

console.log(`🚀  Server ready at: ${url}`);
