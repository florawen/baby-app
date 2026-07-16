const Registry = {
    items: [],
    editingId: null,
    unsubscribe: null,

    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('items', 'createdAt', 'desc', (items) => {
            this.items = items.filter(i => i.status === 'need');
            this.render();
        });
    },

    bindEvents() {
        if (Auth.userRole === 'guest') return;

        document.getElementById('add-registry-item-btn').addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('registry-item-modal-title').textContent = 'Add to Registry';
            document.getElementById('registry-item-name').value = '';
            document.getElementById('registry-item-category').value = 'other';
            document.getElementById('registry-item-notes').value = '';
            document.getElementById('registry-item-link').value = '';
            document.getElementById('registry-item-modal').classList.remove('hidden');
        });

        document.getElementById('save-registry-item').addEventListener('click', () => this.saveItem());

        document.getElementById('generate-registry-link-tab-btn').addEventListener('click', async () => {
            const link = await Auth.generateInviteLink('guest');
            const display = document.getElementById('registry-link-tab-display');
            display.value = link;
            document.getElementById('registry-link-tab-container').classList.remove('hidden');
        });

        document.getElementById('copy-registry-link-tab-btn').addEventListener('click', () => {
            const display = document.getElementById('registry-link-tab-display');
            display.select();
            navigator.clipboard.writeText(display.value);
            document.getElementById('copy-registry-link-tab-btn').textContent = 'Copied!';
            setTimeout(() => {
                document.getElementById('copy-registry-link-tab-btn').textContent = 'Copy';
            }, 2000);
        });

        document.getElementById('load-starter-kit-btn').addEventListener('click', async () => {
            const btn = document.getElementById('load-starter-kit-btn');
            btn.textContent = 'Loading...';
            btn.disabled = true;
            await this.loadStarterKit();
            document.getElementById('registry-starter-kit').classList.add('hidden');
        });
    },

    async saveItem() {
        const name = document.getElementById('registry-item-name').value.trim();
        if (!name) return;

        const item = {
            name,
            category: document.getElementById('registry-item-category').value,
            status: 'need',
            quantity: 0,
            notes: document.getElementById('registry-item-notes').value.trim(),
            link: document.getElementById('registry-item-link').value.trim(),
            addedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : ''
        };

        if (this.editingId) {
            await DB.updateDoc('items', this.editingId, item);
        } else {
            await DB.addDoc('items', item);
        }

        document.getElementById('registry-item-modal').classList.add('hidden');
        this.editingId = null;
    },

    editItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        this.editingId = id;
        document.getElementById('registry-item-modal-title').textContent = 'Edit Item';
        document.getElementById('registry-item-name').value = item.name;
        document.getElementById('registry-item-category').value = item.category || 'other';
        document.getElementById('registry-item-notes').value = item.notes || '';
        document.getElementById('registry-item-link').value = item.link || '';
        document.getElementById('registry-item-modal').classList.remove('hidden');
    },

    async deleteItem(id) {
        if (!confirm('Remove this item from the registry?')) return;
        await DB.deleteDoc('items', id);
    },

    async claimItem(id) {
        const user = Auth.currentUser;
        const displayName = user.displayName || user.email.split('@')[0];
        await DB.updateDoc('items', id, {
            claimedBy: displayName,
            claimedByUid: user.uid,
            claimedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async unclaimItem(id) {
        await DB.updateDoc('items', id, {
            claimedBy: null,
            claimedByUid: null,
            claimedAt: null
        });
    },

    render() {
        const isGuest = Auth.userRole === 'guest';
        const listId = isGuest ? 'registry-list' : 'registry-tab-list';
        const list = document.getElementById(listId);
        if (!list) return;

        const starterKit = document.getElementById('registry-starter-kit');
        if (this.items.length === 0) {
            if (starterKit) starterKit.classList.remove('hidden');
            const msg = isGuest
                ? 'No items on the registry yet!'
                : 'No items on your registry. Tap + Add to list what you need!';
            list.innerHTML = `<p class="empty-state">${msg}</p>`;
            return;
        } else {
            if (starterKit) starterKit.classList.add('hidden');
        }

        const uid = Auth.currentUser ? Auth.currentUser.uid : null;

        list.innerHTML = this.items.map(item => {
            const isClaimed = !!item.claimedByUid;
            const isMyself = isClaimed && item.claimedByUid === uid;

            let claimHtml = '';
            if (isGuest) {
                if (isMyself) {
                    claimHtml = `
                        <div class="registry-claimed registry-claimed-mine">
                            <span>You're getting this!</span>
                            <button class="btn btn-small btn-secondary" onclick="Registry.unclaimItem('${item.id}')">Unclaim</button>
                        </div>`;
                } else if (isClaimed) {
                    claimHtml = `<div class="registry-claimed registry-claimed-other">Someone's getting this</div>`;
                } else {
                    claimHtml = `<button class="btn btn-small btn-primary" onclick="Registry.claimItem('${item.id}')">I'll get this</button>`;
                }
            } else {
                if (isClaimed) {
                    claimHtml = `<span class="claimed-badge">Claimed by ${this.escapeHtml(item.claimedBy)}</span>`;
                } else {
                    claimHtml = `<span class="unclaimed-badge">Unclaimed</span>`;
                }
            }

            const notes = item.notes ? `<div class="registry-item-notes">${this.escapeHtml(item.notes)}</div>` : '';
            const link = item.link ? `<a href="${this.escapeHtml(item.link)}" target="_blank" class="btn btn-small btn-secondary registry-shop-link">Shop</a>` : '';
            const category = item.category ? `<span class="item-category">${item.category}</span>` : '';
            const actions = isGuest ? '' : `
                <button class="btn-icon-small" onclick="Registry.editItem('${item.id}')">✏️</button>
                <button class="btn-icon-small" onclick="Registry.deleteItem('${item.id}')">🗑️</button>`;

            return `
                <div class="registry-item ${isClaimed && !isMyself ? 'registry-item-taken' : ''}">
                    <div class="registry-item-info">
                        <div class="registry-item-name">${this.escapeHtml(item.name)}</div>
                        <div class="registry-item-meta">${category} ${notes}</div>
                    </div>
                    <div class="registry-item-actions">
                        ${link}
                        ${claimHtml}
                        ${actions}
                    </div>
                </div>`;
        }).join('');
    },

    async loadStarterKit() {
        const starterItems = [
            // Gear
            { name: 'Car seat (infant)', category: 'gear', notes: 'Needed for hospital discharge' },
            { name: 'Stroller', category: 'gear', notes: 'Travel system or standalone' },
            { name: 'Baby carrier/wrap', category: 'gear', notes: 'Hands-free carrying' },
            { name: 'Diaper bag', category: 'gear', notes: '' },
            { name: 'Bouncer or swing', category: 'gear', notes: 'For soothing and safe spot to set baby down' },

            // Nursery
            { name: 'Crib or bassinet', category: 'nursery', notes: 'Bassinet great for first few months' },
            { name: 'Firm crib mattress', category: 'nursery', notes: 'Must fit snugly, no gaps' },
            { name: 'Fitted crib sheets (2-3)', category: 'nursery', notes: 'Get extras for middle-of-night changes' },
            { name: 'Swaddle blankets (3-4)', category: 'nursery', notes: 'Muslin or velcro-style' },
            { name: 'Baby monitor', category: 'nursery', notes: 'Audio or video' },
            { name: 'Sound machine', category: 'nursery', notes: 'White noise for sleep' },
            { name: 'Nightlight', category: 'nursery', notes: 'Dim for nighttime feeds' },

            // Feeding
            { name: 'Bottles (4-6)', category: 'feeding', notes: 'Even if breastfeeding — good for pumped milk' },
            { name: 'Bottle brush', category: 'feeding', notes: '' },
            { name: 'Burp cloths (6-8)', category: 'feeding', notes: 'You will go through these fast' },
            { name: 'Nursing pillow', category: 'feeding', notes: 'Boppy or similar' },
            { name: 'Breast pump', category: 'feeding', notes: 'Check insurance coverage — often free' },
            { name: 'Bottle drying rack', category: 'feeding', notes: '' },

            // Diapering
            { name: 'Newborn diapers (2-3 boxes)', category: 'diapering', notes: 'They go through 10-12/day at first' },
            { name: 'Size 1 diapers (1-2 boxes)', category: 'diapering', notes: 'They grow out of newborn fast' },
            { name: 'Baby wipes (unscented)', category: 'diapering', notes: 'Stock up — you always need more' },
            { name: 'Diaper cream', category: 'diapering', notes: 'Desitin, Aquaphor, or similar' },
            { name: 'Changing pad', category: 'diapering', notes: 'Waterproof with cover' },
            { name: 'Diaper pail', category: 'diapering', notes: 'Ubbi or Diaper Genie' },

            // Clothing
            { name: 'Onesies / bodysuits (6-8)', category: 'clothing', notes: 'Newborn + 0-3 month sizes' },
            { name: 'Sleepers / footie pajamas (4-5)', category: 'clothing', notes: 'Zipper > snaps at 3am' },
            { name: 'Socks or booties', category: 'clothing', notes: '' },
            { name: 'Hats (2-3)', category: 'clothing', notes: 'For warmth and sun protection' },
            { name: 'Mittens (scratch mittens)', category: 'clothing', notes: 'Prevents face scratching' },

            // Health
            { name: 'Baby thermometer', category: 'health', notes: 'Rectal is most accurate for newborns' },
            { name: 'Nail clippers or file', category: 'health', notes: 'Baby nails grow surprisingly fast' },
            { name: 'Bulb syringe / nasal aspirator', category: 'health', notes: 'NoseFrida is popular' },
            { name: 'Baby body wash / shampoo', category: 'health', notes: 'Fragrance-free, gentle' },
            { name: 'Baby lotion', category: 'health', notes: 'For dry skin, fragrance-free' },
            { name: 'Infant Tylenol', category: 'health', notes: 'For after vaccines (ask pediatrician)' },
            { name: 'Baby bathtub', category: 'health', notes: 'With newborn sling insert' },

            // Other
            { name: 'Pacifiers (2-3)', category: 'other', notes: 'Different shapes — baby may prefer one' },
            { name: 'Tummy time mat', category: 'other', notes: 'For development starting week 1' },
            { name: 'Baby books (soft/board)', category: 'other', notes: 'High contrast for newborns' },
        ];

        for (const item of starterItems) {
            await DB.addDoc('items', {
                name: item.name,
                category: item.category,
                status: 'need',
                quantity: 0,
                notes: item.notes,
                link: '',
                addedBy: 'Starter Kit'
            });
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
