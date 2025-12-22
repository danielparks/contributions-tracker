import { assert } from "@std/assert";
import { Filter } from "./index.ts";

Deno.test("Filter should be on by default for any repo", () => {
  const filter = new Filter();
  assert(filter.isOn("https://github.com/test/repo"));
  assert(filter.isOn("https://github.com/another/repo"));
});

Deno.test("Filter should create filter with only specified repos", () => {
  const filter = Filter.withOnlyRepos(
    "https://github.com/test/repo1",
    "https://github.com/test/repo2",
  );

  assert(filter.isOn("https://github.com/test/repo1"));
  assert(filter.isOn("https://github.com/test/repo2"));
  assert(!filter.isOn("https://github.com/other/repo"));
});

Deno.test("Filter should switch repo on/off", () => {
  const filter = new Filter();
  assert(filter.isOn("https://github.com/test/repo"));

  filter.switchRepo("https://github.com/test/repo", false);
  assert(!filter.isOn("https://github.com/test/repo"));

  filter.switchRepo("https://github.com/test/repo", true);
  assert(filter.isOn("https://github.com/test/repo"));
});

Deno.test("Filter should clone with same state", () => {
  const filter = new Filter();
  filter.defaultState = false;
  filter.switchRepo("https://github.com/test/repo", true);

  const cloned = filter.clone();
  assert(!cloned.defaultState);
  assert(cloned.isOn("https://github.com/test/repo"));
  assert(!cloned.isOn("https://github.com/other/repo"));
});

Deno.test("Filter should not affect original when cloning", () => {
  const filter = new Filter();
  filter.switchRepo("https://github.com/test/repo", false);

  const cloned = filter.clone();
  cloned.switchRepo("https://github.com/test/repo", true);

  assert(!filter.isOn("https://github.com/test/repo"));
  assert(cloned.isOn("https://github.com/test/repo"));
});
