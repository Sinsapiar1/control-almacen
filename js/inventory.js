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
    try {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        // Crear modal dinámicamente
        const modalHTML = document.createElement('div');
        modalHTML.innerHTML = `
            <div class="modal fade" id="productDetailsModal">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalles del Producto: ${product.productName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h6>Información General</h6>
                                            <p><strong>Cantidad Actual:</strong> 
                                                <span class="badge bg-${getStockStatusColor(product.quantity)}">
                                                    ${product.quantity} unidades
                                                </span>
                                            </p>
                                            <p><strong>Último Precio:</strong> $${product.lastPrice?.toFixed(2) || 'N/A'}</p>
                                            <p><strong>Valor Total:</strong> $${(product.quantity * (product.lastPrice || 0)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h6>Ubicación</h6>
                                            <p><strong>Bodega:</strong> ${warehouses[product.warehouseId]?.name || 'Desconocida'}</p>
                                            <p><strong>Última Actualización:</strong> ${product.updatedAt?.toDate().toLocaleDateString() || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">Movimientos Recientes</h6>
                                        <div class="btn-group btn-group-sm" role="group">
                                            <button type="button" class="btn btn-outline-primary active" onclick="filterMovements('all')">
                                                Todos
                                            </button>
                                            <button type="button" class="btn btn-outline-success" onclick="filterMovements('entry')">
                                                Entradas
                                            </button>
                                            <button type="button" class="btn btn-outline-danger" onclick="filterMovements('exit')">
                                                Salidas
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div id="movimientosList">
                                        <p class="text-center">
                                            <i class="bi bi-hourglass-split"></i> Cargando movimientos...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const oldModal = document.getElementById('productDetailsModal');
        if (oldModal) {
            oldModal.remove();
        }

        // Añadir nuevo modal al DOM
        document.body.appendChild(modalHTML);

        // Inicializar y mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('productDetailsModal'));
        modal.show();

        // Cargar movimientos
        loadProductMovements(product.productName);

    } catch (error) {
        console.error('Error al mostrar detalles:', error);
        alert('Error al cargar detalles del producto');
    }
}

function getStockStatusColor(quantity) {
    if (quantity <= 0) return 'danger';
    if (quantity < 10) return 'warning';
    return 'success';
}

let movimientosFiltrados = [];



function filterMovements(type) {
    const movimientosList = document.getElementById('movimientosList');
    let filtered = movimientosFiltrados;

    if (type === 'entry') {
        filtered = movimientosFiltrados.filter(m => m.type === 'entry');
    } else if (type === 'exit') {
        filtered = movimientosFiltrados.filter(m => ['exit', 'waste'].includes(m.type));
    }

    if (filtered.length === 0) {
        movimientosList.innerHTML = `
            <div class="alert alert-info">
                No hay movimientos de este tipo para el producto
            </div>
        `;
    } else {
        displayMovements(filtered);
    }
}



async function loadProductMovements(productName) {
    const movimientosList = document.getElementById('movimientosList');
    
    try {
        const transactionsQuery = await db.collection('transactions')
            .where('products', 'array-contains', {productName: productName})
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        if (transactionsQuery.empty) {
            movimientosList.innerHTML = `
                <div class="alert alert-info">
                    No hay movimientos registrados para este producto
                </div>
            `;
            return;
        }

        const movements = [];
        transactionsQuery.forEach(doc => {
            const transaction = doc.data();
            const productMovement = transaction.products?.find(p => 
                p.productName === productName
            );

            if (productMovement) {
                movements.push({
                    date: transaction.timestamp?.toDate(),
                    type: transaction.type,
                    quantity: productMovement.quantity,
                    price: productMovement.price,
                    reference: getTransactionReference(transaction),
                    warehouse: warehouses[transaction.warehouseId]?.name || 'Desconocida'
                });
            }
        });

        movimientosFiltrados = movements;
        displayMovements(movements);

    } catch (error) {
        console.error('Error al cargar movimientos:', error);
        movimientosList.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar movimientos. Intente nuevamente.
            </div>
        `;
    }
}


function displayMovements(movements) {
    const movimientosList = document.getElementById('movimientosList');

    if (movements.length === 0) {
        movimientosList.innerHTML = `
            <div class="alert alert-info">
                No hay movimientos registrados para este producto
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Referencia</th>
                        <th>Bodega</th>
                    </tr>
                </thead>
                <tbody>
    `;

    movements.forEach(movement => {
        const movementType = getMovementTypeInfo(movement.type);
        
        html += `
            <tr>
                <td>${movement.date?.toLocaleString() || 'N/A'}</td>
                <td><span class="badge bg-${movementType.color}">${movementType.text}</span></td>
                <td>${movement.quantity}</td>
                <td>${movement.price ? `$${movement.price.toFixed(2)}` : 'N/A'}</td>
                <td>${movement.reference}</td>
                <td>${movement.warehouse}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    movimientosList.innerHTML = html;
}

function getMovementTypeInfo(type) {
    switch (type) {
        case 'entry':
            return { text: 'Entrada', color: 'success' };
        case 'exit':
            return { text: 'Salida', color: 'danger' };
        case 'transfer':
            return { text: 'Traspaso', color: 'primary' };
        case 'waste':
            return { text: 'Merma', color: 'warning' };
        case 'return':
            return { text: 'Devolución', color: 'info' };
        default:
            return { text: 'Desconocido', color: 'secondary' };
    }
}

function getTransactionReference(transaction) {
    if (transaction.invoiceNumber) {
        return `Factura: ${transaction.invoiceNumber}`;
    }
    if (transaction.clientName) {
        return `Cliente: ${transaction.clientName}`;
    }
    if (transaction.returnReference) {
        return `Devolución: ${transaction.returnReference}`;
    }
    if (transaction.wasteReason) {
        return `Merma: ${transaction.wasteReason}`;
    }
    if (transaction.transferReference) {
        return `Traspaso: ${transaction.transferReference}`;
    }
    return 'Sin referencia';
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