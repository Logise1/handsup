// ============================================
// HandsUp — Authentication Module
// ============================================

const Auth = {
    // Sign up with email/password
    async signUp(email, password, displayName) {
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName });

            // Save user data to Firestore
            await db.collection('handsup_users').doc(cred.user.uid).set({
                email,
                displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('¡Cuenta creada con éxito!', 'success');
            return cred.user;
        } catch (error) {
            console.error('Sign up error:', error);
            const messages = {
                'auth/email-already-in-use': 'Este email ya está registrado',
                'auth/invalid-email': 'Email no válido',
                'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres'
            };
            throw new Error(messages[error.code] || error.message);
        }
    },

    // Sign in with email/password
    async signIn(email, password) {
        try {
            const cred = await auth.signInWithEmailAndPassword(email, password);
            Utils.showToast('¡Bienvenido de vuelta!', 'success');
            return cred.user;
        } catch (error) {
            console.error('Sign in error:', error);
            const messages = {
                'auth/user-not-found': 'No existe una cuenta con este email',
                'auth/wrong-password': 'Contraseña incorrecta',
                'auth/invalid-email': 'Email no válido',
                'auth/invalid-credential': 'Credenciales incorrectas'
            };
            throw new Error(messages[error.code] || error.message);
        }
    },

    // Sign out
    async signOut() {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Sign out error:', error);
            Utils.showToast('Error al cerrar sesión', 'error');
        }
    },

    // Get current user
    getCurrentUser() {
        return auth.currentUser;
    },

    // Listen for auth state changes
    onAuthChange(callback) {
        return auth.onAuthStateChanged(callback);
    },

    // Get user display name
    getDisplayName() {
        const user = auth.currentUser;
        return user?.displayName || user?.email?.split('@')[0] || 'Usuario';
    }
};
