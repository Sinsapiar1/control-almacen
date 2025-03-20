// ui-helpers.js - Funciones para mejorar la interfaz de usuario

// Función para mostrar notificaciones tipo Toast
function showToast(message, type = 'success') {
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed bottom-0 end-0 m-3`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Contenido del toast
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Añadir al documento
    document.body.appendChild(toast);
    
    // Inicializar y mostrar
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Eliminar después de ocultarse
    toast.addEventListener('hidden.bs.toast', function () {
        document.body.removeChild(toast);
    });
}

// Mejorar el feedback visual en formularios
function setupFormFeedback() {
    // Añadir clase was-validated cuando se envía un formulario
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// Añadir efecto hover a las tarjetas dinámicamente
function enhanceCardInteractions() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
        });
    });
}

// Inicializar cuando el documento está listo
document.addEventListener('DOMContentLoaded', function() {
    setupFormFeedback();
    enhanceCardInteractions();
});