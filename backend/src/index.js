/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Основной файл сервера
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const winston = require('winston');

// Загрузка переменных окружения
dotenv.config();

// Импорт модулей
const modbusRouter = require('./modbus/router');
const apiRouter = require('./api/router');
const authRouter = require('./auth/router');
const { setupLogger } = require('./config/logger');
const { initScheduler } = require('./config/scheduler');

// Настройка логгера
const logger = setupLogger();

// Инициализация Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка заголовков безопасности
app.use((req, res, next) => {
  // Разрешаем загрузку ресурсов
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: http://localhost:* http://127.0.0.1:*; " +
    "font-src 'self' https://cdnjs.cloudflare.com; " +
    "connect-src 'self' http://localhost:* http://127.0.0.1:*"
  );
  
  // Добавляем другие заголовки безопасности
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Маршруты API
app.use('/api/modbus', modbusRouter);
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);

// Маршрут для проверки работоспособности (не требует авторизации)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Обработка корневого маршрута
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ModBusEtherMon API</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        h2 {
          color: #2980b9;
          margin-top: 30px;
        }
        ul {
          margin-bottom: 20px;
        }
        li {
          margin-bottom: 10px;
        }
        code {
          background-color: #f8f8f8;
          padding: 2px 5px;
          border-radius: 3px;
          font-family: monospace;
        }
        .note {
          background-color: #f8f9fa;
          border-left: 4px solid #3498db;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <h1>ModBusEtherMon API</h1>
      <p>Добро пожаловать в API универсального монитора ModBus по Ethernet!</p>
      
      <div class="note">
        <p>Веб-интерфейс доступен по адресу: <a href="http://localhost:8080" target="_blank">http://localhost:8080</a></p>
      </div>
      
      <h2>Доступные маршруты API:</h2>
      <ul>
        <li><code>/api/auth</code> - Авторизация и управление пользователями</li>
        <li><code>/api/modbus</code> - Работа с ModBus устройствами</li>
        <li><code>/api/archives</code> - Доступ к архивам данных</li>
        <li><code>/api/reports</code> - Генерация отчетов</li>
        <li><code>/api/config</code> - Управление конфигурацией</li>
      </ul>
      
      <h2>Документация:</h2>
      <p>Подробная документация по API доступна в директории <code>docs/api</code>.</p>
    </body>
    </html>
  `);
});

// Обработка ошибок 404 (маршрут не найден)
app.use((req, res, next) => {
  // Если запрос на API, возвращаем JSON
  if (req.path.startsWith('/api/')) {
    logger.warn(`Маршрут не найден: ${req.path}`);
    return res.status(404).json({ error: 'Маршрут не найден' });
  }
  
  // Для остальных запросов отправляем HTML страницу с ошибкой
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Страница не найдена - ModBusEtherMon</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          text-align: center;
        }
        h1 {
          color: #e74c3c;
          font-size: 36px;
          margin-bottom: 20px;
        }
        p {
          margin-bottom: 20px;
          font-size: 18px;
        }
        .error-code {
          font-size: 120px;
          color: #e74c3c;
          margin: 0;
          line-height: 1;
        }
        .home-link {
          display: inline-block;
          margin-top: 30px;
          padding: 10px 20px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        .home-link:hover {
          background-color: #2980b9;
        }
      </style>
    </head>
    <body>
      <h1 class="error-code">404</h1>
      <h1>Страница не найдена</h1>
      <p>Запрашиваемая страница не существует или была перемещена.</p>
      <p>Проверьте правильность введенного URL или вернитесь на главную страницу.</p>
      <a href="/" class="home-link">Вернуться на главную</a>
      <p>Веб-интерфейс доступен по адресу: <a href="http://localhost:8080" target="_blank">http://localhost:8080</a></p>
    </body>
    </html>
  `);
});

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error(`Ошибка: ${err.message}`);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
  logger.info(`Сервер запущен на порту ${PORT}`);
  console.log(`Сервер запущен на порту ${PORT}`);
  
  // Инициализация планировщика задач
  initScheduler();
  logger.info('Планировщик задач запущен');
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  logger.error(`Необработанное исключение: ${error.message}`);
  console.error('Необработанное исключение:', error);
});

// Обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Необработанное отклонение промиса: ${reason}`);
  console.error('Необработанное отклонение промиса:', reason);
});
