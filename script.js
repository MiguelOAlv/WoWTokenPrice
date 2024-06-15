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

        const load = document.getElementById('loading');
        load.style.display = 'block';
        if (chart) {
            chart.destroy();
        }
        try {
            await fetchTokenData(formValues.server, formValues.gameType, formValues.timeRange, accessToken);
        } finally {
            load.style.display = 'none'; 
        }
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

            updatePriceSpan(tokenPrices.data[tokenPrices.data.length - 1]);

            createOrUpdateChart(tokenPrices, region);
        } catch (error) {
            console.error('Error fetching token data:', error);
        }
    }

    function processTokenData(tokenData) {
        let labels = [];
        let data = [];
    
        if (Array.isArray(tokenData)) {
            tokenData.forEach((entry, index) => {
                if (index % 3 === 0) { //Añadir un dato de cada 3
                    if (entry.time && entry.value) {
                        const date = new Date(entry.time);
    
                        function getShortMonthName(date) {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return months[date.getMonth()];
                        }
    
                        function getFormattedDate(date) {
                            const day = date.getDate();
                            const monthName = getShortMonthName(date);
                            const year = date.getFullYear();
    
                            const currentDate = new Date();
                            const currentYear = currentDate.getFullYear();
                            if (year === currentYear || year === currentYear - 1) {
                                return `${monthName} ${day}`;
                            } else {
                                return `${monthName} ${day} ${year}`;
                            }
                        }
    
                        const formattedDate = getFormattedDate(date);
    
                        labels.push(formattedDate);
                        data.push({ x: date, y: entry.value });
                    }
                }
            });
        }
    
    
        return { labels, data };
    }

    function createOrUpdateChart(tokenPrices, region) {
        const ctx = document.getElementById('tokenChart').getContext('2d');
        if (chart) {
            chart.destroy();
        }

        const timeUnit = getTimeUnit(formValues.timeRange);
        const minDate = tokenPrices.data.length > 0 ? tokenPrices.data[0].x : null;
        const maxDate = tokenPrices.data.length > 0 ? tokenPrices.data[tokenPrices.data.length - 1].x : null;
        const regionLabelMap = {
            'us': 'USA',
            'eu': 'EU',
            'kr': 'KR'
        };
        const regionLabel = regionLabelMap[region] || 'Region';

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tokenPrices.labels,
                datasets: [{
                    label: `${regionLabel} Token Price`,
                    data: tokenPrices.data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 2,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeUnit,
                            tooltipFormat: 'P',
                            displayFormats: {
                                day: 'MMM d',
                                month: 'MMM',
                                year: 'yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        min: minDate,
                        max: maxDate,
                        grid: {
                            display: true,
                            color: 'rgba(200, 200, 200, 0.1)',
                            lineWidth: 1,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Price'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(200, 200, 200, 0.1)',
                            lineWidth: 1,
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                return `Price: ${value}`;
                            }
                        }
                    }
                }
            }
        });

        window.addEventListener('resize', function() {
            chart.resize();
        });
    }

    function updatePriceSpan(price) {
        if (price !== undefined) {
            document.getElementById('precio').textContent = (price.y).toLocaleString();
        } else {
            document.getElementById('precio').textContent = 'N/A';
        }
    }

    function getTimeUnit(timeRange) {
        switch (timeRange) {
            case '3d':
            case '7d':
            case '14d':
            case '1m':
                return 'day';
            case '3m':
                return 'month';
            case 'all':
                return 'year';
            default:
                return 'day';
        }
    }

    updateFormValues();
});

//Animaciones
document.addEventListener('DOMContentLoaded', function () {
    const originalTitle = document.title;
    let currentIndex = 0;
    const interval = 500;

    setInterval(() => {
        const nextText = originalTitle.slice(currentIndex) + originalTitle.slice(0, currentIndex);
        document.title = nextText;
        currentIndex = (currentIndex + 1) % originalTitle.length;
    }, interval);

    const wowTokenLogo = document.getElementById('wowTokenLogo');
    const dataToken = document.getElementById('dataToken');
    const dataTokenWidth = dataToken.offsetWidth;
    const dataTokenHeight = dataToken.offsetHeight;

    wowTokenLogo.addEventListener('mousemove', function (event) {
        const x = event.pageX;
        const y = event.pageY;

        // Ajustar la posición de dataToken para que su esquina inferior izquierda sea el puntero
        const offsetX = x - dataTokenWidth;
        const offsetY = y;

        dataToken.style.left = `${offsetX}px`;
        dataToken.style.top = `${offsetY}px`;

        dataToken.style.display = 'block';
    });

    wowTokenLogo.addEventListener('mouseout', function () {
        dataToken.style.display = 'none';
    });
});



