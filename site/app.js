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

  return `
    <a class="card${dim ? " is-dim" : ""}" href="${escapeAttr(entry.url)}" target="_blank" rel="noopener">
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
      <span class="card-link">view &#8599;</span>
    </a>
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
