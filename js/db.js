const DB = {
    db: null,
    storage: null,

    init() {
        if (!this.db) {
            firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            this.storage = firebase.storage();
        }
    },

    getFamilyId() {
        return Auth.familyId;
    },

    collection(name) {
        const familyId = this.getFamilyId();
        if (!familyId) throw new Error('No family context');
        return this.db.collection('families').doc(familyId).collection(name);
    },

    async getDoc(collection, docId) {
        const doc = await this.collection(collection).doc(docId).get();
        return doc.exists ? doc.data() : null;
    },

    async setDoc(collection, docId, data) {
        await this.collection(collection).doc(docId).set(data, { merge: true });
    },

    async addDoc(collection, data) {
        const user = Auth.currentUser;
        const ref = await this.collection(collection).add({
            ...data,
            createdBy: user ? user.uid : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
    },

    async updateDoc(collection, docId, data) {
        await this.collection(collection).doc(docId).update(data);
    },

    async deleteDoc(collection, docId) {
        await this.collection(collection).doc(docId).delete();
    },

    async getAll(collection, orderBy, direction = 'desc') {
        const snapshot = await this.collection(collection)
            .orderBy(orderBy, direction)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    onSnapshot(collection, orderBy, direction, callback) {
        return this.collection(collection)
            .orderBy(orderBy, direction)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(data);
            }, err => {
                console.warn(`[DB] Snapshot error on ${collection}:`, err.message);
            });
    },

    async uploadPhoto(file, path) {
        const familyId = this.getFamilyId();
        const fullPath = `families/${familyId}/${path}`;
        const ref = this.storage.ref().child(fullPath);
        await ref.put(file);
        return ref.getDownloadURL();
    },

    async deletePhoto(path) {
        try {
            const familyId = this.getFamilyId();
            const fullPath = path.startsWith('families/') ? path : `families/${familyId}/${path}`;
            await this.storage.ref().child(fullPath).delete();
        } catch (e) {}
    },

    async getFamily() {
        const familyId = this.getFamilyId();
        if (!familyId) return null;
        const doc = await this.db.collection('families').doc(familyId).get();
        return doc.exists ? doc.data() : null;
    },

    async getFamilyMembers() {
        const family = await this.getFamily();
        if (!family || !family.members) return [];
        const members = [];
        for (const uid of family.members) {
            const userDoc = await this.db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                members.push({ uid, ...userDoc.data() });
            }
        }
        return members;
    }
};
