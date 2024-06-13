document.addEventListener('DOMContentLoaded', function () {
    const clientId = '07a2cd4275a54b88a56f5e8081fd8935';
    const clientSecret = '7SvzaPEDoTfTvZGrMEflxfDUIqMfpdFA';
    let accessToken = null;
    let chart = null;

    const form = document.getElementById('tokenForm');
    const formValues = {
        server: form.server.value,
        gameType: form.gameType.value,
        timeRange: form.timeRange.value
    };

    form.addEventListener('change', updateFormValues);

    async function updateFormValues() {
        formValues.server = form.server.value;
        formValues.gameType = form.gameType.value;
        formValues.timeRange = form.timeRange.value;

        if (!accessToken) {
            accessToken = await getAccessToken(clientId, clientSecret);
        }

        fetchTokenData(formValues.server, formValues.gameType, formValues.timeRange, accessToken);
    }

    async function getAccessToken(clientId, clientSecret) {
        const tokenUrl = 'https://us.battle.net/oauth/token';
        const auth = btoa(`${clientId}:${clientSecret}`);

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: 'grant_type=client_credentials'
            });

            const data = await response.json();
            return data.access_token;
        } catch (error) {
            console.error('Error fetching access token:', error);
        }
    }

    async function fetchTokenData(server, gameType, timeRange, accessToken) {
        let region;
        switch (server) {
            case 'KR':
                region = 'kr';
                break;
            case 'USA':
                region = 'us';
                break;
            case 'EU':
                region = 'eu';
                break;
            default:
                region = 'us';
        }

        const timeRangeMap = {
            '3d': '72h',
            '7d': '168h',
            '14d': '336h',
            '1m': '720h',
            '3m': '90d',
            'all': 'all'
        };

        const range = timeRangeMap[timeRange] || '72h';
        const baseUrl = gameType === 'retail' ? 'https://data.wowtoken.app/token/history' : 'https://data.wowtoken.app/classic/token/history';
        const historyUrl = `${baseUrl}/${region}/${range}.json`;

        try {
            const response = await fetch(historyUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const tokenData = await response.json();
            
            const tokenPrices = processTokenData(tokenData);

            // Update the price span with the latest price
            updatePriceSpan(tokenPrices.data[tokenPrices.data.length - 1]);

            // Update the chart with the new data
            createOrUpdateChart(tokenPrices);
        } catch (error) {
            console.error('Error fetching token data:', error);
        }
    }

    function processTokenData(tokenData) {
        let labels = [];
        let data = [];
    
        if (Array.isArray(tokenData)) {
            tokenData.forEach(entry => {
                if (entry.time && entry.value) {
                    const date = new Date(entry.time); // Convertir el timestamp ISO 8601 a objeto Date
    
                    // Función para obtener el nombre abreviado del mes
                    function getShortMonthName(date) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[date.getMonth()];
                    }
    
                    // Función para obtener el formato deseado de la fecha
                    function getFormattedDate(date) {
                        const day = date.getDate();
                        const monthName = getShortMonthName(date);
                        const year = date.getFullYear(); // Obtener el año
    
                        // Determinar si se debe mostrar el año basado en el rango de tiempo
                        const currentDate = new Date();
                        const currentYear = currentDate.getFullYear();
                        if (year === currentYear || year === currentYear - 1) {
                            return `${monthName} ${day}`;
                        } else {
                            return `${monthName} ${day} ${year}`;
                        }
                    }
    
                    const formattedDate = getFormattedDate(date); // Obtener la fecha formateada
    
                    labels.push(formattedDate); // Agregar la fecha formateada al arreglo de etiquetas
                    data.push(entry.value); // Agregar el valor al arreglo de datos
                }
            });
        }
    
        return { labels, data };
    }

    function createOrUpdateChart(tokenPrices) {
        const ctx = document.getElementById('tokenChart').getContext('2d');
        if (chart) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tokenPrices.labels,
                datasets: [{
                    label: 'Token Price',
                    data: tokenPrices.data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updatePriceSpan(price) {
        if (price !== undefined) {
            document.getElementById('precio').textContent = price.toLocaleString(); // Formatear el precio con separadores de miles
        } else {
            document.getElementById('precio').textContent = 'N/A';
        }
    }

    // Initialize with default values
    updateFormValues();
});
