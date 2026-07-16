const Scrapbook = {
    photos: [],
    editingId: null,
    unsubscribe: null,

    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('scrapbook', 'date', 'desc', (photos) => {
            this.photos = photos;
            this.render();
        });
    },

    lightboxIndex: 0,

    bindEvents() {
        document.getElementById('add-photo-btn').addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('photo-modal-title').textContent = 'Add Photo';
            document.getElementById('scrapbook-photo').value = '';
            document.getElementById('scrapbook-caption').value = '';
            document.getElementById('scrapbook-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('scrapbook-photo-preview').classList.add('hidden');
            document.getElementById('scrapbook-photo-preview').innerHTML = '';
            document.getElementById('photo-modal').classList.remove('hidden');
        });

        document.getElementById('scrapbook-photo').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('scrapbook-photo-preview');
                preview.innerHTML = `<img src="${ev.target.result}">`;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('save-photo').addEventListener('click', () => this.save());

        document.getElementById('lightbox-prev').addEventListener('click', () => this.lightboxNav(-1));
        document.getElementById('lightbox-next').addEventListener('click', () => this.lightboxNav(1));
        document.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
        document.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
    },

    openLightbox(index) {
        this.lightboxIndex = index;
        this.updateLightbox();
        document.getElementById('lightbox').classList.remove('hidden');
    },

    closeLightbox() {
        document.getElementById('lightbox').classList.add('hidden');
    },

    lightboxNav(dir) {
        this.lightboxIndex += dir;
        if (this.lightboxIndex < 0) this.lightboxIndex = this.photos.length - 1;
        if (this.lightboxIndex >= this.photos.length) this.lightboxIndex = 0;
        this.updateLightbox();
    },

    updateLightbox() {
        const photo = this.photos[this.lightboxIndex];
        document.getElementById('lightbox-img').src = photo.photoUrl;
        document.getElementById('lightbox-caption').textContent = photo.caption || '';
        document.getElementById('lightbox-counter').textContent = `${this.lightboxIndex + 1} / ${this.photos.length}`;
        const showNav = this.photos.length > 1;
        document.getElementById('lightbox-prev').style.display = showNav ? '' : 'none';
        document.getElementById('lightbox-next').style.display = showNav ? '' : 'none';
        document.getElementById('lightbox-counter').style.display = showNav ? '' : 'none';
    },

    async save() {
        const fileInput = document.getElementById('scrapbook-photo');
        const caption = document.getElementById('scrapbook-caption').value.trim();
        const date = document.getElementById('scrapbook-date').value;
        const file = fileInput.files[0];

        if (!file && !this.editingId) return;

        const btn = document.getElementById('save-photo');
        btn.disabled = true;
        btn.textContent = 'Uploading...';

        try {
            let photoUrl = null;
            let photoPath = null;

            if (file) {
                photoPath = `scrapbook/${Date.now()}_${file.name}`;
                photoUrl = await DB.uploadPhoto(file, photoPath);
            }

            if (this.editingId) {
                const update = { caption, date };
                if (photoUrl) {
                    update.photoUrl = photoUrl;
                    update.photoPath = photoPath;
                }
                await DB.updateDoc('scrapbook', this.editingId, update);
            } else {
                await DB.addDoc('scrapbook', {
                    photoUrl,
                    photoPath,
                    caption,
                    date,
                    addedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : ''
                });
            }

            document.getElementById('photo-modal').classList.add('hidden');
            this.editingId = null;
        } catch (e) {
            console.error('Scrapbook save error:', e);
            alert('Upload failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save';
        }
    },

    edit(id) {
        const photo = this.photos.find(p => p.id === id);
        if (!photo) return;

        this.editingId = id;
        document.getElementById('photo-modal-title').textContent = 'Edit Photo';
        document.getElementById('scrapbook-photo').value = '';
        document.getElementById('scrapbook-caption').value = photo.caption || '';
        document.getElementById('scrapbook-date').value = photo.date;

        const preview = document.getElementById('scrapbook-photo-preview');
        if (photo.photoUrl) {
            preview.innerHTML = `<img src="${photo.photoUrl}">`;
            preview.classList.remove('hidden');
        } else {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }

        document.getElementById('photo-modal').classList.remove('hidden');
    },

    async delete(id) {
        const photo = this.photos.find(p => p.id === id);
        if (photo && photo.photoPath) {
            await DB.deletePhoto(photo.photoPath);
        }
        await DB.deleteDoc('scrapbook', id);
    },

    render() {
        const container = document.getElementById('scrapbook-grid');

        if (this.photos.length === 0) {
            container.innerHTML = '<p class="empty-state">A place for all the little moments. Snap a photo, add a caption, and watch the album grow.</p>';
            return;
        }

        container.innerHTML = this.photos.map((p, i) => `
            <div class="scrapbook-item">
                <div class="scrapbook-img" onclick="Scrapbook.openLightbox(${i})">
                    <img src="${p.photoUrl}" loading="lazy">
                </div>
                <div class="scrapbook-info">
                    ${p.caption ? `<div class="scrapbook-caption">${this.escapeHtml(p.caption)}</div>` : ''}
                    <div class="scrapbook-meta">
                        ${new Date(p.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}${p.addedBy ? ` · ${this.escapeHtml(p.addedBy)}` : ''}
                    </div>
                </div>
                <div class="scrapbook-actions">
                    <button onclick="Scrapbook.edit('${p.id}')">Edit</button>
                    <button onclick="Scrapbook.delete('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
