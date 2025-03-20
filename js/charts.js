// Función para crear el gráfico de análisis de inventario
async function createInventoryAnalysisChart() {
    const ctx = document.getElementById('inventoryChartAnalisis').getContext('2d');
    
    try {
        // Obtener datos del inventario desde Firestore
        const inventorySnapshot = await db.collection('inventory').get();
        
        // Agrupar productos por bodega
        const warehouseData = {};
        inventorySnapshot.forEach(doc => {
            const data = doc.data();
            if (!warehouseData[data.warehouseId]) {
                warehouseData[data.warehouseId] = {
                    products: 0,
                    value: 0
                };
            }
            warehouseData[data.warehouseId].products++;
            warehouseData[data.warehouseId].value += (data.quantity || 0) * (data.lastPrice || 0);
        });

        // Obtener nombres de bodegas
        const warehousesSnapshot = await db.collection('warehouses').get();
        const warehouseNames = {};
        warehousesSnapshot.forEach(doc => {
            warehouseNames[doc.id] = doc.data().name;
        });

        // Preparar datos para el gráfico
        const labels = Object.keys(warehouseData).map(id => warehouseNames[id] || id);
        const productData = Object.values(warehouseData).map(d => d.products);
        const valueData = Object.values(warehouseData).map(d => d.value);

        // Crear el gráfico
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Número de Productos',
                        data: productData,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        yAxisID: 'y-products'
                    },
                    {
                        label: 'Valor del Inventario ($)',
                        data: valueData,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        yAxisID: 'y-value'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    'y-products': {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Número de Productos'
                        }
                    },
                    'y-value': {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Valor ($)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Resumen de Inventario por Bodega'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear el gráfico:', error);
        ctx.canvas.parentNode.innerHTML = 'Error al cargar el gráfico';
    }
}

// Inicializar gráfico cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('inventoryChartAnalisis')) {
        createInventoryAnalysisChart();
    }
});