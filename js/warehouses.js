// Elementos del DOM
const warehousesList = document.getElementById('warehousesList');
const usersList = document.getElementById('usersList');
const addWarehouseForm = document.getElementById('addWarehouseForm');
const assignWarehouseForm = document.getElementById('assignWarehouseForm');
const warehousesCheckboxes = document.getElementById('warehousesCheckboxes');

// Variable para almacenar las bodegas
let allWarehouses = [];

// Verificar autenticación
auth.onAuthStateChanged(async (user) => {
    if (!user || !user.emailVerified) {
        // Redirigir al login si no está autenticado
        window.location.href = 'login.html';
        return;
    }

    try {
        // Obtener datos del usuario
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // Mostrar nombre del usuario
        if (document.getElementById('userDisplay')) {
            document.getElementById('userDisplay').textContent = userData.fullName;
        }

        // Cargar bodegas y usuarios
        loadWarehouses();
        loadUsers();
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
    }
});

// Cargar bodegas
async function loadWarehouses() {
    try {
        const warehousesQuery = await db.collection('warehouses').get();
        
        if (warehousesQuery.empty) {
            warehousesList.innerHTML = `
                <div class="alert alert-info">
                    No hay bodegas registradas. Crea una nueva bodega.
                </div>
            `;
            return;
        }

        // Almacenar todas las bodegas
        allWarehouses = [];
        warehousesQuery.forEach(doc => {
            allWarehouses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Mostrar lista de bodegas
        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Ubicación</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        allWarehouses.forEach(warehouse => {
            html += `
                <tr>
                    <td>${warehouse.name}</td>
                    <td>${warehouse.location || 'No especificada'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteWarehouse('${warehouse.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        warehousesList.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
        warehousesList.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar bodegas. Intenta recargar la página.
            </div>
        `;
    }
}

// Cargar usuarios
async function loadUsers() {
    try {
        const usersQuery = await db.collection('users').get();
        
        if (usersQuery.empty) {
            usersList.innerHTML = `
                <div class="alert alert-info">
                    No hay usuarios registrados.
                </div>
            `;
            return;
        }

        // Mostrar lista de usuarios con sus bodegas asignadas
        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Bodegas Asignadas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const usersData = [];
        usersQuery.forEach(doc => {
            usersData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        for (const user of usersData) {
            // Obtener nombres de bodegas asignadas
            let assignedWarehouses = 'Ninguna';
            if (user.assignedWarehouses && user.assignedWarehouses.length > 0) {
                const warehouseNames = [];
                for (const warehouseId of user.assignedWarehouses) {
                    const warehouse = allWarehouses.find(w => w.id === warehouseId);
                    if (warehouse) {
                        warehouseNames.push(warehouse.name);
                    }
                }
                assignedWarehouses = warehouseNames.join(', ');
            }

            html += `
                <tr>
                    <td>${user.fullName || 'Sin nombre'}</td>
                    <td>${user.email}</td>
                    <td>${assignedWarehouses}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-assign-warehouse" 
                                data-user-id="${user.id}" 
                                data-user-name="${user.fullName || user.email}" 
                                data-assigned-warehouses='${JSON.stringify(user.assignedWarehouses || [])}'>
                            <i class="bi bi-building"></i> Asignar Bodegas
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        usersList.innerHTML = html;
        
        // Configurar botones de asignación
        configurarBotonesAsignacion();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        usersList.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar usuarios. Intenta recargar la página.
            </div>
        `;
    }
}

// Configurar botones de asignación de bodegas
function configurarBotonesAsignacion() {
    const assignButtons = document.querySelectorAll('.btn-assign-warehouse');
    
    assignButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-name');
            const assignedWarehouses = JSON.parse(this.getAttribute('data-assigned-warehouses') || '[]');
            
            openAssignWarehouseModal(userId, userName, assignedWarehouses);
        });
    });
}

// Abrir modal para asignar bodegas
function openAssignWarehouseModal(userId, userName, assignedWarehouses = []) {
    document.getElementById('userId').value = userId;
    document.getElementById('userName').textContent = userName;

    // Mostrar checkboxes de bodegas
    let html = '<div class="form-check">';
    allWarehouses.forEach(warehouse => {
        const isChecked = assignedWarehouses.includes(warehouse.id) ? 'checked' : '';
        html += `
            <div class="mb-2">
                <input class="form-check-input" type="checkbox" value="${warehouse.id}" id="warehouse_${warehouse.id}" ${isChecked}>
                <label class="form-check-label" for="warehouse_${warehouse.id}">
                    ${warehouse.name} (${warehouse.location || 'Sin ubicación'})
                </label>
            </div>
        `;
    });
    html += '</div>';

    warehousesCheckboxes.innerHTML = html;
    
    // Mostrar modal
    const assignModal = new bootstrap.Modal(document.getElementById('assignWarehouseModal'));
    assignModal.show();
}

// Agregar nueva bodega
if (addWarehouseForm) {
    addWarehouseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('warehouseName').value;
        const location = document.getElementById('warehouseLocation').value;
        
        try {
            await db.collection('warehouses').add({
                name,
                location,
                createdAt: new Date()
            });
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('addWarehouseModal'));
            modal.hide();
            addWarehouseForm.reset();
            
            // Recargar bodegas
            loadWarehouses();
            
            alert('Bodega creada correctamente');
        } catch (error) {
            console.error('Error al crear bodega:', error);
            alert('Error al crear bodega: ' + error.message);
        }
    });
}

// Asignar bodegas a usuario
if (assignWarehouseForm) {
    assignWarehouseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        
        // Obtener bodegas seleccionadas
        const selectedWarehouses = [];
        allWarehouses.forEach(warehouse => {
            const checkbox = document.getElementById(`warehouse_${warehouse.id}`);
            if (checkbox && checkbox.checked) {
                selectedWarehouses.push(warehouse.id);
            }
        });
        
        try {
            await db.collection('users').doc(userId).update({
                assignedWarehouses: selectedWarehouses
            });
            
            // Cerrar modal
            const assignModal = bootstrap.Modal.getInstance(document.getElementById('assignWarehouseModal'));
            assignModal.hide();
            
            // Recargar usuarios
            loadUsers();
            
            alert('Bodegas asignadas correctamente');
        } catch (error) {
            console.error('Error al asignar bodegas:', error);
            alert('Error al asignar bodegas: ' + error.message);
        }
    });
}

// Eliminar bodega
async function deleteWarehouse(warehouseId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta bodega? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // Verificar si hay productos en esta bodega
        const productsQuery = await db.collection('inventory')
            .where('warehouseId', '==', warehouseId)
            .limit(1)
            .get();
        
        if (!productsQuery.empty) {
            alert('No se puede eliminar esta bodega porque tiene productos asociados.');
            return;
        }
        
        // Eliminar bodega
        await db.collection('warehouses').doc(warehouseId).delete();
        
        // Actualizar usuarios que tengan esta bodega asignada
        const usersQuery = await db.collection('users')
            .where('assignedWarehouses', 'array-contains', warehouseId)
            .get();
        
        const batch = db.batch();
        usersQuery.forEach(doc => {
            const userData = doc.data();
            const updatedWarehouses = userData.assignedWarehouses.filter(id => id !== warehouseId);
            batch.update(doc.ref, { assignedWarehouses: updatedWarehouses });
        });
        
        await batch.commit();
        
        // Recargar bodegas y usuarios
        loadWarehouses();
        loadUsers();
        
        alert('Bodega eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar bodega:', error);
        alert('Error al eliminar bodega: ' + error.message);
    }
}

// Manejar enlaces del menú
document.addEventListener('DOMContentLoaded', () => {
    // Enlace a entradas
    const entriesLink = document.getElementById('entriesLink');
    if (entriesLink) {
        entriesLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'entries.html';
        });
    }

    // Enlace a salidas
    const exitsLink = document.getElementById('exitsLink');
    if (exitsLink) {
        exitsLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'exits.html';
        });
    }
    
    // Enlace a inventario
    const inventoryLink = document.getElementById('inventoryLink');
    if (inventoryLink) {
        inventoryLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'inventory.html';
        });
    }
    
    // Cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut()
                .then(() => {
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error('Error al cerrar sesión:', error);
                });
        });
    }
});
