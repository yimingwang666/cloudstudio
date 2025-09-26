// ---------------- CONFIG ----------------
const WORKER_URL = "https://progress-sync-worker.yimingwong666.workers.dev"; // <-- 改成你的 Worker 地址
const AUDIO_FILES = [
  "01.說法前行 (01).opus",
  "02.說法前行 (02).opus",
  "03.說法前行 (03).opus",
  "04.道前基礎 Foundation (01).opus",
  "05.道前基礎 Foundation (02).opus",
  "06.道前基礎 Foundation (03).opus",
  "07.道前基礎 foundation (04).opus",
  "08.道前基礎 foundation (05).opus",
  "09.道前基礎 foundation (06).opus",
  "10.道前基礎 foundation (07).opus",
  "11.道前基礎 foundation (08).opus",
  "13.道前基礎 Foundation (10).opus",
  "14.道前基礎 Foundation (11).opus",
  "15.道前基礎 Foundation (12).opus",
  "16.共下士道 (01).opus",
  "17.共下士道 (02).opus",
  "18.共下士道 (03).opus",
  "19.共下士道 (04).opus",
  "20.共下士道 (05).opus",
  "21.共下士道 (06).opus",
  "22.共下士道 (07).opus",
  "23.共下士道 (08).opus",
  "24.共中士道 (01).opus",
  "25.共中士道 (02).opus",
  "26.共中士道 (03).opus",
  "27.共中士道 (04).opus",
  "28.共中士道 (05).opus",
  "29.上士道 (01).opus",
  "30.上士道 (02).opus",
  "31.上士道 (03).opus",
  "32.上士道 (04).opus",
  "34.上士道 (06).opus",
  "35.六度四攝 6perfections (01).opus",
  "36.六度四攝 6perfections (02).opus",
  "37.六度四攝 6perfections (03).opus",
  "38.六度四攝 6perfections (04).opus",
  "39.六度四攝 6perfections (05).opus",
  "40.奢摩他 Shamadi (01).opus",
  "41.奢摩他 Shamadi (02).opus",
  "42.奢摩他 Shamadi (03).opus",
  "43.奢摩他 Shamadi (04).opus",
  "44.奢摩他 Shamadi (05).opus",
  "45.毗缽舍那 Insight (01).opus",
  "46.毗缽舍那 Insight (02).opus",
  "47.毗缽舍那 Insight (03).opus",
  "48.毗缽舍那 Insight (04).opus",
  "49.毗缽舍那 Insight (05).opus",
  "50.毗缽舍那 Insight (06).opus",
  "51.毗缽舍那 Insight (07).opus",
  "52.毗缽舍那 Insight (08).opus",
  "53.毗缽舍那 Insight (09).opus",
  "55.毗缽舍那 Insight (11).opus",
  "56.毗缽舍那 Insight (12).opus",
  "57.毗缽舍那 Insight (13).opus",
  "58.毗缽舍那 Insight (14).opus",
]; // <-- 放 assets 里
const TEXT_FILES = ["覺燈日光(一).md", "覺燈日光(二).md", "覺燈日光(三).md"]; // <-- 放 assets 里
// ----------------------------------------

/* 全局元素 */
const loginOverlay = document.getElementById("login-overlay");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const guestBtn = document.getElementById("guest-btn");
const appEl = document.getElementById("app");

const usernameDisplay = document.getElementById("username-display");
const logoutBtn = document.getElementById("logout-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const audioListEl = document.getElementById("audio-list");
const textListEl = document.getElementById("text-list");
const markdownContent = document.getElementById("markdown-content");
const contentViewer = document.getElementById("content-viewer");

const audioPlayer = document.getElementById("audio-player");
const playPauseBtn = document.getElementById("play-pause-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");
const progressBar = document.getElementById("progress-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const volumeBar = document.getElementById("volume-bar");
const currentTrackTitle = document.getElementById("current-track-title");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

/* 应用状态（可序列化）*/
let appState = {
  currentUser: null,
  lastTheme: "dark",
  lastPlayedAudio: null,
  lastOpenedText: null,
  progressData: {}, // filename => seconds
  scrollPositions: {}, // filename => 0..1
  volume: 1,
  sidebarCollapsed: false,
};

/* 防抖和节流句柄 */
let saveTimeout = null;
let scrollTimeout = null;
let progressSaveThrottle = null;

/* ----------------- 辅助函数 ----------------- */
function sanitizeForSave(state) {
  // 只保留我们需要的字段（避免 DOM 或函数）
  return {
    lastTheme: state.lastTheme,
    lastPlayedAudio: state.lastPlayedAudio,
    lastOpenedText: state.lastOpenedText,
    progressData: state.progressData || {},
    scrollPositions: state.scrollPositions || {},
    volume: state.volume || 1,
    sidebarCollapsed: !!state.sidebarCollapsed,
  };
}

function scheduleStateSave(delay = 600) {
  if (!appState.currentUser) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveStateToBackend, delay);
}

async function saveStateToBackend() {
  if (!appState.currentUser) return;
  const payload = {
    userId: appState.currentUser,
    state: sanitizeForSave(appState),
  };
  try {
    await fetch(`${WORKER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    // also mirror to localStorage for instant load
    localStorage.setItem(
      `studio_local_${appState.currentUser}`,
      JSON.stringify(sanitizeForSave(appState))
    );
  } catch (err) {
    console.warn("保存到后端失败，已保存在 localStorage（离线）", err);
    localStorage.setItem(
      `studio_local_${appState.currentUser}`,
      JSON.stringify(sanitizeForSave(appState))
    );
  }
}

async function loadStateFromBackend(username) {
  try {
    const res = await fetch(
      `${WORKER_URL}/get/${encodeURIComponent(username)}`
    );
    if (!res.ok) throw new Error("no-data");
    const text = await res.text();
    // 后端可能直接返回 JSON 字符串或已序列化对象
    let obj = {};
    try {
      obj = JSON.parse(text || "{}");
    } catch (e) {
      obj = {};
    }
    // 如果后端返回的可能是字符串化的字符串 -> 双重解析保护
    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch (e) {
        obj = {};
      }
    }
    return obj || {};
  } catch (err) {
    // fallback to localStorage
    const local = localStorage.getItem(`studio_local_${username}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return {};
      }
    }
    return {};
  }
}

function formatTime(seconds = 0) {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/* ----------------- 渲染列表 ----------------- */
function renderLists() {
  audioListEl.innerHTML = AUDIO_FILES.map(
    (f) => `<li tabindex="0" class="audio-item" data-src="${f}">${f}</li>`
  ).join("");
  textListEl.innerHTML = TEXT_FILES.map(
    (f) => `<li tabindex="0" class="text-item" data-src="${f}">${f}</li>`
  ).join("");
  attachListHandlers();
  refreshActiveMarks();
}

/* 高亮当前选择项 */
function refreshActiveMarks() {
  document
    .querySelectorAll(".audio-item")
    .forEach((it) =>
      it.classList.toggle("active", it.dataset.src === appState.lastPlayedAudio)
    );
  document
    .querySelectorAll(".text-item")
    .forEach((it) =>
      it.classList.toggle("active", it.dataset.src === appState.lastOpenedText)
    );
}

/* 列表事件代理 */
function attachListHandlers() {
  audioListEl.addEventListener("click", (e) => {
    const li = e.target.closest(".audio-item");
    if (li) loadAudio(li.dataset.src, true);
  });
  textListEl.addEventListener("click", (e) => {
    const li = e.target.closest(".text-item");
    if (li) loadAndRenderMarkdown(li.dataset.src);
  });

  // keyboard accessibility
  audioListEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const li = e.target.closest(".audio-item");
      if (li) loadAudio(li.dataset.src, true);
    }
  });
  textListEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const li = e.target.closest(".text-item");
      if (li) loadAndRenderMarkdown(li.dataset.src);
    }
  });
}

/* ----------------- 音频相关 ----------------- */
function loadAudio(fileName, shouldPlay = true) {
  appState.lastPlayedAudio = fileName;
  audioPlayer.src = `./assets/${fileName}`;
  currentTrackTitle.textContent = fileName;
  progressBar.value = 0;
  durationEl.textContent = "00:00";
  refreshActiveMarks();
  // 恢复音量
  audioPlayer.volume = appState.volume ?? 1;
  if (shouldPlay) {
    audioPlayer.play().catch(() => {});
  }
  scheduleStateSave(400);
}

audioPlayer.addEventListener("loadedmetadata", () => {
  if (!isFinite(audioPlayer.duration)) return;
  progressBar.max = Math.floor(audioPlayer.duration);
  durationEl.textContent = formatTime(audioPlayer.duration);

  const saved =
    (appState.progressData &&
      appState.progressData[appState.lastPlayedAudio]) ||
    0;
  if (saved > 0 && saved < audioPlayer.duration - 1) {
    audioPlayer.currentTime = saved;
  }
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!isFinite(audioPlayer.duration)) return;
  const t = Math.floor(audioPlayer.currentTime);
  progressBar.value = t;
  currentTimeEl.textContent = formatTime(t);
  // 节流保存 progress（每 2s 或播放结束时保存）
  if (!progressSaveThrottle || Date.now() - progressSaveThrottle > 2000) {
    progressSaveThrottle = Date.now();
    if (appState.lastPlayedAudio) {
      appState.progressData[appState.lastPlayedAudio] = audioPlayer.currentTime;
      scheduleStateSave(800);
    }
  }
});

playPauseBtn.addEventListener("click", () => {
  if (!audioPlayer.src) return;
  if (audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
});

audioPlayer.addEventListener("play", () =>
  playPauseBtn.querySelector("i").classList.replace("fa-play", "fa-pause")
);
audioPlayer.addEventListener("pause", () => {
  playPauseBtn.querySelector("i").classList.replace("fa-pause", "fa-play");
  scheduleStateSave();
});
audioPlayer.addEventListener("ended", () => playNext(1));

progressBar.addEventListener("input", () => {
  audioPlayer.currentTime = Number(progressBar.value);
});
volumeBar.addEventListener("input", () => {
  const v = Number(volumeBar.value);
  audioPlayer.volume = v;
  appState.volume = v;
  scheduleStateSave();
});

function playNext(offset = 1) {
  if (!appState.lastPlayedAudio) return;
  const idx = AUDIO_FILES.indexOf(appState.lastPlayedAudio);
  if (idx === -1) return;
  const next = (idx + offset + AUDIO_FILES.length) % AUDIO_FILES.length;
  loadAudio(AUDIO_FILES[next], true);
}
nextBtn.addEventListener("click", () => playNext(1));
prevBtn.addEventListener("click", () => playNext(-1));
rewindBtn.addEventListener("click", () => {
  audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
});
forwardBtn.addEventListener("click", () => {
  audioPlayer.currentTime = Math.min(
    audioPlayer.duration || 0,
    audioPlayer.currentTime + 10
  );
});

/* ----------------- 文稿加载和滚动恢复 ----------------- */
async function loadAndRenderMarkdown(fileName) {
  appState.lastOpenedText = fileName;
  refreshActiveMarks();
  markdownContent.innerHTML = `<p style="color:var(--muted)">正在加载 ${fileName} …</p>`;
  try {
    const res = await fetch(`./assets/${fileName}`);
    if (!res.ok) throw new Error("文件未找到");
    const md = await res.text();
    markdownContent.innerHTML = marked.parse(md);

    // 恢复滚动位置（百分比）
    const saved =
      (appState.scrollPositions && appState.scrollPositions[fileName]) || 0;
    // 小的延迟以等待渲染完成
    requestAnimationFrame(() => {
      const maxScroll = contentViewer.scrollHeight - contentViewer.clientHeight;
      contentViewer.scrollTop = Math.round(maxScroll * saved);
    });
  } catch (err) {
    markdownContent.innerHTML = `<p style="color:tomato">加载失败：${err.message}</p>`;
  }
  scheduleStateSave(400);
}

/* 记录滚动百分比（防抖）*/
contentViewer.addEventListener("scroll", () => {
  if (!appState.lastOpenedText) return;
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const maxScroll = contentViewer.scrollHeight - contentViewer.clientHeight;
    const pct = maxScroll > 0 ? contentViewer.scrollTop / maxScroll : 0;
    appState.scrollPositions[appState.lastOpenedText] = Number(pct.toFixed(4));
    scheduleStateSave(600);
  }, 300);
});

/* ----------------- 登录 / 注销 ----------------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = (usernameInput.value || "").trim();
  if (!name) return;
  await doLogin(name);
});
guestBtn.addEventListener("click", async () => {
  const guest = `guest_${Date.now()}`;
  await doLogin(guest);
});

async function doLogin(name) {
  appState.currentUser = name;
  // 先尝试从后端拉取已保存状态
  const saved = await loadStateFromBackend(name);
  // 合并（后端优先，但保留基本默认）
  Object.assign(appState, { ...appState, ...saved });
  // set UI
  usernameDisplay.textContent = name;
  // 誓言：保证 theme 在最前
  applyTheme(appState.lastTheme || "dark", false);
  // volume
  const v = typeof appState.volume === "number" ? appState.volume : 1;
  volumeBar.value = v;
  audioPlayer.volume = v;

  renderLists();
  // 恢复上次打开项
  if (appState.lastOpenedText && TEXT_FILES.includes(appState.lastOpenedText)) {
    loadAndRenderMarkdown(appState.lastOpenedText);
  }
  if (
    appState.lastPlayedAudio &&
    AUDIO_FILES.includes(appState.lastPlayedAudio)
  ) {
    loadAudio(appState.lastPlayedAudio, false);
  }

  // show app
  loginOverlay.classList.remove("visible");
  appEl.setAttribute("aria-hidden", "false");
  localStorage.setItem("studio_currentUser", name);
  scheduleStateSave(300);
}

logoutBtn.addEventListener("click", async () => {
  if (!appState.currentUser) return;
  // 先保存一次（采用 sendBeacon + fetch 双保险）
  try {
    const payload = JSON.stringify({
      userId: appState.currentUser,
      state: sanitizeForSave(appState),
    });
    // sendBeacon (fire-and-forget)
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`${WORKER_URL}/save`, blob);
    }
    // also attempt fetch
    await fetch(`${WORKER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  } catch (e) {
    console.warn("注销时保存失败", e);
  }

  // 清理本地状态并返回登录
  localStorage.removeItem("studio_currentUser");
  usernameDisplay.textContent = "";
  appState.currentUser = null;
  // 保留主题偏好 locally, 但清空用户相关项
  appState.lastPlayedAudio = null;
  appState.lastOpenedText = null;
  appState.progressData = {};
  appState.scrollPositions = {};
  appState.volume = 1;
  loginOverlay.classList.add("visible");
  appEl.setAttribute("aria-hidden", "true");
});

/* ----------------- 主题切换 ----------------- */
function applyTheme(theme, persist = true) {
  if (theme === "light") document.body.classList.add("light-theme");
  else document.body.classList.remove("light-theme");
  appState.lastTheme = theme;
  themeToggleBtn
    .querySelector("i")
    .classList.toggle("fa-sun", theme === "light");
  themeToggleBtn
    .querySelector("i")
    .classList.toggle("fa-moon", theme !== "light");
  if (persist) {
    localStorage.setItem("studio_lastTheme", theme);
    scheduleStateSave();
  }
}
themeToggleBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("light-theme")
    ? "dark"
    : "light";
  applyTheme(next);
});

/* ----------------- 侧栏折叠 ----------------- */
sidebarToggle.addEventListener("click", () => {
  const collapsed = sidebar.classList.toggle("collapsed");
  appState.sidebarCollapsed = collapsed;
  const icon = sidebarToggle.querySelector("i");
  icon.classList.toggle("fa-chevron-right", collapsed);
  icon.classList.toggle("fa-chevron-left", !collapsed);
  scheduleStateSave();
});

/* ----------------- 初始化 ----------------- */
function init() {
  const savedTheme = localStorage.getItem("studio_lastTheme");
  if (savedTheme) applyTheme(savedTheme, false);

  const savedUser = localStorage.getItem("studio_currentUser");
  if (savedUser) {
    // 自动登录（尝试拉取远端）
    doLogin(savedUser);
  } else {
    // 显示登录
    loginOverlay.classList.add("visible");
    appEl.setAttribute("aria-hidden", "true");
    renderLists();
  }

  // 绑定一些快捷键（空格播放/暂停）
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && document.activeElement === document.body) {
      e.preventDefault();
      if (audioPlayer.src) playPauseBtn.click();
    }
  });

  // 在页面卸载前尝试保存一次（sendBeacon）
  window.addEventListener("beforeunload", () => {
    if (appState.currentUser) {
      try {
        const payload = JSON.stringify({
          userId: appState.currentUser,
          state: sanitizeForSave(appState),
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(`${WORKER_URL}/save`, blob);
        }
      } catch (e) {}
    }
  });
}

init();
