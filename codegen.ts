import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/github/schema.graphql",
  noSilentErrors: true,
  generates: {
    "src/github/gql.ts": {
      config: {
        defaultScalarType: "string",
        useTypeImports: true,
      },
      plugins: [
        { add: { content: "/* eslint-disable */" } },
        { add: { content: "// deno-lint-ignore-file" } },
        "typescript",
      ],
    },
  },
  hooks: { afterAllFileWrite: ["deno fmt src/github/gql.ts"] },
};
export default config;
