/**
 * Middleware авторизации
 * Проверка JWT токенов и прав доступа
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { getLogger } = require('../config/logger');

// Получаем логгер
const logger = getLogger('auth-middleware');

// Секретный ключ для JWT
const JWT_SECRET = process.env.JWT_SECRET || 'modbus-ethermon-secret-key';

/**
 * Middleware для проверки JWT токена
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const authMiddleware = (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Отсутствует токен авторизации' });
    }

    // Проверяем формат токена
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Неверный формат токена' });
    }

    const token = parts[1];

    // Верифицируем токен
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn(`Ошибка верификации токена: ${err.message}`);
        return res.status(401).json({ error: 'Недействительный токен' });
      }

      // Сохраняем данные пользователя в request
      req.user = decoded;

      // Проверяем права доступа
      checkPermissions(req, res, next);
    });
  } catch (error) {
    logger.error(`Ошибка в middleware авторизации: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

/**
 * Проверка прав доступа пользователя
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const checkPermissions = (req, res, next) => {
  try {
    const { user } = req;
    const { path, method } = req;

    // Если пользователь админ, разрешаем все операции
    if (user.role === 'admin') {
      return next();
    }

    // Загружаем конфигурацию прав доступа
    const permissionsPath = path.join(__dirname, '../../../configs/permissions.json');
    if (!fs.existsSync(permissionsPath)) {
      logger.warn('Файл конфигурации прав доступа не найден');
      return next(); // Если файл не найден, разрешаем доступ
    }

    const permissionsData = fs.readFileSync(permissionsPath, 'utf8');
    const permissions = JSON.parse(permissionsData);

    // Проверяем права доступа для роли пользователя
    const rolePermissions = permissions[user.role] || [];

    // Проверяем, есть ли у пользователя доступ к запрашиваемому ресурсу
    const hasAccess = rolePermissions.some(permission => {
      // Проверяем путь по регулярному выражению
      const pathRegex = new RegExp(permission.path);
      const pathMatch = pathRegex.test(path);

      // Проверяем метод
      const methodMatch = permission.methods.includes(method) || permission.methods.includes('*');

      return pathMatch && methodMatch;
    });

    if (!hasAccess) {
      logger.warn(`Отказано в доступе пользователю ${user.username} к ${method} ${path}`);
      return res.status(403).json({ error: 'Нет прав доступа к данному ресурсу' });
    }

    next();
  } catch (error) {
    logger.error(`Ошибка при проверке прав доступа: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  authMiddleware
};
