// ===================================================================
// --- ⚙️ 配置区 (请务必修改这里的配置) ---
// ===================================================================

// 1. 替换成你部署成功后得到的 Worker 的 URL
const WORKER_URL = "https://progress-sync-worker.yimingwong666.workers.dev";

// 2. 在这里列出你 `assets` 文件夹中的所有音频和文稿文件名
//    !!! 确保音频文件的扩展名是 .opus !!!
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
    "58.毗缽舍那 Insight (14).opus"
];

const TEXT_FILES = [
    "覺燈日光(一).md",
    "覺燈日光(二).md",
    "覺燈日光(三).md"
];

// ===================================================================
// --- 应用逻辑 (以下代码无需修改) ---
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const contentViewer = document.getElementById('content-viewer');
    // ... (All other DOM elements are the same as before)
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username-input');
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const rewindBtn = document.getElementById('rewind-btn');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeBar = document.getElementById('volume-bar');
    const currentTrackTitle = document.getElementById('current-track-title');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const audioList = document.getElementById('audio-list');
    const textList = document.getElementById('text-list');
    const markdownContent = document.getElementById('markdown-content');

    // --- State Management ---
    let appState = {
        currentUser: null,
        lastTheme: 'dark',
        lastPlayedAudio: null,
        lastOpenedText: null,
        progressData: {}, // { 'filename.opus': 123.45, ... }
        scrollPositions: {}, // { 'filename.md': 0.5, ... } (percentage)
        volume: 1,
        sidebarCollapsed: false,
    };
    let saveStateTimeout;
    let scrollSaveTimeout;

    // --- Initialization & Theme ---
    function applyTheme(theme) {
        if (theme === 'light') {
            body.classList.add('light-theme');
            themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        } else {
            body.classList.remove('light-theme');
            themeToggleBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
        }
        appState.lastTheme = theme;
    }

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('light-theme') ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('studio_lastTheme', newTheme); // Save locally for instant load
        scheduleStateSave();
    });

    // --- Login & State Loading ---
    function init() {
        const localTheme = localStorage.getItem('studio_lastTheme');
        if (localTheme) applyTheme(localTheme);

        const savedUser = localStorage.getItem('studio_currentUser');
        if (savedUser) {
            appState.currentUser = savedUser;
            loginOverlay.classList.remove('visible');
            loadInitialState();
        } else {
            loginOverlay.classList.add('visible');
        }
    }

    // ... (Login form and logout logic are the same)
    
    async function loadInitialState() {
        if (!appState.currentUser) return;
        usernameDisplay.textContent = appState.currentUser;
        try {
            const response = await fetch(`${WORKER_URL}/get/${encodeURIComponent(appState.currentUser)}`);
            if (response.ok) {
                const savedState = await response.json();
                if (savedState && Object.keys(savedState).length > 0) {
                     Object.assign(appState, savedState);
                }
                console.log('State loaded from backend:', appState);
            }
        } catch (error) { console.error('Failed to load state:', error); }
        finally {
            applyTheme(appState.lastTheme || 'dark');
            renderUI();
        }
    }

    // --- UI Rendering ---
    // ... (renderLists, updateActiveItems functions are the same)

    function applyInitialState() {
        // ... (Logic for applying sidebar, audio, text state is the same)
        // The key change is that loadAndRenderMarkdown and loadAudio will handle restoring positions
        if (appState.lastOpenedText && TEXT_FILES.includes(appState.lastOpenedText)) {
            loadAndRenderMarkdown(appState.lastOpenedText);
        }
        if (appState.lastPlayedAudio && AUDIO_FILES.includes(appState.lastPlayedAudio)) {
            loadAudio(appState.lastPlayedAudio, false);
        }
    }

    // --- Core Logic with Bug Fixes ---
    async function loadAndRenderMarkdown(fileName) {
        appState.lastOpenedText = fileName;
        // ... (Fetch and render logic is the same)
        try {
            const response = await fetch(`./assets/${fileName}`);
            if (!response.ok) throw new Error(`File not found: ${fileName}`);
            const mdText = await response.text();
            markdownContent.innerHTML = marked.parse(mdText);

            // --- FEATURE: Restore scroll position ---
            const savedScroll = appState.scrollPositions[fileName] || 0;
            if (savedScroll > 0) {
                contentViewer.scrollTop = savedScroll * contentViewer.scrollHeight;
            } else {
                contentViewer.scrollTop = 0; // Scroll to top for new files
            }
        } catch (error) {
            markdownContent.innerHTML = `<p style="color: red;">Error loading content: ${error.message}</p>`;
        }
        updateActiveItems();
        scheduleStateSave();
    }
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        // --- BUG FIX: Only update duration when it's a valid number ---
        if (isFinite(audioPlayer.duration)) {
            progressBar.max = audioPlayer.duration;
            durationEl.textContent = formatTime(audioPlayer.duration);
        }
        const savedTime = appState.progressData[appState.lastPlayedAudio] || 0;
        if (savedTime > 0) {
            audioPlayer.currentTime = savedTime;
        }
    });

    // --- State Saving with Fixes ---
    async function saveStateToBackend() {
        if (!appState.currentUser) return;
        console.log('Saving state to backend via fetch...', appState);
        try {
            await fetch(`${WORKER_URL}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: appState.currentUser, state: appState }),
                keepalive: true, // Important for background requests
            });
        } catch (error) { console.error('Failed to save state via fetch:', error); }
    }
    
    // --- FEATURE: Save scroll position ---
    contentViewer.addEventListener('scroll', () => {
        if (!appState.lastOpenedText) return;
        clearTimeout(scrollSaveTimeout);
        scrollSaveTimeout = setTimeout(() => {
            const scrollPercent = contentViewer.scrollTop / contentViewer.scrollHeight;
            appState.scrollPositions[appState.lastOpenedText] = scrollPercent;
            scheduleStateSave();
        }, 500); // Debounce scroll saving
    });

    // --- BUG FIX: Reliable save on page close ---
    window.addEventListener('beforeunload', (event) => {
        if (appState.currentUser) {
            // Use sendBeacon for reliable background sending
            const data = new Blob([JSON.stringify({ userId: appState.currentUser, state: appState })], { type: 'application/json' });
            navigator.sendBeacon(`${WORKER_URL}/save`, data);
        }
    });

    // ... (All other functions and event listeners remain the same)
    // ... init(); at the end
    
    // Placeholder functions to avoid errors if you copy only this part
    function renderLists() {
        audioList.innerHTML = AUDIO_FILES.map(f => `<li class="audio-item" data-src="${f}">${f}</li>`).join('');
        textList.innerHTML = TEXT_FILES.map(f => `<li class="text-item" data-src="${f}">${f}</li>`).join('');
        addListEventListeners();
    }
    function updateActiveItems() {
        document.querySelectorAll('.audio-item').forEach(item => item.classList.toggle('active', item.dataset.src === appState.lastPlayedAudio));
        document.querySelectorAll('.text-item').forEach(item => item.classList.toggle('active', item.dataset.src === appState.lastOpenedText));
    }
    function loadAudio(fileName, shouldPlay = true) {
        appState.lastPlayedAudio = fileName;
        audioPlayer.src = `./assets/${fileName}`;
        currentTrackTitle.textContent = fileName;
        durationEl.textContent = '00:00'; // Reset duration on new file
        updateActiveItems();
        if (shouldPlay) audioPlayer.play().catch(e => {});
    }
    function formatTime(seconds) { return new Date(seconds * 1000).toISOString().substr(14, 5); }
    function addListEventListeners() {
        audioList.addEventListener('click', (e) => e.target.closest('.audio-item') && loadAudio(e.target.closest('.audio-item').dataset.src));
        textList.addEventListener('click', (e) => e.target.closest('.text-item') && loadAndRenderMarkdown(e.target.closest('.text-item').dataset.src));
    }
    playPauseBtn.addEventListener('click', () => { if (audioPlayer.paused && audioPlayer.src) audioPlayer.play(); else audioPlayer.pause(); });
    audioPlayer.addEventListener('play', () => playPauseBtn.querySelector('i').classList.replace('fa-play', 'fa-pause'));
    audioPlayer.addEventListener('pause', () => { playPauseBtn.querySelector('i').classList.replace('fa-pause', 'fa-play'); scheduleStateSave(); });
    rewindBtn.addEventListener('click', () => { audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10); });
    forwardBtn.addEventListener('click', () => { audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10); });
    const playTrackByIndex = (offset) => { if (!appState.lastPlayedAudio) return; const currentIndex = AUDIO_FILES.indexOf(appState.lastPlayedAudio); if (currentIndex === -1) return; let nextIndex = (currentIndex + offset + AUDIO_FILES.length) % AUDIO_FILES.length; loadAudio(AUDIO_FILES[nextIndex]); };
    nextBtn.addEventListener('click', () => playTrackByIndex(1));
    prevBtn.addEventListener('click', () => playTrackByIndex(-1));
    audioPlayer.addEventListener('ended', () => playTrackByIndex(1));
    audioPlayer.addEventListener('timeupdate', () => { if (!isFinite(audioPlayer.duration)) return; progressBar.value = audioPlayer.currentTime; currentTimeEl.textContent = formatTime(audioPlayer.currentTime); if(appState.lastPlayedAudio) { appState.progressData[appState.lastPlayedAudio] = audioPlayer.currentTime; scheduleStateSave(); } });
    progressBar.addEventListener('input', () => { audioPlayer.currentTime = progressBar.value; });
    volumeBar.addEventListener('input', () => { audioPlayer.volume = volumeBar.value; appState.volume = Number(volumeBar.value); scheduleStateSave(); });
    sidebarToggle.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); appState.sidebarCollapsed = sidebar.classList.contains('collapsed'); const icon = sidebarToggle.querySelector('i'); icon.classList.toggle('fa-chevron-right', appState.sidebarCollapsed); icon.classList.toggle('fa-chevron-left', !appState.sidebarCollapsed); scheduleStateSave(); });

    init();
});