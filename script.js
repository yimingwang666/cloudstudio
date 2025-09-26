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

/* 应用状态 (代码不变) */
let appState = {
  currentUser: null,
  lastTheme: "dark",
  lastPlayedAudio: null,
  lastOpenedText: null,
  progressData: {},
  scrollPositions: {},
  volume: 1,
  sidebarCollapsed: false,
};

/* 防抖和节流句柄 (代码不变) */
let saveTimeout = null,
  scrollTimeout = null,
  progressSaveThrottle = null;

/* ----------------- 辅助函数 (代码不变) ----------------- */
function sanitizeForSave(state) {
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
function scheduleStateSave(delay = 800) {
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
    const res = await fetch(`${WORKER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (res.ok)
      localStorage.setItem(
        `studio_local_${appState.currentUser}`,
        JSON.stringify(sanitizeForSave(appState))
      );
  } catch (err) {
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
    if (res.ok) {
      const data = await res.json();
      return typeof data === "string" ? JSON.parse(data) : data;
    }
  } catch (err) {}
  const local = localStorage.getItem(`studio_local_${username}`);
  return local ? JSON.parse(local) : {};
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

/* ----------------- 渲染与交互 (代码不变) ----------------- */
function renderLists() {
  audioListEl.innerHTML = AUDIO_FILES.map(
    (f) => `<li tabindex="0" class="audio-item" data-src="${f}">${f}</li>`
  ).join("");
  textListEl.innerHTML = TEXT_FILES.map(
    (f) => `<li tabindex="0" class="text-item" data-src="${f}">${f}</li>`
  ).join("");
  attachListHandlers();
}
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
function attachListHandlers() {
  const handler = (e, type) => {
    const li = e.target.closest(`.${type}-item`);
    if (li && (e.type === "click" || e.key === "Enter")) {
      if (type === "audio") loadAudio(li.dataset.src, true);
      else loadAndRenderMarkdown(li.dataset.src);
    }
  };
  audioListEl.addEventListener("click", (e) => handler(e, "audio"));
  textListEl.addEventListener("click", (e) => handler(e, "text"));
  audioListEl.addEventListener("keydown", (e) => handler(e, "audio"));
  textListEl.addEventListener("keydown", (e) => handler(e, "text"));
}
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
sidebarToggle.addEventListener("click", () => {
  const collapsed = sidebar.classList.toggle("collapsed");
  appState.sidebarCollapsed = collapsed;
  sidebarToggle
    .querySelector("i")
    .classList.toggle("fa-chevron-right", collapsed);
  sidebarToggle
    .querySelector("i")
    .classList.toggle("fa-chevron-left", !collapsed);
  scheduleStateSave();
});
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
themeToggleBtn.addEventListener("click", () =>
  applyTheme(document.body.classList.contains("light-theme") ? "dark" : "light")
);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && document.activeElement === document.body) {
    e.preventDefault();
    if (audioPlayer.src) playPauseBtn.click();
  }
});
window.addEventListener("beforeunload", () => {
  if (appState.currentUser) {
    try {
      const payload = JSON.stringify({
        userId: appState.currentUser,
        state: sanitizeForSave(appState),
      });
      if (navigator.sendBeacon)
        navigator.sendBeacon(
          `${WORKER_URL}/save`,
          new Blob([payload], { type: "application/json" })
        );
    } catch (e) {}
  }
});

// --- 🐞 性能优化：快速响应 ---
function loadAudio(fileName, shouldPlay = true) {
  appState.lastPlayedAudio = fileName;
  audioPlayer.src = `./assets/${fileName}`;
  currentTrackTitle.textContent = fileName;

  // 乐观更新 UI：立即重置时间显示
  progressBar.value = 0;
  progressBar.max = 1; // 临时最大值，避免进度条不可用
  currentTimeEl.textContent = "00:00";
  durationEl.textContent = "--:--"; // 使用占位符，表示正在加载

  refreshActiveMarks();
  audioPlayer.volume = appState.volume ?? 1;

  // 关键：不再等待 `loadedmetadata`，而是让浏览器自己处理加载和播放
  if (shouldPlay) {
    // 调用 play() 会返回一个 Promise，浏览器会在数据足够时自动开始播放
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // 自动播放失败通常是因为用户未与页面交互，这是正常行为
        console.warn("Playback prevented:", error);
        // 即使播放失败，我们也要确保 UI 状态正确
        playPauseBtn
          .querySelector("i")
          .classList.replace("fa-pause", "fa-play");
      });
    }
  }

  // 尝试立即恢复进度。如果元数据还未加载，浏览器会自动处理
  const savedTime =
    (appState.progressData && appState.progressData[fileName]) || 0;
  if (savedTime > 0) {
    // 我们可以在 'loadedmetadata' 之前就设置 currentTime。
    // 浏览器会记住这个值，并在数据加载到该位置后从那里开始。
    audioPlayer.currentTime = savedTime;
  }

  scheduleStateSave(400);
}

// 当音频元数据（包括总时长）加载完成时触发
audioPlayer.addEventListener("loadedmetadata", () => {
  // 只需要在这里更新总时长和进度条最大值即可
  if (isFinite(audioPlayer.duration)) {
    const duration = Math.floor(audioPlayer.duration);
    progressBar.max = duration;
    durationEl.textContent = formatTime(duration);
  }
});

// 当播放时间更新时（每秒多次）触发
audioPlayer.addEventListener("timeupdate", () => {
  const currentTime = audioPlayer.currentTime;

  // 无论 duration 是否有效，都应更新当前时间显示
  if (isFinite(currentTime)) {
    currentTimeEl.textContent = formatTime(currentTime);
    progressBar.value = Math.floor(currentTime);
  }

  // 节流保存播放进度
  if (!progressSaveThrottle || Date.now() - progressSaveThrottle > 2000) {
    progressSaveThrottle = Date.now();
    // 确保有音频在播放且时间有效才保存
    if (appState.lastPlayedAudio && isFinite(currentTime) && currentTime > 0) {
      appState.progressData[appState.lastPlayedAudio] = currentTime;
      scheduleStateSave(); // 使用默认延迟即可
    }
  }
});

// 作为 loadedmetadata 的补充，当 duration 变化时（例如从未知变为已知）再次更新UI
audioPlayer.addEventListener("durationchange", () => {
  if (isFinite(audioPlayer.duration)) {
    const duration = Math.floor(audioPlayer.duration);
    progressBar.max = duration;
    durationEl.textContent = formatTime(duration);
  }
});

async function loadAndRenderMarkdown(fileName) {
  appState.lastOpenedText = fileName;
  refreshActiveMarks();
  markdownContent.innerHTML = `<p style="color:var(--muted)">正在加载 ${fileName} …</p>`;
  try {
    const res = await fetch(`./assets/${fileName}`);
    if (!res.ok) throw new Error("文件未找到");
    const md = await res.text();
    markdownContent.innerHTML = marked.parse(md);
    // Memory Fix: Restore scroll position
    const saved =
      (appState.scrollPositions && appState.scrollPositions[fileName]) || 0;
    requestAnimationFrame(() => {
      const maxScroll = contentViewer.scrollHeight - contentViewer.clientHeight;
      contentViewer.scrollTop = Math.round(maxScroll * saved);
    });
  } catch (err) {
    markdownContent.innerHTML = `<p style="color:tomato">加载失败：${err.message}</p>`;
  }
  scheduleStateSave(400);
}
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

/* ----------------- 登录/注销/初始化 (已优化) ----------------- */
async function doLogin(name) {
  appState.currentUser = name;
  usernameDisplay.textContent = name;
  const savedState = await loadStateFromBackend(name);
  // Memory Fix: Properly merge saved state
  Object.assign(appState, savedState);

  // Apply UI based on loaded state
  applyTheme(appState.lastTheme || "dark", false);
  const v = typeof appState.volume === "number" ? appState.volume : 1;
  volumeBar.value = v;
  audioPlayer.volume = v;
  if (appState.sidebarCollapsed) sidebar.classList.add("collapsed");

  renderLists(); // This will also call refreshActiveMarks
  // Memory Fix: Explicitly restore last opened items
  if (appState.lastOpenedText && TEXT_FILES.includes(appState.lastOpenedText)) {
    loadAndRenderMarkdown(appState.lastOpenedText);
  }
  if (
    appState.lastPlayedAudio &&
    AUDIO_FILES.includes(appState.lastPlayedAudio)
  ) {
    loadAudio(appState.lastPlayedAudio, false);
  }

  // UI transition
  loginOverlay.classList.remove("visible");
  appEl.classList.remove("loading"); // Login Flash Fix
  appEl.setAttribute("aria-hidden", "false");
  localStorage.setItem("studio_currentUser", name);
  scheduleStateSave();
}
logoutBtn.addEventListener("click", async () => {
  await saveStateToBackend();
  localStorage.removeItem("studio_currentUser");
  window.location.reload();
});
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = (usernameInput.value || "").trim();
  if (name) doLogin(name);
});
guestBtn.addEventListener("click", () =>
  doLogin(`guest_${Date.now().toString().slice(-6)}`)
);

function init() {
  const savedTheme = localStorage.getItem("studio_lastTheme");
  if (savedTheme) applyTheme(savedTheme, false);

  const savedUser = localStorage.getItem("studio_currentUser");
  if (savedUser) {
    // Has user, proceed to login (removes flash)
    doLogin(savedUser);
  } else {
    // No user, show login form
    loginOverlay.classList.add("visible");
    appEl.classList.remove("loading"); // Also remove loading for login view
  }
}

init();
