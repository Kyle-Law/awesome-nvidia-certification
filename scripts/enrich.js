#!/usr/bin/env node
// Reads data/entries.yaml, fetches metadata for each entry, writes data/data.json.
// Idempotent: safe to re-run. Preserves date_added across runs.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTRIES_PATH = join(__dirname, "..", "data", "entries.yaml");
const DATA_PATH = join(__dirname, "..", "data", "data.json");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = "https://api.github.com";

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awesome-nvidia-certification-enrich",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// Classify a URL into { source: "github" | "external", repo?: "owner/name" }
function classify(url) {
  const repoMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (repoMatch) {
    return { source: "github", repo: `${repoMatch[1]}/${repoMatch[2].replace(/\.git$/, "")}` };
  }
  const pagesMatch = url.match(/^https?:\/\/([^.]+)\.github\.io(?:\/([^/#?]+))?/i);
  if (pagesMatch) {
    const owner = pagesMatch[1];
    const project = pagesMatch[2];
    return { source: "github", repo: project ? `${owner}/${project}` : `${owner}/${owner}.github.io` };
  }
  return { source: "external" };
}

async function fetchGithubRepo(repo) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}`, { headers: githubHeaders() });
  if (!res.ok) {
    return { alive: false, stars: null, last_updated: null, language: null, topics: [], archived: false };
  }
  const json = await res.json();
  return {
    alive: true,
    stars: json.stargazers_count,
    last_updated: json.pushed_at,
    language: json.language,
    topics: json.topics ?? [],
    archived: Boolean(json.archived),
  };
}

async function checkAlive(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

function loadPreviousData() {
  if (!existsSync(DATA_PATH)) return new Map();
  const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  return new Map(parsed.entries.map((e) => [e.url, e]));
}

async function enrichEntry(entry, previous, today, now) {
  const { source, repo } = classify(entry.url);
  const prior = previous.get(entry.url);
  const date_added = prior?.date_added ?? today;

  const meta =
    source === "github"
      ? await fetchGithubRepo(repo)
      : { alive: await checkAlive(entry.url), stars: null, last_updated: null, language: null, topics: [], archived: false };

  return {
    url: entry.url,
    title: entry.title,
    certs: entry.certs,
    type: entry.type,
    description: entry.description,
    source,
    repo_url: source === "github" ? `https://github.com/${repo}` : null,
    stars: meta.stars,
    last_updated: meta.last_updated,
    language: meta.language,
    topics: meta.topics,
    archived: meta.archived,
    alive: meta.alive,
    date_added,
    last_checked: now,
  };
}

async function main() {
  const doc = yaml.load(readFileSync(ENTRIES_PATH, "utf8"));
  const entries = doc?.entries ?? [];
  const previous = loadPreviousData();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const enriched = [];
  for (const entry of entries) {
    enriched.push(await enrichEntry(entry, previous, today, now));
  }

  const deadCount = enriched.filter((e) => !e.alive).length;
  const archivedCount = enriched.filter((e) => e.archived).length;

  writeFileSync(
    DATA_PATH,
    JSON.stringify({ generated_at: now, entries: enriched }, null, 2) + "\n"
  );

  console.log(`Wrote ${enriched.length} entries to ${DATA_PATH} (${deadCount} dead, ${archivedCount} archived).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
