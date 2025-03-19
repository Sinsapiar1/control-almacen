// Funciones para gestionar transacciones (entradas y salidas)

// Obtener elementos del DOM
const recentActivity = document.getElementById('recentActivity');
const inventorySummary = document.getElementById('inventorySummary');
const newEntryBtn = document.getElementById('newEntryBtn');
const newExitBtn = document.getElementById('newExitBtn');
const newTransferBtn = document.getElementById('newTransferBtn');
const generateReportBtn = document.getElementById('generateReportBtn');
const entriesLink = document.getElementById('entriesLink');
const exitsLink = document.getElementById('exitsLink');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplay = document.getElementById('userDisplay');

// Cargar actividad reciente
async function loadRecentActivity(warehouses) {
    if (!recentActivity) return;
    
    try {
        // Si el usuario no tiene bodegas asignadas, mostrar mensaje
        if (!warehouses || warehouses.length === 0) {
            recentActivity.innerHTML = `
                <div class="alert alert-warning">
                    No tienes bodegas asignadas. Contacta al administrador.
                </div>
            `;
            return;
        }
        
        // Consultar las transacciones más recientes de las bodegas asignadas
        let transactionsQuery;
        
        try {
            transactionsQuery = await db.collection('transactions')
                .where('warehouseId', 'in', warehouses)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
        } catch (error) {
            // Si falla la consulta 'in', es posible que haya demasiadas bodegas
            // Intentamos una consulta sin filtro de bodegas como fallback
            console.warn('Error en consulta con filtro de bodegas:', error);
            transactionsQuery = await db.collection('transactions')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
        }
        
        if (transactionsQuery.empty) {
            recentActivity.innerHTML = `
                <div class="alert alert-info">
                    No hay actividad reciente en tus bodegas.
                </div>
            `;
            return;
        }
        
        // Mostrar las transacciones
        let activityHTML = '<ul class="list-group">';
        
        // Obtener bodegas para mostrar nombres
        const warehousesData = {};
        const warehousesSnapshot = await db.collection('warehouses').get();
        warehousesSnapshot.forEach(doc => {
            warehousesData[doc.id] = doc.data().name;
        });
        
        transactionsQuery.forEach((doc) => {
            const transaction = doc.data();
            const date = transaction.timestamp ? transaction.timestamp.toDate() : new Date();
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            let typeIcon = '';
            let typeBadge = '';
            let description = '';
            
            // Definir icono y badge según el tipo de transacción
            switch (transaction.type) {
                case 'entry':
                    typeIcon = '<i class="bi bi-box-arrow-in-down text-success"></i>';
                    typeBadge = '<span class="badge bg-success">Entrada</span>';
                    
                    if (transaction.invoiceNumber) {
                        description = `Entrada por factura: ${transaction.invoiceNumber}`;
                    } else if (transaction.returnReference) {
                        description = `Devolución: ${transaction.returnReference}`;
                    } else {
                        description = 'Entrada de productos';
                    }
                    break;
                
                case 'exit':
                    typeIcon = '<i class="bi bi-box-arrow-up text-danger"></i>';
                    typeBadge = '<span class="badge bg-danger">Salida</span>';
                    
                    if (transaction.clientName) {
                        description = `Salida a cliente: ${transaction.clientName}`;
                    } else {
                        description = 'Salida de productos';
                    }
                    break;
                
                case 'transfer':
                    typeIcon = '<i class="bi bi-arrow-left-right text-primary"></i>';
                    typeBadge = '<span class="badge bg-primary">Traspaso</span>';
                    
                    const targetWarehouseName = warehousesData[transaction.targetWarehouseId] || 'Desconocida';
                    description = `Traspaso a ${targetWarehouseName}`;
                    break;
                
                case 'waste':
                    typeIcon = '<i class="bi bi-trash text-warning"></i>';
                    typeBadge = '<span class="badge bg-warning text-dark">Merma</span>';
                    
                    let reasonText = 'Razón no especificada';
                    if (transaction.wasteReason) {
                        switch (transaction.wasteReason) {
                            case 'expired': reasonText = 'Producto Vencido'; break;
                            case 'damaged': reasonText = 'Producto Dañado'; break;
                            case 'quality': reasonText = 'Control de Calidad'; break;
                            case 'other': reasonText = 'Otro motivo'; break;
                        }
                    }
                    description = `Merma por ${reasonText}`;
                    break;
                
                default:
                    description = 'Transacción no especificada';
            }
            
            // Obtener nombre de bodega
            const warehouseName = warehousesData[transaction.warehouseId] || 'Desconocida';
            
            // Obtener cantidad de productos
            const productCount = transaction.products ? transaction.products.length : 0;
            
            activityHTML += `
                <li class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${typeIcon} ${description}</h6>
                        ${typeBadge}
                    </div>
                    <div>
                        <small class="text-muted">
                            <strong>Bodega:</strong> ${warehouseName} | 
                            <strong>Productos:</strong> ${productCount} | 
                            <strong>Usuario:</strong> ${transaction.userEmail || 'N/A'} | 
                            <strong>Fecha:</strong> ${formattedDate}
                        </small>
                    </div>
                </li>
            `;
        });
        
        activityHTML += '</ul>';
        recentActivity.innerHTML = activityHTML;
    } catch (error) {
        console.error('Error al cargar actividad reciente:', error);
        recentActivity.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar datos. Intenta recargar la página.
            </div>
        `;
    }
}

// Cargar resumen de inventario

// Cargar resumen de inventario
async function loadInventorySummary(warehouses) {
    if (!inventorySummary) return;
    
    try {
        // Mensaje de depuración
        console.log("Cargando resumen para bodegas:", warehouses);
        
        // Si el usuario no tiene bodegas asignadas, mostrar mensaje
        if (!warehouses || warehouses.length === 0) {
            inventorySummary.innerHTML = `
                <div class="alert alert-warning">
                    No tienes bodegas asignadas. Contacta al administrador.
                </div>
            `;
            return;
        }
        
        // Obtener todas las bodegas disponibles
        const warehousesData = {};
        const warehousesSnapshot = await db.collection('warehouses').get();
        
        console.log("Total de bodegas en sistema:", warehousesSnapshot.size);
        
        warehousesSnapshot.forEach(doc => {
            warehousesData[doc.id] = doc.data().name;
            console.log(`Bodega encontrada: ${doc.id} - ${doc.data().name}`);
        });
        
        // Resumen por bodega
        let summaryHTML = '';
        
        // Mostrar primero la información general de todas las bodegas asignadas
        let totalProducts = 0;
        let totalValue = 0;
        let totalLowStock = 0;
        
        // Para cada bodega asignada al usuario
        for (const warehouseId of warehouses) {
            const warehouseName = warehousesData[warehouseId] || 'Desconocida';
            console.log(`Procesando bodega: ${warehouseName} (${warehouseId})`);
            
            // Obtener productos de esta bodega
            const inventoryQuery = await db.collection('inventory')
                .where('warehouseId', '==', warehouseId)
                .get();
            
            console.log(`Productos encontrados en ${warehouseName}: ${inventoryQuery.size}`);
            
            // Contadores para esta bodega
            let productCount = 0;
            let warehouseValue = 0;
            let lowStockCount = 0;
            
            inventoryQuery.forEach(doc => {
                const product = doc.data();
                productCount++;
                
                // Calcular valor del inventario
                const quantity = product.quantity || 0;
                const price = product.lastPrice || 0;
                warehouseValue += quantity * price;
                
                // Contar productos con stock bajo (menos de 10 unidades)
                if (quantity > 0 && quantity < 10) {
                    lowStockCount++;
                }
            });
            
            // Acumular totales
            totalProducts += productCount;
            totalValue += warehouseValue;
            totalLowStock += lowStockCount;
            
            // Crear tarjeta para esta bodega
            summaryHTML += `
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">${warehouseName}</h6>
                    </div>
                    <div class="card-body p-2">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="border rounded p-2 text-center">
                                    <div class="small text-muted">Productos</div>
                                    <div class="h5">${productCount}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="border rounded p-2 text-center">
                                    <div class="small text-muted">Valor Total</div>
                                    <div class="h5">$${warehouseValue.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="border rounded p-2 text-center ${lowStockCount > 0 ? 'bg-warning text-dark' : ''}">
                                    <div class="small text-muted">Stock Bajo</div>
                                    <div class="h5">${lowStockCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Mostrar el resumen
        inventorySummary.innerHTML = summaryHTML;
        
    } catch (error) {
        console.error('Error al cargar resumen de inventario:', error);
        inventorySummary.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar datos. Intenta recargar la página.
            </div>
        `;
    }
}

// Verificar si el usuario está autenticado
auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        try {
            // Mostrar información del usuario
            if (userDisplay) {
                userDisplay.textContent = user.email;
            }
            
            // Cargar datos del usuario desde Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                if (userDisplay) {
                    userDisplay.textContent = userData.fullName;
                }
                
                // Cargar datos del dashboard si estamos en esa página
                if (window.location.pathname.includes('dashboard.html')) {
                    // Cargar actividad reciente
                    if (recentActivity) {
                        loadRecentActivity(userData.assignedWarehouses);
                    }
                    
                    // Cargar resumen de inventario
                    if (inventorySummary) {
                        loadInventorySummary(userData.assignedWarehouses);
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
        }
    } else {
        // Si no está autenticado y no estamos en la página de login o registro
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html') && !currentPage.includes('register.html') && !currentPage.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Manejar botones de acciones rápidas
if (newEntryBtn) {
    newEntryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'entries.html';
    });
}

if (newExitBtn) {
    newExitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'exits.html';
    });
}

if (newTransferBtn) {
    newTransferBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Guardar flag para abrir modal de traspaso
        localStorage.setItem('openTransferModal', 'true');
        // Redirigir a la página de salidas
        window.location.href = 'exits.html';
    });
}


// Manejar enlaces del menú
if (entriesLink) {
    entriesLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'entries.html';
    });
}

if (exitsLink) {
    exitsLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'exits.html';
    });
}

// Cerrar sesión
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

// Manejar enlaces del menú
if (inventoryLink) {
    inventoryLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'inventory.html';
    });
}

// Agregar función para recargar datos del dashboard
function refreshDashboard() {
    if (recentActivity || inventorySummary) {
        auth.onAuthStateChanged(async (user) => {
            if (user && user.emailVerified) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        if (recentActivity) {
                            loadRecentActivity(userData.assignedWarehouses);
                        }
                        
                        if (inventorySummary) {
                            loadInventorySummary(userData.assignedWarehouses);
                        }
                    }
                } catch (error) {
                    console.error('Error al actualizar dashboard:', error);
                }
            }
        });
    }
}

// Actualizar dashboard cada 60 segundos si estamos en esa página
if (window.location.pathname.includes('dashboard.html')) {
    setInterval(refreshDashboard, 60000);
}
// Añade o modifica esta función en transactions.js


// Función para mostrar opciones de reporte
async function showReportOptions() {
    try {
        console.log('Iniciando generación de reporte');

        // Eliminar cualquier modal existente antes de crear uno nuevo
        const existingModal = document.getElementById('reportOptionsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Validar que estamos en un contexto con acceso a Firebase
        if (!db || !firebase) {
            throw new Error('Firebase no está inicializado correctamente');
        }

        let warehousesData = {};
        try {
            // Cargar bodegas
            const warehousesSnapshot = await db.collection('warehouses').get();
            
            // Verificar si hay bodegas
            if (warehousesSnapshot.empty) {
                console.warn('No hay bodegas disponibles');
                alert('No hay bodegas disponibles para generar el reporte.');
                return;
            }
            
            warehousesSnapshot.forEach(doc => {
                const warehouseData = doc.data();
                if (warehouseData && warehouseData.name) {
                    warehousesData[doc.id] = {
                        id: doc.id,
                        name: warehouseData.name
                    };
                }
            });
        } catch (loadError) {
            console.error('Error al cargar bodegas:', loadError);
            alert('No se pudieron cargar las bodegas. Inténtelo de nuevo.');
            return;
        }
        
        // Verificar que se cargaron bodegas
        if (Object.keys(warehousesData).length === 0) {
            console.warn('No se pudieron cargar datos de bodegas');
            alert('No se pudieron cargar las bodegas.');
            return;
        }

        // Crear modal para seleccionar tipo de reporte
        const modalHTML = `
            <div class="modal fade" id="reportOptionsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Generar Reporte</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Tipo de Reporte</label>
                                <select id="reportType" class="form-select">
                                    <option value="inventory">Inventario Actual</option>
                                    <option value="transactions">Transacciones</option>
                                    <option value="lowstock">Productos con Stock Bajo</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Bodega</label>
                                <select id="reportWarehouse" class="form-select">
                                    <option value="all">Todas las Bodegas</option>
                                </select>
                            </div>
                            
                            <div class="mb-3 date-range" style="display: none;">
                                <label class="form-label">Rango de Fechas</label>
                                <div class="row">
                                    <div class="col">
                                        <label>Desde</label>
                                        <input type="date" id="startDate" class="form-control">
                                    </div>
                                    <div class="col">
                                        <label>Hasta</label>
                                        <input type="date" id="endDate" class="form-control">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Formato</label>
                                <select id="reportFormat" class="form-select">
                                    <option value="csv">CSV</option>
                                    <option value="html">HTML</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="generateReportBtn">Generar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar modal en el DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Crear instancia de modal
        const reportModal = new bootstrap.Modal(document.getElementById('reportOptionsModal'), {
            backdrop: 'static',
            keyboard: false
        });
        
        // Llenar opciones de bodega
        const warehouseSelect = document.getElementById('reportWarehouse');
        Object.values(warehousesData).forEach(warehouse => {
            warehouseSelect.innerHTML += `
                <option value="${warehouse.id}">${warehouse.name}</option>
            `;
        });
        
        // Mostrar/ocultar selector de fechas según tipo de reporte
        const reportTypeSelect = document.getElementById('reportType');
        const dateRangeDiv = document.querySelector('.date-range');
        
        reportTypeSelect.addEventListener('change', function() {
            dateRangeDiv.style.display = this.value === 'transactions' ? 'block' : 'none';
        });
        
        // Establecer fechas por defecto (último mes)
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        const endDateInput = document.getElementById('endDate');
        const startDateInput = document.getElementById('startDate');
        
        endDateInput.valueAsDate = today;
        startDateInput.valueAsDate = lastMonth;
        
        // Capturar el botón de generar
        const generateBtn = document.getElementById('generateReportBtn');
        
        // Limpiar cualquier evento anterior
        generateBtn.onclick = null;
        
        // Flag para prevenir múltiples generaciones
        let isGenerating = false;
        
        // Función de generación de reporte
        const generateReportHandler = async () => {
            console.log('Botón de generación de reporte clickeado');
            
            // Prevenir múltiples clics
            if (isGenerating) {
                console.log('Generación en progreso, ignorando clic');
                return;
            }
            
            isGenerating = true;
            
            try {
                // Validar existencia de elementos antes de acceder a sus valores
                const reportTypeElement = document.getElementById('reportType');
                const warehouseElement = document.getElementById('reportWarehouse');
                const formatElement = document.getElementById('reportFormat');
                
                if (!reportTypeElement || !warehouseElement || !formatElement) {
                    console.error('Uno o más elementos del formulario no existen');
                    alert('Error: No se pudieron encontrar los elementos del formulario');
                    return;
                }
                
                const reportType = reportTypeElement.value;
                const warehouseId = warehouseElement.value;
                const format = formatElement.value;
                
                console.log('Parámetros del reporte:', { reportType, warehouseId, format });
                
                // Cerrar modal
                reportModal.hide();
                
                // Fechas solo para reporte de transacciones
                let startDate, endDate;
                if (reportType === 'transactions') {
                    const startDateInput = document.getElementById('startDate');
                    const endDateInput = document.getElementById('endDate');
                    
                    if (!startDateInput || !endDateInput) {
                        console.error('Elementos de fecha no encontrados');
                        alert('Error: No se pudieron encontrar los campos de fecha');
                        return;
                    }
                    
                    startDate = startDateInput.valueAsDate;
                    endDate = endDateInput.valueAsDate;
                    
                    // Ajustar endDate para incluir todo el día
                    if (endDate) {
                        endDate.setHours(23, 59, 59, 999);
                    }
                }
                
                console.log('Generando reporte...');
                await generateReport(reportType, warehouseId, format, startDate, endDate, warehousesData);
                console.log('Reporte generado exitosamente');
                
            } catch (error) {
                console.error("Error al generar reporte:", error);
                alert("Error al generar el reporte: " + (error.message || "Ocurrió un error inesperado"));
            } finally {
                isGenerating = false;
            }
        };
        
        // Agregar evento de clic
        generateBtn.addEventListener('click', generateReportHandler);
        
        // Mostrar modal
        reportModal.show();
        
    } catch (error) {
        console.error("Error al preparar el modal de reporte:", error);
        alert("Error al preparar opciones de reporte: " + (error.message || "Ocurrió un error inesperado"));
    }
}

// Función para generar el reporte
async function getTransactionsReportData(warehouseId, startDate, endDate, allWarehouses) {
    let query = db.collection('transactions')
        .orderBy('timestamp', 'desc');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const transaction = doc.data();
        const date = transaction.timestamp ? transaction.timestamp.toDate() : null;
        
        // Filtrar por fecha si es necesario
        if (date && startDate && endDate) {
            if (date < startDate || date > endDate) return;
        }
        
        // Determinar tipo y descripción
        let typeText = '';
        let description = '';
        
        switch (transaction.type) {
            case 'entry':
                typeText = 'Entrada';
                description = transaction.invoiceNumber ? `Factura: ${transaction.invoiceNumber}` : 'Entrada de productos';
                break;
            case 'exit':
                typeText = 'Salida';
                description = transaction.clientName ? `Cliente: ${transaction.clientName}` : 'Salida de productos';
                break;
            case 'transfer':
                typeText = 'Traspaso';
                const targetWarehouse = allWarehouses[transaction.targetWarehouseId]?.name || 'Desconocida';
                description = `A: ${targetWarehouse}`;
                break;
            case 'waste':
                typeText = 'Merma';
                description = transaction.wasteReason || 'No especificado';
                break;
            case 'return':
                typeText = 'Devolución';
                description = transaction.returnReference || 'No especificado';
                break;
        }
        
        // Información básica de la transacción
        const baseInfo = {
            Fecha: date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : '-',
            Tipo: typeText,
            Descripción: description,
            Bodega: allWarehouses[transaction.warehouseId]?.name || 'Desconocida',
            Usuario: transaction.userEmail || '-',
            Total: transaction.total ? `$${transaction.total.toFixed(2)}` : '-'
        };
        
        // Agregar una fila por cada producto si hay productos
        if (transaction.products && transaction.products.length > 0) {
            transaction.products.forEach((product, index) => {
                data.push({
                    ...baseInfo,
                    'ID Transacción': index === 0 ? doc.id : '',
                    Producto: product.name || product.productName || '-',
                    Cantidad: product.quantity || 0,
                    'Precio Unitario': product.price ? `$${product.price.toFixed(2)}` : '-',
                    Subtotal: product.price && product.quantity ? `$${(product.price * product.quantity).toFixed(2)}` : '-'
                });
            });
        } else {
            // Si no hay productos, agregar una sola fila
            data.push({
                ...baseInfo,
                'ID Transacción': doc.id,
                Producto: '-',
                Cantidad: '-',
                'Precio Unitario': '-',
                Subtotal: '-'
            });
        }
    });
    
    return data;
}

// Función para obtener datos de inventario
async function getLowStockReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory')
        .where('quantity', '>', 0)
        .where('quantity', '<', 10);
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            'Stock Actual': item.quantity || 0,
            'Stock Mínimo': 10,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}
// Función para obtener datos de stock bajo
async function getLowStockReportData(warehouseId) {
    let query = db.collection('inventory')
        .where('quantity', '>', 0)
        .where('quantity', '<', 10);
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            'Stock Actual': item.quantity || 0,
            'Stock Mínimo': 10,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}

// Función para descargar archivo CSV
function downloadCSV(data, filename) {
    if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Encabezados
    const headers = Object.keys(data[0]);
    
    // Contenido CSV
    let csvContent = headers.join(',') + '\n';
    
    // Agregar filas
    csvContent += data.map(row => {
        return headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : row[header].toString();
            // Escapar comas y comillas
            cell = cell.replace(/"/g, '""');
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                cell = `"${cell}"`;
            }
            return cell;
        }).join(',');
    }).join('\n');
    
    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para descargar archivo HTML
function downloadHTML(data, reportType, filename) {
    if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Título del reporte
    let reportTitle = '';
    switch (reportType) {
        case 'inventory':
            reportTitle = 'Reporte de Inventario';
            break;
        case 'transactions':
            reportTitle = 'Reporte de Transacciones';
            break;
        case 'lowstock':
            reportTitle = 'Reporte de Productos con Stock Bajo';
            break;
    }
    
    // Crear tabla HTML
    const headers = Object.keys(data[0]);
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    
    const rows = data.map(row => {
        const cells = headers.map(header => `<td>${row[header]}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    
    // Plantilla HTML
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${reportTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #0d6efd; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #0d6efd; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .footer { margin-top: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <h1>${reportTitle}</h1>
            <p>Fecha de generación: ${new Date().toLocaleString()}</p>
            
            <table>
                <thead>
                    <tr>${headerRow}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Reporte generado desde Sistema de Control de Almacén</p>
            </div>
        </body>
        </html>
    `;
    
    // Crear blob y descargar
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función auxiliar para formatear fecha (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función para obtener datos de inventario
async function getInventoryReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            'Stock Actual': item.quantity || 0,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}

// Función para generar el reporte

async function generateReport(type, warehouseId, format, startDate, endDate, warehousesData) {
    try {
        let reportData = [];
        let fileName = '';
        
        switch (type) {
            case 'inventory':
                reportData = await getInventoryReportData(warehouseId, warehousesData);
                fileName = 'inventario';
                break;
            case 'transactions':
                reportData = await getTransactionsReportData(warehouseId, startDate, endDate, warehousesData);
                fileName = 'transacciones';
                break;
            case 'lowstock':
                reportData = await getLowStockReportData(warehouseId, warehousesData);
                fileName = 'stock_bajo';
                break;
        }
        
        if (reportData.length === 0) {
            alert('No hay datos para generar el reporte seleccionado.');
            return;
        }
        
        // 2. Generar archivo según formato
        if (format === 'csv') {
            downloadCSV(reportData, `${fileName}_${formatDate(new Date())}.csv`);
        } else {
            downloadHTML(reportData, type, `${fileName}_${formatDate(new Date())}.html`);
        }
        
    } catch (error) {
        console.error('Error al generar reporte:', error);
        alert('Error al generar el reporte. Intente nuevamente.');
    }
}

// Función para obtener datos de inventario
async function getInventoryReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            Cantidad: item.quantity || 0,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}// Función para generar el reporte
async function generateReport(type, warehouseId, format, startDate, endDate, warehousesData) {
    try {
        let reportData = [];
        let fileName = '';
        
        switch (type) {
            case 'inventory':
                reportData = await getInventoryReportData(warehouseId, warehousesData);
                fileName = 'inventario';
                break;
            case 'transactions':
                reportData = await getTransactionsReportData(warehouseId, startDate, endDate, warehousesData);
                fileName = 'transacciones';
                break;
            case 'lowstock':
                reportData = await getLowStockReportData(warehouseId, warehousesData);
                fileName = 'stock_bajo';
                break;
        }
        
        if (reportData.length === 0) {
            alert('No hay datos para generar el reporte seleccionado.');
            return;
        }
        
        // 2. Generar archivo según formato
        if (format === 'csv') {
            downloadCSV(reportData, `${fileName}_${formatDate(new Date())}.csv`);
        } else {
            downloadHTML(reportData, type, `${fileName}_${formatDate(new Date())}.html`);
        }
        
    } catch (error) {
        console.error('Error al generar reporte:', error);
        alert('Error al generar el reporte. Intente nuevamente.');
    }
}

// Función para obtener datos de inventario
async function getInventoryReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            Cantidad: item.quantity || 0,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}

// Función para obtener datos de transacciones
async function getTransactionsReportData(warehouseId, startDate, endDate, allWarehouses) {
    let query = db.collection('transactions')
        .orderBy('timestamp', 'desc');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const transaction = doc.data();
        const date = transaction.timestamp ? transaction.timestamp.toDate() : null;
        
        // Filtrar por fecha si es necesario
        if (date && startDate && endDate) {
            if (date < startDate || date > endDate) return;
        }
        
        // Determinar tipo y descripción
        let typeText = '';
        let description = '';
        
        switch (transaction.type) {
            case 'entry':
                typeText = 'Entrada';
                description = transaction.invoiceNumber ? `Factura: ${transaction.invoiceNumber}` : 'Entrada de productos';
                break;
            case 'exit':
                typeText = 'Salida';
                description = transaction.clientName ? `Cliente: ${transaction.clientName}` : 'Salida de productos';
                break;
            case 'transfer':
                typeText = 'Traspaso';
                const targetWarehouse = allWarehouses[transaction.targetWarehouseId]?.name || 'Desconocida';
                description = `A: ${targetWarehouse}`;
                break;
            case 'waste':
                typeText = 'Merma';
                description = transaction.wasteReason || 'No especificado';
                break;
            case 'return':
                typeText = 'Devolución';
                description = transaction.returnReference || 'No especificado';
                break;
        }
        
        // Información básica de la transacción
        const baseInfo = {
            Fecha: date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : '-',
            Tipo: typeText,
            Descripción: description,
            Bodega: allWarehouses[transaction.warehouseId]?.name || 'Desconocida',
            Usuario: transaction.userEmail || '-',
            Total: transaction.total ? `$${transaction.total.toFixed(2)}` : '-'
        };
        
        // Agregar una fila por cada producto si hay productos
        if (transaction.products && transaction.products.length > 0) {
            transaction.products.forEach((product, index) => {
                data.push({
                    ...baseInfo,
                    'ID Transacción': index === 0 ? doc.id : '',
                    Producto: product.name || product.productName || '-',
                    Cantidad: product.quantity || 0,
                    'Precio Unitario': product.price ? `$${product.price.toFixed(2)}` : '-',
                    Subtotal: product.price && product.quantity ? `$${(product.price * product.quantity).toFixed(2)}` : '-'
                });
            });
        } else {
            // Si no hay productos, agregar una sola fila
            data.push({
                ...baseInfo,
                'ID Transacción': doc.id,
                Producto: '-',
                Cantidad: '-',
                'Precio Unitario': '-',
                Subtotal: '-'
            });
        }
    });
    
    return data;
}

// Función para obtener datos de stock bajo
async function getLowStockReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory')
        .where('quantity', '>', 0)
        .where('quantity', '<', 10);
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            'Stock Actual': item.quantity || 0,
            'Stock Mínimo': 10,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}

// Función para obtener datos de transacciones
async function getTransactionsReportData(warehouseId, startDate, endDate, allWarehouses) {
    let query = db.collection('transactions')
        .orderBy('timestamp', 'desc');
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const transaction = doc.data();
        const date = transaction.timestamp ? transaction.timestamp.toDate() : null;
        
        // Filtrar por fecha si es necesario
        if (date && startDate && endDate) {
            if (date < startDate || date > endDate) return;
        }
        
        // Determinar tipo y descripción
        let typeText = '';
        let description = '';
        
        switch (transaction.type) {
            case 'entry':
                typeText = 'Entrada';
                description = transaction.invoiceNumber ? `Factura: ${transaction.invoiceNumber}` : 'Entrada de productos';
                break;
            case 'exit':
                typeText = 'Salida';
                description = transaction.clientName ? `Cliente: ${transaction.clientName}` : 'Salida de productos';
                break;
            case 'transfer':
                typeText = 'Traspaso';
                const targetWarehouse = allWarehouses[transaction.targetWarehouseId]?.name || 'Desconocida';
                description = `A: ${targetWarehouse}`;
                break;
            case 'waste':
                typeText = 'Merma';
                description = transaction.wasteReason || 'No especificado';
                break;
            case 'return':
                typeText = 'Devolución';
                description = transaction.returnReference || 'No especificado';
                break;
        }
        
        // Información básica de la transacción
        const baseInfo = {
            Fecha: date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : '-',
            Tipo: typeText,
            Descripción: description,
            Bodega: allWarehouses[transaction.warehouseId]?.name || 'Desconocida',
            Usuario: transaction.userEmail || '-',
            Total: transaction.total ? `$${transaction.total.toFixed(2)}` : '-'
        };
        
        // Agregar una fila por cada producto si hay productos
        if (transaction.products && transaction.products.length > 0) {
            transaction.products.forEach((product, index) => {
                data.push({
                    ...baseInfo,
                    'ID Transacción': index === 0 ? doc.id : '',
                    Producto: product.name || product.productName || '-',
                    Cantidad: product.quantity || 0,
                    'Precio Unitario': product.price ? `$${product.price.toFixed(2)}` : '-',
                    Subtotal: product.price && product.quantity ? `$${(product.price * product.quantity).toFixed(2)}` : '-'
                });
            });
        } else {
            // Si no hay productos, agregar una sola fila
            data.push({
                ...baseInfo,
                'ID Transacción': doc.id,
                Producto: '-',
                Cantidad: '-',
                'Precio Unitario': '-',
                Subtotal: '-'
            });
        }
    });
    
    return data;
}

// Función para obtener datos de stock bajo
async function getLowStockReportData(warehouseId, allWarehouses) {
    let query = db.collection('inventory')
        .where('quantity', '>', 0)
        .where('quantity', '<', 10);
    
    if (warehouseId !== 'all') {
        query = query.where('warehouseId', '==', warehouseId);
    }
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach(doc => {
        const item = doc.data();
        data.push({
            Producto: item.productName,
            'Stock Actual': item.quantity || 0,
            'Stock Mínimo': 10,
            'Precio Unitario': item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '-',
            'Valor Total': item.quantity && item.lastPrice ? `$${(item.quantity * item.lastPrice).toFixed(2)}` : '-',
            Bodega: allWarehouses[item.warehouseId]?.name || 'Desconocida',
            'Última Actualización': item.updatedAt ? item.updatedAt.toDate().toLocaleDateString() : '-'
        });
    });
    
    return data;
}
// Evento para generación de reportes mejorado
document.addEventListener('DOMContentLoaded', () => {
    const allGenerateReportButtons = document.querySelectorAll('[id="generateReportBtn"], [id="Generar\u00A0Reporte"]');
    
    allGenerateReportButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Botón de generación de reporte clickeado');
            
            try {
                await showReportOptions();
            } catch (error) {
                console.error('Error al generar reporte:', error);
                alert('Error al generar reporte: ' + error.message);
            }
        });
    });
});

// Añade esta función al final de tu transactions.js

// Función especial para manejar el modal de reportes
// Función mejorada para manejar el modal de reportes
function configurarModalReportes() {
    // Esta función se ejecutará cuando se haga clic en el botón "Generar Reporte"
    const abrirModalReportes = async function(e) {
      e.preventDefault();
      console.log('Botón de generación de reporte clickeado');
      
      try {
        // Eliminar cualquier modal existente antes de crear uno nuevo
        const existingModal = document.getElementById('reportOptionsModal');
        if (existingModal) {
          existingModal.remove();
        }
        
        // Cargar datos de bodegas
        const warehousesData = {};
        const warehousesSnapshot = await db.collection('warehouses').get();
        warehousesSnapshot.forEach(doc => {
          const warehouseData = doc.data();
          if (warehouseData && warehouseData.name) {
            warehousesData[doc.id] = {
              id: doc.id,
              name: warehouseData.name
            };
          }
        });
        
        // Crear el HTML del modal (manteniendo los IDs originales)
        const modalHTML = `
          <div class="modal fade" id="reportOptionsModal" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Generar Reporte</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label">Tipo de Reporte</label>
                    <select id="reportType" class="form-select">
                      <option value="inventory">Inventario Actual</option>
                      <option value="transactions">Transacciones</option>
                      <option value="lowstock">Productos con Stock Bajo</option>
                    </select>
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label">Bodega</label>
                    <select id="reportWarehouse" class="form-select">
                      <option value="all">Todas las Bodegas</option>
                      ${Object.values(warehousesData).map(warehouse => 
                        `<option value="${warehouse.id}">${warehouse.name}</option>`
                      ).join('')}
                    </select>
                  </div>
                  
                  <div class="mb-3 date-range" style="display: none;">
                    <label class="form-label">Rango de Fechas</label>
                    <div class="row">
                      <div class="col">
                        <label>Desde</label>
                        <input type="date" id="startDate" class="form-control">
                      </div>
                      <div class="col">
                        <label>Hasta</label>
                        <input type="date" id="endDate" class="form-control">
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label">Formato</label>
                    <select id="reportFormat" class="form-select">
                      <option value="csv">CSV</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn btn-primary" id="btnGenerar">Generar</button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Añadir el modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Mostrar el modal
        const reportModal = new bootstrap.Modal(document.getElementById('reportOptionsModal'));
        reportModal.show();
        
        // Configurar comportamiento de fechas
        const reportTypeSelect = document.getElementById('reportType');
        const dateRangeDiv = document.querySelector('.date-range');
        
        reportTypeSelect.addEventListener('change', function() {
          dateRangeDiv.style.display = this.value === 'transactions' ? 'block' : 'none';
        });
        
        // Establecer fechas por defecto
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        const endDateInput = document.getElementById('endDate');
        const startDateInput = document.getElementById('startDate');
        
        endDateInput.valueAsDate = today;
        startDateInput.valueAsDate = lastMonth;
        
        // Configurar evento del botón Generar
        const btnGenerar = document.getElementById('btnGenerar');
        btnGenerar.addEventListener('click', async function() {
          try {
            // Capturar valores ANTES de cerrar el modal
            const reportType = document.getElementById('reportType').value;
            const warehouseId = document.getElementById('reportWarehouse').value;
            const format = document.getElementById('reportFormat').value;
            
            let startDate = null, endDate = null;
            if (reportType === 'transactions') {
              startDate = document.getElementById('startDate').valueAsDate;
              endDate = document.getElementById('endDate').valueAsDate;
              if (endDate) {
                endDate.setHours(23, 59, 59, 999);
              }
            }
            
            // Cerrar modal
            reportModal.hide();
            
            // Esperar a que el modal se cierre completamente
            setTimeout(async () => {
              // Generar reporte con los valores capturados
              await generateReport(reportType, warehouseId, format, startDate, endDate, warehousesData);
            }, 500);
          } catch (error) {
            console.error('Error al generar reporte:', error);
            alert('Error al generar reporte: ' + error.message);
          }
        });
      } catch (error) {
        console.error('Error al abrir modal de reportes:', error);
        alert('Error al preparar opciones de reporte: ' + error.message);
      }
    };
    
    // Asignar este manejador a todos los botones de reportes
    const reportBtns = document.querySelectorAll('[id="generateReportBtn"], .btn-generate-report, [data-action="generate-report"]');
    reportBtns.forEach(btn => {
      // Eliminar eventos previos
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      // Asignar el nuevo evento
      newBtn.addEventListener('click', abrirModalReportes);
    });
  }
  
  // Inicializar cuando el DOM está listo
  document.addEventListener('DOMContentLoaded', function() {
    configurarModalReportes();
  });