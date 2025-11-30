import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_URL = 'https://www.water.gov.tw/wq/XML/ADTS.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 儲存水質資料
let waterData = null;
let lastUpdateTime = null;

// 從官方網站取得水質資料
async function fetchWaterData() {
  try {
    console.log(`[${new Date().toISOString()}] Fetching water quality data...`);
    const response = await axios.get(DATA_URL);
    waterData = response.data;
    lastUpdateTime = new Date();
    console.log(`[${lastUpdateTime.toISOString()}] Data fetched successfully. Records: ${waterData.length}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching water data:`, error.message);
    return false;
  }
}

// 定期更新（每小時）
function scheduleDataUpdate() {
  // 立即執行一次
  fetchWaterData();

  // 之後每小時執行一次
  setInterval(() => {
    fetchWaterData();
  }, 60 * 60 * 1000); // 3600000 毫秒 = 1 小時
}

// API 路由 - 取得水質資料
app.get('/api/water-data', (req, res) => {
  if (!waterData) {
    return res.status(500).json({
      error: 'Data not available yet',
      message: 'Please wait for the first data fetch to complete'
    });
  }

  res.json({
    data: waterData,
    lastUpdated: lastUpdateTime,
    count: waterData.length
  });
});

// API 路由 - 手動刷新水質資料
app.post('/api/water-data/refresh', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Manual refresh requested`);
  const success = await fetchWaterData();

  if (!success) {
    return res.status(500).json({
      error: 'Failed to fetch data',
      message: 'Could not retrieve water quality data from the server'
    });
  }

  res.json({
    data: waterData,
    lastUpdated: lastUpdateTime,
    count: waterData.length,
    message: 'Data refreshed successfully'
  });
});

// API 路由 - 取得更新狀態
app.get('/api/status', (req, res) => {
  res.json({
    lastUpdated: lastUpdateTime,
    dataCount: waterData ? waterData.length : 0,
    serverTime: new Date()
  });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 啟動伺服器
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Data will update every hour');

  // 開始定期更新
  scheduleDataUpdate();
});

// 處理端口被佔用的情況
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port:`);
    console.error(`PORT=3001 npm start`);
    console.error(`or`);
    console.error(`PORT=8080 npm start`);
    process.exit(1);
  }
  throw err;
});
