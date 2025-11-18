import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./github.graphql",
  noSilentErrors: true,
  generates: {
    "./src/gql.ts": {
      config: {
        scalars: {
          Date: "string",
        },
        useTypeImports: true,
      },
      plugins: [
        { add: { content: "// deno-lint-ignore-file" } },
        "typescript",
      ],
    },
  },
  hooks: { afterAllFileWrite: ["deno fmt src/gql.ts"] },
};
export default config;
