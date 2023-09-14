const documents = [];
export function gql(source) {
    return documents[source] ?? {};
}
