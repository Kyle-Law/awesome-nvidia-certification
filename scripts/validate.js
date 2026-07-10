#!/usr/bin/env node
// Validates data/entries.yaml: schema, url reachability, no duplicates.
// Exits non-zero on any failure so it can gate PRs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTRIES_PATH = join(__dirname, "..", "data", "entries.yaml");

const VALID_TYPES = new Set(["repo", "simulation", "flashcards", "study-guide", "site"]);
const REQUIRED_FIELDS = ["url", "title", "certs", "type", "description"];

function validateSchema(entry, index, errors) {
  const label = `entries[${index}] (${entry?.url ?? "no url"})`;

  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      errors.push(`${label}: missing required field "${field}"`);
    }
  }

  if (entry.url && !/^https?:\/\//i.test(entry.url)) {
    errors.push(`${label}: url must be http(s)`);
  }

  if (entry.certs && (!Array.isArray(entry.certs) || entry.certs.length === 0)) {
    errors.push(`${label}: certs must be a non-empty list`);
  }

  if (entry.type && !VALID_TYPES.has(entry.type)) {
    errors.push(`${label}: type "${entry.type}" must be one of ${[...VALID_TYPES].join(", ")}`);
  }
}

function findDuplicates(entries, errors) {
  const seen = new Map();
  entries.forEach((entry, index) => {
    if (!entry.url) return;
    const normalized = entry.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(normalized)) {
      errors.push(`entries[${index}]: duplicate url of entries[${seen.get(normalized)}] (${entry.url})`);
    } else {
      seen.set(normalized, index);
    }
  });
}

async function checkResolves(entry, errors) {
  try {
    const res = await fetch(entry.url, { method: "GET", redirect: "follow" });
    if (!res.ok) {
      errors.push(`${entry.url}: returned HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`${entry.url}: request failed (${err.message})`);
  }
}

async function main() {
  const doc = yaml.load(readFileSync(ENTRIES_PATH, "utf8"));
  const entries = doc?.entries ?? [];
  const errors = [];

  entries.forEach((entry, index) => validateSchema(entry, index, errors));
  findDuplicates(entries, errors);

  // Only check reachability once schema is clean enough to have URLs.
  const withUrls = entries.filter((e) => e.url);
  await Promise.all(withUrls.map((entry) => checkResolves(entry, errors)));

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(`Validated ${entries.length} entries: all OK.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
