// Reads ./data.json (a copy of data/data.json placed alongside this file at
// deploy time — GitHub Pages can only serve files inside the published
// folder, so the deploy workflow copies it in rather than the frontend
// reaching outside its own root) and renders the filterable/sortable grid.

// All NVIDIA certification exams currently offered, shown as filter tabs
// even when the index has no resources for one yet.
const ALL_CERTS = [
  "NCA-ADS", "NCA-AIIO", "NCA-GENL", "NCA-GENM",
  "NCP-AAI", "NCP-ADS", "NCP-AII", "NCP-AIN", "NCP-AIO", "NCP-GENL", "NCP-OUSD",
];

const state = {
  entries: [],
  cert: "ALL",
  sort: "top",
};

const ICON_EXTERNAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

const ICON_GITHUB = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;

const grid = document.getElementById("grid");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const certFilters = document.getElementById("certFilters");
const sortTabs = document.querySelectorAll(".tab");

function formatStars(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function relTime(iso) {
  if (!iso) return "n/a";
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function statusOf(entry) {
  if (!entry.alive) return { cls: "led-dead", label: "Offline" };
  if (entry.archived) return { cls: "led-archived", label: "Archived" };
  return { cls: "led-alive", label: "Active" };
}

function cardTemplate(entry) {
  const status = statusOf(entry);
  const dim = !entry.alive || entry.archived;
  const stamp = !entry.alive
    ? '<span class="stamp stamp-dead">OFFLINE</span>'
    : entry.archived
      ? '<span class="stamp">ARCHIVED</span>'
      : "";
  const showGithubIcon = Boolean(entry.repo_url);

  return `
    <article class="card${dim ? " is-dim" : ""}" title="Open link">
      <div class="card-head">
        <h2>${escapeHtml(entry.title)}</h2>
        <span class="type-badge">${escapeHtml(entry.type)}</span>
      </div>
      <p class="desc">${escapeHtml(entry.description)}</p>
      <div class="card-meta">
        <span class="led ${status.cls}" title="${status.label}"></span>
        <span class="stat">★ ${formatStars(entry.stars)}</span>
        <span class="sep">·</span>
        <span class="stat">${relTime(entry.last_updated)}</span>
        ${stamp}
      </div>
      <div class="cert-tags">
        ${entry.certs.map((c) => `<span class="cert-tag">${escapeHtml(c)}</span>`).join("")}
      </div>
      <div class="card-actions">
        <a class="icon-link" href="${escapeAttr(entry.url)}" target="_blank" rel="noopener" title="Open link" aria-label="Open ${escapeAttr(entry.title)} site">${ICON_EXTERNAL}</a>
        ${showGithubIcon ? `<a class="icon-link" href="${escapeAttr(entry.repo_url)}" target="_blank" rel="noopener" title="View code" aria-label="View ${escapeAttr(entry.title)} on GitHub">${ICON_GITHUB}</a>` : ""}
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function sortEntries(entries, mode) {
  const copy = [...entries];
  if (mode === "top") {
    copy.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1));
  } else if (mode === "recent") {
    copy.sort((a, b) => new Date(b.last_updated ?? 0) - new Date(a.last_updated ?? 0));
  } else if (mode === "new") {
    copy.sort((a, b) => new Date(b.date_added ?? 0) - new Date(a.date_added ?? 0));
  }
  return copy;
}

function render() {
  let visible = state.entries;
  if (state.cert !== "ALL") {
    visible = visible.filter((e) => e.certs.includes(state.cert));
  }
  visible = sortEntries(visible, state.sort);

  grid.innerHTML = visible.map(cardTemplate).join("");
  emptyState.hidden = visible.length > 0;
}

function buildCertFilters() {
  const buttons = ["ALL", ...ALL_CERTS].map(
    (cert) => `<button class="chip${cert === state.cert ? " is-active" : ""}" data-cert="${escapeAttr(cert)}">${escapeHtml(cert)}</button>`
  );
  certFilters.innerHTML = buttons.join("");

  certFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    state.cert = button.dataset.cert;
    certFilters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === button));
    render();
  });
}

sortTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.sort = tab.dataset.sort;
    sortTabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });
    render();
  });
});

async function main() {
  try {
    const res = await fetch("./data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.entries = data.entries ?? [];
    buildCertFilters();
    render();
  } catch (err) {
    console.error(err);
    errorState.hidden = false;
  }
}

main();
