require("dotenv").config();
const express = require("express");
const path = require('path');

console.log("Bắt đầu khởi tạo server...");

const app = express();

console.log("Đang thiết lập middleware để phục vụ file tĩnh...");
app.use(express.static(path.join(__dirname, '.')));

console.log("Đang thiết lập route /...");
app.get('/', (req, res) => {
    console.log("Truy cập route /");
    res.sendFile(path.join(__dirname, 'index.html'));
});

console.log("Đang thiết lập route *...");
app.get('*', (req, res) => {
    console.log(`Truy cập route: ${req.path}`);
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: 'File not found' });
        }
    });
});

console.log("Đang khởi động server...");
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] ✅ Server running on port ${PORT}`);
}).on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ Lỗi khởi động server:`, error);
    process.exit(1);
});