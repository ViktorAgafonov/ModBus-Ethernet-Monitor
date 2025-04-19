/**
 * Конфигурация администратора ModBusEtherMon
 * ВНИМАНИЕ: Этот файл содержит конфиденциальные данные и должен быть доступен
 * только при прямом доступе к файловой системе.
 * 
 * Этот файл используется для первоначальной настройки или сброса учетных данных администратора.
 */

const bcrypt = require('bcrypt');

// Учетные данные администратора по умолчанию
const adminCredentials = {
  username: 'admin',
  // Хеш пароля 'admin123' (рекомендуется изменить после первого входа)
  passwordHash: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  name: 'Администратор системы',
  email: 'admin@example.com'
};

module.exports = adminCredentials;
