#!/usr/bin/env -S deno run --allow-read

import { getQueryHash, STATIC_DATA_SCHEMA_VERSION } from "../src/github/api.ts";

interface StaticDataFile {
  schemaVersion: number;
  queryHash: string;
  generatedAt: string;
  contributions: unknown[];
}

async function main() {
  if (Deno.args.length !== 1) {
    Deno.exit(1);
  }

  const filePath = Deno.args[0];

  try {
    const content = await Deno.readTextFile(filePath);
    const data = JSON.parse(content) as StaticDataFile;

    if (
      typeof data.schemaVersion !== "number" ||
      typeof data.queryHash !== "string" ||
      typeof data.generatedAt !== "string" ||
      !Array.isArray(data.contributions)
    ) {
      Deno.exit(1);
    }

    const currentQueryHash = await getQueryHash();

    if (
      data.schemaVersion !== STATIC_DATA_SCHEMA_VERSION ||
      data.queryHash !== currentQueryHash
    ) {
      Deno.exit(1);
    }

    Deno.exit(0);
  } catch {
    Deno.exit(1);
  }
}

main();
