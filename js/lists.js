/**
 * Dual Lists & Match History Manager
 * Manages Active Players Queue, Target Bricks Pool, Presets, and LocalStorage persistence.
 */

const PRESETS = {
    party: {
        name: "Party Crew",
        players: ["Alex Turner", "Sam Rivera", "Jordan Lee", "Taylor Swift", "Morgan Reed", "Casey Parker", "Riley Chen", "Jamie Fox"],
        targets: ["David K.", "Sarah M.", "Michael B.", "Emma Stone", "Lucas Scott", "Olivia Wilde", "Ethan Hunt", "Chloe Price", "Noah C.", "Sophia Loren", "James Bond", "Mia Wallace"]
    },
    tech: {
        name: "Tech & Pioneers",
        players: ["Dev Lead", "Frontend Ninja", "Backend Guru", "QA Tester", "Product Owner", "Scrum Master", "DevOps Eng", "UI Designer"],
        targets: ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Tim Berners-Lee", "Claude Shannon", "Margaret Hamilton", "Linus Torvalds", "Steve Wozniak", "Guido van Rossum", "Dennis Ritchie"]
    },
    villains: {
        name: "Movie Villains",
        players: ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6", "Player 7", "Player 8"],
        targets: ["Darth Vader", "Lord Voldemort", "Thanos", "Sauron", "The Joker", "Bowser", "Green Goblin", "Agent Smith", "Hans Gruber", "Magneto", "Sephiroth", "Megatron"]
    },
    office: {
        name: "Office Chaos",
        players: ["Intern Kevin", "Manager Bob", "Lead Dev Sarah", "HR Pam", "Sales Guy Jim", "Accountant Angela", "Support Toby", "CEO Dwight"],
        targets: ["The Micromanager", "Reply-All Sender", "Coffee Thief", "Friday 5PM Deploy", "Broken Printer", "Meeting That Could Be An Email", "Broken AC Unit", "Expired Milk in Fridge", "Slack Outage"]
    }
};

class ListManager {
    constructor() {
        this.activePlayersQueue = [];
        this.targetBricksPool = [];
        this.matchesHistory = [];
        this.currentRoundNumber = 1;
        this.initialRosterSnapshot = null;
        this.tournamentWinner = null;
        this.wonTargets = [];

        this.STORAGE_KEY = 'arcade_dodge_lists_v1';
        this.loadFromStorage();
    }

    createId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Load state from localStorage or populate default preset
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.activePlayersQueue) && Array.isArray(parsed.targetBricksPool)) {
                    this.activePlayersQueue = parsed.activePlayersQueue;
                    this.targetBricksPool = parsed.targetBricksPool;
                    this.matchesHistory = Array.isArray(parsed.matchesHistory) ? parsed.matchesHistory : [];
                    this.currentRoundNumber = parsed.currentRoundNumber || 1;
                    this.initialRosterSnapshot = parsed.initialRosterSnapshot || null;
                    this.tournamentWinner = parsed.tournamentWinner || null;
                    this.wonTargets = Array.isArray(parsed.wonTargets) ? parsed.wonTargets : [];
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load lists from localStorage', e);
        }

        // Default initial setup
        this.loadPreset('party');
    }

    saveToStorage() {
        try {
            const data = {
                activePlayersQueue: this.activePlayersQueue,
                targetBricksPool: this.targetBricksPool,
                matchesHistory: this.matchesHistory,
                currentRoundNumber: this.currentRoundNumber,
                initialRosterSnapshot: this.initialRosterSnapshot,
                tournamentWinner: this.tournamentWinner,
                wonTargets: this.wonTargets
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage', e);
        }
    }

    loadPreset(presetKey = 'party') {
        const preset = PRESETS[presetKey] || PRESETS.party;
        this.activePlayersQueue = preset.players.map(name => ({ id: this.createId(), name: name.trim() }));
        this.targetBricksPool = preset.targets.map(name => ({ id: this.createId(), name: name.trim() }));
        this.tournamentWinner = null;
        this.wonTargets = [];
        this.snapshotInitialRoster();
        this.saveToStorage();
    }

    snapshotInitialRoster() {
        this.initialRosterSnapshot = {
            players: this.activePlayersQueue.map(p => p.name),
            targets: this.targetBricksPool.map(t => t.name)
        };
        this.saveToStorage();
    }

    syncRosterSnapshot() {
        this.initialRosterSnapshot = {
            players: this.activePlayersQueue.map(player => player.name),
            targets: this.targetBricksPool.map(target => target.name)
        };
    }

    // ==========================================
    // Active Players Queue Methods
    // ==========================================

    getCurrentPlayer() {
        return this.activePlayersQueue.length > 0 ? this.activePlayersQueue[0] : null;
    }

    getUpNextPlayer() {
        return this.activePlayersQueue.length > 1 ? this.activePlayersQueue[1] : null;
    }

    addPlayer(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;
        const player = { id: this.createId(), name: trimmed };
        this.activePlayersQueue.push(player);
        this.syncRosterSnapshot();
        this.saveToStorage();
        return player;
    }

    bulkAddPlayers(rawText) {
        if (!rawText) return 0;
        const names = rawText.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
        names.forEach(name => {
            this.activePlayersQueue.push({ id: this.createId(), name });
        });
        this.syncRosterSnapshot();
        this.saveToStorage();
        return names.length;
    }

    renamePlayer(id, name) {
        const trimmed = (name || '').trim();
        const player = this.activePlayersQueue.find(entry => entry.id === id);
        if (!player || !trimmed) return false;
        player.name = trimmed;
        this.syncRosterSnapshot();
        this.saveToStorage();
        return true;
    }

    removePlayer(id) {
        const idx = this.activePlayersQueue.findIndex(p => p.id === id);
        if (idx !== -1) {
            this.activePlayersQueue.splice(idx, 1);
            this.syncRosterSnapshot();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    movePlayer(id, direction) {
        const idx = this.activePlayersQueue.findIndex(p => p.id === id);
        if (idx === -1) return false;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= this.activePlayersQueue.length) return false;

        const temp = this.activePlayersQueue[idx];
        this.activePlayersQueue[idx] = this.activePlayersQueue[targetIdx];
        this.activePlayersQueue[targetIdx] = temp;
        this.syncRosterSnapshot();
        this.saveToStorage();
        return true;
    }

    shufflePlayers() {
        for (let i = this.activePlayersQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.activePlayersQueue[i], this.activePlayersQueue[j]] = [this.activePlayersQueue[j], this.activePlayersQueue[i]];
        }
        this.syncRosterSnapshot();
        this.saveToStorage();
    }

    clearPlayers() {
        this.activePlayersQueue = [];
        this.syncRosterSnapshot();
        this.saveToStorage();
    }

    // ==========================================
    // Target Bricks Pool Methods
    // ==========================================

    addTarget(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;
        const target = { id: this.createId(), name: trimmed };
        this.targetBricksPool.push(target);
        this.syncRosterSnapshot();
        this.saveToStorage();
        return target;
    }

    bulkAddTargets(rawText) {
        if (!rawText) return 0;
        const names = rawText.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
        names.forEach(name => {
            this.targetBricksPool.push({ id: this.createId(), name });
        });
        this.syncRosterSnapshot();
        this.saveToStorage();
        return names.length;
    }

    renameTarget(id, name) {
        const trimmed = (name || '').trim();
        const target = this.targetBricksPool.find(entry => entry.id === id);
        if (!target || !trimmed) return false;
        target.name = trimmed;
        this.syncRosterSnapshot();
        this.saveToStorage();
        return true;
    }

    removeTarget(id) {
        const idx = this.targetBricksPool.findIndex(t => t.id === id);
        if (idx !== -1) {
            this.targetBricksPool.splice(idx, 1);
            this.syncRosterSnapshot();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Remove target by name upon collision
     */
    removeTargetByName(name) {
        const trimmed = (name || '').trim().toLowerCase();
        const idx = this.targetBricksPool.findIndex(t => t.name.trim().toLowerCase() === trimmed);
        if (idx !== -1) {
            const removed = this.targetBricksPool.splice(idx, 1)[0];
            this.saveToStorage();
            return removed;
        }
        return null;
    }

    shuffleTargets() {
        for (let i = this.targetBricksPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.targetBricksPool[i], this.targetBricksPool[j]] = [this.targetBricksPool[j], this.targetBricksPool[i]];
        }
        this.syncRosterSnapshot();
        this.saveToStorage();
    }

    clearTargets() {
        this.targetBricksPool = [];
        this.syncRosterSnapshot();
        this.saveToStorage();
    }

    // ==========================================
    // Match & Turn Advancement
    // ==========================================

    /**
     * Completes current turn: logs match, removes brick name from target pool, advances queue.
     */
    recordMatchAndAdvance(brickName, survivalTime, dodgedCount) {
        const activePlayer = this.getCurrentPlayer();
        if (!activePlayer) return null;

        // 1. Permanently remove brick name from target pool
        this.removeTargetByName(brickName);

        // 2. Remove active player from head of the queue
        const completedPlayer = this.activePlayersQueue.shift();

        // 3. Record in match history
        const matchRecord = {
            round: this.currentRoundNumber,
            player: completedPlayer.name,
            target: brickName,
            survivalTime: Number(survivalTime.toFixed(1)),
            dodgedCount: dodgedCount,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        this.matchesHistory.unshift(matchRecord); // newest first
        this.currentRoundNumber++;
        this.resolveLastPlayerVictory();
        this.saveToStorage();

        return matchRecord;
    }

    clearHistory() {
        this.matchesHistory = [];
        this.currentRoundNumber = 1;
        this.saveToStorage();
    }

    /**
     * Restores tournament from snapshot or presets for a quick rematch
     */
    rematch(shuffle = false) {
        if (this.initialRosterSnapshot && this.initialRosterSnapshot.players.length && this.initialRosterSnapshot.targets.length) {
            this.activePlayersQueue = this.initialRosterSnapshot.players.map(name => ({ id: this.createId(), name }));
            this.targetBricksPool = this.initialRosterSnapshot.targets.map(name => ({ id: this.createId(), name }));
        } else {
            this.loadPreset('party');
        }

        if (shuffle) {
            this.shufflePlayers();
            this.shuffleTargets();
        }
        this.tournamentWinner = null;
        this.wonTargets = [];
        this.clearHistory();
    }

    resolveLastPlayerVictory() {
        if (this.activePlayersQueue.length !== 1 || this.targetBricksPool.length === 0) return false;

        this.tournamentWinner = this.activePlayersQueue[0].name;
        this.wonTargets = this.targetBricksPool.map(target => target.name);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const victoryRecords = this.wonTargets.map(target => ({
            round: this.currentRoundNumber,
            player: this.tournamentWinner,
            target,
            survivalTime: null,
            dodgedCount: null,
            timestamp,
            outcome: 'last-player-win'
        }));
        this.matchesHistory.unshift(...victoryRecords);
        this.targetBricksPool = [];
        this.saveToStorage();
        return true;
    }

    /**
     * Checks if tournament is complete
     */
    isGameOver() {
        return this.activePlayersQueue.length === 0 || this.targetBricksPool.length === 0;
    }

    /**
     * Formats match history for clipboard export
     */
    exportFormattedText() {
        if (this.matchesHistory.length === 0) return "No matches recorded yet.";

        let text = `🎮 ARCADE DODGE: ELIMINATION MATCH RESULTS\n`;
        text += `==========================================\n\n`;
        // Chronological order (reverse of newest-first)
        const chronological = [...this.matchesHistory].reverse();
        chronological.forEach(m => {
            if (m.outcome === 'last-player-win') {
                text += `Round ${m.round}: ${m.player} crashed into ${m.target} (last-player victory)\n`;
            } else {
                text += `Round ${m.round}: ${m.player} crashed into ${m.target} (Survived ${m.survivalTime}s, Dodged ${m.dodgedCount} bricks)\n`;
            }
        });
        text += `\nTotal Rounds: ${chronological.length}\n`;
        if (this.tournamentWinner) {
            text += `Winner: ${this.tournamentWinner}\n`;
            text += `Remaining targets won: ${this.wonTargets.join(', ')}\n`;
        }
        return text;
    }

    exportCsv() {
        let csv = "Round,Player,Target Eliminated,Result / Survival Time,Bricks Dodged,Time\n";
        const chronological = [...this.matchesHistory].reverse();
        chronological.forEach(m => {
            const status = m.outcome === 'last-player-win' ? 'Won as last player' : `${m.survivalTime}s`;
            csv += `"${m.round}","${m.player.replace(/"/g, '""')}","${m.target.replace(/"/g, '""')}","${status}",${m.dodgedCount ?? ''},"${m.timestamp}"\n`;
        });
        return csv;
    }
}

window.listManager = new ListManager();
