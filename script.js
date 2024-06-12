// script.js

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

        let historyUrl;
        switch (timeRange) {
            case '3d':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/72h.json`;
                break;
            case '7d':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/168h.json`;
                break;
            case '14d':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/336h.json`;
                break;
            case '1m':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/720h.json`;
                break;
            case '3m':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/90d.json`;
                break;
            case 'all':
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/all.json`;
                break;
            default:
                historyUrl = `https://data.wowtoken.app/classic/token/history/${region}/72h.json`; // Default to 3 days
        }

        try {
            const response = await fetch(historyUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const tokenData = await response.json();

            const tokenPrices = processTokenData(tokenData, timeRange);
            createOrUpdateChart(tokenPrices);
        } catch (error) {
            console.error('Error fetching token data:', error);
        }
    }

    function processTokenData(tokenData, timeRange) {
        let labels = [];
        let data = [];

        // Parse the tokenData and extract necessary information
        if (Array.isArray(tokenData)) {
            tokenData.forEach(entry => {
                labels.push(entry.timestamp); // Assuming timestamp is available
                data.push(entry.price); // Assuming price is available
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

    // Initialize the chart with default values
    updateFormValues();
});
