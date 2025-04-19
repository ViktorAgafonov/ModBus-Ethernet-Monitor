/**
 * Модуль проверки работоспособности API
 */

const express = require('express');
const router = express.Router();
const { getLogger } = require('../config/logger');

// Получаем логгер
const logger = getLogger('health-router');

/**
 * GET /api/health
 * Проверка работоспособности API (не требует авторизации)
 */
router.get('/', (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error(`Ошибка при проверке работоспособности: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
