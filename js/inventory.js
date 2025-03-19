// Elementos del DOM
const inventoryList = document.getElementById('inventoryList');
const warehouseFilter = document.getElementById('warehouseFilter');
const searchInput = document.getElementById('searchInput');
const inventoryLink = document.getElementById('inventoryLink');

// Variables para almacenar datos
let userWarehouses = [];
let allProducts = [];
let warehouses = {};

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

        // Obtener bodegas asignadas al usuario
        if (userData.assignedWarehouses && userData.assignedWarehouses.length > 0) {
            userWarehouses = userData.assignedWarehouses;
            loadWarehouses(userData.assignedWarehouses);
            loadInventory();
        } else {
            if (inventoryList) {
                inventoryList.innerHTML = `
                    <div class="alert alert-warning">
                        No tienes bodegas asignadas. Contacta al administrador.
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
    }
});

// Cargar bodegas
async function loadWarehouses() {
    try {
        const warehousesSnapshot = await db.collection('warehouses').get();
        
        // Limpiar selector
        if (warehouseFilter) {
            warehouseFilter.innerHTML = '<option value="">Todas las bodegas</option>';
        }
        
        // Almacenar información de bodegas
        warehouses = {};
        
        warehousesSnapshot.forEach(doc => {
            const warehouse = {
                id: doc.id,
                ...doc.data()
            };
            
            warehouses[doc.id] = warehouse;
            
            // Agregar TODAS las bodegas al filtro
            if (warehouseFilter) {
                warehouseFilter.innerHTML += `
                    <option value="${warehouse.id}">${warehouse.name}</option>
                `;
            }
        });
        
        // Configurar evento de cambio de filtro
        if (warehouseFilter) {
            warehouseFilter.addEventListener('change', filterInventory);
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}
// Cargar inventario
// Cargar inventario
async function loadInventory() {
    if (!inventoryList) return;
    
    try {
        // Obtener la bodega seleccionada
        const selectedWarehouse = warehouseFilter ? warehouseFilter.value : null;
        
        let inventoryQuery;
        
        if (selectedWarehouse) {
            // Si hay una bodega seleccionada, cargar solo productos de esa bodega
            inventoryQuery = await db.collection('inventory')
                .where('warehouseId', '==', selectedWarehouse)
                .limit(50)
                .get();
        } else if (userWarehouses.length > 0) {
            // Si no hay bodega seleccionada, cargar productos de bodegas del usuario
            inventoryQuery = await db.collection('inventory')
                .where('warehouseId', 'in', userWarehouses)
                .limit(50)
                .get();
        } else {
            // Si no hay bodegas asignadas, cargar todos los productos
            inventoryQuery = await db.collection('inventory')
                .limit(50)
                .get();
        }
        
        if (inventoryQuery.empty) {
            inventoryList.innerHTML = `
                <div class="alert alert-info">
                    No hay productos en el inventario.
                </div>
            `;
            return;
        }
        
        // Almacenar todos los productos
        allProducts = [];
        
        inventoryQuery.forEach(doc => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordenar productos por nombre
        allProducts.sort((a, b) => a.productName.localeCompare(b.productName));
        
        // Mostrar productos
        displayInventory(allProducts);
        
        // Configurar búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', filterInventory);
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        if (inventoryList) {
            inventoryList.innerHTML = `
                <div class="alert alert-danger">
                    Error al cargar datos. Intenta recargar la página.
                </div>
            `;
        }
    }
}

// Modificar loadWarehouses para recargar inventario al cambiar bodega
async function loadWarehouses() {
    try {
        const warehousesSnapshot = await db.collection('warehouses').get();
        
        // Limpiar selector
        if (warehouseFilter) {
            warehouseFilter.innerHTML = '<option value="">Todas las bodegas</option>';
        }
        
        // Almacenar información de bodegas
        warehouses = {};
        
        warehousesSnapshot.forEach(doc => {
            const warehouse = {
                id: doc.id,
                ...doc.data()
            };
            
            warehouses[doc.id] = warehouse;
            
            // Agregar TODAS las bodegas al filtro
            if (warehouseFilter) {
                warehouseFilter.innerHTML += `
                    <option value="${warehouse.id}">${warehouse.name}</option>
                `;
            }
        });
        
        // Configurar evento de cambio de filtro
        if (warehouseFilter) {
            warehouseFilter.addEventListener('change', () => {
                loadInventory();
            });
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}

// Mostrar inventario
function displayInventory(products) {
    if (!inventoryList) return;
    
    if (products.length === 0) {
        inventoryList.innerHTML = `
            <div class="alert alert-info">
                No se encontraron productos con los filtros aplicados.
            </div>
        `;
        return;
    }
    
    // Agrupar productos por bodega
    const productsByWarehouse = {};
    
    products.forEach(product => {
        const warehouseId = product.warehouseId;
        
        if (!productsByWarehouse[warehouseId]) {
            productsByWarehouse[warehouseId] = [];
        }
        
        productsByWarehouse[warehouseId].push(product);
    });
    
    // Generar HTML
    let html = '';
    
    for (const warehouseId in productsByWarehouse) {
        const warehouseName = warehouses[warehouseId] ? warehouses[warehouseId].name : 'Bodega Desconocida';
        
        html += `
            <div class="warehouse-section mb-4">
                <h4>${warehouseName}</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Último Precio</th>
                                <th>Última Actualización</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        productsByWarehouse[warehouseId].forEach(product => {
            const lastUpdateDate = product.updatedAt ? product.updatedAt.toDate().toLocaleDateString() : 'N/A';
            const price = product.lastPrice ? `$${product.lastPrice.toFixed(2)}` : 'N/A';
            
            html += `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantity}</td>
                    <td>${price}</td>
                    <td>${lastUpdateDate}</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    inventoryList.innerHTML = html;
}

// Filtrar inventario
function filterInventory() {
    if (!allProducts || !searchInput || !warehouseFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const warehouseId = warehouseFilter.value;
    
    // Aplicar filtros
    let filteredProducts = allProducts;
    
    // Filtrar por bodega
    if (warehouseId) {
        filteredProducts = filteredProducts.filter(product => product.warehouseId === warehouseId);
    }
    
    // Filtrar por término de búsqueda (más flexible)
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.productName.toLowerCase().includes(searchTerm) ||
            (product.productDescription && product.productDescription.toLowerCase().includes(searchTerm)) ||
            product.quantity.toString().includes(searchTerm) ||
            (product.lastPrice && product.lastPrice.toString().includes(searchTerm))
        );
    }
    
    // Mostrar resultados filtrados
    displayInventory(filteredProducts);
}

// Modificar displayInventory para mostrar más información
function displayInventory(products) {
    if (!inventoryList) return;
    
    if (products.length === 0) {
        inventoryList.innerHTML = `
            <div class="alert alert-info">
                No se encontraron productos con los filtros aplicados.
            </div>
        `;
        return;
    }
    
    // Agrupar productos por bodega
    const productsByWarehouse = {};
    
    products.forEach(product => {
        const warehouseId = product.warehouseId;
        
        if (!productsByWarehouse[warehouseId]) {
            productsByWarehouse[warehouseId] = [];
        }
        
        productsByWarehouse[warehouseId].push(product);
    });
    
    // Generar HTML
    let html = '';
    
    for (const warehouseId in productsByWarehouse) {
        const warehouseName = warehouses[warehouseId] ? warehouses[warehouseId].name : 'Bodega Desconocida';
        
        html += `
            <div class="warehouse-section mb-4">
                <h4>${warehouseName}</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Último Precio</th>
                                <th>Última Actualización</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        productsByWarehouse[warehouseId].forEach(product => {
            const lastUpdateDate = product.updatedAt ? product.updatedAt.toDate().toLocaleDateString() : 'N/A';
            const price = product.lastPrice ? `$${product.lastPrice.toFixed(2)}` : 'N/A';
            
            html += `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantity}</td>
                    <td>${price}</td>
                    <td>${lastUpdateDate}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewProductDetails('${product.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    inventoryList.innerHTML = html;
}

// Agregar función para ver detalles del producto (placeholder)
function viewProductDetails(productId) {
    alert(`Detalles del producto con ID: ${productId}\nEsta funcionalidad estará disponible próximamente.`);
}

// Cargar inventario
async function loadInventory() {
    if (!inventoryList) return;
    
    try {
        // Obtener la bodega seleccionada
        const selectedWarehouse = warehouseFilter ? warehouseFilter.value : null;
        
        let inventoryQuery;
        
        if (selectedWarehouse) {
            // Si hay una bodega seleccionada, cargar solo productos de esa bodega
            inventoryQuery = await db.collection('inventory')
                .where('warehouseId', '==', selectedWarehouse)
                .limit(100)  // Aumentar límite de registros
                .get();
        } else if (userWarehouses.length > 0) {
            // Si no hay bodega seleccionada, cargar productos de bodegas del usuario
            inventoryQuery = await db.collection('inventory')
                .where('warehouseId', 'in', userWarehouses)
                .limit(100)
                .get();
        } else {
            // Si no hay bodegas asignadas, cargar todos los productos
            inventoryQuery = await db.collection('inventory')
                .limit(100)
                .get();
        }
        
        if (inventoryQuery.empty) {
            inventoryList.innerHTML = `
                <div class="alert alert-info">
                    No hay productos en el inventario.
                </div>
            `;
            return;
        }
        
        // Almacenar todos los productos
        allProducts = [];
        
        inventoryQuery.forEach(doc => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordenar productos por nombre
        allProducts.sort((a, b) => a.productName.localeCompare(b.productName));
        
        // Mostrar productos
        displayInventory(allProducts);
        
        // Configurar búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', filterInventory);
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        if (inventoryList) {
            inventoryList.innerHTML = `
                <div class="alert alert-danger">
                    Error al cargar datos. Intenta recargar la página.
                </div>
            `;
        }
    }
}

// Modificar loadInventory para cargar más registros

// Si estamos en otra página, configurar el enlace al inventario
if (inventoryLink && window.location.pathname.indexOf('inventory.html') === -1) {
    inventoryLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'inventory.html';
    });
}