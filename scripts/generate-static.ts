#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
import { GitHub } from "../src/github/api.ts";
import type { Contributions } from "../src/github/api.ts";

interface Args {
  username: string;
  tokenFile: string;
  verbose: boolean;
  outputFile: string;
}

function parseArgs(): Args {
  const args = Deno.args;
  let username = "";
  let tokenFile = ".github-token";
  let verbose = false;
  let outputFile = "static.html";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (arg === "--token-file" || arg === "-t") {
      i++;
      if (i >= args.length) {
        throw new Error(`${arg} requires an argument`);
      }
      tokenFile = args[i];
    } else if (arg === "--output" || arg === "-o") {
      i++;
      if (i >= args.length) {
        throw new Error(`${arg} requires an argument`);
      }
      outputFile = args[i];
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      if (username) {
        throw new Error(`Multiple usernames specified: ${username}, ${arg}`);
      }
      username = arg;
    }
  }

  if (!username) {
    throw new Error(
      "Usage: generate-static.ts [options] <username>\n" +
        "Options:\n" +
        "  -t, --token-file <file>  Path to file containing GitHub token (default: .github-token)\n" +
        "  -o, --output <file>      Output file path (default: static.html)\n" +
        "  -v, --verbose            Enable verbose output",
    );
  }

  return { username, tokenFile, verbose, outputFile };
}

async function readToken(tokenFile: string): Promise<string> {
  const token = (await Deno.readTextFile(tokenFile)).trim();
  if (!token) {
    throw new Error(`Token file ${tokenFile} is empty`);
  }
  return token;
}

async function fetchContributions(
  token: string,
  username: string,
  verbose: boolean,
): Promise<Contributions[]> {
  const gh = new GitHub(token);
  if (verbose) {
    gh.installRateLimitReport();
  }

  const contributions: Contributions[] = [];
  for await (const contribution of gh.queryBase(username)) {
    contributions.push(contribution);
  }

  return contributions;
}

async function generateStaticHtml(
  contributions: Contributions[],
  outputFile: string,
): Promise<void> {
  const template = await Deno.readTextFile("static.html");

  const dataScript = `<script>window.CALENDAR_DATA = ${
    JSON.stringify(contributions)
  };</script>`;

  const html = template.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n    ${dataScript}`,
  );

  await Deno.writeTextFile(outputFile, html);
}

async function main() {
  try {
    const args = parseArgs();

    if (args.verbose) {
      console.log(`Fetching contributions for ${args.username}...`);
      console.log(`Reading token from ${args.tokenFile}...`);
    }

    const token = await readToken(args.tokenFile);
    const contributions = await fetchContributions(
      token,
      args.username,
      args.verbose,
    );

    if (args.verbose) {
      console.log(`Fetched ${contributions.length} contribution batches`);
      console.log(`Generating ${args.outputFile}...`);
    }

    await generateStaticHtml(contributions, args.outputFile);

    if (args.verbose) {
      console.log(`Done! Generated ${args.outputFile}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

main();
