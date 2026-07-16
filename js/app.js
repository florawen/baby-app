const App = {
    babyName: 'Baby Zhu',
    initialized: false,

    cleanup() {
        if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
        if (Tracker.timerInterval) { clearInterval(Tracker.timerInterval); Tracker.timerInterval = null; }
        if (Tracker.unsubscribe) { Tracker.unsubscribe(); Tracker.unsubscribe = null; }
        if (Growth.unsubscribe) { Growth.unsubscribe(); Growth.unsubscribe = null; }
        if (Village.unsubscribe) { Village.unsubscribe(); Village.unsubscribe = null; }
        if (Scrapbook.unsubscribe) { Scrapbook.unsubscribe(); Scrapbook.unsubscribe = null; }
        if (Journal.unsubscribe) { Journal.unsubscribe(); Journal.unsubscribe = null; }
        if (Inventory.unsubscribe) { Inventory.unsubscribe(); Inventory.unsubscribe = null; }
        if (Registry.unsubscribe) { Registry.unsubscribe(); Registry.unsubscribe = null; }
    },

    showGuestRegistry() {
        document.getElementById('guest-registry').classList.remove('hidden');
        document.getElementById('guest-logout-btn').addEventListener('click', async () => {
            this.cleanup();
            this.initialized = false;
            document.getElementById('guest-registry').classList.add('hidden');
            await Auth.logout();
        });
        Registry.init();
    },

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        this.cleanup();

        if (Auth.userRole === 'guest') {
            this.showGuestRegistry();
            return;
        }

        document.getElementById('app').classList.remove('hidden');

        const user = Auth.currentUser;
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-display-name').textContent = displayName;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.renderMembersSettings();
            document.getElementById('settings-modal').classList.remove('hidden');
        });

        document.getElementById('logout-btn').addEventListener('click', async () => {
            this.cleanup();
            this.initialized = false;
            document.getElementById('app').classList.add('hidden');
            await Auth.logout();
        });

        this.initModules();

        document.getElementById('export-data').addEventListener('click', async () => {
            const data = {
                tracker: await DB.getAll('tracker', 'time'),
                contacts: await DB.getAll('contacts', 'name', 'asc'),
                journal: await DB.getAll('journal', 'date'),
                scrapbook: await DB.getAll('scrapbook', 'date')
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `baby-zhu-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('generate-invite-btn').addEventListener('click', async () => {
            const link = await Auth.generateInviteLink('member');
            const display = document.getElementById('invite-link-display');
            display.value = link;
            document.getElementById('invite-link-container').classList.remove('hidden');
        });

        document.getElementById('copy-invite-btn').addEventListener('click', () => {
            const display = document.getElementById('invite-link-display');
            display.select();
            navigator.clipboard.writeText(display.value);
            document.getElementById('copy-invite-btn').textContent = 'Copied!';
            setTimeout(() => {
                document.getElementById('copy-invite-btn').textContent = 'Copy';
            }, 2000);
        });


        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-cancel') || e.target.classList.contains('modal')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.add('hidden');
            }
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    },

    async renderMembersSettings() {
        const list = document.getElementById('members-list');
        list.innerHTML = '<p class="loading-text">Loading...</p>';
        const members = await DB.getFamilyMembers();
        list.innerHTML = members.map(m =>
            `<div class="people-item"><span>${this.escapeHtml(m.displayName || m.email)}</span><span class="member-email">${this.escapeHtml(m.email)}</span></div>`
        ).join('') || '<p class="empty-state">Just you so far!</p>';
    },

    showDailyFact() {
        const facts = [
            "Babies are born with about 300 bones — adults only have 206.",
            "Newborns can recognize their mother's voice from birth.",
            "A baby's brain doubles in size during the first year.",
            "Babies are born without kneecaps — they develop between 3-5 years.",
            "Newborns can only see about 8-12 inches in front of them.",
            "Babies have taste buds on the roof, sides, and back of their mouth.",
            "A newborn's stomach is only the size of a hazelnut.",
            "Babies smile an average of 200 times a day.",
            "Newborns can hear just as well as adults.",
            "A baby's heart beats about 130-160 times per minute.",
            "Babies are born with natural swimming reflexes.",
            "Newborns sleep up to 17 hours a day (in bursts).",
            "A baby can breathe and swallow at the same time until 7 months.",
            "Babies produce about 3,000 diapers in their first year.",
            "A newborn's head makes up about 25% of their total weight.",
            "Babies are born with 10,000 taste buds — more than adults.",
            "Newborns cry without tears for the first few weeks.",
            "A baby's fingerprints form at just 3 months in the womb.",
            "Babies can recognize faces within hours of being born.",
            "A newborn's grip is strong enough to support their body weight.",
            "Babies prefer high-contrast patterns like black and white.",
            "Newborns sneeze a lot to clear their nasal passages — it's totally normal.",
            "A baby's first social smile usually appears around 6 weeks.",
            "Babies are born with a sense of smell and prefer sweet scents.",
            "A newborn can distinguish their mother's milk from another's by smell.",
            "Babies grow fastest in spring and summer.",
            "A baby's eyes are 75% of their adult size at birth.",
            "Newborns have more neural connections than adults.",
            "Babies hiccup in the womb — it helps develop their diaphragm.",
            "The soft spot on a baby's head can visibly pulse with their heartbeat.",
            "Babies recognize music they heard regularly in the womb.",
        ];
        const today = new Date();
        const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % facts.length;
        document.getElementById('daily-fact').textContent = facts[dayIndex];
    },

    startCountdown() {
        const dueDate = new Date('2026-09-14T00:00:00');
        const update = () => {
            const now = new Date();
            const diff = dueDate - now;
            if (diff <= 0) {
                document.getElementById('countdown-days').textContent = '0';
                document.getElementById('countdown-hours').textContent = '0';
                document.getElementById('countdown-minutes').textContent = '0';
                document.getElementById('countdown-seconds').textContent = '0';
                return;
            }
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-days').textContent = days;
            document.getElementById('countdown-hours').textContent = hours;
            document.getElementById('countdown-minutes').textContent = minutes;
            document.getElementById('countdown-seconds').textContent = seconds;
        };
        update();
        this.countdownInterval = setInterval(update, 1000);
    },

    initModules() {
        try { this.startCountdown(); this.showDailyFact(); } catch (e) { console.warn('Countdown init failed:', e); }
        try { Tracker.init(); } catch (e) { console.warn('Tracker init failed:', e); }
        try { Growth.init(); } catch (e) { console.warn('Growth init failed:', e); }
        try { Village.init(); } catch (e) { console.warn('Village init failed:', e); }
        try { Scrapbook.init(); } catch (e) { console.warn('Scrapbook init failed:', e); }
        try { Journal.init(); } catch (e) { console.warn('Journal init failed:', e); }
        try { Inventory.init(); } catch (e) { console.warn('Inventory init failed:', e); }
        try { Registry.init(); } catch (e) { console.warn('Registry init failed:', e); }
        try { Voice.init(); } catch (e) { console.warn('Voice init failed:', e); }
        try { VoiceMemo.init(); } catch (e) { console.warn('VoiceMemo init failed:', e); }
    },

    switchTab(tab) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tab + '-tab').classList.add('active');
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago';
    const days = Math.floor(hrs / 24);
    return days + 'd ago';
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getNowLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Demo !== 'undefined' && Demo.isDemo()) {
        Demo.init();
        return;
    }
    DB.init();
    Auth.bindEvents();
    Auth.init();
});
