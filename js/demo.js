const Demo = {
    isDemo() {
        return new URLSearchParams(window.location.search).has('demo');
    },

    init() {
        if (!this.isDemo()) return false;

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('user-display-name').textContent = 'Sarah';

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => App.switchTab(btn.dataset.tab));
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-cancel') || e.target.classList.contains('modal')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.add('hidden');
            }
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('members-list').innerHTML = `
                <div class="people-item"><span>Sarah</span><span class="member-email">sarah@example.com</span></div>
                <div class="people-item"><span>Flor</span><span class="member-email">flor@example.com</span></div>
                <div class="people-item"><span>Mom</span><span class="member-email">mom@example.com</span></div>
            `;
            document.getElementById('settings-modal').classList.remove('hidden');
        });

        document.getElementById('manual-entry-link').addEventListener('click', (e) => e.preventDefault());

        App.startCountdown();
        App.showDailyFact();
        this.loadTracker();
        this.loadVillage();
        this.loadScrapbook();
        this.loadJournal();
        this.loadInventory();
        this.loadRegistry();

        return true;
    },

    loadTracker() {
        document.getElementById('last-feed').querySelector('.dashboard-time').textContent = '45m ago';
        document.getElementById('last-diaper').querySelector('.dashboard-time').textContent = '1h 20m ago';
        document.getElementById('last-sleep').querySelector('.dashboard-time').textContent = '3h ago';

        document.getElementById('tracker-summary').innerHTML = `
            <div class="summary-card"><span class="summary-icon">🍼</span><span class="summary-text">6 feeds · 52m</span></div>
            <div class="summary-card"><span class="summary-icon">👶</span><span class="summary-text">4 wet · 2 dirty</span></div>
            <div class="summary-card"><span class="summary-icon">😴</span><span class="summary-text">3 naps · 5h 45m</span></div>
        `;

        document.getElementById('doctor-prep-btn').addEventListener('click', () => {
            document.getElementById('doctor-prep-content').innerHTML = `
                <div class="prep-range">Jun 15 — Jun 22 (7 days)</div>
                <div class="prep-section"><h3>Feeding</h3><div class="prep-stat">7.2 feeds/day</div><div class="prep-stat">Avg interval: 2h 45m</div></div>
                <div class="prep-section"><h3>Diapers</h3><div class="prep-stat">5.4 wet/day</div><div class="prep-stat">2.1 dirty/day</div></div>
                <div class="prep-section"><h3>Sleep</h3><div class="prep-stat">14.2 hours/day avg</div><div class="prep-stat">Longest stretch: 4h 30m</div></div>
            `;
            document.getElementById('doctor-prep-modal').classList.remove('hidden');
        });

        document.getElementById('copy-doctor-prep').addEventListener('click', () => {
            const btn = document.getElementById('copy-doctor-prep');
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000);
        });

        const history = document.getElementById('tracker-history');
        history.innerHTML = [
            { icon: '🍼', title: 'Breastfeed', meta: '10:15 AM · 18 min' },
            { icon: '👶', title: 'Wet diaper', meta: '9:40 AM' },
            { icon: '😴', title: 'Sleep', meta: '7:30 AM · 1h 30m' },
            { icon: '🍼', title: 'Bottle', meta: '7:00 AM · 4 oz' },
            { icon: '👶', title: 'Dirty diaper', meta: '6:15 AM' },
            { icon: '😴', title: 'Sleep', meta: '2:00 AM · 4h' },
            { icon: '🍼', title: 'Breastfeed', meta: '1:45 AM · 22 min' },
        ].map(e => `
            <div class="history-item">
                <span class="item-icon">${e.icon}</span>
                <div class="item-details">
                    <div class="item-title">${e.title}</div>
                    <div class="item-meta">${e.meta}</div>
                </div>
            </div>
        `).join('');

        this.loadGrowth();
    },

    loadGrowth() {
        document.getElementById('add-growth-btn').addEventListener('click', () => {
            document.getElementById('growth-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('growth-modal').classList.remove('hidden');
        });

        const measurements = [
            { date: 'Jun 15, 2026', weight: '8.2 lb', length: '20.5 in', head: 'HC 14.0 in', notes: '2-week checkup' },
            { date: 'Jun 1, 2026', weight: '7.4 lb (-0.2)', length: '19.5 in', head: 'HC 13.5 in', notes: 'Birth' },
        ];

        document.getElementById('growth-list').innerHTML = measurements.map(m => `
            <div class="growth-item">
                <div class="growth-item-date">${m.date}</div>
                <div class="growth-item-stats">${m.weight} · ${m.length} · ${m.head}</div>
                ${m.notes ? `<div class="growth-item-notes">${m.notes}</div>` : ''}
            </div>
        `).join('');
    },

    loadVillage() {
        const contacts = [
            { name: 'Dr. Patel', role: 'Pediatrician', phone: '(604) 555-0142' },
            { name: 'Maria Chen', role: 'Midwife', phone: '(604) 555-0198', notes: 'Available weekends' },
            { name: 'Lisa Park', role: 'Lactation Consultant', phone: '(604) 555-0167' },
            { name: 'Auntie May', role: 'Aunty', phone: '(604) 555-0201' },
            { name: 'Grandma Zhu', role: 'Grandma', phone: '(604) 555-0155' },
            { name: 'Grandpa Van Swieten', role: 'Grandpa', phone: '(604) 555-0134' },
            { name: 'Jen & Mike', role: 'Friend', phone: '(604) 555-0189', notes: 'Offered to help with meals first 2 weeks' },
        ];

        document.getElementById('contacts-list').innerHTML = contacts.map(c => `
            <div class="contact-card">
                <div class="contact-top">
                    <span class="contact-name">${c.name}</span>
                    <span class="contact-role">${c.role}</span>
                </div>
                <a href="#" class="contact-phone" onclick="event.preventDefault()">📞 ${c.phone}</a>
                ${c.notes ? `<div class="contact-notes">${c.notes}</div>` : ''}
            </div>
        `).join('');
    },

    loadScrapbook() {
        const photos = [
            { color: '#f4c2d0', caption: 'Nursery coming together!', date: 'Jun 12, 2026' },
            { color: '#c2e0f4', caption: 'Baby shower day', date: 'Jun 8, 2026' },
            { color: '#f4e8c2', caption: 'First onesie purchase', date: 'May 28, 2026' },
            { color: '#c2f4d5', caption: '20-week ultrasound', date: 'May 15, 2026' },
            { color: '#e8c2f4', caption: 'Gender reveal!', date: 'Apr 22, 2026' },
            { color: '#f4d5c2', caption: 'Bump at 16 weeks', date: 'Apr 3, 2026' },
        ];

        const grid = document.getElementById('scrapbook-grid');
        grid.innerHTML = photos.map((p, i) => `
            <div class="scrapbook-item">
                <div class="scrapbook-img" onclick="Demo.openDemoLightbox(${i})">
                    <div style="width:100%;height:110px;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:24px;">📷</div>
                </div>
                <div class="scrapbook-info">
                    <div class="scrapbook-caption">${p.caption}</div>
                    <div class="scrapbook-meta">${p.date}</div>
                </div>
            </div>
        `).join('');

        this.demoPhotos = photos;
    },

    demoLightboxIndex: 0,
    demoPhotos: [],

    openDemoLightbox(i) {
        this.demoLightboxIndex = i;
        this.updateDemoLightbox();
        document.getElementById('lightbox').classList.remove('hidden');

        document.querySelector('.lightbox-close').onclick = () => document.getElementById('lightbox').classList.add('hidden');
        document.querySelector('.lightbox-backdrop').onclick = () => document.getElementById('lightbox').classList.add('hidden');
        document.getElementById('lightbox-prev').onclick = () => { this.demoLightboxIndex = (this.demoLightboxIndex - 1 + this.demoPhotos.length) % this.demoPhotos.length; this.updateDemoLightbox(); };
        document.getElementById('lightbox-next').onclick = () => { this.demoLightboxIndex = (this.demoLightboxIndex + 1) % this.demoPhotos.length; this.updateDemoLightbox(); };
    },

    updateDemoLightbox() {
        const p = this.demoPhotos[this.demoLightboxIndex];
        const img = document.getElementById('lightbox-img');
        img.style.display = 'none';
        img.insertAdjacentHTML('afterend', `<div id="lightbox-placeholder" style="width:300px;height:300px;background:${p.color};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:48px;">📷</div>`);
        const old = document.getElementById('lightbox-placeholder');
        if (document.querySelectorAll('#lightbox-placeholder').length > 1) {
            document.querySelectorAll('#lightbox-placeholder')[0].remove();
        }
        document.getElementById('lightbox-caption').textContent = p.caption;
        document.getElementById('lightbox-counter').textContent = `${this.demoLightboxIndex + 1} / ${this.demoPhotos.length}`;
    },

    loadJournal() {
        const entries = [
            { date: '2026-06-15', text: 'Felt the strongest kicks today during a meeting — had to mute myself on Zoom! The baby is definitely most active in the afternoons now.' },
            { date: '2026-06-10', text: 'Nursery is finally painted. Went with a soft sage green. Took us three trips to the hardware store but worth it.' },
            { date: '2026-06-03', text: 'Had my glucose test today. Not as bad as everyone said! Results next week. Treating myself to a nap.' },
            { date: '2026-05-27', text: 'Baby shower was perfect. So grateful for everyone who came. Got almost everything off the registry!' },
            { date: '2026-05-18', text: 'Starting to feel real now. 24 weeks. Packed my first hospital bag items — probably too early but it made me feel better.' },
        ];

        const list = document.getElementById('journal-list');
        list.innerHTML = entries.map(e => {
            const d = new Date(e.date + 'T12:00:00');
            const dateStr = d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
            const teaser = e.text.substring(0, 60) + '...';
            return `
                <div class="journal-entry-item">
                    <div class="journal-entry-date">${dateStr}</div>
                    <div class="journal-entry-teaser">${teaser}</div>
                </div>`;
        }).join('');
    },

    loadInventory() {
        const items = [
            { name: 'Diapers (Newborn)', category: 'essentials', qty: 3, low: true },
            { name: 'Baby Wipes', category: 'essentials', qty: 8, low: false },
            { name: 'Onesies (0-3mo)', category: 'clothing', qty: 12, low: false },
            { name: 'Swaddle Blankets', category: 'sleep', qty: 4, low: false },
            { name: 'Breast Milk Storage Bags', category: 'feeding', qty: 2, low: true },
            { name: 'Burp Cloths', category: 'feeding', qty: 6, low: false },
            { name: 'Nursing Pads', category: 'maternity', qty: 1, low: true },
        ];

        document.getElementById('stuff-list').innerHTML = items.map(item => `
            <div class="stuff-item ${item.low ? 'stuff-item-low' : ''}">
                <div class="stuff-item-main">
                    <div class="stuff-item-name">${item.name} ${item.low ? '<span class="low-badge">Low</span>' : ''}</div>
                    <div class="stuff-item-meta"><span class="item-category">${item.category}</span></div>
                </div>
                <div class="stuff-item-qty">${item.qty}</div>
            </div>
        `).join('');
    },

    loadRegistry() {
        const items = [
            { name: 'Uppababy Vista Stroller', category: 'gear', claimed: 'Auntie May' },
            { name: 'Hatch Rest Sound Machine', category: 'sleep', claimed: null },
            { name: 'Baby Monitor (Nanit Pro)', category: 'tech', claimed: 'Jen & Mike' },
            { name: 'Nursing Pillow (Boppy)', category: 'feeding', claimed: null },
            { name: 'Diaper Bag Backpack', category: 'gear', claimed: null },
            { name: 'Car Seat (Nuna Pipa)', category: 'gear', claimed: 'Grandma Zhu' },
            { name: 'Baby Bathtub', category: 'essentials', claimed: null },
            { name: 'High Chair (Stokke Tripp Trapp)', category: 'feeding', claimed: null },
        ];

        document.getElementById('registry-tab-list').innerHTML = items.map(item => {
            const claimHtml = item.claimed
                ? `<span class="claimed-badge">Claimed by ${item.claimed}</span>`
                : `<span class="unclaimed-badge">Unclaimed</span>`;
            return `
                <div class="registry-item ${item.claimed ? 'registry-item-taken' : ''}">
                    <div class="registry-item-info">
                        <div class="registry-item-name">${item.name}</div>
                        <div class="registry-item-meta"><span class="item-category">${item.category}</span></div>
                    </div>
                    <div class="registry-item-actions">
                        ${claimHtml}
                    </div>
                </div>`;
        }).join('');
    }
};
