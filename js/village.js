const Village = {
    contacts: [],
    editingId: null,
    unsubscribe: null,

    init() {
        this.bindEvents();
        this.unsubscribe = DB.onSnapshot('contacts', 'name', 'asc', (contacts) => {
            this.contacts = contacts;
            this.render();
        });
    },

    bindEvents() {
        document.getElementById('add-contact-btn').addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('contact-modal-title').textContent = 'Add Contact';
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-role').value = '';
            document.getElementById('contact-role-other').value = '';
            document.getElementById('contact-role-other').classList.add('hidden');
            document.getElementById('contact-phone').value = '';
            document.getElementById('contact-notes-input').value = '';
            document.getElementById('contact-modal').classList.remove('hidden');
        });

        document.getElementById('contact-role').addEventListener('change', (e) => {
            const otherInput = document.getElementById('contact-role-other');
            if (e.target.value === 'Other') {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = '';
            }
        });

        document.getElementById('save-contact').addEventListener('click', () => this.save());
    },

    async save() {
        const name = document.getElementById('contact-name').value.trim();
        let role = document.getElementById('contact-role').value;
        if (role === 'Other') {
            role = document.getElementById('contact-role-other').value.trim() || 'Other';
        }
        const phone = document.getElementById('contact-phone').value.trim();
        const notes = document.getElementById('contact-notes-input').value.trim();

        if (!name) return;

        if (this.editingId) {
            await DB.updateDoc('contacts', this.editingId, { name, role, phone, notes });
        } else {
            await DB.addDoc('contacts', { name, role, phone, notes });
        }

        document.getElementById('contact-modal').classList.add('hidden');
        this.editingId = null;
    },

    edit(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;

        this.editingId = id;
        document.getElementById('contact-modal-title').textContent = 'Edit Contact';
        document.getElementById('contact-name').value = contact.name;

        const roleSelect = document.getElementById('contact-role');
        const otherInput = document.getElementById('contact-role-other');
        const knownRoles = [...roleSelect.options].map(o => o.value);
        if (contact.role && !knownRoles.includes(contact.role)) {
            roleSelect.value = 'Other';
            otherInput.value = contact.role;
            otherInput.classList.remove('hidden');
        } else {
            roleSelect.value = contact.role || '';
            otherInput.value = '';
            otherInput.classList.add('hidden');
        }

        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-notes-input').value = contact.notes || '';
        document.getElementById('contact-modal').classList.remove('hidden');
    },

    async delete(id) {
        await DB.deleteDoc('contacts', id);
    },

    render() {
        const container = document.getElementById('contacts-list');

        if (this.contacts.length === 0) {
            container.innerHTML = '<p class="empty-state">Your support network goes here. Add your pediatrician, lactation consultant, or anyone you might need to reach quickly.</p>';
            return;
        }

        const roleOrder = ['Emergency', 'Pediatrician', 'OB/GYN', 'Lactation Consultant', 'Doula', 'Midwife', 'Postpartum Therapist', 'Aunty', 'Grandma', 'Grandpa', 'Family', 'Friend', 'Other'];

        const sorted = [...this.contacts].sort((a, b) => {
            const ai = roleOrder.indexOf(a.role);
            const bi = roleOrder.indexOf(b.role);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        container.innerHTML = sorted.map(c => `
            <div class="contact-card">
                <div class="contact-top">
                    <span class="contact-name">${this.escapeHtml(c.name)}</span>
                    ${c.role ? `<span class="contact-role">${this.escapeHtml(c.role)}</span>` : ''}
                </div>
                ${c.phone ? `<a href="tel:${c.phone}" class="contact-phone">📞 ${this.escapeHtml(c.phone)}</a>` : ''}
                ${c.notes ? `<div class="contact-notes">${this.escapeHtml(c.notes)}</div>` : ''}
                <div class="contact-actions">
                    <button onclick="Village.edit('${c.id}')">Edit</button>
                    <button onclick="Village.delete('${c.id}')">Delete</button>
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
