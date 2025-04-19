/**
 * Модуль логирования
 * Настройка и управление логами приложения
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Создаем директорию для логов, если она не существует
const logDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Формат логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, module, ...rest } = info;
    const moduleStr = module ? `[${module}]` : '';
    const restStr = Object.keys(rest).length ? JSON.stringify(rest) : '';
    return `${timestamp} ${level.toUpperCase()} ${moduleStr} ${message} ${restStr}`;
  })
);

// Основной логгер приложения
let appLogger = null;

/**
 * Инициализация и настройка логгера
 * @returns {winston.Logger} - Настроенный логгер
 */
const setupLogger = () => {
  if (appLogger) return appLogger;

  appLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'modbus-ethermon' },
    transports: [
      // Вывод в консоль
      new winston.transports.Console(),
      // Сохранение всех логов в файл
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 10
      }),
      // Сохранение ошибок в отдельный файл
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 10
      })
    ]
  });

  return appLogger;
};

/**
 * Получение логгера для конкретного модуля
 * @param {string} moduleName - Название модуля
 * @returns {winston.Logger} - Логгер с метаданными модуля
 */
const getLogger = (moduleName) => {
  if (!appLogger) {
    setupLogger();
  }

  return appLogger.child({ module: moduleName });
};

module.exports = {
  setupLogger,
  getLogger
};
