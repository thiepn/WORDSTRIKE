import { LEADERBOARD_BOARDS } from "./leaderboardService.js";

const app = () => document.querySelector("#app");
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function duration(value) {
  const ms = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1).padStart(4, "0");
  return minutes ? `${minutes}:${seconds}` : `${seconds}s`;
}

function metricText(entry, daily) {
  return daily
    ? `${entry.score.toLocaleString()} pts · ${duration(entry.durationMs)} · ${entry.accuracy.toFixed(1)}%`
    : `Stage ${entry.stage} · ${entry.score.toLocaleString()} pts · ${entry.accuracy.toFixed(1)}%`;
}

function rows(entries, viewer, daily) {
  if (!entries.length) return "";
  return `<div class="leaderboard-table" role="table" aria-label="Global leaderboard rankings">
    <div class="leaderboard-table-head" role="row">
      <span>RANK</span><span>PLAYER</span><span>${daily ? "SCORE" : "STAGE"}</span><span>${daily ? "TIME" : "SCORE"}</span><span>ACCURACY</span>
    </div>
    ${entries.map((entry) => {
    const own = viewer?.rank === entry.rank && viewer?.entry?.username === entry.username;
    return `<div class="leaderboard-row ${own ? "viewer-row" : ""}" role="row" ${own ? 'aria-label="Your leaderboard rank"' : ""}>
        <strong class="leaderboard-rank">#${entry.rank}</strong>
        <span class="leaderboard-player">${escapeHtml(entry.username)}${own ? '<small>YOU</small>' : ""}</span>
        <span>${daily ? entry.score.toLocaleString() : entry.stage}</span>
        <span>${daily ? duration(entry.durationMs) : entry.score.toLocaleString()}</span>
        <span>${entry.accuracy.toFixed(1)}%</span>
        <small class="leaderboard-mobile-metrics">${metricText(entry, daily)}</small>
      </div>`;
  }).join("")}
  </div>`;
}

function viewerPanel(authState, profileState, viewer, entries, daily) {
  if (authState?.status !== "signed-in") {
    return `<section class="leaderboard-viewer"><h3>YOUR RANK</h3><p>Sign in to view your personal rank.</p></section>`;
  }
  if (["idle", "loading"].includes(profileState?.status)) {
    return `<section class="leaderboard-viewer"><h3>YOUR RANK</h3><p>Loading your public profile&hellip;</p></section>`;
  }
  if (!profileState?.profile) {
    return `<section class="leaderboard-viewer"><h3>YOUR RANK</h3><p>Choose a public username before joining global rankings.</p></section>`;
  }
  if (!viewer) {
    return `<section class="leaderboard-viewer"><h3>YOUR RANK</h3><p>You do not have a ranked result on this board yet.</p></section>`;
  }
  if (entries.some((entry) => entry.rank === viewer.rank && entry.username === viewer.entry.username)) return "";
  return `<section class="leaderboard-viewer viewer-outside-top"><h3>YOUR RANK</h3>
    <strong>#${viewer.rank} &nbsp; ${escapeHtml(viewer.entry.username)}</strong>
    <p>${metricText(viewer.entry, daily)}</p></section>`;
}

function boardContent(state, authState, profileState) {
  const daily = state.selectedBoard === LEADERBOARD_BOARDS.DAILY;
  if (state.status === "idle" || state.status === "loading") {
    return `<div class="leaderboard-status">Loading global rankings&hellip;</div>`;
  }
  if (state.status === "offline") {
    return `<div class="leaderboard-status"><strong>Global rankings are unavailable while offline.</strong>
      <p>Local gameplay and records are unaffected.</p></div>`;
  }
  if (state.status === "error") {
    return `<div class="leaderboard-status"><strong>Unable to load global rankings.</strong>
      <button class="arcade-button" data-action="leaderboard-refresh">RETRY</button></div>`;
  }
  const empty = state.status === "empty"
    ? `<div class="leaderboard-status"><strong>No ranked ${daily ? "Daily Strike" : "Endless"} results yet.</strong>
        <p>${daily
    ? "Complete this Daily Strike after global score submission is introduced."
    : "Global score submission is not available yet."}</p></div>`
    : "";
  return `${state.status === "refreshing" ? '<div class="leaderboard-refreshing">Refreshing rankings&hellip;</div>' : ""}
    ${empty || rows(state.entries, state.viewer, daily)}
    ${viewerPanel(authState, profileState, state.viewer, state.entries, daily)}`;
}

export function renderLeaderboards(state, authState, profileState) {
  const daily = state.selectedBoard === LEADERBOARD_BOARDS.DAILY;
  const challengeDate = daily ? state.board?.challengeDate : null;
  app().innerHTML = `<section class="screen leaderboards-screen">
    <main class="leaderboards-panel">
      <div class="eyebrow">Public rankings // read only</div>
      <h1>GLOBAL LEADERBOARDS</h1>
      <nav class="leaderboard-tabs" aria-label="Leaderboard boards">
        <button class="${daily ? "selected" : ""}" data-action="leaderboard-select-daily" aria-pressed="${daily}">DAILY STRIKE</button>
        <button class="${daily ? "" : "selected"}" data-action="leaderboard-select-endless" aria-pressed="${!daily}">ENDLESS</button>
      </nav>
      <div class="leaderboard-board-meta">${daily
    ? `CANONICAL UTC CHALLENGE ${escapeHtml(challengeDate || "LOADING")}`
    : "STANDARD ENDLESS // RULES VERSION 1"}</div>
      <section class="leaderboard-content">${boardContent(state, authState, profileState)}</section>
      <div class="leaderboard-actions">
        <button class="arcade-button" data-action="leaderboard-refresh" ${["loading", "refreshing"].includes(state.status) ? 'disabled aria-disabled="true"' : ""}>REFRESH</button>
        <button class="arcade-button" data-action="leaderboard-main-menu">MAIN MENU</button>
      </div>
    </main>
  </section>`;
}
