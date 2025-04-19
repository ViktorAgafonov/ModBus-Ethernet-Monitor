/**
 * ModBus клиент
 * Модуль для взаимодействия с ModBus устройствами по TCP/IP
 */

const ModbusRTU = require('modbus-serial');
const fs = require('fs');
const path = require('path');
const { getLogger } = require('../config/logger');

// Получаем логгер
const logger = getLogger('modbus-client');

// Импортируем модуль статистики
let modbusStats;
try {
  // Используем require.resolve для проверки существования модуля
  require.resolve('./stats');
  // Если модуль существует, импортируем его
  modbusStats = require('./stats');
} catch (error) {
  // Если модуль не существует, создаем заглушку
  logger.warn('Модуль статистики не найден, используется заглушка');
  modbusStats = {
    registerPoll: () => {},
    registerError: () => {}
  };
}

class ModbusClient {
  constructor() {
    this.client = new ModbusRTU();
    this.connected = false;
    this.devices = [];
    this.pollingIntervals = {};
    this.deviceData = {};
    
    // Загружаем конфигурацию устройств при инициализации
    this.loadDevicesConfig();
  }

  /**
   * Загрузка конфигурации устройств из файла
   * @param {boolean} forceReload - Принудительная перезагрузка конфигурации
   * @returns {Array} - Список устройств
   */
  loadDevicesConfig(forceReload = false) {
    // Если устройства уже загружены и не требуется принудительная перезагрузка
    if (this.devices.length > 0 && !forceReload) {
      return this.devices;
    }
    
    try {
      const configPath = path.join(__dirname, '../../../configs/devices.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.devices = JSON.parse(configData);
        logger.info(`Загружена конфигурация ${this.devices.length} устройств`);
        return this.devices;
      } else {
        logger.warn('Файл конфигурации устройств не найден');
        return [];
      }
    } catch (error) {
      logger.error(`Ошибка при загрузке конфигурации устройств: ${error.message}`);
      return [];
    }
  }

  /**
   * Подключение к ModBus устройству
   * @param {Object} device - Объект с параметрами устройства
   * @returns {Promise<boolean>} - Результат подключения
   */
  async connect(device) {
    try {
      // Закрываем предыдущее соединение, если оно есть
      if (this.connected) {
        await this.disconnect();
      }

      // Подключаемся к устройству по TCP
      await this.client.connectTCP(device.ip, { port: device.port || 502 });
      this.client.setID(device.unitId || 1);
      this.connected = true;
      
      logger.info(`Подключено к устройству ${device.name} (${device.ip}:${device.port || 502})`);
      return true;
    } catch (error) {
      logger.error(`Ошибка подключения к устройству ${device.name}: ${error.message}`);
      this.connected = false;
      return false;
    }
  }

  /**
   * Отключение от ModBus устройства
   */
  async disconnect() {
    try {
      if (this.connected) {
        await this.client.close();
        this.connected = false;
        logger.info('Отключено от устройства');
      }
    } catch (error) {
      logger.error(`Ошибка при отключении: ${error.message}`);
    }
  }

  /**
   * Чтение holding регистров
   * @param {number} address - Адрес начального регистра
   * @param {number} length - Количество регистров для чтения
   * @returns {Promise<Array>} - Массив значений регистров
   */
  async readHoldingRegisters(address, length) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      const result = await this.client.readHoldingRegisters(address, length);
      return result.data;
    } catch (error) {
      logger.error(`Ошибка чтения holding регистров: ${error.message}`);
      throw error;
    }
  }

  /**
   * Чтение input регистров
   * @param {number} address - Адрес начального регистра
   * @param {number} length - Количество регистров для чтения
   * @returns {Promise<Array>} - Массив значений регистров
   */
  async readInputRegisters(address, length) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      const result = await this.client.readInputRegisters(address, length);
      return result.data;
    } catch (error) {
      logger.error(`Ошибка чтения input регистров: ${error.message}`);
      throw error;
    }
  }

  /**
   * Чтение coil статусов
   * @param {number} address - Адрес начального coil
   * @param {number} length - Количество coils для чтения
   * @returns {Promise<Array>} - Массив значений coils
   */
  async readCoils(address, length) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      const result = await this.client.readCoils(address, length);
      return result.data;
    } catch (error) {
      logger.error(`Ошибка чтения coils: ${error.message}`);
      throw error;
    }
  }

  /**
   * Чтение discrete input статусов
   * @param {number} address - Адрес начального discrete input
   * @param {number} length - Количество inputs для чтения
   * @returns {Promise<Array>} - Массив значений inputs
   */
  async readDiscreteInputs(address, length) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      const result = await this.client.readDiscreteInputs(address, length);
      return result.data;
    } catch (error) {
      logger.error(`Ошибка чтения discrete inputs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Запись в holding регистр
   * @param {number} address - Адрес регистра
   * @param {number} value - Значение для записи
   * @returns {Promise<boolean>} - Результат записи
   */
  async writeRegister(address, value) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      await this.client.writeRegister(address, value);
      logger.info(`Записано значение ${value} в регистр ${address}`);
      return true;
    } catch (error) {
      logger.error(`Ошибка записи в регистр: ${error.message}`);
      return false;
    }
  }

  /**
   * Запись в несколько holding регистров
   * @param {number} address - Адрес начального регистра
   * @param {Array} values - Массив значений для записи
   * @returns {Promise<boolean>} - Результат записи
   */
  async writeRegisters(address, values) {
    try {
      if (!this.connected) {
        throw new Error('Нет подключения к устройству');
      }
      
      await this.client.writeRegisters(address, values);
      logger.info(`Записаны значения в регистры, начиная с адреса ${address}`);
      return true;
    } catch (error) {
      logger.error(`Ошибка записи в регистры: ${error.message}`);
      return false;
    }
  }

  /**
   * Запуск периодического опроса устройства
   * @param {string} deviceId - ID устройства
   * @param {number} interval - Интервал опроса в миллисекундах
   */
  startPolling(deviceId, interval = 5000) {
    try {
      // Останавливаем предыдущий опрос, если он был
      this.stopPolling(deviceId);
      
      const device = this.devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error(`Устройство с ID ${deviceId} не найдено`);
      }
      
      // Инициализируем хранилище данных для устройства
      if (!this.deviceData[deviceId]) {
        this.deviceData[deviceId] = {};
      }
      
      // Запускаем интервал опроса
      this.pollingIntervals[deviceId] = setInterval(async () => {
        try {
          // Подключаемся к устройству
          const connected = await this.connect(device);
          if (!connected) return;
          
          // Обрабатываем каждый регистр
          for (const register of device.registers) {
            try {
              // Пропускаем отключенные регистры
              if (!register.enabled) continue;
              
              let data;
              
              // Читаем данные в зависимости от типа регистра
              switch (register.type) {
                case 'holding':
                  data = await this.readHoldingRegisters(register.address, register.length || 1);
                  break;
                case 'input':
                  data = await this.readInputRegisters(register.address, register.length || 1);
                  break;
                case 'coil':
                  data = await this.readCoils(register.address, register.length || 1);
                  break;
                case 'discrete':
                  data = await this.readDiscreteInputs(register.address, register.length || 1);
                  break;
                default:
                  logger.warn(`Неизвестный тип регистра: ${register.type}`);
                  continue;
              }
              
              // Сохраняем данные
              if (!this.deviceData[deviceId]) {
                this.deviceData[deviceId] = {};
              }
              
              this.deviceData[deviceId][register.name] = {
                value: data,
                timestamp: new Date().toISOString(),
                address: register.address,
                type: register.type
              };
              
              // Регистрируем успешный опрос в статистике
              modbusStats.registerPoll(deviceId);
              
              logger.debug(`Получены данные регистра ${register.name}: ${JSON.stringify(data)}`);
              
            } catch (registerError) {
              // Регистрируем ошибку в статистике
              modbusStats.registerError(deviceId);
              logger.error(`Ошибка при чтении регистра ${register.name}: ${registerError.message}`);
            }
          }
          
          // Отключаемся от устройства
          await this.disconnect();
          
          // Сохраняем данные в архив
          this.saveDataToArchive(deviceId);
          
        } catch (pollError) {
          logger.error(`Ошибка в цикле опроса устройства ${device.name}: ${pollError.message}`);
        }
      }, interval);
      
      logger.info(`Запущен опрос устройства ${device.name} с интервалом ${interval} мс`);
    } catch (error) {
      logger.error(`Ошибка при запуске опроса устройства: ${error.message}`);
    }
  }

  /**
   * Остановка периодического опроса устройства
   * @param {string} deviceId - ID устройства
   */
  stopPolling(deviceId) {
    if (this.pollingIntervals[deviceId]) {
      clearInterval(this.pollingIntervals[deviceId]);
      delete this.pollingIntervals[deviceId];
      
      const device = this.devices.find(d => d.id === deviceId);
      logger.info(`Остановлен опрос устройства ${device ? device.name : deviceId}`);
    }
  }

  /**
   * Сохранение данных в архив
   * @param {string} deviceId - ID устройства
   */
  saveDataToArchive(deviceId) {
    try {
      const device = this.devices.find(d => d.id === deviceId);
      if (!device) return;
      
      const data = this.deviceData[deviceId];
      if (!data) return;
      
      // Формируем имя файла в формате YYYY-MM-DD.json
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const archiveDir = path.join(__dirname, '../../../archives');
      const archiveFile = path.join(archiveDir, `${dateStr}.json`);
      
      // Создаем директорию архивов, если она не существует
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      
      // Читаем существующие данные или создаем новый объект
      let archiveData = {};
      if (fs.existsSync(archiveFile)) {
        try {
          const fileContent = fs.readFileSync(archiveFile, 'utf8');
          archiveData = JSON.parse(fileContent);
        } catch (readError) {
          logger.error(`Ошибка чтения архивного файла: ${readError.message}`);
        }
      }
      
      // Добавляем новые данные
      if (!archiveData[deviceId]) {
        archiveData[deviceId] = {};
      }
      
      // Обновляем данные устройства
      archiveData[deviceId] = {
        ...archiveData[deviceId],
        ...data,
        lastUpdate: new Date().toISOString()
      };
      
      // Записываем обновленные данные в файл
      fs.writeFileSync(archiveFile, JSON.stringify(archiveData, null, 2), 'utf8');
      logger.debug(`Данные устройства ${device.name} сохранены в архив ${dateStr}.json`);
      
    } catch (error) {
      logger.error(`Ошибка при сохранении данных в архив: ${error.message}`);
    }
  }

  /**
   * Получение текущих данных устройства
   * @param {string} deviceId - ID устройства
   * @returns {Object} - Данные устройства
   */
  getDeviceData(deviceId) {
    return this.deviceData[deviceId] || {};
  }

  /**
   * Получение данных всех устройств
   * @returns {Object} - Данные всех устройств
   */
  getAllDevicesData() {
    return this.deviceData;
  }
}

// Создаем и экспортируем экземпляр клиента
const modbusClient = new ModbusClient();

module.exports = modbusClient;
