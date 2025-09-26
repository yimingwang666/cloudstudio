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

// ---------- 全局元素 ----------
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

// ---------- 应用状态 ----------
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

// 防抖与节流句柄
let saveTimeout = null,
  scrollTimeout = null,
  progressSaveThrottle = null;

// ----------------- 辅助函数 -----------------
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

// ----------------- 渲染与交互 -----------------
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

// ----------------- 核心播放逻辑 -----------------
let durationCheckInterval = null;

function loadAudio(fileName, shouldPlay = true) {
  appState.lastPlayedAudio = fileName;
  audioPlayer.src = `./assets/${fileName}`;
  currentTrackTitle.textContent = fileName;

  // 乐观更新 UI
  progressBar.value = 0;
  progressBar.max = 1;
  currentTimeEl.textContent = "00:00";
  durationEl.textContent = "--:--";

  refreshActiveMarks();
  audioPlayer.volume = appState.volume ?? 1;

  // 清除上一个文件的轮询定时器
  if (durationCheckInterval) clearInterval(durationCheckInterval);

  if (shouldPlay) {
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Playback prevented:", error);
        playPauseBtn
          .querySelector("i")
          .classList.replace("fa-pause", "fa-play");
      });
    }
  }

  // 立即尝试恢复进度
  const savedTime =
    (appState.progressData && appState.progressData[fileName]) || 0;
  if (savedTime > 0) {
    audioPlayer.currentTime = savedTime;
  }

  scheduleStateSave(400);
}

// 当播放开始时（无论元数据是否加载），启动我们的主动轮询检查
audioPlayer.addEventListener("playing", () => {
  // 清除旧的定时器以防万一
  if (durationCheckInterval) clearInterval(durationCheckInterval);

  // 启动一个新的定时器，每 250 毫秒检查一次总时长
  durationCheckInterval = setInterval(() => {
    // 检查 audioPlayer.duration 是否已经是一个有效的、大于0的数字
    if (isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
      // 成功获取！
      const duration = Math.floor(audioPlayer.duration);
      progressBar.max = duration;
      durationEl.textContent = formatTime(duration);

      // 任务完成，清除定时器，避免不必要的资源消耗
      clearInterval(durationCheckInterval);
      durationCheckInterval = null;
    }
  }, 250); // 每秒检查4次
});

// 当音频暂停、结束或出错时，停止轮询
audioPlayer.addEventListener("pause", () => {
  if (durationCheckInterval) clearInterval(durationCheckInterval);
});
audioPlayer.addEventListener("ended", () => {
  if (durationCheckInterval) clearInterval(durationCheckInterval);
});
audioPlayer.addEventListener("error", () => {
  if (durationCheckInterval) clearInterval(durationCheckInterval);
});

// 当播放时间更新时（每秒多次）触发
audioPlayer.addEventListener("timeupdate", () => {
  const currentTime = audioPlayer.currentTime;

  if (isFinite(currentTime)) {
    currentTimeEl.textContent = formatTime(currentTime);
    progressBar.value = Math.floor(currentTime);
  }

  // 节流保存播放进度 (这段逻辑是正确的，保持不变)
  if (!progressSaveThrottle || Date.now() - progressSaveThrottle > 2000) {
    progressSaveThrottle = Date.now();
    if (appState.lastPlayedAudio && isFinite(currentTime) && currentTime > 0) {
      appState.progressData[appState.lastPlayedAudio] = currentTime;
      scheduleStateSave();
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

// ----------------- 登录/注销/初始化（修复版） -----------------
async function doLogin(name) {
  appState.currentUser = name;
  usernameDisplay.textContent = name;
  const savedState = await loadStateFromBackend(name);
  // 仅在后端有返回时合并，防止把 undefined 覆盖掉
  if (savedState && typeof savedState === "object") {
    Object.assign(appState, savedState);
  }

  // Apply UI based on loaded state
  applyTheme(appState.lastTheme || "dark", false);
  const v = typeof appState.volume === "number" ? appState.volume : 1;
  volumeBar.value = v;
  audioPlayer.volume = v;
  if (appState.sidebarCollapsed) sidebar.classList.add("collapsed");

  renderLists(); // This will also call refreshActiveMarks
  // Explicitly restore last opened items
  if (appState.lastOpenedText && TEXT_FILES.includes(appState.lastOpenedText)) {
    loadAndRenderMarkdown(appState.lastOpenedText);
  }
  if (
    appState.lastPlayedAudio &&
    AUDIO_FILES.includes(appState.lastPlayedAudio)
  ) {
    loadAudio(appState.lastPlayedAudio, false);
  }

  // UI transition: 隐藏登录界面并确保主界面可见
  loginOverlay.classList.remove("visible");
  loginOverlay.style.display = "none";
  appEl.classList.remove("loading");
  appEl.setAttribute("aria-hidden", "false");

  localStorage.setItem("studio_currentUser", name);
  scheduleStateSave();
}

function doLogoutUIOnly() {
  // 不强制保存（调用者可在需要时先调用 save），然后重置 UI 到登录态
  appState.currentUser = null;
  loginOverlay.classList.add("visible");
  loginOverlay.style.display = "flex";
  appEl.classList.add("loading");
  appEl.setAttribute("aria-hidden", "true");
  usernameDisplay.textContent = "";
}

// 绑定 logout：先尝试保存，再重置 UI（与你的原逻辑兼容）
logoutBtn.addEventListener("click", async () => {
  await saveStateToBackend();
  localStorage.removeItem("studio_currentUser");
  // 刷新页面也可以，但为了更流畅我们直接切回登录视图
  doLogoutUIOnly();
});

// 确保只有一个登录 submit 监听（避免重复）
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = (usernameInput.value || "").trim();
  if (name) doLogin(name);
});

// 访客按钮
guestBtn.addEventListener("click", () =>
  doLogin(`guest_${Date.now().toString().slice(-6)}`)
);

// ----------------- init（只在这里处理一次初始化） -----------------
function init() {
  const savedTheme = localStorage.getItem("studio_lastTheme");
  if (savedTheme) applyTheme(savedTheme, false);

  const savedUser = localStorage.getItem("studio_currentUser");
  if (savedUser) {
    // 如果有已登录用户，直接恢复并隐藏登录界面（避免闪烁）
    doLogin(savedUser);
  } else {
    // 否则显示登录界面
    loginOverlay.classList.add("visible");
    loginOverlay.style.display = "flex";
    appEl.classList.remove("loading"); // 使顶部/主界面元素渲染（但会被 overlay 遮盖）
    appEl.setAttribute("aria-hidden", "true");
  }
}

init();
