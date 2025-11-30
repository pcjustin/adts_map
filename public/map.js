// 地圖初始化
let map;
let markers = [];
let waterPlantsData = [];
let selectedPlantId = null;

// 台灣中心坐標
const TAIWAN_CENTER = [23.6, 121.0];
const INITIAL_ZOOM = 7;

function initMap() {
    map = L.map('map').setView(TAIWAN_CENTER, INITIAL_ZOOM);

    // 添加地圖圖層
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    // 添加地理編碼控件
    L.Control.geocoder().addTo(map);
}

function getMarkerColor(quality) {
    // 根據水質狀況返回不同顏色
    // pH: 6.5-8.5 正常, 濁度: 0-1 優秀
    const pH = parseFloat(quality.pH_value);
    const turbidity = parseFloat(quality['turbidity(NTU)']);

    if (isNaN(pH) || isNaN(turbidity)) {
        return '#gray'; // 灰色 - 數據不完整
    }

    // 根據濁度判斷
    if (turbidity <= 0.5) {
        return '#green'; // 綠色 - 優秀
    } else if (turbidity <= 1) {
        return '#blue'; // 藍色 - 良好
    } else if (turbidity <= 2) {
        return '#yellow'; // 黃色 - 中等
    } else {
        return '#red'; // 紅色 - 需要關注
    }
}

function createMarker(plant) {
    const lat = parseFloat(plant.latitude);
    const lon = parseFloat(plant.longitude);

    if (isNaN(lat) || isNaN(lon)) {
        return null;
    }

    const color = getMarkerColor(plant);
    const colorMap = {
        '#green': '#22c55e',
        '#blue': '#3b82f6',
        '#yellow': '#eab308',
        '#red': '#ef4444',
        '#gray': '#9ca3af'
    };

    const markerColor = colorMap[color] || '#667eea';

    // 創建自訂圖標
    const iconHtml = `
        <div style="
            background: ${markerColor};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
            💧
        </div>
    `;

    const icon = L.divIcon({
        html: iconHtml,
        iconSize: [36, 36],
        className: 'custom-marker'
    });

    const marker = L.marker([lat, lon], { icon }).addTo(map);

    // 創建 popup 內容
    const popupContent = createPopupContent(plant);
    marker.bindPopup(popupContent, { maxWidth: 280 });

    marker.on('click', () => {
        selectPlant(plant);
    });

    return marker;
}

function createPopupContent(plant) {
    const pH = plant.pH_value || '無資料';
    const turbidity = plant['turbidity(NTU)'] || '無資料';
    const chlorine = plant['residual_chlorine(mg/L)'] || '無資料';

    return `
        <div class="marker-popup">
            <h3 class="marker-popup-title">${escapeHtml(plant.station_name)}</h3>
            <div class="marker-popup-content">
                <div class="popup-stat">
                    <span class="popup-stat-label">pH值</span>
                    <span class="popup-stat-value ${pH === '無資料' ? 'empty' : ''}">${pH}</span>
                </div>
                <div class="popup-stat">
                    <span class="popup-stat-label">濁度 (NTU)</span>
                    <span class="popup-stat-value ${turbidity === '無資料' ? 'empty' : ''}">${turbidity}</span>
                </div>
                <div class="popup-stat">
                    <span class="popup-stat-label">殘餘氯 (mg/L)</span>
                    <span class="popup-stat-value ${chlorine === '無資料' ? 'empty' : ''}">${chlorine}</span>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function loadWaterData() {
    return fetch('/api/water-data')
        .then(response => response.json())
        .then(data => {
            waterPlantsData = data.data;
            updateUI(data);
            renderMarkers();
            renderPlantsList();
        })
        .catch(error => {
            console.error('Error loading water data:', error);
            showError('無法加載水質資料');
        });
}

function updateUI(data) {
    // 更新時間戳
    const lastUpdated = new Date(data.lastUpdated);
    const timeStr = lastUpdated.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('update-time').textContent = `最後更新: ${timeStr}`;

    // 更新資料點數
    document.getElementById('data-count').textContent = `資料點: ${data.count}`;
}

function renderMarkers() {
    clearMarkers();
    waterPlantsData.forEach(plant => {
        const marker = createMarker(plant);
        if (marker) {
            markers.push(marker);
        }
    });
}

function renderPlantsList() {
    const list = document.getElementById('plants-list');
    list.innerHTML = '';

    waterPlantsData.forEach((plant, index) => {
        const item = document.createElement('div');
        item.className = 'plant-item';
        if (plant.station_name === selectedPlantId) {
            item.classList.add('selected');
        }

        const pH = plant.pH_value || '無';
        const turbidity = plant['turbidity(NTU)'] || '無';

        item.innerHTML = `
            <div class="plant-name">${escapeHtml(plant.station_name)}</div>
            <div class="plant-stats">
                <div class="stat">
                    <span class="stat-label">pH</span>
                    <span class="stat-value ${pH === '無' ? 'empty' : ''}">${pH}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">濁度</span>
                    <span class="stat-value ${turbidity === '無' ? 'empty' : ''}">${turbidity}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            selectPlant(plant);
        });

        list.appendChild(item);
    });
}

function selectPlant(plant) {
    selectedPlantId = plant.station_name;

    // 更新列表樣式
    document.querySelectorAll('.plant-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget?.classList.add('selected');

    // 在地圖上聚焦
    const lat = parseFloat(plant.latitude);
    const lon = parseFloat(plant.longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 12);

        // 打開該位置的 popup
        const marker = markers.find(m => {
            const markerLat = m.getLatLng().lat;
            const markerLon = m.getLatLng().lng;
            return Math.abs(markerLat - lat) < 0.001 && Math.abs(markerLon - lon) < 0.001;
        });

        if (marker) {
            marker.openPopup();
        }
    }
}

function searchPlants() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    document.querySelectorAll('.plant-item').forEach(item => {
        const plantName = item.querySelector('.plant-name').textContent.toLowerCase();
        if (plantName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function refreshData() {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('loading');

    fetch('/api/water-data/refresh', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            waterPlantsData = data.data;
            updateUI(data);
            renderMarkers();
            renderPlantsList();
        })
        .catch(error => {
            console.error('Error refreshing water data:', error);
            showError('刷新失敗，請稍後重試');
        })
        .finally(() => {
            btn.classList.remove('loading');
        });
}

function showError(message) {
    console.error(message);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadWaterData();

    // 搜尋功能
    document.getElementById('search-input').addEventListener('input', searchPlants);

    // 手動刷新按鈕
    document.getElementById('refresh-btn').addEventListener('click', refreshData);

    // 每小時自動刷新一次
    setInterval(loadWaterData, 60 * 60 * 1000);
});
