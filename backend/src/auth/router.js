/**
 * Роутер аутентификации
 * Обработка запросов на регистрацию, вход и управление пользователями
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { getLogger } = require('../config/logger');
const { authMiddleware } = require('./middleware');

// Получаем логгер
const logger = getLogger('auth-router');

// Секретный ключ для JWT
const JWT_SECRET = process.env.JWT_SECRET || 'modbus-ethermon-secret-key';
// Срок действия токена (1 день)
const TOKEN_EXPIRATION = '1d';

// Путь к файлу с пользователями
const USERS_FILE_PATH = path.join(__dirname, '../../../configs/users.json');

/**
 * Загрузка списка пользователей
 * @returns {Array} - Массив пользователей
 */
const loadUsers = () => {
  try {
    // Проверяем наличие файла пользователей
    if (!fs.existsSync(USERS_FILE_PATH)) {
      // Пытаемся загрузить данные администратора из защищенного файла конфигурации
      let adminConfig;
      const adminConfigPath = path.join(__dirname, '../../../configs/admin.config.js');
      
      try {
        // Проверяем наличие файла конфигурации администратора
        if (fs.existsSync(adminConfigPath)) {
          // Загружаем конфигурацию администратора
          adminConfig = require(adminConfigPath);
          logger.info('Загружена конфигурация администратора из защищенного файла');
        }
      } catch (error) {
        logger.warn(`Не удалось загрузить конфигурацию администратора: ${error.message}`);
      }
      
      // Создаем администратора по умолчанию или из конфигурации
      const defaultAdmin = {
        id: '1',
        username: adminConfig?.username || 'admin',
        password: adminConfig?.passwordHash || bcrypt.hashSync('admin123', 10),
        role: 'admin',
        name: adminConfig?.name || 'Администратор системы',
        email: adminConfig?.email || 'admin@example.com',
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      logger.info(`Создан администратор по умолчанию: ${defaultAdmin.username}`);
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify([defaultAdmin], null, 2), 'utf8');
      return [defaultAdmin];
    }
    
    const usersData = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(usersData);
  } catch (error) {
    logger.error(`Ошибка при загрузке пользователей: ${error.message}`);
    return [];
  }
};

/**
 * Сохранение списка пользователей
 * @param {Array} users - Массив пользователей
 */
const saveUsers = (users) => {
  try {
    // Создаем директорию configs, если она не существует
    const configsDir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }
    
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    logger.error(`Ошибка при сохранении пользователей: ${error.message}`);
    throw error;
  }
};

/**
 * POST /api/auth/login
 * Вход пользователя в систему
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Необходимо указать имя пользователя и пароль' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Ищем пользователя по имени
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
    
    // Проверяем пароль
    const passwordMatch = bcrypt.compareSync(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }
    
    // Проверяем, активирована ли учетная запись
    if (user.pendingApproval || user.isActive === false) {
      return res.status(403).json({ 
        error: 'Ваша учетная запись ожидает подтверждения администратором',
        pendingApproval: true
      });
    }
    
    // Создаем JWT токен
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }, 
      JWT_SECRET, 
      { expiresIn: TOKEN_EXPIRATION }
    );
    
    // Обновляем время последнего входа
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return { ...u, lastLogin: new Date().toISOString() };
      }
      return u;
    });
    
    saveUsers(updatedUsers);
    
    // Отправляем токен и информацию о пользователе
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    logger.error(`Ошибка при входе пользователя: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 * Обычные пользователи могут зарегистрироваться, но требуется подтверждение администратором
 */
router.post('/register', (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Необходимо указать имя пользователя и пароль' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Проверяем, существует ли пользователь с таким именем
    if (users.some(u => u.username === username)) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    
    // Хешируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Создаем нового пользователя с флагом ожидания подтверждения
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: 'user', // По умолчанию роль - обычный пользователь
      name: name || username,
      email: email || '',
      createdAt: new Date().toISOString(),
      isActive: false, // Пользователь неактивен до подтверждения администратором
      pendingApproval: true // Ожидает подтверждения
    };
    
    // Добавляем пользователя в список
    users.push(newUser);
    
    // Сохраняем обновленный список пользователей
    saveUsers(users);
    
    logger.info(`Зарегистрирован новый пользователь ${username}, ожидает подтверждения`);
    
    res.status(201).json({ 
      message: 'Регистрация выполнена успешно. Ваша учетная запись ожидает подтверждения администратором.',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        pendingApproval: true
      }
    });
  } catch (error) {
    logger.error(`Ошибка при регистрации пользователя: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * POST /api/auth/approve/:id
 * Подтверждение регистрации пользователя администратором
 */
router.post('/approve/:id', authMiddleware, (req, res) => {
  try {
    // Проверяем, является ли пользователь администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    
    const { id } = req.params;
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Подтверждаем регистрацию пользователя
    users[userIndex].pendingApproval = false;
    users[userIndex].isActive = true;
    users[userIndex].approvedAt = new Date().toISOString();
    users[userIndex].approvedBy = req.user.id;
    
    // Сохраняем обновленный список пользователей
    saveUsers(users);
    
    logger.info(`Администратор ${req.user.username} подтвердил регистрацию пользователя ${users[userIndex].username}`);
    
    res.json({ 
      message: 'Регистрация пользователя подтверждена',
      user: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        role: users[userIndex].role,
        name: users[userIndex].name,
        isActive: users[userIndex].isActive
      }
    });
  } catch (error) {
    logger.error(`Ошибка при подтверждении регистрации: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * POST /api/auth/reject/:id
 * Отклонение регистрации пользователя администратором
 */
router.post('/reject/:id', authMiddleware, (req, res) => {
  try {
    // Проверяем, является ли пользователь администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    
    const { id } = req.params;
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Сохраняем имя пользователя для логирования
    const rejectedUsername = users[userIndex].username;
    
    // Удаляем пользователя из списка
    users.splice(userIndex, 1);
    
    // Сохраняем обновленный список пользователей
    saveUsers(users);
    
    logger.info(`Администратор ${req.user.username} отклонил регистрацию пользователя ${rejectedUsername}`);
    
    res.json({ message: 'Регистрация пользователя отклонена' });
  } catch (error) {
    logger.error(`Ошибка при отклонении регистрации: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/auth/pending
 * Получение списка пользователей, ожидающих подтверждения (только для администраторов)
 */
router.get('/pending', authMiddleware, (req, res) => {
  try {
    // Проверяем, является ли пользователь администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }
    
    const users = loadUsers();
    
    // Фильтруем пользователей, ожидающих подтверждения
    const pendingUsers = users
      .filter(user => user.pendingApproval)
      .map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }));
    
    res.json({ users: pendingUsers });
  } catch (error) {
    logger.error(`Ошибка при получении списка ожидающих подтверждения: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/auth/users
 * Получение списка пользователей (только для администраторов)
 */
router.get('/users', authMiddleware, (req, res) => {
  try {
    // Проверяем, что запрос делает администратор
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администраторы могут просматривать список пользователей' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Удаляем пароли из ответа
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    logger.error(`Ошибка при получении списка пользователей: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/auth/users/:id
 * Получение информации о пользователе по ID (только для администраторов или самого пользователя)
 */
router.get('/users/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа (администратор или сам пользователь)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Нет прав доступа к данной информации' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error(`Ошибка при получении информации о пользователе: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * PUT /api/auth/users/:id
 * Обновление информации о пользователе (только для администраторов или самого пользователя)
 */
router.put('/users/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    
    // Проверяем права доступа (администратор или сам пользователь)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Нет прав доступа для изменения данных пользователя' });
    }
    
    // Обычный пользователь не может изменить свою роль
    if (req.user.role !== 'admin' && role) {
      return res.status(403).json({ error: 'Только администратор может изменить роль пользователя' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Обновляем информацию о пользователе
    const updatedUser = { ...users[userIndex] };
    
    if (name) updatedUser.name = name;
    if (email) updatedUser.email = email;
    if (password) updatedUser.password = bcrypt.hashSync(password, 10);
    if (role && req.user.role === 'admin') updatedUser.role = role;
    
    updatedUser.updatedAt = new Date().toISOString();
    
    // Сохраняем обновленного пользователя
    users[userIndex] = updatedUser;
    saveUsers(users);
    
    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error(`Ошибка при обновлении информации о пользователе: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Удаление пользователя (только для администраторов)
 */
router.delete('/users/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, что запрос делает администратор
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администраторы могут удалять пользователей' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Проверяем, что пользователь существует
    if (!users.some(u => u.id === id)) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Удаляем пользователя
    const updatedUsers = users.filter(u => u.id !== id);
    
    // Проверяем, что остался хотя бы один администратор
    const hasAdmin = updatedUsers.some(u => u.role === 'admin');
    if (!hasAdmin) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }
    
    // Сохраняем обновленный список
    saveUsers(updatedUsers);
    
    res.json({ success: true, message: 'Пользователь успешно удален' });
  } catch (error) {
    logger.error(`Ошибка при удалении пользователя: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const { id } = req.user;
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error(`Ошибка при получении информации о текущем пользователе: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * POST /api/auth/change-password
 * Изменение пароля текущего пользователя
 */
router.post('/change-password', authMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Необходимо указать текущий и новый пароль' });
    }
    
    // Загружаем пользователей
    const users = loadUsers();
    
    // Ищем пользователя по ID
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Проверяем текущий пароль
    const passwordMatch = bcrypt.compareSync(currentPassword, users[userIndex].password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }
    
    // Обновляем пароль
    users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    users[userIndex].updatedAt = new Date().toISOString();
    
    // Сохраняем обновленный список
    saveUsers(users);
    
    res.json({ success: true, message: 'Пароль успешно изменен' });
  } catch (error) {
    logger.error(`Ошибка при изменении пароля: ${error.message}`);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
