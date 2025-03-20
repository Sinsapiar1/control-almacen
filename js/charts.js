// charts.js - Funciones para generar gráficos y visualizaciones

// Función para crear gráfico de inventario
function createInventoryChart() {
    const ctx = document.getElementById('inventoryChart');
    if (!ctx) return;
    
    // Recuperar datos de inventario desde Firebase
    auth.onAuthStateChanged(async (user) => {
        if (user && user.emailVerified) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const warehouses = userData.assignedWarehouses || [];
                    
                    // Variables para almacenar datos
                    const warehouseNames = [];
                    const productCounts = [];
                    const stockValues = [];
                    
                    // Recuperar datos de cada bodega
                    for (const warehouseId of warehouses) {
                        // Obtener nombre de bodega
                        const warehouseDoc = await db.collection('warehouses').doc(warehouseId).get();
                        if (warehouseDoc.exists) {
                            const warehouseName = warehouseDoc.data().name;
                            warehouseNames.push(warehouseName);
                            
                            // Contar productos y valor
                            const inventoryQuery = await db.collection('inventory')
                                .where('warehouseId', '==', warehouseId)
                                .get();
                            
                            let count = 0;
                            let value = 0;
                            
                            inventoryQuery.forEach(doc => {
                                const product = doc.data();
                                count++;
                                value += (product.quantity || 0) * (product.lastPrice || 0);
                            });
                            
                            productCounts.push(count);
                            stockValues.push(value);
                        }
                    }
                    
                    // Crear gráfico
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: warehouseNames,
                            datasets: [
                                {
                                    label: 'Número de Productos',
                                    data: productCounts,
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y'
                                },
                                {
                                    label: 'Valor del Inventario ($)',
                                    data: stockValues,
                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y1'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    type: 'linear',
                                    position: 'left',
                                    title: {
                                        display: true,
                                        text: 'Número de Productos'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: 'Valor ($)'
                                    },
                                    grid: {
                                        drawOnChartArea: false
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error al crear gráfico:', error);
            }
        }
    });
}

// Inicializar gráficos cuando el documento está listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráfico si estamos en la página correcta
    if (window.location.pathname.includes('dashboard.html') || 
        window.location.pathname.endsWith('/') || 
        window.location.pathname.endsWith('/dashboard')) {
        createInventoryChart();
    }
});