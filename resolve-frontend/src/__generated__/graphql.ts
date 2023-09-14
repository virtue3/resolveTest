/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Entity = {
  __typename?: 'Entity';
  categories?: Maybe<Array<Maybe<EntityCategory>>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type EntityCategory = {
  __typename?: 'EntityCategory';
  attributes?: Maybe<Array<Maybe<EntityCategoryAttribute>>>;
  name?: Maybe<Scalars['String']['output']>;
};

export type EntityCategoryAttribute = {
  __typename?: 'EntityCategoryAttribute';
  attrVals?: Maybe<Scalars['String']['output']>;
  dataType?: Maybe<Scalars['Int']['output']>;
  dataTypeContext?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  displayPrecision?: Maybe<Scalars['Int']['output']>;
  flags?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  entity?: Maybe<Entity>;
};


export type QueryEntityArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type GetEntityQueryVariables = Exact<{
  entityId: Scalars['ID']['input'];
}>;


export type GetEntityQuery = { __typename?: 'Query', entity?: { __typename?: 'Entity', id: string, name: string, categories?: Array<{ __typename?: 'EntityCategory', name?: string | null, attributes?: Array<{ __typename?: 'EntityCategoryAttribute', name?: string | null, displayName?: string | null, attrVals?: string | null, dataType?: number | null, dataTypeContext?: string | null } | null> | null } | null> | null } | null };


export const GetEntityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEntity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"attrVals"}},{"kind":"Field","name":{"kind":"Name","value":"dataType"}},{"kind":"Field","name":{"kind":"Name","value":"dataTypeContext"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetEntityQuery, GetEntityQueryVariables>;