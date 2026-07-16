const Auth = {
    currentUser: null,
    familyId: null,
    userRole: null,
    pendingInvite: null,

    init() {
        this.parseInviteFromURL();

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.resolveFamily(user);
            } else {
                this.currentUser = null;
                this.familyId = null;
                this.userRole = null;
                this.showAuthScreen();
            }
        });
    },

    parseInviteFromURL() {
        const hash = window.location.hash;
        const match = hash.match(/^#\/join\/([^/]+)\/([^/]+)$/);
        if (match) {
            this.pendingInvite = { familyId: match[1], inviteId: match[2] };
        }
    },

    async resolveFamily(user) {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();

        if (userDoc.exists && userDoc.data().familyId) {
            this.familyId = userDoc.data().familyId;
            this.userRole = userDoc.data().role || 'member';
            this.hideAllScreens();
            App.init();
        } else if (this.pendingInvite) {
            await this.acceptInvite(user);
        } else {
            this.showCreateFamilyScreen();
        }
    },

    async register(email, password, displayName) {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName });
        return cred.user;
    },

    async login(email, password) {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
        return cred.user;
    },

    async logout() {
        await firebase.auth().signOut();
    },

    async createFamily(user, familyName) {
        const familyId = this.generateId();
        const db = firebase.firestore();
        const batch = db.batch();

        batch.set(db.collection('families').doc(familyId), {
            name: familyName,
            createdBy: user.uid,
            members: [user.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.set(db.collection('users').doc(user.uid), {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            familyId: familyId,
            role: 'member',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        this.familyId = familyId;
        this.userRole = 'member';
        this.hideAllScreens();
        App.init();
    },

    async acceptInvite(user) {
        const { familyId, inviteId } = this.pendingInvite;
        const db = firebase.firestore();

        const inviteDoc = await db.collection('families').doc(familyId).collection('invites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            this.showError('auth-error', 'This invite link is invalid.');
            this.pendingInvite = null;
            this.showCreateFamilyScreen();
            return;
        }

        const invite = inviteDoc.data();
        if (invite.used) {
            this.showError('auth-error', 'This invite has already been used.');
            this.pendingInvite = null;
            this.showCreateFamilyScreen();
            return;
        }

        if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
            this.showError('auth-error', 'This invite has expired.');
            this.pendingInvite = null;
            this.showCreateFamilyScreen();
            return;
        }

        const role = invite.role || 'member';
        const batch = db.batch();

        if (role === 'member') {
            batch.update(db.collection('families').doc(familyId), {
                members: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
        } else {
            batch.update(db.collection('families').doc(familyId), {
                guests: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
        }

        batch.set(db.collection('users').doc(user.uid), {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            familyId: familyId,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.update(db.collection('families').doc(familyId).collection('invites').doc(inviteId), {
            used: true,
            usedBy: user.uid
        });

        await batch.commit();

        this.familyId = familyId;
        this.userRole = role;
        this.pendingInvite = null;
        window.location.hash = '';
        this.hideAllScreens();
        App.init();
    },

    async generateInviteLink(role = 'member') {
        const db = firebase.firestore();
        const inviteRef = db.collection('families').doc(this.familyId).collection('invites').doc();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await inviteRef.set({
            createdBy: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            role: role,
            used: false
        });

        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#/join/${this.familyId}/${inviteRef.id}`;
    },

    showAuthScreen() {
        this.hideAllScreens();
        const screen = document.getElementById('auth-screen');
        screen.classList.remove('hidden');
        this.showLoginForm();
    },

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('auth-title').textContent = 'Sign In';
        document.getElementById('auth-toggle-text').innerHTML =
            'Don\'t have an account? <a href="#" id="show-register">Sign up</a>';
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
    },

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('auth-title').textContent = 'Create Account';
        document.getElementById('auth-toggle-text').innerHTML =
            'Already have an account? <a href="#" id="show-login">Sign in</a>';
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
    },

    showCreateFamilyScreen() {
        this.hideAllScreens();
        document.getElementById('create-family-screen').classList.remove('hidden');
    },

    hideAllScreens() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('create-family-screen').classList.add('hidden');
        document.getElementById('guest-registry').classList.add('hidden');
    },

    showError(elementId, msg) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    },

    generateId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },

    setLoading(btn, loading) {
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = 'Loading...';
            btn.disabled = true;
        } else {
            btn.textContent = btn.dataset.originalText || btn.textContent;
            btn.disabled = false;
        }
    },

    bindEvents() {
        document.getElementById('login-btn').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            if (!email || !password) {
                this.showError('auth-error', 'Please fill in all fields.');
                return;
            }
            const btn = document.getElementById('login-btn');
            this.setLoading(btn, true);
            try {
                await this.login(email, password);
            } catch (e) {
                this.showError('auth-error', this.friendlyError(e.code));
                this.setLoading(btn, false);
            }
        });

        document.getElementById('register-btn').addEventListener('click', async () => {
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-password-confirm').value;
            if (!name || !email || !password) {
                this.showError('auth-error', 'Please fill in all fields.');
                return;
            }
            if (password.length < 6) {
                this.showError('auth-error', 'Password must be at least 6 characters.');
                return;
            }
            if (password !== confirm) {
                this.showError('auth-error', 'Passwords don\'t match.');
                return;
            }
            const btn = document.getElementById('register-btn');
            this.setLoading(btn, true);
            try {
                await this.register(email, password, name);
            } catch (e) {
                this.showError('auth-error', this.friendlyError(e.code));
                this.setLoading(btn, false);
            }
        });

        document.getElementById('create-family-btn').addEventListener('click', async () => {
            const name = document.getElementById('family-name-input').value.trim();
            if (!name) {
                this.showError('family-error', 'Please enter a family name.');
                return;
            }
            const btn = document.getElementById('create-family-btn');
            this.setLoading(btn, true);
            try {
                await this.createFamily(this.currentUser, name);
            } catch (e) {
                this.showError('family-error', 'Something went wrong. Please try again.');
                this.setLoading(btn, false);
            }
        });

        document.getElementById('forgot-password-link').addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            if (!email) {
                this.showError('auth-error', 'Enter your email above, then tap "Forgot password?"');
                return;
            }
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                this.showError('auth-error', 'Reset link sent! Check your inbox.');
            } catch (err) {
                this.showError('auth-error', this.friendlyError(err.code));
            }
        });

        document.getElementById('login-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('login-password').focus();
        });
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('login-btn').click();
        });
        document.getElementById('register-password-confirm').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('register-btn').click();
        });
    },

    friendlyError(code) {
        const messages = {
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/weak-password': 'Password must be at least 6 characters.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many attempts. Please try again later.'
        };
        return messages[code] || 'Something went wrong. Please try again.';
    }
};
