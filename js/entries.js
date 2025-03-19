// Elementos del DOM
const entriesList = document.getElementById('entriesList');
const invoiceEntryForm = document.getElementById('invoiceEntryForm');
const returnEntryForm = document.getElementById('returnEntryForm');
const warehouseSelect = document.getElementById('warehouseSelect');
const originWarehouse = document.getElementById('originWarehouse');
const destinationWarehouse = document.getElementById('destinationWarehouse');
const addProductBtn = document.getElementById('addProductBtn');
const addReturnProductBtn = document.getElementById('addReturnProductBtn');
const productsList = document.getElementById('productsList');
const returnProductsList = document.getElementById('returnProductsList');
const totalAmount = document.getElementById('totalAmount');

// Almacenar bodegas asignadas al usuario
let userWarehouses = [];
let allWarehouses = {};

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

        // Cargar TODAS las bodegas primero
        await loadAllWarehouses();

        // Obtener bodegas asignadas al usuario
        if (userData.assignedWarehouses && userData.assignedWarehouses.length > 0) {
            userWarehouses = userData.assignedWarehouses;
            
            // Cargar selectores de bodegas
            loadWarehouseSelectors(userData.assignedWarehouses);

            // Añadir filtro de bodega primero
            addWarehouseFilter();
            // Cargar entradas (mostrar todas o filtradas)
            const warehouseFilter = localStorage.getItem('warehouseFilter');
            if (warehouseFilter && warehouseFilter !== 'all') {
                loadRecentEntries([warehouseFilter]);
            } else {
                loadRecentEntries(userData.assignedWarehouses);
            }
            
        } else {
            if (entriesList) {
                entriesList.innerHTML = `
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

// Nueva función para cargar todas las bodegas
async function loadAllWarehouses() {
    try {
        const warehousesSnapshot = await db.collection('warehouses').get();
        
        allWarehouses = {};
        warehousesSnapshot.forEach(doc => {
            allWarehouses[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        return allWarehouses;
    } catch (error) {
        console.error('Error al cargar todas las bodegas:', error);
        return {};
    }
}
// Añade esta función después de loadAllWarehouses() en entries.js

function addWarehouseFilter() {
    // Verificar si ya existe el filtro
    if (document.getElementById('warehouseFilterSelect')) return;
    
    // Obtener el contenedor del título y botones
    const headerDiv = document.querySelector('.card-header');
    if (!headerDiv) return;
    
    // Crear el HTML del filtro
    const filterHTML = `
        <div style="display: inline-block; margin-right: 15px;">
            <label style="margin-right: 5px;"><strong>Bodega:</strong></label>
            <select id="warehouseFilterSelect" class="form-select form-select-sm" style="display: inline-block; width: 180px;">
                <option value="all">Todas las bodegas</option>
                ${Object.values(allWarehouses).map(warehouse => 
                    `<option value="${warehouse.id}">${warehouse.name}</option>`
                ).join('')}
            </select>
        </div>
    `;
    
    // Insertar el filtro al principio del header
    headerDiv.insertAdjacentHTML('afterbegin', filterHTML);
    
    // Configurar el evento de cambio
    const filterSelect = document.getElementById('warehouseFilterSelect');
    const savedFilter = localStorage.getItem('warehouseFilter');
    
    if (savedFilter && savedFilter !== 'all') {
        filterSelect.value = savedFilter;
    }
    
    filterSelect.addEventListener('change', function() {
        const selectedWarehouse = this.value;
        localStorage.setItem('warehouseFilter', selectedWarehouse);
        
        if (selectedWarehouse === 'all') {
            loadRecentEntries(userWarehouses);
        } else {
            loadRecentEntries([selectedWarehouse]);
        }
    });
}

// Función para cargar selectores de bodegas
function loadWarehouseSelectors(assignedWarehouseIds) {
    try {
        // Función para poblar un selector
        const populateSelector = (selector, includeAll = false) => {
            if (!selector) return;
            
            // Limpiar selector
            selector.innerHTML = '<option value="">Seleccionar bodega</option>';
            
            // Opción para todas las bodegas
            if (includeAll) {
                selector.innerHTML += '<option value="all">Todas las bodegas</option>';
            }
            
            // Agregar todas las bodegas disponibles
            Object.values(allWarehouses).forEach(warehouse => {
                // Destacar las bodegas asignadas con un prefijo
                const isAssigned = assignedWarehouseIds.includes(warehouse.id);
                const prefix = isAssigned ? '✓ ' : '';
                
                selector.innerHTML += `
                    <option value="${warehouse.id}">${prefix}${warehouse.name}</option>
                `;
            });
        };

        // Poblar selectores
        if (warehouseSelect) {
            populateSelector(warehouseSelect);
        }

        if (originWarehouse) {
            populateSelector(originWarehouse);
        }

        if (destinationWarehouse) {
            populateSelector(destinationWarehouse);
        }

        // Agregar filtro de bodegas para entradas
        const filterContainer = document.querySelector('.card-header');
        if (filterContainer && !document.getElementById('warehouseFilterSelect')) {
            const filterDiv = document.createElement('div');
            filterDiv.innerHTML = `
                <select id="warehouseFilterSelect" class="form-select form-select-sm" style="width: 200px; display: inline-block;">
                    <option value="all">Todas las bodegas</option>
                </select>
            `;
            
            // Insertar antes del último botón
            const buttons = filterContainer.querySelectorAll('button');
            if (buttons.length > 0) {
                filterContainer.insertBefore(filterDiv, buttons[0]);
            } else {
                filterContainer.appendChild(filterDiv);
            }
            
            // Poblar el filtro
            const warehouseFilterSelect = document.getElementById('warehouseFilterSelect');
            populateSelector(warehouseFilterSelect, true);
            
            // Establecer valor guardado
            const savedFilter = localStorage.getItem('warehouseFilter');
            if (savedFilter) {
                warehouseFilterSelect.value = savedFilter;
            }
            
            // Manejar cambio de filtro
            warehouseFilterSelect.addEventListener('change', function() {
                const selectedWarehouse = this.value;
                localStorage.setItem('warehouseFilter', selectedWarehouse);
                
                if (selectedWarehouse === 'all') {
                    loadRecentEntries(userWarehouses);
                } else {
                    loadRecentEntries([selectedWarehouse]);
                }
            });
        }
    } catch (error) {
        console.error('Error al cargar selectores de bodegas:', error);
    }
}

// Cargar entradas recientes
async function loadRecentEntries(warehouseIds) {
    if (!entriesList) return;
    
    try {
        let entries = [];
        const warehouseFilter = document.getElementById('warehouseFilterSelect');
        const showingFilterMessage = warehouseFilter && warehouseFilter.value !== 'all';
        
        // Si no hay IDs de bodega o está vacío, mostrar mensaje
        if (!warehouseIds || warehouseIds.length === 0) {
            entriesList.innerHTML = `
                <div class="alert alert-warning">
                    No hay bodegas seleccionadas para mostrar entradas.
                </div>
            `;
            return;
        }

        // Mostrar mensaje de carga
        entriesList.innerHTML = '<p class="text-center">Cargando entradas recientes...</p>';
        
        // Si hay muchas bodegas, hacer una consulta general sin filtro y luego filtrar en memoria
        if (warehouseIds.length > 5) {
            console.log('Muchas bodegas, haciendo consulta general');
            const querySnapshot = await db.collection('transactions')
                .where('type', 'in', ['entry', 'return'])
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
                
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Solo incluir si la bodega está en warehouseIds
                if (warehouseIds.includes(data.warehouseId)) {
                    entries.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
        } else {
            // Para cada bodega, realizar una consulta
            for (const warehouseId of warehouseIds) {
                try {
                    const querySnapshot = await db.collection('transactions')
                        .where('warehouseId', '==', warehouseId)
                        .where('type', 'in', ['entry', 'return'])
                        .orderBy('timestamp', 'desc')
                        .limit(15)
                        .get();
                        
                    querySnapshot.forEach(doc => {
                        entries.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                } catch (error) {
                    console.error(`Error al consultar bodega ${warehouseId}:`, error);
                }
            }
        }
        
        // Ordenar entradas por timestamp
        entries.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
            return timeB - timeA; // Ordenar descendente
        });
        
        // Limitar a 20 entradas para no sobrecargar la vista
        entries = entries.slice(0, 20);
        
        if (entries.length === 0) {
            let message = 'No hay entradas registradas.';
            if (showingFilterMessage) {
                const warehouseName = allWarehouses[warehouseFilter.value]?.name || 'la bodega seleccionada';
                message = `No hay entradas registradas en ${warehouseName}.`;
            }
            
            entriesList.innerHTML = `
                <div class="alert alert-info">
                    ${message}
                </div>
            `;
            return;
        }
        
        // Mostrar lista de entradas
        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Referencia</th>
                            <th>Bodega</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Procesar cada entrada
        entries.forEach(entry => {
            const date = entry.timestamp ? entry.timestamp.toDate() : new Date();
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            // Determinar tipo y referencia
            let type, reference;
            if (entry.type === 'entry') {
                type = '<span class="badge bg-success">Factura</span>';
                reference = entry.invoiceNumber || '-';
            } else {
                type = '<span class="badge bg-warning text-dark">Devolución</span>';
                reference = entry.returnReference || '-';
            }
            
            // Obtener nombre de bodega
            const warehouseName = allWarehouses[entry.warehouseId]?.name || "Desconocida";
            
            html += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${type}</td>
                    <td>${reference}</td>
                    <td>${warehouseName}</td>
                    <td>$${entry.total ? entry.total.toFixed(2) : '0.00'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewEntryDetails('${entry.id}')">
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
        
        entriesList.innerHTML = html;
        
        // Mostrar mensaje de filtro activo
        if (showingFilterMessage) {
            const warehouseName = allWarehouses[warehouseFilter.value]?.name || 'la bodega seleccionada';
            const filterMessage = document.createElement('div');
            filterMessage.className = 'alert alert-info mt-2';
            filterMessage.innerHTML = `<small>Mostrando entradas de: <strong>${warehouseName}</strong></small>`;
            entriesList.appendChild(filterMessage);
        }
    } catch (error) {
        console.error('Error al cargar entradas:', error);
        entriesList.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar datos. Intenta recargar la página.
            </div>
        `;
    }
}

// Agregar producto a factura
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        const newProduct = document.createElement('div');
        newProduct.className = 'row product-item mb-3';
        newProduct.innerHTML = `
            <div class="col-md-4">
                <label class="form-label">Producto</label>
                <input type="text" class="form-control product-name" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">Cantidad</label>
                <input type="number" class="form-control product-quantity" min="1" required>
            </div>
            <div class="col-md-3">
                <label class="form-label">Precio Unitario</label>
                <input type="number" class="form-control product-price" min="0" step="0.01" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">Subtotal</label>
                <input type="text" class="form-control product-subtotal" readonly>
            </div>
            <div class="col-md-1">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-danger form-control remove-product-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        productsList.appendChild(newProduct);
        
        // Agregar evento para calcular subtotal
        const quantityInput = newProduct.querySelector('.product-quantity');
        const priceInput = newProduct.querySelector('.product-price');
        const subtotalInput = newProduct.querySelector('.product-subtotal');
        
        function calculateSubtotal() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const subtotal = quantity * price;
            subtotalInput.value = subtotal.toFixed(2);
            calculateTotal();
        }
        
        quantityInput.addEventListener('input', calculateSubtotal);
        priceInput.addEventListener('input', calculateSubtotal);
        
        // Agregar evento para eliminar producto
        const removeBtn = newProduct.querySelector('.remove-product-btn');
        removeBtn.addEventListener('click', () => {
            newProduct.remove();
            calculateTotal();
        });
    });
}

// Agregar producto a devolución
// Agregar producto a devolución
if (addReturnProductBtn) {
    addReturnProductBtn.addEventListener('click', () => {
        // Obtener la bodega de origen seleccionada
        const originWarehouseId = document.getElementById('originWarehouse')?.value;
        if (!originWarehouseId) {
            alert('Primero seleccione una bodega de origen');
            return;
        }
        
        // Crear elemento de fila de producto
        const newProduct = document.createElement('div');
        newProduct.className = 'row product-item mb-3';
        
        // Si tenemos productos cargados para esta bodega, usar selector
        if (window.warehouseProducts && window.warehouseProducts[originWarehouseId]) {
            const products = window.warehouseProducts[originWarehouseId];
            
            // HTML con selector de productos
            newProduct.innerHTML = `
                <div class="col-md-6">
                    <label class="form-label">Producto</label>
                    <select class="form-select return-product-name" required>
                        <option value="">Seleccionar producto</option>
                        ${products.map(product => 
                            `<option value="${product.productName}" 
                                data-quantity="${product.quantity}">
                                ${product.productName} (${product.quantity} disponibles)
                            </option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Cantidad</label>
                    <input type="number" class="form-control return-product-quantity" min="1" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-danger form-control remove-product-btn">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            
            // Agregar evento para actualizar cantidad máxima disponible
            const productSelect = newProduct.querySelector('.return-product-name');
            if (productSelect) {
                productSelect.addEventListener('change', function() {
                    const option = this.options[this.selectedIndex];
                    const quantity = option.dataset.quantity;
                    const quantityInput = newProduct.querySelector('.return-product-quantity');
                    
                    if (quantityInput && quantity) {
                        quantityInput.max = quantity;
                        quantityInput.placeholder = `Máx: ${quantity}`;
                    }
                });
            }
        } else {
            // Usar input normal si no hay productos cargados
            newProduct.innerHTML = `
                <div class="col-md-6">
                    <label class="form-label">Producto</label>
                    <input type="text" class="form-control return-product-name" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Cantidad</label>
                    <input type="number" class="form-control return-product-quantity" min="1" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-danger form-control remove-product-btn">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        }
        
        returnProductsList.appendChild(newProduct);
        
        // Agregar evento para eliminar producto
        const removeBtn = newProduct.querySelector('.remove-product-btn');
        removeBtn.addEventListener('click', () => {
            newProduct.remove();
        });
    });
}

// Calcular total de factura
function calculateTotal() {
    const totalAmountElement = document.getElementById('totalAmount');
    if (!totalAmountElement) return;
    
    let total = 0;
    const subtotalInputs = document.querySelectorAll('.product-subtotal');
    
    subtotalInputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    totalAmountElement.value = total.toFixed(2);
}

// Inicializar eventos de cálculo en los productos iniciales
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos para el primer producto de factura
    const initialQuantityInputs = document.querySelectorAll('.product-quantity');
    const initialPriceInputs = document.querySelectorAll('.product-price');
    
    for (let i = 0; i < initialQuantityInputs.length; i++) {
        const quantityInput = initialQuantityInputs[i];
        const priceInput = initialPriceInputs[i];
        const subtotalInput = document.querySelectorAll('.product-subtotal')[i];
        
        function calculateSubtotal() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const subtotal = quantity * price;
            subtotalInput.value = subtotal.toFixed(2);
            calculateTotal();
        }
        
        quantityInput.addEventListener('input', calculateSubtotal);
        priceInput.addEventListener('input', calculateSubtotal);
    }
    
    // Configurar eventos para eliminar productos
    const removeButtons = document.querySelectorAll('.remove-product-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.product-item').remove();
            calculateTotal();
        });
    });
});

// Procesar formulario de entrada por factura
if (invoiceEntryForm) {
    invoiceEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener datos del formulario
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const invoiceDate = document.getElementById('invoiceDate').value;
        const supplier = document.getElementById('supplier').value;
        const warehouseId = warehouseSelect.value;
        const notes = document.getElementById('notes').value;
        
        // Obtener productos
        const products = [];
        let total = 0;

        // Verificar si hay elementos product-item antes de procesarlos
        const productItems = document.querySelectorAll('.product-item');
        if (productItems && productItems.length > 0) {
            for (const item of productItems) {
                // Verificar que cada elemento exista antes de acceder a sus propiedades
                const nameElement = item.querySelector('.product-name');
                const quantityElement = item.querySelector('.product-quantity');
                const priceElement = item.querySelector('.product-price');
                
                if (nameElement && quantityElement && priceElement) {
                    const name = nameElement.value;
                    const quantity = parseInt(quantityElement.value) || 0;
                    const price = parseFloat(priceElement.value) || 0;
                    const subtotal = price * quantity;
                    
                    products.push({
                        name,
                        quantity,
                        price,
                        subtotal
                    });
                    
                    total += subtotal;
                }
            }
        }
        
        try {
            // Crear transacción (entrada)
            const entryRef = await db.collection('transactions').add({
                type: 'entry',
                subtype: 'invoice',
                invoiceNumber,
                invoiceDate,
                supplier,
                warehouseId,
                notes,
                products,
                total,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar inventario
            const batch = db.batch();
            
            for (const product of products) {
                // Buscar si el producto ya existe en el inventario
                const inventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', warehouseId)
                    .where('productName', '==', product.name)
                    .limit(1)
                    .get();
                
                if (inventoryQuery.empty) {
                    // Crear nuevo registro de inventario
                    const inventoryRef = db.collection('inventory').doc();
                    batch.set(inventoryRef, {
                        productName: product.name,
                        quantity: product.quantity,
                        lastPrice: product.price,
                        warehouseId,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Actualizar registro existente
                    const inventoryDoc = inventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    batch.update(inventoryDoc.ref, {
                        quantity: currentQuantity + product.quantity,
                        lastPrice: product.price,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            await batch.commit();
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('newInvoiceModal'));
            modal.hide();
            invoiceEntryForm.reset();
            
            // Limpiar lista de productos (mantener solo el primero)
            const firstProduct = productsList.firstElementChild;
            if (firstProduct) {
                const inputs = firstProduct.querySelectorAll('input');
                inputs.forEach(input => input.value = '');
                productsList.innerHTML = '';
                productsList.appendChild(firstProduct);
            }
            
            // Recargar entradas
            const warehouseFilter = document.getElementById('warehouseFilterSelect');
            if (warehouseFilter && warehouseFilter.value !== 'all') {
                loadRecentEntries([warehouseFilter.value]);
            } else {
                loadRecentEntries(userWarehouses);
            }
            
            alert('Entrada registrada correctamente');
        } catch (error) {
            console.error('Error al registrar entrada:', error);
            alert('Error al registrar entrada: ' + error.message);
        }
    });
}

// Procesar formulario de entrada por devolución
if (returnEntryForm) {
    returnEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener datos del formulario
        const returnDate = document.getElementById('returnDate').value;
        const originWarehouseId = document.getElementById('originWarehouse').value;
        const destinationWarehouseId = document.getElementById('destinationWarehouse').value;
        const returnReason = document.getElementById('returnReason').value;
        const notes = document.getElementById('returnNotes').value;
        
        // Validar que origen y destino sean diferentes
        if (originWarehouseId === destinationWarehouseId) {
            alert('La bodega de origen y destino no pueden ser la misma.');
            return;
        }
        
        // Obtener productos
        const products = [];
        
        const productItems = document.querySelectorAll('#returnProductsList .product-item');
        for (const item of productItems) {
            const name = item.querySelector('.return-product-name').value;
            const quantity = parseInt(item.querySelector('.return-product-quantity').value);
            
            products.push({
                name,
                quantity
            });
        }
        
        try {
            // Crear referencia única para la devolución
            const returnReference = 'DEV-' + Date.now().toString().substr(-6);
            
            // Crear transacción (devolución)
            const entryRef = await db.collection('transactions').add({
                type: 'return',
                returnReference,
                returnDate,
                originWarehouseId,
                destinationWarehouseId,
                returnReason,
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
                const originInventoryQuery = await db.collection('inventory')
                    .where('warehouseId', '==', originWarehouseId)
                    .where('productName', '==', product.name)
                    .limit(1)
                    .get();
                
                if (!originInventoryQuery.empty) {
                    const inventoryDoc = originInventoryQuery.docs[0];
                    const currentQuantity = inventoryDoc.data().quantity || 0;
                    
                    if (currentQuantity >= product.quantity) {
                        batch.update(inventoryDoc.ref, {
                            quantity: currentQuantity - product.quantity,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        throw new Error(`Cantidad insuficiente de ${product.name} en la bodega de origen.`);
                    }
                } else {
                    throw new Error(`El producto ${product.name} no existe en la bodega de origen.`);
                }

        // Agregar a la bodega de destino
        const destInventoryQuery = await db.collection('inventory')
        .where('warehouseId', '==', destinationWarehouseId)
        .where('productName', '==', product.name)
        .limit(1)
        .get();
    
    if (destInventoryQuery.empty) {
        // Crear nuevo registro de inventario
        const inventoryRef = db.collection('inventory').doc();
        
        // Obtener el precio del producto de la bodega de origen
        const price = originInventoryQuery.docs[0].data().lastPrice || 0;
        
        batch.set(inventoryRef, {
            productName: product.name,
            quantity: product.quantity,
            lastPrice: price,
            warehouseId: destinationWarehouseId,
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
const modal = bootstrap.Modal.getInstance(document.getElementById('newReturnModal'));
modal.hide();
returnEntryForm.reset();

// Limpiar lista de productos (mantener solo el primero)
const firstProduct = returnProductsList.firstElementChild;
if (firstProduct) {
    const inputs = firstProduct.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    returnProductsList.innerHTML = '';
    returnProductsList.appendChild(firstProduct);
}

// Recargar entradas
const warehouseFilter = document.getElementById('warehouseFilterSelect');
if (warehouseFilter && warehouseFilter.value !== 'all') {
    loadRecentEntries([warehouseFilter.value]);
} else {
    loadRecentEntries(userWarehouses);
}

alert('Devolución registrada correctamente');
} catch (error) {
console.error('Error al registrar devolución:', error);
alert('Error al registrar devolución: ' + error.message);
}
});
}

// Ver detalles de entrada
function viewEntryDetails(entryId) {
// Guardar el ID en localStorage para verlo en la página de detalles
localStorage.setItem('viewEntryId', entryId);

// Crear un modal temporal para mostrar los detalles
const modalHTML = `
<div class="modal fade" id="entryDetailsModal" tabindex="-1" aria-hidden="true">
<div class="modal-dialog modal-lg">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">Detalles de la Entrada</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="entryDetailsBody">
            <p class="text-center"><i class="bi bi-hourglass spinner"></i> Cargando detalles...</p>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
    </div>
</div>
</div>
`;

// Insertar modal en el documento
const modalContainer = document.createElement('div');
modalContainer.innerHTML = modalHTML;
document.body.appendChild(modalContainer);

// Mostrar modal
const modal = new bootstrap.Modal(document.getElementById('entryDetailsModal'));
modal.show();

// Cargar detalles
loadEntryDetails(entryId);
}

// Cargar detalles de una entrada
async function loadEntryDetails(entryId) {
const entryDetailsBody = document.getElementById('entryDetailsBody');

try {
const entryDoc = await db.collection('transactions').doc(entryId).get();

if (!entryDoc.exists) {
entryDetailsBody.innerHTML = `
    <div class="alert alert-warning">
        No se encontró la entrada solicitada.
    </div>
`;
return;
}

const entry = entryDoc.data();
const date = entry.timestamp ? entry.timestamp.toDate() : new Date();
const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

// Obtener nombre de bodega
let warehouseName = "Desconocida";
if (entry.warehouseId && allWarehouses[entry.warehouseId]) {
warehouseName = allWarehouses[entry.warehouseId].name;
}

// Determinar tipo y datos específicos
let typeHTML = '';
let additionalInfoHTML = '';

if (entry.type === 'entry') {
typeHTML = '<span class="badge bg-success">Factura</span>';
additionalInfoHTML = `
    <p><strong>Número de Factura:</strong> ${entry.invoiceNumber || '-'}</p>
    <p><strong>Fecha de Factura:</strong> ${entry.invoiceDate || '-'}</p>
    <p><strong>Proveedor:</strong> ${entry.supplier || '-'}</p>
`;
} else if (entry.type === 'return') {
typeHTML = '<span class="badge bg-warning text-dark">Devolución</span>';

// Obtener nombres de bodegas origen y destino
let originWarehouseName = "Desconocida";
let destWarehouseName = "Desconocida";

if (entry.originWarehouseId && allWarehouses[entry.originWarehouseId]) {
    originWarehouseName = allWarehouses[entry.originWarehouseId].name;
}

if (entry.destinationWarehouseId && allWarehouses[entry.destinationWarehouseId]) {
    destWarehouseName = allWarehouses[entry.destinationWarehouseId].name;
}

additionalInfoHTML = `
    <p><strong>Referencia:</strong> ${entry.returnReference || '-'}</p>
    <p><strong>Fecha de Devolución:</strong> ${entry.returnDate || '-'}</p>
    <p><strong>Bodega de Origen:</strong> ${originWarehouseName}</p>
    <p><strong>Bodega de Destino:</strong> ${destWarehouseName}</p>
    <p><strong>Motivo:</strong> ${getReturnReasonText(entry.returnReason)}</p>
`;
}

// Construir tabla de productos
let productsHTML = `
<div class="table-responsive mt-3">
    <table class="table table-striped">
        <thead>
            <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
`;

let totalAmount = 0;

if (entry.products && entry.products.length > 0) {
entry.products.forEach(product => {
    const price = product.price || 0;
    const quantity = product.quantity || 0;
    const subtotal = price * quantity;
    totalAmount += subtotal;
    
    productsHTML += `
        <tr>
            <td>${product.name || product.productName}</td>
            <td>${quantity}</td>
            <td>$${price.toFixed(2)}</td>
            <td>$${subtotal.toFixed(2)}</td>
        </tr>
    `;
});
} else {
productsHTML += `
    <tr>
        <td colspan="4" class="text-center">No hay productos registrados</td>
    </tr>
`;
}

productsHTML += `
        </tbody>
        <tfoot>
            <tr>
                <th colspan="3" class="text-end">Total:</th>
                <th>$${totalAmount.toFixed(2)}</th>
            </tr>
        </tfoot>
    </table>
</div>
`;

// Mostrar todos los detalles
entryDetailsBody.innerHTML = `
<div class="row">
    <div class="col-md-6">
        <h6>Información General</h6>
        <p><strong>Tipo:</strong> ${typeHTML}</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Bodega:</strong> ${warehouseName}</p>
        <p><strong>Usuario:</strong> ${entry.userEmail || '-'}</p>
    </div>
    <div class="col-md-6">
        <h6>Detalles Específicos</h6>
        ${additionalInfoHTML}
    </div>
</div>

<hr>

<h6>Productos</h6>
${productsHTML}

<div class="mt-3">
    <h6>Notas</h6>
    <p>${entry.notes || 'Sin notas adicionales'}</p>
</div>
`;
} catch (error) {
console.error('Error al cargar detalles de la entrada:', error);
entryDetailsBody.innerHTML = `
<div class="alert alert-danger">
    Error al cargar detalles. Intenta nuevamente.
</div>
`;
}
}

// Función para obtener texto del motivo de devolución
function getReturnReasonText(reason) {
switch (reason) {
case 'damaged': return 'Producto Dañado';
case 'expired': return 'Producto Vencido';
case 'wrong': return 'Producto Incorrecto';
case 'other': return 'Otro';
default: return reason || 'No especificado';
}
}

// Agregar esta función para cargar productos de una bodega específica
async function loadProductsForOriginWarehouse(warehouseId) {
    if (!warehouseId) return;
    
    try {
        // Limpiar el campo de producto
        const productInput = document.querySelector('.return-product-name');
        if (productInput) {
            productInput.value = '';
        }
        
        // Obtener productos con stock en esta bodega
        const inventorySnapshot = await db.collection('inventory')
            .where('warehouseId', '==', warehouseId)
            .where('quantity', '>', 0)
            .get();
        
        // Si no hay productos, mostrar mensaje
        if (inventorySnapshot.empty) {
            alert('No hay productos con stock en esta bodega');
            return;
        }
        
        // Crear lista de productos con stock
        const products = [];
        inventorySnapshot.forEach(doc => {
            const product = doc.data();
            products.push({
                name: product.productName,
                quantity: product.quantity,
                price: product.lastPrice || 0
            });
        });
        
        // Si estamos en el modal de devolución, mostrar un selector de productos
        if (document.getElementById('returnDate')) {
            // Buscar el contenedor del primer producto
            const productContainer = document.querySelector('#returnProductsList .product-item');
            if (productContainer) {
                // Obtener campo de nombre del producto
                const nameInput = productContainer.querySelector('.return-product-name');
                if (nameInput) {
                    // Convertir input a selector
                    const selectContainer = document.createElement('div');
                    selectContainer.innerHTML = `
                        <select class="form-select return-product-name" required>
                            <option value="">Seleccionar producto</option>
                            ${products.map(product => 
                                `<option value="${product.name}" data-quantity="${product.quantity}">${product.name} (${product.quantity} disponibles)</option>`
                            ).join('')}
                        </select>
                    `;
                    
                    // Reemplazar input por selector
                    nameInput.parentNode.replaceChild(selectContainer.firstElementChild, nameInput);
                    
                    // Agregar evento para actualizar cantidad máxima disponible
                    const newSelect = productContainer.querySelector('select.return-product-name');
                    if (newSelect) {
                        newSelect.addEventListener('change', function() {
                            const option = this.options[this.selectedIndex];
                            const availableQty = option.dataset.quantity;
                            const qtyInput = productContainer.querySelector('.return-product-quantity');
                            
                            if (qtyInput && availableQty) {
                                qtyInput.max = availableQty;
                                qtyInput.placeholder = `Máx: ${availableQty}`;
                            }
                        });
                    }
                }
            }
            
            // Actualizar función para agregar producto
            if (addReturnProductBtn) {
                // Guardar la función original
                const originalAddProduct = addReturnProductBtn.onclick;
                
                // Sobrescribir con nueva función
                addReturnProductBtn.onclick = function() {
                    const newProduct = document.createElement('div');
                    newProduct.className = 'row product-item mb-3';
                    newProduct.innerHTML = `
                        <div class="col-md-6">
                            <label class="form-label">Producto</label>
                            <select class="form-select return-product-name" required>
                                <option value="">Seleccionar producto</option>
                                ${products.map(product => 
                                    `<option value="${product.name}" data-quantity="${product.quantity}">${product.name} (${product.quantity} disponibles)</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Cantidad</label>
                            <input type="number" class="form-control return-product-quantity" min="1" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">&nbsp;</label>
                            <button type="button" class="btn btn-danger form-control remove-product-btn">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    returnProductsList.appendChild(newProduct);
                    
                    // Agregar evento para actualizar cantidad máxima
                    const newSelect = newProduct.querySelector('select.return-product-name');
                    if (newSelect) {
                        newSelect.addEventListener('change', function() {
                            const option = this.options[this.selectedIndex];
                            const availableQty = option.dataset.quantity;
                            const qtyInput = newProduct.querySelector('.return-product-quantity');
                            
                            if (qtyInput && availableQty) {
                                qtyInput.max = availableQty;
                                qtyInput.placeholder = `Máx: ${availableQty}`;
                            }
                        });
                    }
                    
                    // Agregar evento para eliminar producto
                    const removeBtn = newProduct.querySelector('.remove-product-btn');
                    removeBtn.addEventListener('click', () => {
                        newProduct.remove();
                    });
                };
            }
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        alert('Error al cargar productos de esta bodega');
    }
}

// Ahora, vamos a agregar el evento al selector de bodega de origen
document.addEventListener('DOMContentLoaded', function() {
    // Cuando se abra el modal de devolución
    const originWarehouseSelect = document.getElementById('originWarehouse');
    if (originWarehouseSelect) {
        originWarehouseSelect.addEventListener('change', function() {
            const selectedWarehouse = this.value;
            if (selectedWarehouse) {
                loadProductsForOriginWarehouse(selectedWarehouse);
            }
        });
    }
});
// Añade esto justo después de la declaración de variables al inicio del archivo
// después de: let userWarehouses = [];
window.warehouseProducts = {};

// Y añade esta función al final del archivo
// Cargar productos para la bodega de origen
async function loadProductsForOriginWarehouse(warehouseId) {
    if (!warehouseId) return;
    
    try {
        console.log(`Cargando productos para bodega: ${warehouseId}`);
        
        // Obtener productos en esta bodega con stock positivo
        const inventorySnapshot = await db.collection('inventory')
            .where('warehouseId', '==', warehouseId)
            .where('quantity', '>', 0)
            .get();
        
        // Si no hay productos con stock
        if (inventorySnapshot.empty) {
            console.log('No hay productos con stock en esta bodega');
            window.warehouseProducts[warehouseId] = [];
            return;
        }
        
        // Almacenar productos disponibles
        window.warehouseProducts[warehouseId] = [];
        
        inventorySnapshot.forEach(doc => {
            const product = doc.data();
            window.warehouseProducts[warehouseId].push({
                id: doc.id,
                productName: product.productName,
                quantity: product.quantity,
                price: product.lastPrice || 0
            });
        });
        
        console.log(`Productos cargados: ${window.warehouseProducts[warehouseId].length}`);
        
        // Si ya existe un producto en el formulario, actualizar su selector
        const existingItems = document.querySelectorAll('#returnProductsList .product-item');
        if (existingItems.length > 0) {
            existingItems.forEach(item => {
                // Obtener el input o select actual
                const nameInput = item.querySelector('.return-product-name');
                if (!nameInput) return;
                
                // Crear un nuevo select
                const newSelect = document.createElement('select');
                newSelect.className = 'form-select return-product-name';
                newSelect.required = true;
                newSelect.innerHTML = `
                    <option value="">Seleccionar producto</option>
                    ${window.warehouseProducts[warehouseId].map(product => 
                        `<option value="${product.productName}" 
                            data-quantity="${product.quantity}">
                            ${product.productName} (${product.quantity} disponibles)
                        </option>`
                    ).join('')}
                `;
                
                // Reemplazar el input con el select
                nameInput.parentNode.replaceChild(newSelect, nameInput);
                
                // Agregar evento para actualizar cantidad
                newSelect.addEventListener('change', function() {
                    const option = this.options[this.selectedIndex];
                    const quantity = option.dataset.quantity;
                    const quantityInput = item.querySelector('.return-product-quantity');
                    
                    if (quantityInput && quantity) {
                        quantityInput.max = quantity;
                        quantityInput.placeholder = `Máx: ${quantity}`;
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

// Finalmente, añade esto al final para configurar el evento del selector de bodega
// Configurar evento cuando se selecciona una bodega de origen
document.addEventListener('DOMContentLoaded', function() {
    // Buscar el selector de bodega de origen
    const originWarehouse = document.getElementById('originWarehouse');
    if (originWarehouse) {
        // Configurar evento de cambio
        originWarehouse.addEventListener('change', function() {
            const selectedWarehouse = this.value;
            if (selectedWarehouse) {
                loadProductsForOriginWarehouse(selectedWarehouse);
            }
        });
        
        // Cargar productos si ya hay una bodega seleccionada
        setTimeout(() => {
            if (originWarehouse.value) {
                loadProductsForOriginWarehouse(originWarehouse.value);
            }
        }, 1000);
    }
    
    // También configurar evento para cuando se abre el modal
    const returnButton = document.querySelector('[data-bs-target="#newReturnModal"]');
    if (returnButton) {
        returnButton.addEventListener('click', function() {
            setTimeout(() => {
                const origin = document.getElementById('originWarehouse');
                if (origin && origin.value) {
                    loadProductsForOriginWarehouse(origin.value);
                }
            }, 500);
        });
    }
});