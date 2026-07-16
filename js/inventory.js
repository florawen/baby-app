const Inventory = {
    items: [],
    editingId: null,
    quantityEditId: null,
    unsubscribe: null,

    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('items', 'createdAt', 'desc', (items) => {
            this.items = items.filter(i => i.status === 'have');
            this.render();
        });
    },

    bindEvents() {
        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('item-modal-title').textContent = 'Add Item';
            document.getElementById('item-name').value = '';
            document.getElementById('item-category').value = 'other';
            document.getElementById('item-quantity').value = '';
            document.getElementById('item-threshold').value = '';
            document.getElementById('item-notes').value = '';
            document.getElementById('item-modal').classList.remove('hidden');
        });

        document.getElementById('save-item').addEventListener('click', () => this.saveItem());

        document.getElementById('qty-minus').addEventListener('click', () => {
            const display = document.getElementById('qty-display');
            const val = Math.max(0, parseInt(display.textContent) - 1);
            display.textContent = val;
        });

        document.getElementById('qty-plus').addEventListener('click', () => {
            const display = document.getElementById('qty-display');
            display.textContent = parseInt(display.textContent) + 1;
        });

        document.getElementById('save-quantity').addEventListener('click', () => this.saveQuantity());
        document.getElementById('mark-need-more').addEventListener('click', () => this.markNeedMore());
    },

    async saveItem() {
        const name = document.getElementById('item-name').value.trim();
        if (!name) return;

        const category = document.getElementById('item-category').value;
        const notes = document.getElementById('item-notes').value.trim();
        const quantity = parseInt(document.getElementById('item-quantity').value) || 0;
        const threshold = parseInt(document.getElementById('item-threshold').value) || null;

        const item = {
            name,
            category,
            status: 'have',
            quantity,
            threshold,
            lowFlag: threshold ? quantity <= threshold : false,
            notes,
            addedBy: Auth.currentUser ? (Auth.currentUser.displayName || Auth.currentUser.email) : ''
        };

        if (this.editingId) {
            await DB.updateDoc('items', this.editingId, item);
        } else {
            await DB.addDoc('items', item);
        }

        document.getElementById('item-modal').classList.add('hidden');
        this.editingId = null;
    },

    openQuantityModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        this.quantityEditId = id;
        document.getElementById('quantity-modal-title').textContent = item.name;
        document.getElementById('qty-display').textContent = item.quantity || 0;
        document.getElementById('quantity-modal').classList.remove('hidden');
    },

    async saveQuantity() {
        if (!this.quantityEditId) return;
        const quantity = parseInt(document.getElementById('qty-display').textContent);
        const item = this.items.find(i => i.id === this.quantityEditId);
        const lowFlag = item && item.threshold ? quantity <= item.threshold : (item ? item.lowFlag : false);
        await DB.updateDoc('items', this.quantityEditId, { quantity, lowFlag });
        document.getElementById('quantity-modal').classList.add('hidden');
        this.quantityEditId = null;
    },

    async markNeedMore() {
        if (!this.quantityEditId) return;
        await DB.updateDoc('items', this.quantityEditId, { lowFlag: true });
        document.getElementById('quantity-modal').classList.add('hidden');
        this.quantityEditId = null;
    },

    editItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        this.editingId = id;
        document.getElementById('item-modal-title').textContent = 'Edit Item';
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category || 'other';
        document.getElementById('item-quantity').value = item.quantity || '';
        document.getElementById('item-threshold').value = item.threshold || '';
        document.getElementById('item-notes').value = item.notes || '';
        document.getElementById('item-modal').classList.remove('hidden');
    },

    async deleteItem(id) {
        if (!confirm('Delete this item?')) return;
        await DB.deleteDoc('items', id);
    },

    render() {
        const list = document.getElementById('stuff-list');

        if (this.items.length === 0) {
            list.innerHTML = '<p class="empty-state">No items yet. Add things you already have to track quantities!</p>';
            return;
        }

        list.innerHTML = this.items.map(item => {
            const isLow = item.lowFlag || (item.threshold && item.quantity <= item.threshold);
            const badge = isLow ? '<span class="low-badge">Low</span>' : '';
            const categoryLabel = item.category ? `<span class="item-category">${item.category}</span>` : '';
            const notes = item.notes ? `<span class="item-notes">${this.escapeHtml(item.notes)}</span>` : '';

            return `
                <div class="stuff-item ${isLow ? 'stuff-item-low' : ''}" onclick="Inventory.openQuantityModal('${item.id}')">
                    <div class="stuff-item-main">
                        <div class="stuff-item-name">${this.escapeHtml(item.name)} ${badge}</div>
                        <div class="stuff-item-meta">${categoryLabel} ${notes}</div>
                    </div>
                    <div class="stuff-item-qty">${item.quantity || 0}</div>
                    <div class="stuff-item-actions">
                        <button class="btn-icon-small" onclick="event.stopPropagation(); Inventory.editItem('${item.id}')">✏️</button>
                        <button class="btn-icon-small" onclick="event.stopPropagation(); Inventory.deleteItem('${item.id}')">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
