const Journal = {
    entries: [],
    editingId: null,
    unsubscribe: null,


    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('journal', 'date', 'desc', (entries) => {
            this.entries = entries;
            this.render();
        });
    },

    bindEvents() {
        document.getElementById('new-entry-btn').addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('entry-modal-title').textContent = 'New Entry';
            document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('entry-title').value = '';
            document.getElementById('entry-text').value = '';
            document.getElementById('entry-photo').value = '';
            document.getElementById('photo-preview').classList.add('hidden');
            document.getElementById('photo-preview').innerHTML = '';
            document.getElementById('entry-modal').classList.remove('hidden');
        });

        document.getElementById('entry-photo').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${ev.target.result}">`;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('save-entry').addEventListener('click', () => this.save());
        document.getElementById('share-journal-btn').addEventListener('click', () => this.share());
    },


    async save() {
        const date = document.getElementById('entry-date').value;
        const title = document.getElementById('entry-title').value.trim();
        const text = document.getElementById('entry-text').value.trim();
        const fileInput = document.getElementById('entry-photo');
        const file = fileInput.files[0];

        if (!title && !text) return;

        let photoUrl = null;
        let photoPath = null;

        if (file) {
            photoPath = `journal/${Date.now()}_${file.name}`;
            photoUrl = await DB.uploadPhoto(file, photoPath);
        }

        // Handle voice memo upload
        let memoData = null;
        if (typeof VoiceMemo !== 'undefined' && VoiceMemo.audioBlob) {
            memoData = await VoiceMemo.uploadMemo();
        }

        if (this.editingId) {
            const update = { date, title, text };
            if (photoUrl) {
                update.photoUrl = photoUrl;
                update.photoPath = photoPath;
            }
            if (memoData) {
                update.memoUrl = memoData.audioUrl;
                update.memoPath = memoData.audioPath;
                update.memoTranscript = memoData.transcript;
            }
            await DB.updateDoc('journal', this.editingId, update);
        } else {
            await DB.addDoc('journal', {
                date,
                title,
                text,
                photoUrl,
                photoPath,
                memoUrl: memoData ? memoData.audioUrl : null,
                memoPath: memoData ? memoData.audioPath : null,
                memoTranscript: memoData ? memoData.transcript : null,
                author: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : ''
            });
        }

        // Clean up voice memo state
        if (typeof VoiceMemo !== 'undefined') VoiceMemo.clear();

        document.getElementById('entry-modal').classList.add('hidden');
        this.editingId = null;
    },

    edit(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry) return;

        this.editingId = id;
        document.getElementById('entry-modal-title').textContent = 'Edit Entry';
        document.getElementById('entry-date').value = entry.date;
        document.getElementById('entry-title').value = entry.title || '';
        document.getElementById('entry-text').value = entry.text || '';
        document.getElementById('entry-photo').value = '';

        const preview = document.getElementById('photo-preview');
        if (entry.photoUrl) {
            preview.innerHTML = `<img src="${entry.photoUrl}">`;
            preview.classList.remove('hidden');
        } else {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }

        document.getElementById('entry-modal').classList.remove('hidden');
    },

    async delete(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry && entry.photoPath) {
            await DB.deletePhoto(entry.photoPath);
        }
        await DB.deleteDoc('journal', id);
    },

    render() {
        const container = document.getElementById('journal-entries');

        if (this.entries.length === 0) {
            const emptyIcon = `<svg class="journal-thumb-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4h18l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#f5f0e8" stroke="#c4b9a4" stroke-width="1.5"/>
                <path d="M30 4v10h10" fill="#e8e0d4" stroke="#c4b9a4" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M10 42c2-2 4-3 6-5" stroke="#c4b9a4" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
                <path d="M12 44c3-1 5-3 7-4" stroke="#c4b9a4" stroke-width="1" stroke-dasharray="2 2" opacity="0.4"/>
                <line x1="16" y1="18" x2="32" y2="18" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="16" y1="23" x2="30" y2="23" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="16" y1="28" x2="26" y2="28" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M34 28l-8 8-2 4 4-2 8-8-2-2z" fill="#fff8e8" stroke="#7a9a6d" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M32 30l2 2" stroke="#7a9a6d" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M24 40l1.5-0.5" stroke="#7a9a6d" stroke-width="1.2" stroke-linecap="round"/>
            </svg>`;
            container.innerHTML = `
                <div class="journal-thumb journal-thumb-empty" onclick="document.getElementById('new-entry-btn').click()">
                    <div class="journal-thumb-page">${emptyIcon}</div>
                    <div class="journal-thumb-info">
                        <span class="journal-thumb-title">Your first entry goes here!</span>
                    </div>
                </div>`;
            return;
        }

        const pageIcon = `<svg class="journal-thumb-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4h18l10 10v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#f5f0e8" stroke="#c4b9a4" stroke-width="1.5"/>
            <path d="M30 4v10h10" fill="#e8e0d4" stroke="#c4b9a4" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M10 42c2-2 4-3 6-5" stroke="#c4b9a4" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
            <path d="M12 44c3-1 5-3 7-4" stroke="#c4b9a4" stroke-width="1" stroke-dasharray="2 2" opacity="0.4"/>
            <line x1="16" y1="18" x2="32" y2="18" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="16" y1="23" x2="30" y2="23" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="16" y1="28" x2="26" y2="28" stroke="#d4cabb" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M34 28l-8 8-2 4 4-2 8-8-2-2z" fill="#fff8e8" stroke="#7a9a6d" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M32 30l2 2" stroke="#7a9a6d" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M24 40l1.5-0.5" stroke="#7a9a6d" stroke-width="1.2" stroke-linecap="round"/>
        </svg>`;

        container.innerHTML = this.entries.map(e => {
            const dateStr = new Date(e.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
            const title = e.title ? this.escapeHtml(e.title) : 'Untitled';
            return `
            <div class="journal-thumb" onclick="Journal.expand('${e.id}')">
                <div class="journal-thumb-page">
                    ${pageIcon}
                </div>
                <div class="journal-thumb-info">
                    <span class="journal-thumb-date">${dateStr}</span>
                    <span class="journal-thumb-title">${title}</span>
                </div>
                <div class="entry-actions">
                    <button onclick="event.stopPropagation(); Journal.edit('${e.id}')">Edit</button>
                    <button onclick="event.stopPropagation(); Journal.delete('${e.id}')">Delete</button>
                </div>
            </div>`;
        }).join('');
    },

    expand(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry) return;
        this.editingId = null;
        const dateStr = new Date(entry.date + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('entry-modal-title').textContent = dateStr;
        document.getElementById('entry-date').value = entry.date;
        document.getElementById('entry-title').value = entry.title || '';
        document.getElementById('entry-text').value = entry.text || '';
        document.getElementById('entry-photo').value = '';
        const preview = document.getElementById('photo-preview');
        if (entry.photoUrl) {
            preview.innerHTML = `<img src="${entry.photoUrl}">`;
            preview.classList.remove('hidden');
        } else {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }

        // Show existing voice memo if present
        const memoPreview = document.getElementById('voice-memo-preview');
        if (entry.memoUrl) {
            document.getElementById('voice-memo-audio').src = entry.memoUrl;
            memoPreview.classList.remove('hidden');
        } else {
            document.getElementById('voice-memo-audio').src = '';
            memoPreview.classList.add('hidden');
        }
        if (typeof VoiceMemo !== 'undefined') VoiceMemo.clear();

        this.editingId = id;
        document.getElementById('entry-modal').classList.remove('hidden');
    },

    share() {
        if (this.entries.length === 0) {
            alert('Add some journal entries first!');
            return;
        }

        const babyName = App.babyName || 'Baby';
        const sortedEntries = [...this.entries].sort((a, b) => new Date(a.date) - new Date(b.date));

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${babyName}'s Journal</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif; background: #f0f5f1; color: #2f382f; padding: 24px; max-width: 600px; margin: 0 auto; }
header { text-align: center; padding: 40px 0; border-bottom: 1px solid #d6e5d9; margin-bottom: 32px; }
header h1 { font-size: 28px; font-weight: 600; color: #2f382f; margin-bottom: 4px; }
header p { color: #6b766b; font-style: italic; }
.entry { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #d6e5d9; }
.entry:last-child { border-bottom: none; }
.entry-date { font-size: 13px; color: #6b766b; margin-bottom: 6px; }
.entry-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.entry-text { font-size: 16px; line-height: 1.7; white-space: pre-wrap; }
.entry-photo { margin-top: 16px; border-radius: 8px; overflow: hidden; }
.entry-photo img { width: 100%; height: auto; }
footer { text-align: center; padding: 32px 0; color: #6b766b; font-size: 13px; }
</style>
</head>
<body>
<header>
<h1>${this.escapeHtml(babyName)}'s Journal</h1>
<p>A collection of moments, big and small</p>
</header>
${sortedEntries.map(e => `
<div class="entry">
<div class="entry-date">${new Date(e.date + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${e.author ? ` &middot; written by ${this.escapeHtml(e.author)}` : ''}</div>
${e.title ? `<div class="entry-title">${this.escapeHtml(e.title)}</div>` : ''}
${e.text ? `<div class="entry-text">${this.escapeHtml(e.text)}</div>` : ''}
${e.photoUrl ? `<div class="entry-photo"><img src="${e.photoUrl}"></div>` : ''}
</div>`).join('')}
<footer>Made with love using Baby Zhu's Slice of Life 🌱</footer>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });

        if (navigator.share && navigator.canShare) {
            const file = new File([blob], `${babyName.toLowerCase().replace(/\s+/g, '-')}-journal.html`, { type: 'text/html' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: `${babyName}'s Journal`,
                    files: [file]
                });
                return;
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${babyName.toLowerCase().replace(/\s+/g, '-')}-journal.html`;
        a.click();
        URL.revokeObjectURL(url);
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
