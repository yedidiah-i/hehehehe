/**
 * Master Application Controller
 * Coordinates UI, DOM elements, modals, settings, and game state transitions.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Elements
    const canvas = document.getElementById('gameCanvas');
    const hudCurrentPlayer = document.getElementById('hudCurrentPlayer');
    const hudUpNext = document.getElementById('hudUpNext');
    const hudTargetsLeft = document.getElementById('hudTargetsLeft');
    const hudSurvivalTime = document.getElementById('hudSurvivalTime');
    const hudDodgedCount = document.getElementById('hudDodgedCount');
    const hudSpeedBadge = document.getElementById('hudSpeedBadge');
    const hudRoundNum = document.getElementById('hudRoundNum');

    // Action buttons
    const btnSettings = document.getElementById('btnSettings');
    const btnHistory = document.getElementById('btnHistory');
    const btnSound = document.getElementById('btnSound');
    const btnPause = document.getElementById('btnPause');

    // Modals & Drawers
    const readyOverlay = document.getElementById('readyOverlay');
    const readyPlayerName = document.getElementById('readyPlayerName');
    const readyRoundNum = document.getElementById('readyRoundNum');
    const readyUpNext = document.getElementById('readyUpNext');
    const btnStartRound = document.getElementById('btnStartRound');

    const crashOverlay = document.getElementById('crashOverlay');
    const crashAnnouncement = document.getElementById('crashAnnouncement');
    const crashPlayerName = document.getElementById('crashPlayerName');
    const crashBrickName = document.getElementById('crashBrickName');
    const crashSurvivalTime = document.getElementById('crashSurvivalTime');
    const crashDodgedCount = document.getElementById('crashDodgedCount');
    const crashNextPlayerHint = document.getElementById('crashNextPlayerHint');
    const btnNextPlayerReady = document.getElementById('btnNextPlayerReady');

    const gameOverModal = document.getElementById('gameOverModal');
    const gameOverReason = document.getElementById('gameOverReason');
    const gameOverTableBody = document.getElementById('gameOverTableBody');
    const btnRematchSame = document.getElementById('btnRematchSame');
    const btnRematchShuffle = document.getElementById('btnRematchShuffle');
    const btnGameOverCopy = document.getElementById('btnGameOverCopy');
    const btnCloseGameOver = document.getElementById('btnCloseGameOver');

    const settingsModal = document.getElementById('settingsModal');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const historyDrawer = document.getElementById('historyDrawer');
    const btnCloseHistory = document.getElementById('btnCloseHistory');
    const historyList = document.getElementById('historyList');
    const btnExportHistory = document.getElementById('btnExportHistory');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const historyBadgeCount = document.getElementById('historyBadgeCount');

    // Settings Controls
    const speedSlider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValueDisplay');
    const speedRampToggle = document.getElementById('speedRampToggle');
    const densitySlider = document.getElementById('densitySlider');
    const densityValueDisplay = document.getElementById('densityValueDisplay');
    const presetSelect = document.getElementById('presetSelect');
    const soundToggleSetting = document.getElementById('soundToggleSetting');
    const volumeSlider = document.getElementById('volumeSlider');
    const controlModeSelect = document.getElementById('controlModeSelect');

    // List 1 (Players) Controls
    const inputPlayerName = document.getElementById('inputPlayerName');
    const btnAddPlayer = document.getElementById('btnAddPlayer');
    const textareaBulkPlayers = document.getElementById('textareaBulkPlayers');
    const btnBulkAddPlayers = document.getElementById('btnBulkAddPlayers');
    const btnShufflePlayers = document.getElementById('btnShufflePlayers');
    const btnClearPlayers = document.getElementById('btnClearPlayers');
    const playersListContainer = document.getElementById('playersListContainer');
    const playersCountBadge = document.getElementById('playersCountBadge');

    // List 2 (Targets) Controls
    const inputTargetName = document.getElementById('inputTargetName');
    const btnAddTarget = document.getElementById('btnAddTarget');
    const textareaBulkTargets = document.getElementById('textareaBulkTargets');
    const btnBulkAddTargets = document.getElementById('btnBulkAddTargets');
    const btnShuffleTargets = document.getElementById('btnShuffleTargets');
    const btnClearTargets = document.getElementById('btnClearTargets');
    const targetsListContainer = document.getElementById('targetsListContainer');
    const targetsCountBadge = document.getElementById('targetsCountBadge');
    const btnResetDefaults = document.getElementById('btnResetDefaults');

    // Toast notification
    const toast = document.getElementById('toast');

    function showToast(msg, duration = 2400) {
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, duration);
    }

    // 2. Initialize Game Engine
    const game = new GameEngine(canvas, {
        onCrash: (brickName, survivalTime, dodgedCount) => {
            handleCrashEvent(brickName, survivalTime, dodgedCount);
        },
        onStateChange: (state) => {
            handleStateChange(state);
        },
        onHudUpdate: (hudData) => {
            updateHUDStats(hudData);
        },
        onSpacePressed: () => {
            handleSpaceShortcut();
        }
    });

    // 3. UI State & Helpers
    function updateHUDOverview() {
        const currentPlayer = window.listManager.getCurrentPlayer();
        const upNextPlayer = window.listManager.getUpNextPlayer();
        const targetsLeft = window.listManager.targetBricksPool.length;
        const currentRound = window.listManager.currentRoundNumber;

        hudRoundNum.textContent = `Round ${currentRound}`;
        hudCurrentPlayer.textContent = currentPlayer ? currentPlayer.name : 'Queue Empty';
        hudUpNext.textContent = upNextPlayer ? upNextPlayer.name : (currentPlayer ? 'Last Player' : 'None');
        hudTargetsLeft.textContent = `${targetsLeft} left`;

        if (readyOverlay.classList.contains('active')) {
            const readyPlayer = window.listManager.getCurrentPlayer();
            const nextPlayer = window.listManager.getUpNextPlayer();
            readyPlayerName.textContent = readyPlayer ? readyPlayer.name : 'Queue Empty';
            readyUpNext.textContent = nextPlayer ? nextPlayer.name : 'No one — final turn';
            btnStartRound.disabled = !readyPlayer || targetsLeft === 0;
            btnStartRound.setAttribute('aria-disabled', String(btnStartRound.disabled));
        }

        const historyCount = window.listManager.matchesHistory.length;
        historyBadgeCount.textContent = historyCount;
        historyBadgeCount.style.display = historyCount > 0 ? 'inline-flex' : 'none';
    }

    function updateHUDStats(data) {
        hudSurvivalTime.textContent = `${data.survivalTime.toFixed(1)}s`;
        hudDodgedCount.textContent = data.dodgedCount;

        const baseLevel = game.settings.baseSpeedLevel;
        let speedText = `Spd ${baseLevel}`;
        if (game.settings.gradualSpeedRamp && data.rampMultiplier > 1.05) {
            speedText += ` (+${Math.round((data.rampMultiplier - 1) * 100)}%)`;
        }
        hudSpeedBadge.textContent = speedText;
    }

    function handleStateChange(state) {
        if (state === 'PAUSED') {
            btnPause.classList.add('active');
            btnPause.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume`;
        } else {
            btnPause.classList.remove('active');
            btnPause.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause`;
        }
    }

    function handleSpaceShortcut() {
        // If crash overlay is visible, proceed to next round
        if (crashOverlay.classList.contains('active')) {
            proceedToNextRound();
            return;
        }

        // If ready overlay is visible, start round
        if (readyOverlay.classList.contains('active')) {
            beginActiveRound();
            return;
        }

        // If game over modal is visible, rematch
        if (gameOverModal.classList.contains('active')) {
            rematchGame(false);
            return;
        }
    }

    // 4. Round & Turn Transitions
    function prepareNextTurn() {
        // Check if game has ended
        if (window.listManager.isGameOver()) {
            showGameOverModal();
            return;
        }

        const currentPlayer = window.listManager.getCurrentPlayer();
        const upNextPlayer = window.listManager.getUpNextPlayer();
        const currentRound = window.listManager.currentRoundNumber;

        readyRoundNum.textContent = `Round ${currentRound}`;
        readyPlayerName.textContent = currentPlayer.name;
        readyUpNext.textContent = upNextPlayer ? upNextPlayer.name : 'Final Player in Queue';

        readyOverlay.classList.add('active');
        crashOverlay.classList.remove('active');
        gameOverModal.classList.remove('active');

        updateHUDOverview();
    }

    function beginActiveRound() {
        readyOverlay.classList.remove('active');
        game.startRound();
        updateHUDOverview();
    }

    function handleCrashEvent(brickName, survivalTime, dodgedCount) {
        const activePlayer = window.listManager.getCurrentPlayer();
        const playerName = activePlayer ? activePlayer.name : 'Player';

        // 1. Advance queue & log match
        const match = window.listManager.recordMatchAndAdvance(brickName, survivalTime, dodgedCount);

        // 2. Populate Crash Overlay
        crashPlayerName.textContent = playerName;
        crashBrickName.textContent = brickName;
        crashAnnouncement.textContent = `${playerName} crashed into ${brickName}!`;
        crashSurvivalTime.textContent = `${survivalTime.toFixed(1)}s`;
        crashDodgedCount.textContent = dodgedCount;

        const nextPlayer = window.listManager.getCurrentPlayer();
        if (nextPlayer && window.listManager.targetBricksPool.length > 0) {
            crashNextPlayerHint.textContent = `Up Next: ${nextPlayer.name}`;
            btnNextPlayerReady.textContent = `Next Player Ready (${nextPlayer.name}) [Space]`;
        } else {
            crashNextPlayerHint.textContent = `Final match reached!`;
            btnNextPlayerReady.textContent = `View Elimination Results [Space]`;
        }

        crashOverlay.classList.add('active');

        // Update live HUD and lists
        updateHUDOverview();
        renderHistoryList();
        renderSettingsPlayers();
        renderSettingsTargets();
    }

    function proceedToNextRound() {
        crashOverlay.classList.remove('active');

        if (window.listManager.isGameOver()) {
            showGameOverModal();
        } else {
            prepareNextTurn();
        }
    }

    // 5. Game Over / Tournament Recap
    function showGameOverModal() {
        let reason = '';
        if (window.listManager.activePlayersQueue.length === 0 && window.listManager.targetBricksPool.length === 0) {
            reason = 'Both the Active Players Queue and Target Pool have been completely resolved!';
        } else if (window.listManager.activePlayersQueue.length === 0) {
            reason = 'All players in the Active Players Queue have completed their turns!';
        } else {
            reason = 'All target bricks in the pool have been hit and eliminated!';
        }
        gameOverReason.textContent = reason;

        // Render full summary table
        const matches = [...window.listManager.matchesHistory].reverse();
        gameOverTableBody.innerHTML = '';

        if (matches.length === 0) {
            gameOverTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No matches recorded.</td></tr>`;
        } else {
            // Find longest survivor
            let bestTime = -1;
            matches.forEach(m => {
                if (m.survivalTime > bestTime) bestTime = m.survivalTime;
            });

            matches.forEach(m => {
                const tr = document.createElement('tr');
                const isChampion = m.survivalTime === bestTime && bestTime > 0;
                tr.innerHTML = `
                    <td><strong>#${m.round}</strong></td>
                    <td class="player-cell">${escapeHtml(m.player)} ${isChampion ? '<span class="trophy-badge" title="Longest Survivor">👑</span>' : ''}</td>
                    <td class="target-cell">${escapeHtml(m.target)}</td>
                    <td>${m.survivalTime}s</td>
                    <td>${m.dodgedCount}</td>
                `;
                gameOverTableBody.appendChild(tr);
            });
        }

        gameOverModal.classList.add('active');
        crashOverlay.classList.remove('active');
        readyOverlay.classList.remove('active');
    }

    function rematchGame(shuffle = false) {
        window.listManager.rematch(shuffle);
        updateHUDOverview();
        renderHistoryList();
        renderSettingsPlayers();
        renderSettingsTargets();
        gameOverModal.classList.remove('active');
        showToast(shuffle ? 'Rematch initialized with shuffled rosters!' : 'Rematch initialized!');
        prepareNextTurn();
    }

    // 6. Settings & Modal Rendering
    function renderSettingsPlayers() {
        const queue = window.listManager.activePlayersQueue;
        playersCountBadge.textContent = `${queue.length} in queue`;
        playersListContainer.innerHTML = '';

        if (queue.length === 0) {
            playersListContainer.innerHTML = `<div class="empty-list-hint">Queue is empty. Add players above!</div>`;
            return;
        }

        queue.forEach((player, idx) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            if (idx === 0) item.classList.add('is-current');

            item.innerHTML = `
                <div class="list-item-meta">
                    <span class="item-order">${idx + 1}</span>
                    <span class="item-name">${escapeHtml(player.name)}</span>
                    ${idx === 0 ? '<span class="status-pill current">Current Turn</span>' : ''}
                    ${idx === 1 ? '<span class="status-pill next">Up Next</span>' : ''}
                </div>
                <div class="list-item-actions">
                    <button class="icon-btn-sm" title="Move Up" data-action="up" data-id="${player.id}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                    <button class="icon-btn-sm" title="Move Down" data-action="down" data-id="${player.id}" ${idx === queue.length - 1 ? 'disabled' : ''}>▼</button>
                    <button class="icon-btn-sm danger" title="Remove" data-action="delete" data-id="${player.id}">✕</button>
                </div>
            `;
            playersListContainer.appendChild(item);
        });
    }

    function renderSettingsTargets() {
        const pool = window.listManager.targetBricksPool;
        targetsCountBadge.textContent = `${pool.length} targets`;
        targetsListContainer.innerHTML = '';

        if (pool.length === 0) {
            targetsListContainer.innerHTML = `<div class="empty-list-hint">Target pool is empty. Add names above or select a preset!</div>`;
            return;
        }

        pool.forEach((target, idx) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-meta">
                    <span class="item-order dot">●</span>
                    <span class="item-name">${escapeHtml(target.name)}</span>
                </div>
                <div class="list-item-actions">
                    <button class="icon-btn-sm danger" title="Remove" data-action="delete" data-id="${target.id}">✕</button>
                </div>
            `;
            targetsListContainer.appendChild(item);
        });
    }

    function renderHistoryList() {
        const matches = window.listManager.matchesHistory; // newest first
        historyBadgeCount.textContent = matches.length;
        historyBadgeCount.style.display = matches.length > 0 ? 'inline-flex' : 'none';
        historyList.innerHTML = '';

        if (matches.length === 0) {
            historyList.innerHTML = `<div class="empty-list-hint">No matches recorded yet. Play a round!</div>`;
            return;
        }

        matches.forEach(m => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-card-header">
                    <span class="round-badge">Round ${m.round}</span>
                    <span class="time-stamp">${m.timestamp}</span>
                </div>
                <div class="history-card-match">
                    <span class="player-pill">${escapeHtml(m.player)}</span>
                    <span class="vs-crash">💥</span>
                    <span class="target-pill">${escapeHtml(m.target)}</span>
                </div>
                <div class="history-card-stats">
                    <span>⏱️ ${m.survivalTime}s</span>
                    <span>🧱 Dodged: ${m.dodgedCount}</span>
                </div>
            `;
            historyList.appendChild(card);
        });
    }

    // 7. Event Listeners for Lists & Settings
    // Players List Actions
    btnAddPlayer.addEventListener('click', () => {
        const name = inputPlayerName.value;
        if (window.listManager.addPlayer(name)) {
            inputPlayerName.value = '';
            renderSettingsPlayers();
            updateHUDOverview();
            showToast(`Added "${name}" to Active Queue`);
        }
    });

    inputPlayerName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAddPlayer.click();
    });

    btnBulkAddPlayers.addEventListener('click', () => {
        const count = window.listManager.bulkAddPlayers(textareaBulkPlayers.value);
        if (count > 0) {
            textareaBulkPlayers.value = '';
            renderSettingsPlayers();
            updateHUDOverview();
            showToast(`Bulk added ${count} players to queue`);
        }
    });

    btnShufflePlayers.addEventListener('click', () => {
        window.listManager.shufflePlayers();
        renderSettingsPlayers();
        updateHUDOverview();
        showToast('Active Queue shuffled!');
    });

    btnClearPlayers.addEventListener('click', () => {
        if (confirm('Clear all players in the queue?')) {
            window.listManager.clearPlayers();
            renderSettingsPlayers();
            updateHUDOverview();
            showToast('Player queue cleared');
        }
    });

    playersListContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');

        if (action === 'up') {
            window.listManager.movePlayer(id, -1);
        } else if (action === 'down') {
            window.listManager.movePlayer(id, 1);
        } else if (action === 'delete') {
            window.listManager.removePlayer(id);
        }
        renderSettingsPlayers();
        updateHUDOverview();
    });

    // Targets List Actions
    btnAddTarget.addEventListener('click', () => {
        const name = inputTargetName.value;
        if (window.listManager.addTarget(name)) {
            inputTargetName.value = '';
            renderSettingsTargets();
            updateHUDOverview();
            showToast(`Added "${name}" to Target Pool`);
        }
    });

    inputTargetName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAddTarget.click();
    });

    btnBulkAddTargets.addEventListener('click', () => {
        const count = window.listManager.bulkAddTargets(textareaBulkTargets.value);
        if (count > 0) {
            textareaBulkTargets.value = '';
            renderSettingsTargets();
            updateHUDOverview();
            showToast(`Bulk added ${count} targets to pool`);
        }
    });

    btnShuffleTargets.addEventListener('click', () => {
        window.listManager.shuffleTargets();
        renderSettingsTargets();
        updateHUDOverview();
        showToast('Target Pool shuffled!');
    });

    btnClearTargets.addEventListener('click', () => {
        if (confirm('Clear all names from Target Pool?')) {
            window.listManager.clearTargets();
            renderSettingsTargets();
            updateHUDOverview();
            showToast('Target pool cleared');
        }
    });

    targetsListContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');

        if (action === 'delete') {
            window.listManager.removeTarget(id);
            renderSettingsTargets();
            updateHUDOverview();
        }
    });

    // Presets & Defaults
    presetSelect.addEventListener('change', (e) => {
        const presetKey = e.target.value;
        window.listManager.loadPreset(presetKey);
        renderSettingsPlayers();
        renderSettingsTargets();
        updateHUDOverview();
        showToast(`Loaded "${PRESETS[presetKey]?.name || presetKey}" preset!`);
    });

    btnResetDefaults.addEventListener('click', () => {
        window.listManager.loadPreset('party');
        presetSelect.value = 'party';
        renderSettingsPlayers();
        renderSettingsTargets();
        updateHUDOverview();
        showToast('Reset rosters to default party preset!');
    });

    // Speed & Density Sliders
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        game.updateSettings({ baseSpeedLevel: val });
        const labels = {
            1: "1 (Normal - 180 px/s)",
            2: "2 (Brisk - 240 px/s)",
            3: "3 (Swift - 320 px/s)",
            4: "4 (Fast - 420 px/s)",
            5: "5 (Rapid - 530 px/s)",
            6: "6 (High Velocity - 660 px/s)",
            7: "7 (Very Fast - 820 px/s)",
            8: "8 (Blazing - 1010 px/s)",
            9: "9 (Hyper - 1220 px/s)",
            10: "10 (INSANE! - 1460 px/s)"
        };
        speedValueDisplay.textContent = labels[val] || `${val}`;
    });

    speedRampToggle.addEventListener('change', (e) => {
        game.updateSettings({ gradualSpeedRamp: e.target.checked });
        showToast(e.target.checked ? 'Gradual Speed Ramp enabled!' : 'Speed Ramp disabled');
    });

    densitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        game.updateSettings({ brickDensity: val });
        densityValueDisplay.textContent = `${val} Bricks`;
    });

    controlModeSelect.addEventListener('change', (e) => {
        game.updateSettings({ controlMode: e.target.value });
    });

    // Audio Controls
    const updateSoundUI = () => {
        const muted = window.soundEngine.muted;
        btnSound.innerHTML = muted
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        soundToggleSetting.checked = !muted;
    };

    btnSound.addEventListener('click', () => {
        window.soundEngine.setMuted(!window.soundEngine.muted);
        updateSoundUI();
        window.soundEngine.playClick();
    });

    soundToggleSetting.addEventListener('change', (e) => {
        window.soundEngine.setMuted(!e.target.checked);
        updateSoundUI();
    });

    volumeSlider.addEventListener('input', (e) => {
        window.soundEngine.setVolume(parseFloat(e.target.value));
    });

    // Pause button
    btnPause.addEventListener('click', () => {
        game.togglePause();
    });

    // Next Player Ready / Start buttons
    btnStartRound.addEventListener('click', () => {
        beginActiveRound();
    });

    btnNextPlayerReady.addEventListener('click', () => {
        proceedToNextRound();
    });

    // History Sidebar
    btnHistory.addEventListener('click', () => {
        historyDrawer.classList.toggle('active');
        renderHistoryList();
    });

    btnCloseHistory.addEventListener('click', () => {
        historyDrawer.classList.remove('active');
    });

    btnExportHistory.addEventListener('click', () => {
        const text = window.listManager.exportFormattedText();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Match results copied to clipboard!');
        }).catch(() => {
            showToast('Export ready (check console)');
            console.log(text);
        });
    });

    btnClearHistory.addEventListener('click', () => {
        if (confirm('Clear match history log?')) {
            window.listManager.clearHistory();
            renderHistoryList();
            updateHUDOverview();
            showToast('History cleared');
        }
    });

    // Game Over Rematch buttons
    btnRematchSame.addEventListener('click', () => {
        rematchGame(false);
    });

    btnRematchShuffle.addEventListener('click', () => {
        rematchGame(true);
    });

    btnGameOverCopy.addEventListener('click', () => {
        const text = window.listManager.exportFormattedText();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Tournament recap copied to clipboard!');
        });
    });

    btnCloseGameOver.addEventListener('click', () => {
        gameOverModal.classList.remove('active');
    });

    // Settings Modal
    btnSettings.addEventListener('click', () => {
        renderSettingsPlayers();
        renderSettingsTargets();
        settingsModal.classList.add('active');
    });

    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        updateHUDOverview();
    });

    // Close modals on overlay backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.classList.remove('active');
                updateHUDOverview();
            }
        });
    });

    // Helper: Escape HTML string
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 8. Start Game Engine Loop & Show First Round Ready
    game.start();
    updateHUDOverview();
    renderSettingsPlayers();
    renderSettingsTargets();
    renderHistoryList();
    prepareNextTurn();
});
