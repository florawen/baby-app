const Growth = {
    measurements: [],
    unsubscribe: null,

    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('growth', 'date', 'desc', (measurements) => {
            this.measurements = measurements;
            this.render();
        });
    },

    bindEvents() {
        document.getElementById('add-growth-btn').addEventListener('click', () => {
            document.getElementById('growth-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('growth-weight').value = '';
            document.getElementById('growth-length').value = '';
            document.getElementById('growth-head').value = '';
            document.getElementById('growth-notes').value = '';
            document.getElementById('growth-modal').classList.remove('hidden');
        });

        document.getElementById('save-growth').addEventListener('click', () => this.save());
    },

    async save() {
        const date = document.getElementById('growth-date').value;
        if (!date) return;

        const weight = parseFloat(document.getElementById('growth-weight').value) || null;
        const length = parseFloat(document.getElementById('growth-length').value) || null;
        const head = parseFloat(document.getElementById('growth-head').value) || null;
        const notes = document.getElementById('growth-notes').value.trim();

        if (!weight && !length && !head) return;

        await DB.addDoc('growth', {
            date,
            weight,
            length,
            head,
            notes,
            loggedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : ''
        });

        document.getElementById('growth-modal').classList.add('hidden');
    },

    async deleteEntry(id) {
        if (!confirm('Delete this measurement?')) return;
        await DB.deleteDoc('growth', id);
    },

    render() {
        const container = document.getElementById('growth-list');

        if (this.measurements.length === 0) {
            container.innerHTML = '<p class="empty-state">No measurements yet. Log weight, length, and head circumference from doctor visits.</p>';
            return;
        }

        container.innerHTML = this.measurements.map((m, i) => {
            const prev = this.measurements[i + 1];
            const dateStr = new Date(m.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            let deltas = [];
            if (m.weight) {
                let d = '';
                if (prev && prev.weight) {
                    const diff = (m.weight - prev.weight).toFixed(1);
                    d = diff > 0 ? ` (+${diff})` : ` (${diff})`;
                }
                deltas.push(`${m.weight} lb${d}`);
            }
            if (m.length) {
                let d = '';
                if (prev && prev.length) {
                    const diff = (m.length - prev.length).toFixed(1);
                    d = diff > 0 ? ` (+${diff})` : ` (${diff})`;
                }
                deltas.push(`${m.length} in${d}`);
            }
            if (m.head) {
                let d = '';
                if (prev && prev.head) {
                    const diff = (m.head - prev.head).toFixed(1);
                    d = diff > 0 ? ` (+${diff})` : ` (${diff})`;
                }
                deltas.push(`HC ${m.head} in${d}`);
            }

            return `
                <div class="growth-item">
                    <div class="growth-item-date">${dateStr}</div>
                    <div class="growth-item-stats">${deltas.join(' · ')}</div>
                    ${m.notes ? `<div class="growth-item-notes">${this.escapeHtml(m.notes)}</div>` : ''}
                    <button class="item-delete" onclick="Growth.deleteEntry('${m.id}')">✕</button>
                </div>`;
        }).join('');
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
