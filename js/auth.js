// Función para registrar un nuevo usuario
function registerUser(email, password, fullName) {
    // Crear usuario con email y contraseña
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Enviar email de verificación
            userCredential.user.sendEmailVerification();
            
            // Guardar información adicional del usuario en Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                fullName: fullName,
                email: email,
                role: 'regular', // Rol por defecto
                createdAt: new Date(),
                assignedWarehouses: []
            });
        })
        .then(() => {
            alert('Registro exitoso. Por favor verifica tu correo electrónico.');
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Error al registrar:', error);
            alert('Error al registrar: ' + error.message);
        });
}

// Manejar el formulario de registro
if (document.getElementById('registerForm')) {
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const fullName = document.getElementById('fullName').value;
        
        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }
        
        registerUser(email, password, fullName);
    });
}

// Función para iniciar sesión
function loginUser(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Verificar si el correo está verificado
            if (!userCredential.user.emailVerified) {
                alert('Por favor verifica tu correo electrónico antes de iniciar sesión.');
                auth.signOut();
                return;
            }
            
            // Redireccionar al dashboard
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            console.error('Error al iniciar sesión:', error);
            alert('Error al iniciar sesión: ' + error.message);
        });
}

// Manejar el formulario de inicio de sesión
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        loginUser(email, password);
    });
}

// Función para restablecer la contraseña
function resetPassword(email) {
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert('Se ha enviado un correo para restablecer tu contraseña.');
        })
        .catch((error) => {
            console.error('Error al restablecer contraseña:', error);
            alert('Error: ' + error.message);
        });
}

// Manejar el enlace de olvidé mi contraseña
if (document.getElementById('forgotPassword')) {
    document.getElementById('forgotPassword').addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt('Ingresa tu correo electrónico para restablecer la contraseña:');
        if (email) {
            resetPassword(email);
        }
    });
}

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
    // En páginas que requieren autenticación
    const requiresAuth = ['dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (requiresAuth.includes(currentPage)) {
        if (!user || !user.emailVerified) {
            // Si no está autenticado, redirigir al login
            window.location.href = 'login.html';
        }
    }
});

// Función para convertir un usuario en administrador
// Esta función se puede llamar desde la consola del navegador: promoteToAdmin()
window.promoteToAdmin = async function() {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Debes iniciar sesión para realizar esta acción.');
        return;
    }
    
    try {
        await db.collection('users').doc(user.uid).update({
            role: 'admin'
        });
        
        alert('¡Ahora eres administrador! Recarga la página para ver los cambios.');
    } catch (error) {
        console.error('Error al convertir en administrador:', error);
        alert('Error: ' + error.message);
    }
}