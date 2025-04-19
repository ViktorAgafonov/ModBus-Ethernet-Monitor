/**
 * ModBus статистика
 * Модуль для сбора и хранения статистики работы ModBus устройств
 */

const fs = require('fs');
const path = require('path');
const { getLogger } = require('../config/logger');

// Получаем логгер
const logger = getLogger('modbus-stats');

// Путь к файлу статистики
const STATS_FILE_PATH = path.join(__dirname, '../../../configs/stats.json');
const HOURLY_STATS_FILE_PATH = path.join(__dirname, '../../../configs/hourly-stats.json');

class ModbusStats {
  constructor() {
    this.stats = {
      totalPolls: 0,
      errors: 0,
      lastPoll: null,
      deviceStats: {} // Статистика по устройствам
    };
    
    this.hourlyStats = [];
    
    // Загружаем статистику при инициализации
    this.loadStats();
    this.loadHourlyStats();
    
    // Запускаем автосохранение статистики
    this.startAutoSave();
    
    // Запускаем автоматическое обновление почасовой статистики
    this.startHourlyStatsUpdate();
  }
  
  /**
   * Загрузка статистики из файла
   */
  loadStats() {
    try {
      if (fs.existsSync(STATS_FILE_PATH)) {
        const statsData = fs.readFileSync(STATS_FILE_PATH, 'utf8');
        this.stats = JSON.parse(statsData);
        logger.info('Статистика загружена из файла');
      } else {
        logger.info('Файл статистики не найден, используются значения по умолчанию');
        this.saveStats(); // Создаем файл со значениями по умолчанию
      }
    } catch (error) {
      logger.error(`Ошибка при загрузке статистики: ${error.message}`);
    }
  }
  
  /**
   * Загрузка почасовой статистики из файла
   */
  loadHourlyStats() {
    try {
      if (fs.existsSync(HOURLY_STATS_FILE_PATH)) {
        const statsData = fs.readFileSync(HOURLY_STATS_FILE_PATH, 'utf8');
        this.hourlyStats = JSON.parse(statsData);
        logger.info('Почасовая статистика загружена из файла');
      } else {
        logger.info('Файл почасовой статистики не найден, используются значения по умолчанию');
        this.initializeHourlyStats();
        this.saveHourlyStats(); // Создаем файл со значениями по умолчанию
      }
    } catch (error) {
      logger.error(`Ошибка при загрузке почасовой статистики: ${error.message}`);
      this.initializeHourlyStats();
    }
  }
  
  /**
   * Инициализация почасовой статистики
   */
  initializeHourlyStats() {
    // Создаем записи для каждого часа текущего дня
    const now = new Date();
    this.hourlyStats = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now);
      timestamp.setHours(hour, 0, 0, 0);
      
      this.hourlyStats.push({
        timestamp: timestamp.toISOString(),
        polls: 0,
        errors: 0,
        deviceStats: {}
      });
    }
  }
  
  /**
   * Сохранение статистики в файл
   */
  saveStats() {
    try {
      // Создаем директорию configs, если она не существует
      const configsDir = path.dirname(STATS_FILE_PATH);
      if (!fs.existsSync(configsDir)) {
        fs.mkdirSync(configsDir, { recursive: true });
      }
      
      fs.writeFileSync(STATS_FILE_PATH, JSON.stringify(this.stats, null, 2), 'utf8');
      logger.debug('Статистика сохранена в файл');
    } catch (error) {
      logger.error(`Ошибка при сохранении статистики: ${error.message}`);
    }
  }
  
  /**
   * Сохранение почасовой статистики в файл
   */
  saveHourlyStats() {
    try {
      // Создаем директорию configs, если она не существует
      const configsDir = path.dirname(HOURLY_STATS_FILE_PATH);
      if (!fs.existsSync(configsDir)) {
        fs.mkdirSync(configsDir, { recursive: true });
      }
      
      fs.writeFileSync(HOURLY_STATS_FILE_PATH, JSON.stringify(this.hourlyStats, null, 2), 'utf8');
      logger.debug('Почасовая статистика сохранена в файл');
    } catch (error) {
      logger.error(`Ошибка при сохранении почасовой статистики: ${error.message}`);
    }
  }
  
  /**
   * Запуск автосохранения статистики
   */
  startAutoSave() {
    // Сохраняем статистику каждые 5 минут
    setInterval(() => {
      this.saveStats();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Запуск обновления почасовой статистики
   */
  startHourlyStatsUpdate() {
    // Обновляем почасовую статистику каждый час
    const updateHourlyStats = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Проверяем, нужно ли создать новую запись для текущего часа
      const hourEntry = this.hourlyStats.find(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.getHours() === currentHour &&
               entryDate.getDate() === now.getDate() &&
               entryDate.getMonth() === now.getMonth() &&
               entryDate.getFullYear() === now.getFullYear();
      });
      
      if (!hourEntry) {
        // Если записи нет, создаем новую
        const timestamp = new Date(now);
        timestamp.setMinutes(0, 0, 0);
        
        this.hourlyStats.push({
          timestamp: timestamp.toISOString(),
          polls: 0,
          errors: 0,
          deviceStats: {}
        });
        
        // Удаляем старые записи (оставляем только за последние 7 дней)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        this.hourlyStats = this.hourlyStats.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= sevenDaysAgo;
        });
        
        this.saveHourlyStats();
      }
    };
    
    // Запускаем обновление сразу
    updateHourlyStats();
    
    // Вычисляем время до следующего часа
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeToNextHour = nextHour - now;
    
    // Запускаем таймер для первого обновления в начале следующего часа
    setTimeout(() => {
      updateHourlyStats();
      
      // Затем запускаем интервал для обновления каждый час
      setInterval(updateHourlyStats, 60 * 60 * 1000);
    }, timeToNextHour);
  }
  
  /**
   * Регистрация успешного опроса устройства
   * @param {string} deviceId - ID устройства
   */
  registerPoll(deviceId) {
    // Обновляем общую статистику
    this.stats.totalPolls++;
    this.stats.lastPoll = new Date().toISOString();
    
    // Обновляем статистику устройства
    if (!this.stats.deviceStats[deviceId]) {
      this.stats.deviceStats[deviceId] = {
        polls: 0,
        errors: 0,
        lastPoll: null
      };
    }
    
    this.stats.deviceStats[deviceId].polls++;
    this.stats.deviceStats[deviceId].lastPoll = new Date().toISOString();
    
    // Обновляем почасовую статистику
    this.updateHourlyStats(deviceId, true);
  }
  
  /**
   * Регистрация ошибки опроса устройства
   * @param {string} deviceId - ID устройства
   */
  registerError(deviceId) {
    // Обновляем общую статистику
    this.stats.errors++;
    
    // Обновляем статистику устройства
    if (!this.stats.deviceStats[deviceId]) {
      this.stats.deviceStats[deviceId] = {
        polls: 0,
        errors: 0,
        lastPoll: null
      };
    }
    
    this.stats.deviceStats[deviceId].errors++;
    
    // Обновляем почасовую статистику
    this.updateHourlyStats(deviceId, false, true);
  }
  
  /**
   * Обновление почасовой статистики
   * @param {string} deviceId - ID устройства
   * @param {boolean} isPoll - Флаг успешного опроса
   * @param {boolean} isError - Флаг ошибки
   */
  updateHourlyStats(deviceId, isPoll = false, isError = false) {
    const now = new Date();
    
    // Ищем запись для текущего часа
    let hourEntry = this.hourlyStats.find(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.getHours() === now.getHours() &&
             entryDate.getDate() === now.getDate() &&
             entryDate.getMonth() === now.getMonth() &&
             entryDate.getFullYear() === now.getFullYear();
    });
    
    // Если записи нет, создаем новую
    if (!hourEntry) {
      const timestamp = new Date(now);
      timestamp.setMinutes(0, 0, 0);
      
      hourEntry = {
        timestamp: timestamp.toISOString(),
        polls: 0,
        errors: 0,
        deviceStats: {}
      };
      
      this.hourlyStats.push(hourEntry);
    }
    
    // Обновляем статистику
    if (isPoll) hourEntry.polls++;
    if (isError) hourEntry.errors++;
    
    // Обновляем статистику устройства
    if (!hourEntry.deviceStats[deviceId]) {
      hourEntry.deviceStats[deviceId] = {
        polls: 0,
        errors: 0
      };
    }
    
    if (isPoll) hourEntry.deviceStats[deviceId].polls++;
    if (isError) hourEntry.deviceStats[deviceId].errors++;
  }
  
  /**
   * Получение общей статистики
   * @returns {Object} - Статистика
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Получение почасовой статистики
   * @returns {Array} - Почасовая статистика
   */
  getHourlyStats() {
    return this.hourlyStats;
  }
  
  /**
   * Получение статистики устройства
   * @param {string} deviceId - ID устройства
   * @returns {Object} - Статистика устройства
   */
  getDeviceStats(deviceId) {
    return this.stats.deviceStats[deviceId] || {
      polls: 0,
      errors: 0,
      lastPoll: null
    };
  }
  
  /**
   * Сброс статистики
   */
  resetStats() {
    this.stats = {
      totalPolls: 0,
      errors: 0,
      lastPoll: null,
      deviceStats: {}
    };
    
    this.initializeHourlyStats();
    
    this.saveStats();
    this.saveHourlyStats();
    
    logger.info('Статистика сброшена');
  }
}

// Создаем и экспортируем экземпляр статистики
const modbusStats = new ModbusStats();

module.exports = modbusStats;
