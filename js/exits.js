// Elementos del DOM
const exitsList = document.getElementById('exitsList');
const clientExitForm = document.getElementById('clientExitForm');
const transferForm = document.getElementById('transferForm');
const wasteForm = document.getElementById('wasteForm');
const exitWarehouse = document.getElementById('exitWarehouse');
const sourceWarehouse = document.getElementById('sourceWarehouse');
const targetWarehouse = document.getElementById('targetWarehouse');
const wasteWarehouse = document.getElementById('wasteWarehouse');
const addExitProductBtn = document.getElementById('addExitProductBtn');
const addTransferProductBtn = document.getElementById('addTransferProductBtn');
const addWasteProductBtn = document.getElementById('addWasteProductBtn');
const exitProductsList = document.getElementById('exitProductsList');
const transferProductsList = document.getElementById('transferProductsList');
const wasteProductsList = document.getElementById('wasteProductsList');
const warehouseSelect = document.getElementById('warehouseSelect');
const warehouseFilter = document.getElementById('warehouseFilter');


// Almacenar bodegas asignadas al usuario
let userWarehouses = [];
// Almacenar productos por bodega
let warehouseProducts = {};

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
            loadRecentExits(userData.assignedWarehouses);
        } else {
            if (exitsList) {
                exitsList.innerHTML = `
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

// Al inicio del archivo, agrega estas definiciones

// Modificar la función loadWarehouses
async function loadWarehouses(warehouseIds = []) {
    try {
        const warehousesSnapshot = await db.collection('warehouses').get();
        
        // Función para limpiar y poblar un selector
        const populateSelector = (selector, warehouses, assignedWarehouses = []) => {
            if (!selector) return;
            
            // Limpiar selector
            selector.innerHTML = '<option value="">Seleccionar bodega</option>';
            
            // Primero agregar bodegas asignadas
            assignedWarehouses.forEach(warehouseId => {
                const warehouse = warehouses.find(w => w.id === warehouseId);
                if (warehouse) {
                    selector.innerHTML += `
                        <option value="${warehouse.id}">${warehouse.name}</option>
                    `;
                }
            });

            // Luego agregar el resto de bodegas
            warehouses.forEach(warehouse => {
                if (!assignedWarehouses.includes(warehouse.id)) {
                    selector.innerHTML += `
                        <option value="${warehouse.id}">${warehouse.name}</option>
                    `;
                }
            });
        };

        // Almacenar todas las bodegas
        const allWarehouses = [];
        warehousesSnapshot.forEach(doc => {
            const warehouse = { id: doc.id, ...doc.data() };
            allWarehouses.push(warehouse);
        });

        // Bodegas asignadas al usuario
        const assignedWarehouses = warehouseIds || [];

        // Poblar selectores
        if (exitWarehouse) {
            populateSelector(exitWarehouse, allWarehouses, assignedWarehouses);
            exitWarehouse.addEventListener('change', () => {
                loadProductsForWarehouse(exitWarehouse.value, 'product-select');
            });
        }
        
        if (sourceWarehouse) {
            populateSelector(sourceWarehouse, allWarehouses, assignedWarehouses);
            sourceWarehouse.addEventListener('change', () => {
                loadProductsForWarehouse(sourceWarehouse.value, 'transfer-product-select');
            });
        }
        
        if (targetWarehouse) {
            populateSelector(targetWarehouse, allWarehouses);
        }
        
        if (wasteWarehouse) {
            populateSelector(wasteWarehouse, allWarehouses, assignedWarehouses);
            wasteWarehouse.addEventListener('change', () => {
                loadProductsForWarehouse(wasteWarehouse.value, 'waste-product-select');
            });
        }
        
        if (warehouseFilter) {
            populateSelector(warehouseFilter, allWarehouses, assignedWarehouses);
        }
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}
// Cargar productos para una bodega específica
async function loadProductsForWarehouse(warehouseId, selectClass) {
    if (!warehouseId) return;
    
    try {
        // Limpiar selectores de productos existentes
        const productSelects = document.querySelectorAll(`.${selectClass}`);
        productSelects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar producto</option>';
        });
        
        // Obtener productos en esta bodega
        const inventorySnapshot = await db.collection('inventory')
            .where('warehouseId', '==', warehouseId)
            .where('quantity', '>', 0)
            .get();
        
        // Almacenar productos disponibles
        warehouseProducts[warehouseId] = [];
        
        inventorySnapshot.forEach(doc => {
            const product = {
                id: doc.id,
                ...doc.data()
            };
            
            warehouseProducts[warehouseId].push(product);
            
            // Agregar opción en selectores
            productSelects.forEach(select => {
                select.innerHTML += `
                    <option value="${doc.id}" data-name="${product.productName}" data-quantity="${product.quantity}" data-price="${product.lastPrice || 0}">
                        ${product.productName} (${product.quantity} disponibles)
                    </option>
                `;
            });
        });
        
        // Configurar eventos de cambio de producto
        productSelects.forEach(select => {
            select.addEventListener('change', function() {
                updateAvailableQuantity(this);
            });
        });
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

// Actualizar cantidad disponible cuando se selecciona un producto
function updateAvailableQuantity(selectElement) {
    const productId = selectElement.value;
    if (!productId) return;
    
    const option = selectElement.options[selectElement.selectedIndex];
    const quantity = option.dataset.quantity;
    
    // Buscar el campo de cantidad disponible correspondiente
    const row = selectElement.closest('.product-item');
    let availableField;
    
    if (selectElement.classList.contains('product-select')) {
        availableField = row.querySelector('.available-quantity');
    } else if (selectElement.classList.contains('transfer-product-select')) {
        availableField = row.querySelector('.transfer-available-quantity');
    } else if (selectElement.classList.contains('waste-product-select')) {
        availableField = row.querySelector('.waste-available-quantity');
    }
    
    if (availableField) {
        availableField.value = quantity;
    }
}

// Cargar salidas recientes
async function loadRecentExits(warehouseIds) {
    if (!exitsList) return;
    
    try {
        const exitsQuery = await db.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(50)  // Traer más registros para filtrar
            .get();
        
        const exits = [];
        
        exitsQuery.forEach(doc => {
            const exit = { id: doc.id, ...doc.data() };
            // Filtrar solo transacciones de bodegas del usuario
            if (warehouseIds.includes(exit.warehouseId)) {
                exits.push(exit);
            }
        });

        // Ordenar por timestamp
        exits.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });

        // Limitar a 10 entradas
        const recentExits = exits.slice(0, 10);
        
        if (recentExits.length === 0) {
            exitsList.innerHTML = `
                <div class="alert alert-info">
                    No hay salidas registradas.
                </div>
            `;
            return;
        }
        
        // Mostrar lista de salidas
        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Destino/Referencia</th>
                            <th>Bodega</th>
                            <th>Productos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const warehousesMap = new Map();
        
        // Obtener todas las bodegas para mostrar nombres
        const warehousesSnapshot = await db.collection('warehouses').get();
        warehousesSnapshot.forEach(doc => {
            warehousesMap.set(doc.id, doc.data().name);
        });
        
        recentExits.forEach(exit => {
            const date = exit.timestamp ? exit.timestamp.toDate() : new Date();
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            // Determinar tipo, destino y referencia
            let type, destination;
            if (exit.type === 'exit') {
                type = '<span class="badge bg-primary">Cliente</span>';
                destination = exit.clientName || '-';
            } else if (exit.type === 'transfer') {
                type = '<span class="badge bg-info text-dark">Traspaso</span>';
                const targetWarehouseName = warehousesMap.get(exit.targetWarehouseId) || 'Desconocida';
                destination = `A: ${targetWarehouseName}`;
            } else { // waste
                type = '<span class="badge bg-warning text-dark">Merma</span>';
                destination = exit.wasteReason ? getWasteReasonText(exit.wasteReason) : '-';
            }
            
            // Obtener nombre de bodega
            const warehouseName = warehousesMap.get(exit.warehouseId) || 'Desconocida';
            
            // Contar productos
            const productCount = exit.products ? exit.products.length : 0;
            
            html += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${type}</td>
                    <td>${destination}</td>
                    <td>${warehouseName}</td>
                    <td>${productCount} productos</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewExitDetails('${exit.id}')">
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
        `;
        
        exitsList.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar salidas:', error);
        exitsList.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar datos. Intenta recargar la página.
            </div>
        `;
    }
}

// Texto para motivos de merma
function getWasteReasonText(reason) {
    switch (reason) {
        case 'expired': return 'Producto Vencido';
        case 'damaged': return 'Producto Dañado';
        case 'quality': return 'Control de Calidad';
        case 'other': return 'Otro';
        default: return reason;
    }
}

// Agregar producto a salida a cliente
if (addExitProductBtn) {
    addExitProductBtn.addEventListener('click', () => {
        const warehouseId = exitWarehouse.value;
        if (!warehouseId) {
            alert('Primero selecciona una bodega');
            return;
        }
        
        const newProduct = document.createElement('div');
        newProduct.className = 'row product-item mb-3';
        newProduct.innerHTML = `
            <div class="col-md-5">
                <label class="form-label">Producto</label>
                <select class="form-select product-select" required>
                    <option value="">Seleccionar producto</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Disponible</label>
                <input type="text" class="form-control available-quantity" readonly>
            </div>
            <div class="col-md-3">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control exit-quantity" min="1" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-danger form-control remove-product-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        exitProductsList.appendChild(newProduct);
        
        // Cargar productos para esta fila
        const productSelect = newProduct.querySelector('.product-select');
        
        // Añadir opciones de productos
        if (warehouseProducts[warehouseId]) {
            warehouseProducts[warehouseId].forEach(product => {
                productSelect.innerHTML += `
                    <option value="${product.id}" data-name="${product.productName}" data-quantity="${product.quantity}" data-price="${product.lastPrice || 0}">
                        ${product.productName} (${product.quantity} disponibles)
                    </option>
                `;
            });
        }
        
        // Configurar evento de cambio de producto
        productSelect.addEventListener('change', function() {
            updateAvailableQuantity(this);
        });
        
        // Agregar evento para eliminar producto
        const removeBtn = newProduct.querySelector('.remove-product-btn');
        removeBtn.addEventListener('click', () => {
            newProduct.remove();
        });
    });
}

// Agregar producto a traspaso
if (addTransferProductBtn) {
    addTransferProductBtn.addEventListener('click', () => {
        const warehouseId = sourceWarehouse.value;
        if (!warehouseId) {
            alert('Primero selecciona una bodega de origen');
            return;
        }
        
        const newProduct = document.createElement('div');
        newProduct.className = 'row product-item mb-3';
        newProduct.innerHTML = `
            <div class="col-md-5">
                <label class="form-label">Producto</label>
                <select class="form-select transfer-product-select" required>
                    <option value="">Seleccionar producto</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Disponible</label>
                <input type="text" class="form-control transfer-available-quantity" readonly>
            </div>
            <div class="col-md-3">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control transfer-quantity" min="1" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-danger form-control remove-product-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        transferProductsList.appendChild(newProduct);
        
        // Cargar productos para esta fila
        const productSelect = newProduct.querySelector('.transfer-product-select');
        
        // Añadir opciones de productos
        if (warehouseProducts[warehouseId]) {
            warehouseProducts[warehouseId].forEach(product => {
                productSelect.innerHTML += `
                    <option value="${product.id}" data-name="${product.productName}" data-quantity="${product.quantity}" data-price="${product.lastPrice || 0}">
                        ${product.productName} (${product.quantity} disponibles)
                    </option>
                `;
            });
        }
        
        // Configurar evento de cambio de producto
        productSelect.addEventListener('change', function() {
            updateAvailableQuantity(this);
        });
        
        // Agregar evento para eliminar producto
        const removeBtn = newProduct.querySelector('.remove-product-btn');
        removeBtn.addEventListener('click', () => {
            newProduct.remove();
        });
    });
}

// Agregar producto a merma
if (addWasteProductBtn) {
    addWasteProductBtn.addEventListener('click', () => {
        const warehouseId = wasteWarehouse.value;
        if (!warehouseId) {
            alert('Primero selecciona una bodega');
            return;
        }
        
        const newProduct = document.createElement('div');
        newProduct.className = 'row product-item mb-3';
        newProduct.innerHTML = `
            <div class="col-md-5">
                <label class="form-label">Producto</label>
                <select class="form-select waste-product-select" required>
                    <option value="">Seleccionar producto</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Disponible</label>
                <input type="text" class="form-control waste-available-quantity" readonly>
            </div>
            <div class="col-md-3">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control waste-quantity" min="1" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-danger form-control remove-product-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        wasteProductsList.appendChild(newProduct);
        
        // Cargar productos para esta fila
        const productSelect = newProduct.querySelector('.waste-product-select');
        
        // Añadir opciones de productos
        if (warehouseProducts[warehouseId]) {
            warehouseProducts[warehouseId].forEach(product => {
                productSelect.innerHTML += `
                    <option value="${product.id}" data-name="${product.productName}" data-quantity="${product.quantity}" data-price="${product.lastPrice || 0}">
                        ${product.productName} (${product.quantity} disponibles)
                    </option>
                `;
            });
        }
        
        // Configurar evento de cambio de producto
        productSelect.addEventListener('change', function() {
            updateAvailableQuantity(this);
        });
        
        // Agregar evento para eliminar producto
        const removeBtn = newProduct.querySelector('.remove-product-btn');
        removeBtn.addEventListener('click', () => {
            newProduct.remove();
        });
    });
}

// Procesar formulario de salida a cliente
if (clientExitForm) {
    clientExitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener datos del formulario
        const clientName = document.getElementById('clientName').value;
        const exitDate = document.getElementById('exitDate').value;
        const warehouseId = exitWarehouse.value;
        const reference = document.getElementById('reference').value;
        const notes = document.getElementById('exitNotes').value;
        
        // Obtener productos
        const products = [];
        
        const productItems = document.querySelectorAll('#exitProductsList .product-item');
        
        for (const item of productItems) {
            const productSelect = item.querySelector('.product-select');
            const quantityInput = item.querySelector('.exit-quantity');
            
            if (!productSelect.value || !quantityInput.value) {
                continue;
            }
            
            const productId = productSelect.value;
            const option = productSelect.options[productSelect.selectedIndex];
            const productName = option.dataset.name;
            const requestedQuantity = parseInt(quantityInput.value);
            const availableQuantity = parseInt(item.querySelector('.available-quantity').value);
            const price = parseFloat(option.dataset.price) || 0;
            
            // Validar cantidad
            if (requestedQuantity > availableQuantity) {
                alert(`No hay suficiente stock de ${productName}. Disponible: ${availableQuantity}`);
                return;
            }
            
            products.push({
                productId,
                productName,
                quantity: requestedQuantity,
                price
            });
        }
        
        if (products.length === 0) {
            alert('Debes agregar al menos un producto');
            return;
        }
        
        try {
            // Crear transacción (salida)
            const exitRef = await db.collection('transactions').add({
                type: 'exit',
                clientName,
                exitDate,
                warehouseId,
                reference,
                notes,
                products,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar inventario
            const batch = db.batch();
            
            for (const product of products) {
                // Obtener referencia al documento de inventario
                const inventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', warehouseId)
                    .where('productName', '==', product.productName)
                    .limit(1)
                    .get();
                
                if (!inventoryQuery.empty) {
                    const inventoryDoc = inventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    // Actualizar cantidad
                    batch.update(inventoryDoc.ref, {
                        quantity: currentQuantity - product.quantity,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            await batch.commit();
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('clientExitModal'));
            modal.hide();
            clientExitForm.reset();
            
            // Limpiar lista de productos (mantener solo el primero)
            const firstProduct = exitProductsList.firstElementChild;
            if (firstProduct) {
                const inputs = firstProduct.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.type !== 'button') {
                        input.value = '';
                    }
                });
                exitProductsList.innerHTML = '';
                exitProductsList.appendChild(firstProduct);
            }
            
            // Recargar salidas
            loadRecentExits(userWarehouses);
            
            alert('Salida registrada correctamente');
        } catch (error) {
            console.error('Error al registrar salida:', error);
            alert('Error al registrar salida: ' + error.message);
        }
    });
}

// Procesar formulario de traspaso
if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener datos del formulario
        const transferDate = document.getElementById('transferDate').value;
        const sourceWarehouseId = document.getElementById('sourceWarehouse').value;
        const targetWarehouseId = document.getElementById('targetWarehouse').value;
        const transferReference = document.getElementById('transferReference').value;
        const notes = document.getElementById('transferNotes').value;
        
        // Validar que origen y destino sean diferentes
        if (sourceWarehouseId === targetWarehouseId) {
            alert('La bodega de origen y destino no pueden ser la misma.');
            return;
        }
        
        // Obtener productos
        const products = [];
        
        const productItems = document.querySelectorAll('#transferProductsList .product-item');
        
        for (const item of productItems) {
            const productSelect = item.querySelector('.transfer-product-select');
            const quantityInput = item.querySelector('.transfer-quantity');
            
            if (!productSelect.value || !quantityInput.value) {
                continue;
            }
            
            const productId = productSelect.value;
            const option = productSelect.options[productSelect.selectedIndex];
            const productName = option.dataset.name;
            const requestedQuantity = parseInt(quantityInput.value);
            const availableQuantity = parseInt(item.querySelector('.transfer-available-quantity').value);
            const price = parseFloat(option.dataset.price) || 0;
            
            // Validar cantidad
            if (requestedQuantity > availableQuantity) {
                alert(`No hay suficiente stock de ${productName}. Disponible: ${availableQuantity}`);
                return;
            }
            
            products.push({
                productId,
                productName,
                quantity: requestedQuantity,
                price
            });
        }
        
        if (products.length === 0) {
            alert('Debes agregar al menos un producto');
            return;
        }
        
        try {
            // Crear transacción (traspaso)
            const transferRef = await db.collection('transactions').add({
                type: 'transfer',
                transferDate,
                warehouseId: sourceWarehouseId,
                targetWarehouseId,
                transferReference,
                notes,
                products,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar inventario
            const batch = db.batch();
            
            for (const product of products) {
                // Restar de la bodega de origen
                const sourceInventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', sourceWarehouseId)
                    .where('productName', '==', product.productName)
                    .limit(1)
                    .get();
                
                if (!sourceInventoryQuery.empty) {
                    const inventoryDoc = sourceInventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    batch.update(inventoryDoc.ref, {
                        quantity: currentQuantity - product.quantity,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // Agregar a la bodega de destino
                const destInventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', targetWarehouseId)
                    .where('productName', '==', product.productName)
                    .limit(1)
                    .get();
                
                if (destInventoryQuery.empty) {
                    // Crear nuevo registro de inventario
                    const inventoryRef = db.collection('inventory').doc();
                    
                    batch.set(inventoryRef, {
                        productName: product.productName,
                        quantity: product.quantity,
                        lastPrice: product.price,
                        warehouseId: targetWarehouseId,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Actualizar registro existente
                    const inventoryDoc = destInventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    batch.update(inventoryDoc.ref, {
                        quantity: currentQuantity + product.quantity,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            await batch.commit();
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('transferModal'));
            modal.hide();
            transferForm.reset();
            
            // Limpiar lista de productos (mantener solo el primero)
            const firstProduct = transferProductsList.firstElementChild;
            if (firstProduct) {
                const inputs = firstProduct.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.type !== 'button') {
                        input.value = '';
                    }
                });
                transferProductsList.innerHTML = '';
                transferProductsList.appendChild(firstProduct);
            }
            
            // Recargar salidas
            loadRecentExits(userWarehouses);
            
            alert('Traspaso registrado correctamente');
        } catch (error) {
            console.error('Error al registrar traspaso:', error);
            alert('Error al registrar traspaso: ' + error.message);
        }
    });
}

// Procesar formulario de merma
if (wasteForm) {
    wasteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener datos del formulario
        const wasteDate = document.getElementById('wasteDate').value;
        const warehouseId = wasteWarehouse.value;
        const wasteReason = document.getElementById('wasteReason').value;
        const notes = document.getElementById('wasteNotes').value;
        
        // Obtener productos
        const products = [];
        
        const productItems = document.querySelectorAll('#wasteProductsList .product-item');
        
        for (const item of productItems) {
            const productSelect = item.querySelector('.waste-product-select');
            const quantityInput = item.querySelector('.waste-quantity');
            
            if (!productSelect.value || !quantityInput.value) {
                continue;
            }
            
            const productId = productSelect.value;
            const option = productSelect.options[productSelect.selectedIndex];
            const productName = option.dataset.name;
            const requestedQuantity = parseInt(quantityInput.value);
            const availableQuantity = parseInt(item.querySelector('.waste-available-quantity').value);
            
            // Validar cantidad
            if (requestedQuantity > availableQuantity) {
                alert(`No hay suficiente stock de ${productName}. Disponible: ${availableQuantity}`);
                return;
            }
            
            products.push({
                productId,
                productName,
                quantity: requestedQuantity
            });
        }
        
        if (products.length === 0) {
            alert('Debes agregar al menos un producto');
            return;
        }
        
        try {
            // Crear transacción (merma)
            const wasteRef = await db.collection('transactions').add({
                type: 'waste',
                wasteDate,
                warehouseId,
                wasteReason,
                notes,
                products,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar inventario
            const batch = db.batch();
            
            for (const product of products) {
                // Obtener referencia al documento de inventario
                const inventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', warehouseId)
                    .where('productName', '==', product.productName)
                    .limit(1)
                    .get();
                
                if (!inventoryQuery.empty) {
                    const inventoryDoc = inventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    // Actualizar cantidad
                    batch.update(inventoryDoc.ref, {
                        quantity: currentQuantity - product.quantity,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            await batch.commit();
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('wasteModal'));
            modal.hide();
            wasteForm.reset();
            
            // Limpiar lista de productos (mantener solo el primero)
            const firstProduct = wasteProductsList.firstElementChild;
            if (firstProduct) {
                const inputs = firstProduct.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.type !== 'button') {
                        input.value = '';
                    }
                });
                wasteProductsList.innerHTML = '';
                wasteProductsList.appendChild(firstProduct);
            }
            
            // Recargar salidas
            loadRecentExits(userWarehouses);
            
            alert('Merma registrada correctamente');
        } catch (error) {
            console.error('Error al registrar merma:', error);
            alert('Error al registrar merma: ' + error.message);
        }
    });
}

// Ver detalles de salida (placeholder para función futura)
function viewExitDetails(exitId) {
    alert(`Detalles de salida con ID: ${exitId}\nEsta funcionalidad estará disponible próximamente.`);
}

// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si se debe abrir el modal de traspaso
    if (localStorage.getItem('openTransferModal') === 'true') {
        const transferModal = new bootstrap.Modal(document.getElementById('transferModal'));
        transferModal.show();
        localStorage.removeItem('openTransferModal');
    }
});