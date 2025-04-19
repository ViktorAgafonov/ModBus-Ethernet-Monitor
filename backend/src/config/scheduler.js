/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль планировщика задач для автоматической архивации
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const schedule = require('node-schedule');
const winston = require('winston');
const { setupLogger } = require('./logger');

// Настройка логгера
const logger = setupLogger('scheduler');

// Путь к конфигурационному файлу расписания
const scheduleConfigPath = path.join(__dirname, '../../../configs/schedule.json');

// Путь к директории архивов
const archivesDir = path.join(__dirname, '../../../archives');
const zipDir = path.join(archivesDir, 'Zip');

/**
 * Создание ежедневного архива данных
 */
function createDailyArchive() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
  logger.info(`Создание ежедневного архива за ${dateStr}`);
  
  // Проверяем, существует ли уже архив за этот день
  const archiveFile = path.join(archivesDir, `${dateStr}.json`);
  
  if (!fs.existsSync(archiveFile)) {
    logger.warn(`Архивный файл за ${dateStr} не найден. Архивация не требуется.`);
    return;
  }
  
  // Архив уже существует, ничего делать не нужно
  logger.info(`Ежедневный архив за ${dateStr} уже существует.`);
}

/**
 * Создание месячного ZIP-архива
 */
function createMonthlyZip() {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const monthStr = lastMonth.toISOString().slice(0, 7).replace('-', ''); // YYYYMM
  logger.info(`Создание месячного ZIP-архива за ${monthStr}`);
  
  // Проверяем наличие директории для ZIP-архивов
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }
  
  const zipFilePath = path.join(zipDir, `${monthStr}.zip`);
  
  // Проверяем, существует ли уже архив за этот месяц
  if (fs.existsSync(zipFilePath)) {
    logger.warn(`ZIP-архив за ${monthStr} уже существует. Пропускаем создание.`);
    return;
  }
  
  // Получаем список файлов за указанный месяц
  const monthPrefix = lastMonth.toISOString().slice(0, 7); // YYYY-MM
  const files = fs.readdirSync(archivesDir)
    .filter(file => file.endsWith('.json') && file.startsWith(monthPrefix));
  
  if (files.length === 0) {
    logger.warn(`Не найдено файлов для архивации за ${monthPrefix}`);
    return;
  }
  
  // Создаем ZIP-архив
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Максимальный уровень сжатия
  });
  
  output.on('close', () => {
    logger.info(`ZIP-архив за ${monthStr} создан. Размер: ${archive.pointer()} байт`);
  });
  
  archive.on('error', (err) => {
    logger.error(`Ошибка при создании ZIP-архива: ${err.message}`);
    throw err;
  });
  
  archive.pipe(output);
  
  // Добавляем файлы в архив
  files.forEach(file => {
    const filePath = path.join(archivesDir, file);
    archive.file(filePath, { name: file });
  });
  
  archive.finalize();
}

/**
 * Очистка старых архивов
 */
function cleanupOldArchives() {
  logger.info('Запуск очистки старых архивов');
  
  // Загружаем конфигурацию
  const scheduleConfig = JSON.parse(fs.readFileSync(scheduleConfigPath, 'utf8'));
  const { dailyFiles, monthlyZips } = scheduleConfig.archiving.retention;
  
  // Очистка ежедневных архивов
  const jsonFiles = fs.readdirSync(archivesDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a)); // Сортировка по убыванию (новые файлы в начале)
  
  if (jsonFiles.length > dailyFiles) {
    const filesToDelete = dailyFiles.slice(dailyFiles);
    
    filesToDelete.forEach(file => {
      const filePath = path.join(archivesDir, file);
      fs.unlinkSync(filePath);
      logger.info(`Удален устаревший архив: ${file}`);
    });
  }
  
  // Очистка месячных ZIP-архивов
  if (fs.existsSync(zipDir)) {
    const zipFiles = fs.readdirSync(zipDir)
      .filter(file => file.endsWith('.zip'))
      .sort((a, b) => b.localeCompare(a)); // Сортировка по убыванию (новые файлы в начале)
    
    if (zipFiles.length > monthlyZips) {
      const filesToDelete = zipFiles.slice(monthlyZips);
      
      filesToDelete.forEach(file => {
        const filePath = path.join(zipDir, file);
        fs.unlinkSync(filePath);
        logger.info(`Удален устаревший ZIP-архив: ${file}`);
      });
    }
  }
}

/**
 * Инициализация планировщика задач
 */
function initScheduler() {
  logger.info('Инициализация планировщика задач');
  
  try {
    // Загружаем конфигурацию расписания
    const scheduleConfig = JSON.parse(fs.readFileSync(scheduleConfigPath, 'utf8'));
    
    // Настройка ежедневного архивирования
    if (scheduleConfig.archiving.dailyArchive.enabled) {
      const dailyTime = scheduleConfig.archiving.dailyArchive.time;
      logger.info(`Настройка ежедневного архивирования на ${dailyTime}`);
      
      // Разбираем время в формате HH:MM:SS
      const [hours, minutes, seconds] = dailyTime.split(':').map(Number);
      
      // Планируем задачу
      schedule.scheduleJob(`${seconds} ${minutes} ${hours} * * *`, createDailyArchive);
    }
    
    // Настройка месячного ZIP-архивирования
    if (scheduleConfig.archiving.monthlyZip.enabled) {
      const monthlyDay = scheduleConfig.archiving.monthlyZip.day;
      const monthlyTime = scheduleConfig.archiving.monthlyZip.time;
      logger.info(`Настройка месячного ZIP-архивирования на ${monthlyDay} день в ${monthlyTime}`);
      
      // Разбираем время в формате HH:MM:SS
      const [hours, minutes, seconds] = monthlyTime.split(':').map(Number);
      
      // Определяем день месяца для запуска
      let dayOfMonth = '28-31'; // По умолчанию последние дни месяца
      if (monthlyDay !== 'last' && !isNaN(parseInt(monthlyDay))) {
        dayOfMonth = parseInt(monthlyDay);
      }
      
      // Планируем задачу
      schedule.scheduleJob(`${seconds} ${minutes} ${hours} ${dayOfMonth} * *`, createMonthlyZip);
    }
    
    // Настройка очистки старых архивов (каждый день в 01:00)
    schedule.scheduleJob('0 0 1 * * *', cleanupOldArchives);
    
    logger.info('Планировщик задач успешно инициализирован');
  } catch (error) {
    logger.error(`Ошибка при инициализации планировщика: ${error.message}`);
    console.error('Ошибка при инициализации планировщика:', error);
  }
}

module.exports = {
  initScheduler,
  createDailyArchive,
  createMonthlyZip,
  cleanupOldArchives
};
