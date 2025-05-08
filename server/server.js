const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Загружаем переменные окружения
dotenv.config();

const app = express();

// Enable CORS middleware
app.use(cors());

const port = process.env.PORT || 10000;

// Роут для отдачи конфига Firebase
app.get('/api/config', (req, res) => {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    
    res.json(firebaseConfig);  // Отправляем конфиг в формате JSON
});

// Стартуем сервер
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
