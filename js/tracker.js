const Tracker = {
    logs: [],
    unsubscribe: null,
    activeTimer: null,
    timerInterval: null,

    init() {
        this.bindEvents();
        this.resumeTimer();
        this.unsubscribe = DB.onSnapshot('tracker', 'time', 'desc', (logs) => {
            this.logs = logs;
            this.updateDashboard();
            this.renderSummary();
            this.renderHistory();
        });
    },

    bindEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'diaper') {
                    document.getElementById('diaper-time').value = getNowLocal();
                    document.getElementById('diaper-modal').classList.remove('hidden');
                } else if (this.activeTimer && this.activeTimer.category === action) {
                    this.stopTimer();
                } else {
                    this.startTimer(action);
                }
            });
        });

        document.getElementById('manual-entry-link').addEventListener('click', (e) => {
            e.preventDefault();
            const action = prompt('Which type? (feed / sleep)');
            if (action === 'feed') {
                document.getElementById('feed-time').value = getNowLocal();
                document.getElementById('feed-modal').classList.remove('hidden');
            } else if (action === 'sleep') {
                document.getElementById('sleep-start').value = getNowLocal();
                document.getElementById('sleep-modal').classList.remove('hidden');
            }
        });

        document.querySelectorAll('[data-feed-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-feed-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const isBottle = btn.dataset.feedType === 'bottle';
                document.getElementById('feed-duration-group').classList.toggle('hidden', isBottle);
                document.getElementById('feed-amount-group').classList.toggle('hidden', !isBottle);
            });
        });

        document.querySelectorAll('[data-diaper-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-diaper-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('save-feed').addEventListener('click', () => this.saveFeed());
        document.getElementById('save-diaper').addEventListener('click', () => this.saveDiaper());
        document.getElementById('save-sleep').addEventListener('click', () => this.saveSleep());
        document.getElementById('doctor-prep-btn').addEventListener('click', () => this.showDoctorPrep());
        document.getElementById('copy-doctor-prep').addEventListener('click', () => this.copyDoctorPrep());
    },

    startTimer(category) {
        if (this.activeTimer) this.clearTimerUI();

        const startTime = new Date().toISOString();
        this.activeTimer = { category, startTime };
        localStorage.setItem('babyTimer', JSON.stringify(this.activeTimer));
        this.renderTimerUI();
    },

    stopTimer() {
        if (!this.activeTimer) return;
        const { category, startTime } = this.activeTimer;
        const endTime = new Date();
        const start = new Date(startTime);
        const durationMin = Math.round((endTime - start) / 60000);

        this.clearTimerUI();
        this.activeTimer = null;
        localStorage.removeItem('babyTimer');

        if (category === 'feed') {
            const localStart = new Date(start);
            localStart.setMinutes(localStart.getMinutes() - localStart.getTimezoneOffset());
            document.getElementById('feed-time').value = localStart.toISOString().slice(0, 16);
            document.getElementById('feed-duration').value = durationMin;
            document.getElementById('feed-modal').classList.remove('hidden');
        } else if (category === 'sleep') {
            const localStart = new Date(start);
            localStart.setMinutes(localStart.getMinutes() - localStart.getTimezoneOffset());
            const localEnd = new Date(endTime);
            localEnd.setMinutes(localEnd.getMinutes() - localEnd.getTimezoneOffset());
            document.getElementById('sleep-start').value = localStart.toISOString().slice(0, 16);
            document.getElementById('sleep-end').value = localEnd.toISOString().slice(0, 16);
            document.getElementById('sleep-modal').classList.remove('hidden');
        }
    },

    resumeTimer() {
        const saved = localStorage.getItem('babyTimer');
        if (saved) {
            this.activeTimer = JSON.parse(saved);
            this.renderTimerUI();
        }
    },

    renderTimerUI() {
        if (!this.activeTimer) return;
        const btn = document.querySelector(`[data-action="${this.activeTimer.category}"]`);
        if (!btn) return;
        btn.classList.add('timer-active');
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
    },

    updateTimerDisplay() {
        if (!this.activeTimer) return;
        const btn = document.querySelector(`[data-action="${this.activeTimer.category}"]`);
        if (!btn) return;
        const elapsed = Math.floor((Date.now() - new Date(this.activeTimer.startTime)) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        const icon = this.activeTimer.category === 'feed' ? '🍼' : '😴';
        btn.innerHTML = `<span class="timer-elapsed">${icon} ${m}:${s.toString().padStart(2, '0')}</span><span class="timer-stop-hint">tap to stop</span>`;
    },

    clearTimerUI() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        const category = this.activeTimer ? this.activeTimer.category : null;
        if (category) {
            const btn = document.querySelector(`[data-action="${category}"]`);
            if (btn) {
                btn.classList.remove('timer-active');
                const icon = category === 'feed' ? '🍼' : '😴';
                const label = category === 'feed' ? 'Feed' : 'Sleep';
                btn.innerHTML = `${icon} ${label}`;
            }
        }
    },

    async saveFeed() {
        const type = document.querySelector('[data-feed-type].active').dataset.feedType;
        const time = document.getElementById('feed-time').value;
        if (!time) return;

        const log = {
            category: 'feed',
            type,
            time,
            loggedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : '',
            notes: document.getElementById('feed-notes').value.trim()
        };

        if (type === 'breast') {
            log.duration = document.getElementById('feed-duration').value;
        } else {
            log.amount = document.getElementById('feed-amount').value;
        }

        await DB.addDoc('tracker', log);
        document.getElementById('feed-modal').classList.add('hidden');
        document.getElementById('feed-notes').value = '';
        document.getElementById('feed-duration').value = '';
        document.getElementById('feed-amount').value = '';
    },

    async saveDiaper() {
        const type = document.querySelector('[data-diaper-type].active').dataset.diaperType;
        const time = document.getElementById('diaper-time').value;
        if (!time) return;

        const log = {
            category: 'diaper',
            type,
            time,
            loggedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : '',
            notes: document.getElementById('diaper-notes').value.trim()
        };

        await DB.addDoc('tracker', log);
        document.getElementById('diaper-modal').classList.add('hidden');
        document.getElementById('diaper-notes').value = '';
    },

    async saveSleep() {
        const start = document.getElementById('sleep-start').value;
        if (!start) return;

        const log = {
            category: 'sleep',
            time: start,
            endTime: document.getElementById('sleep-end').value || null,
            loggedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : '',
            notes: document.getElementById('sleep-notes').value.trim()
        };

        await DB.addDoc('tracker', log);
        document.getElementById('sleep-modal').classList.add('hidden');
        document.getElementById('sleep-end').value = '';
        document.getElementById('sleep-notes').value = '';
    },

    async deleteLog(id) {
        await DB.deleteDoc('tracker', id);
    },

    updateDashboard() {
        const lastFeed = this.logs.find(l => l.category === 'feed');
        const lastDiaper = this.logs.find(l => l.category === 'diaper');
        const lastSleep = this.logs.find(l => l.category === 'sleep');

        document.querySelector('#last-feed .dashboard-time').textContent =
            lastFeed ? formatTimeAgo(lastFeed.time) : 'No logs yet';
        document.querySelector('#last-diaper .dashboard-time').textContent =
            lastDiaper ? formatTimeAgo(lastDiaper.time) : 'No logs yet';
        document.querySelector('#last-sleep .dashboard-time').textContent =
            lastSleep ? formatTimeAgo(lastSleep.time) : 'No logs yet';
    },

    renderSummary() {
        const container = document.getElementById('tracker-summary');
        const today = new Date().toDateString();
        const todayLogs = this.logs.filter(l => new Date(l.time).toDateString() === today);

        const feeds = todayLogs.filter(l => l.category === 'feed');
        const diapers = todayLogs.filter(l => l.category === 'diaper');
        const sleeps = todayLogs.filter(l => l.category === 'sleep');

        const feedDuration = feeds.reduce((sum, f) => sum + (parseInt(f.duration) || 0), 0);
        const feedAmount = feeds.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        let feedDetail = `${feeds.length} feeds`;
        if (feedDuration > 0) feedDetail += ` · ${feedDuration}m`;
        if (feedAmount > 0) feedDetail += ` · ${feedAmount}oz`;

        const wet = diapers.filter(d => d.type === 'wet' || d.type === 'both').length;
        const dirty = diapers.filter(d => d.type === 'dirty' || d.type === 'both').length;
        const diaperDetail = `${wet} wet · ${dirty} dirty`;

        const totalSleepMin = sleeps.reduce((sum, s) => {
            if (s.endTime) return sum + Math.round((new Date(s.endTime) - new Date(s.time)) / 60000);
            return sum;
        }, 0);
        const sleepH = Math.floor(totalSleepMin / 60);
        const sleepM = totalSleepMin % 60;
        const sleepDetail = `${sleeps.length} naps · ${sleepH}h ${sleepM}m`;

        container.innerHTML = `
            <div class="summary-card"><span class="summary-icon">🍼</span><span class="summary-text">${feedDetail}</span></div>
            <div class="summary-card"><span class="summary-icon">👶</span><span class="summary-text">${diaperDetail}</span></div>
            <div class="summary-card"><span class="summary-icon">😴</span><span class="summary-text">${sleepDetail}</span></div>
        `;
    },

    showDoctorPrep() {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekLogs = this.logs.filter(l => new Date(l.time) >= weekAgo);
        const days = 7;

        const feeds = weekLogs.filter(l => l.category === 'feed');
        const diapers = weekLogs.filter(l => l.category === 'diaper');
        const sleeps = weekLogs.filter(l => l.category === 'sleep');

        const avgFeeds = (feeds.length / days).toFixed(1);
        const avgWet = (diapers.filter(d => d.type === 'wet' || d.type === 'both').length / days).toFixed(1);
        const avgDirty = (diapers.filter(d => d.type === 'dirty' || d.type === 'both').length / days).toFixed(1);

        const totalSleepMin = sleeps.reduce((sum, s) => {
            if (s.endTime) return sum + Math.round((new Date(s.endTime) - new Date(s.time)) / 60000);
            return sum;
        }, 0);
        const avgSleepH = (totalSleepMin / days / 60).toFixed(1);

        let longestStretch = 0;
        sleeps.forEach(s => {
            if (s.endTime) {
                const dur = (new Date(s.endTime) - new Date(s.time)) / 60000;
                if (dur > longestStretch) longestStretch = dur;
            }
        });
        const longestH = Math.floor(longestStretch / 60);
        const longestM = Math.round(longestStretch % 60);

        let avgInterval = '--';
        if (feeds.length > 1) {
            const sorted = [...feeds].sort((a, b) => new Date(a.time) - new Date(b.time));
            let totalGap = 0;
            for (let i = 1; i < sorted.length; i++) {
                totalGap += (new Date(sorted[i].time) - new Date(sorted[i - 1].time)) / 60000;
            }
            const avgGap = Math.round(totalGap / (sorted.length - 1));
            const gapH = Math.floor(avgGap / 60);
            const gapM = avgGap % 60;
            avgInterval = `${gapH}h ${gapM}m`;
        }

        const startStr = weekAgo.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const endStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const content = document.getElementById('doctor-prep-content');
        content.innerHTML = `
            <div class="prep-range">${startStr} — ${endStr} (7 days)</div>
            <div class="prep-section">
                <h3>Feeding</h3>
                <div class="prep-stat">${avgFeeds} feeds/day</div>
                <div class="prep-stat">Avg interval: ${avgInterval}</div>
            </div>
            <div class="prep-section">
                <h3>Diapers</h3>
                <div class="prep-stat">${avgWet} wet/day</div>
                <div class="prep-stat">${avgDirty} dirty/day</div>
            </div>
            <div class="prep-section">
                <h3>Sleep</h3>
                <div class="prep-stat">${avgSleepH} hours/day avg</div>
                <div class="prep-stat">Longest stretch: ${longestH}h ${longestM}m</div>
            </div>
        `;

        document.getElementById('doctor-prep-modal').classList.remove('hidden');
    },

    copyDoctorPrep() {
        const content = document.getElementById('doctor-prep-content');
        const text = content.innerText;
        navigator.clipboard.writeText(text);
        const btn = document.getElementById('copy-doctor-prep');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000);
    },

    renderHistory() {
        const container = document.getElementById('tracker-history');

        if (this.logs.length === 0) {
            container.innerHTML = '<p class="empty-state">No activity logged yet. Tap a button above to start!</p>';
            return;
        }

        const grouped = {};
        this.logs.forEach(log => {
            const dateKey = formatDate(log.time);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(log);
        });

        let html = '';
        Object.entries(grouped).forEach(([date, logs]) => {
            html += `<div class="history-date">${date}</div>`;
            logs.forEach(log => {
                const icon = log.category === 'feed' ? '🍼' : log.category === 'diaper' ? '👶' : '😴';
                let title = '';
                let meta = formatTime(log.time);

                if (log.category === 'feed') {
                    title = log.type === 'breast' ? 'Breastfeed' : 'Bottle';
                    if (log.duration) meta += ` · ${log.duration} min`;
                    if (log.amount) meta += ` · ${log.amount} oz`;
                } else if (log.category === 'diaper') {
                    title = log.type.charAt(0).toUpperCase() + log.type.slice(1) + ' diaper';
                } else {
                    title = 'Sleep';
                    if (log.endTime) {
                        const dur = Math.round((new Date(log.endTime) - new Date(log.time)) / 60000);
                        const h = Math.floor(dur / 60);
                        const m = dur % 60;
                        meta += ` · ${h > 0 ? h + 'h ' : ''}${m}m`;
                    } else {
                        meta += ' · ongoing';
                    }
                }

                if (log.notes) meta += ` · ${log.notes}`;

                html += `
                    <div class="history-item">
                        <span class="item-icon">${icon}</span>
                        <div class="item-details">
                            <div class="item-title">${title}</div>
                            <div class="item-meta">${meta}</div>
                            ${log.loggedBy ? `<div class="logged-by">logged by ${log.loggedBy}</div>` : ''}
                        </div>
                        <button class="item-delete" onclick="Tracker.deleteLog('${log.id}')">✕</button>
                    </div>`;
            });
        });

        container.innerHTML = html;
    }
};
