/**
 * ModBus API роутер
 * Обрабатывает запросы к ModBus устройствам
 */

const express = require('express');
const router = express.Router();
const modbusClient = require('./modbus-client');
const modbusStats = require('./stats');
const { getLogger } = require('../config/logger');
const { authMiddleware } = require('../auth/middleware');

// Получаем логгер
const logger = getLogger('modbus-router');

/**
 * GET /api/modbus/devices
 * Получение списка всех устройств
 */
router.get('/devices', authMiddleware, (req, res) => {
  try {
    const devices = modbusClient.loadDevicesConfig();
    res.json(devices);
  } catch (error) {
    logger.error(`Ошибка при получении списка устройств: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении списка устройств' });
  }
});

/**
 * GET /api/modbus/devices/:id
 * Получение информации об устройстве по ID
 */
router.get('/devices/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === id);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    res.json(device);
  } catch (error) {
    logger.error(`Ошибка при получении информации об устройстве: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении информации об устройстве' });
  }
});

/**
 * GET /api/modbus/data
 * Получение данных всех устройств
 */
router.get('/data', authMiddleware, (req, res) => {
  try {
    const data = modbusClient.getAllDevicesData();
    res.json(data);
  } catch (error) {
    logger.error(`Ошибка при получении данных устройств: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении данных устройств' });
  }
});

/**
 * GET /api/modbus/data/:deviceId
 * Получение данных конкретного устройства
 */
router.get('/data/:deviceId', authMiddleware, (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = modbusClient.getDeviceData(deviceId);
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({ error: 'Данные устройства не найдены' });
    }
    
    res.json(data);
  } catch (error) {
    logger.error(`Ошибка при получении данных устройства: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении данных устройства' });
  }
});

/**
 * POST /api/modbus/connect
 * Подключение к устройству
 */
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Не указан ID устройства' });
    }
    
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    const connected = await modbusClient.connect(device);
    
    if (!connected) {
      return res.status(500).json({ error: 'Не удалось подключиться к устройству' });
    }
    
    res.json({ success: true, message: `Подключено к устройству ${device.name}` });
  } catch (error) {
    logger.error(`Ошибка при подключении к устройству: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при подключении к устройству' });
  }
});

/**
 * POST /api/modbus/disconnect
 * Отключение от устройства
 */
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await modbusClient.disconnect();
    res.json({ success: true, message: 'Отключено от устройства' });
  } catch (error) {
    logger.error(`Ошибка при отключении от устройства: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при отключении от устройства' });
  }
});

/**
 * POST /api/modbus/read
 * Чтение данных из регистров устройства
 */
router.post('/read', authMiddleware, async (req, res) => {
  try {
    const { deviceId, registerType, address, length } = req.body;
    
    if (!deviceId || !registerType || address === undefined) {
      return res.status(400).json({ error: 'Не указаны обязательные параметры' });
    }
    
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    // Подключаемся к устройству
    const connected = await modbusClient.connect(device);
    
    if (!connected) {
      return res.status(500).json({ error: 'Не удалось подключиться к устройству' });
    }
    
    // Читаем данные в зависимости от типа регистра
    let data;
    switch (registerType) {
      case 'holding':
        data = await modbusClient.readHoldingRegisters(address, length || 1);
        break;
      case 'input':
        data = await modbusClient.readInputRegisters(address, length || 1);
        break;
      case 'coil':
        data = await modbusClient.readCoils(address, length || 1);
        break;
      case 'discrete':
        data = await modbusClient.readDiscreteInputs(address, length || 1);
        break;
      default:
        await modbusClient.disconnect();
        return res.status(400).json({ error: 'Неизвестный тип регистра' });
    }
    
    // Отключаемся от устройства
    await modbusClient.disconnect();
    
    res.json({ 
      success: true, 
      data,
      device: device.name,
      registerType,
      address,
      length: length || 1
    });
  } catch (error) {
    logger.error(`Ошибка при чтении данных: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при чтении данных' });
  }
});

/**
 * POST /api/modbus/write
 * Запись данных в регистры устройства
 */
router.post('/write', authMiddleware, async (req, res) => {
  try {
    const { deviceId, address, value, values } = req.body;
    
    if (!deviceId || address === undefined || (value === undefined && !values)) {
      return res.status(400).json({ error: 'Не указаны обязательные параметры' });
    }
    
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    // Подключаемся к устройству
    const connected = await modbusClient.connect(device);
    
    if (!connected) {
      return res.status(500).json({ error: 'Не удалось подключиться к устройству' });
    }
    
    // Записываем данные
    let success;
    if (values) {
      // Запись нескольких значений
      success = await modbusClient.writeRegisters(address, values);
    } else {
      // Запись одного значения
      success = await modbusClient.writeRegister(address, value);
    }
    
    // Отключаемся от устройства
    await modbusClient.disconnect();
    
    if (!success) {
      return res.status(500).json({ error: 'Не удалось записать данные' });
    }
    
    res.json({ 
      success: true, 
      message: 'Данные успешно записаны',
      device: device.name,
      address,
      value: value !== undefined ? value : values
    });
  } catch (error) {
    logger.error(`Ошибка при записи данных: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при записи данных' });
  }
});

/**
 * POST /api/modbus/polling/start
 * Запуск периодического опроса устройства
 */
router.post('/polling/start', authMiddleware, (req, res) => {
  try {
    const { deviceId, interval } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Не указан ID устройства' });
    }
    
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    modbusClient.startPolling(deviceId, interval);
    
    res.json({ 
      success: true, 
      message: `Запущен опрос устройства ${device.name}`,
      interval: interval || 5000
    });
  } catch (error) {
    logger.error(`Ошибка при запуске опроса: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при запуске опроса' });
  }
});

/**
 * POST /api/modbus/polling/stop
 * Остановка периодического опроса устройства
 */
router.post('/polling/stop', authMiddleware, (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Не указан ID устройства' });
    }
    
    const devices = modbusClient.loadDevicesConfig();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    modbusClient.stopPolling(deviceId);
    
    res.json({ 
      success: true, 
      message: `Остановлен опрос устройства ${device.name}`
    });
  } catch (error) {
    logger.error(`Ошибка при остановке опроса: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при остановке опроса' });
  }
});

/**
 * GET /api/modbus/stats
 * Получение общей статистики
 */
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const stats = modbusStats.getStats();
    res.json(stats);
  } catch (error) {
    logger.error(`Ошибка при получении статистики: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

/**
 * GET /api/modbus/stats/hourly
 * Получение почасовой статистики
 */
router.get('/stats/hourly', authMiddleware, (req, res) => {
  try {
    const hourlyStats = modbusStats.getHourlyStats();
    res.json(hourlyStats);
  } catch (error) {
    logger.error(`Ошибка при получении почасовой статистики: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении почасовой статистики' });
  }
});

/**
 * GET /api/modbus/stats/device/:deviceId
 * Получение статистики конкретного устройства
 */
router.get('/stats/device/:deviceId', authMiddleware, (req, res) => {
  try {
    const { deviceId } = req.params;
    const deviceStats = modbusStats.getDeviceStats(deviceId);
    res.json(deviceStats);
  } catch (error) {
    logger.error(`Ошибка при получении статистики устройства: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении статистики устройства' });
  }
});

/**
 * POST /api/modbus/stats/reset
 * Сброс статистики (только для администраторов)
 */
router.post('/stats/reset', authMiddleware, (req, res) => {
  try {
    // Проверяем, является ли пользователь администратором
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администраторы могут сбрасывать статистику' });
    }
    
    modbusStats.resetStats();
    res.json({ success: true, message: 'Статистика успешно сброшена' });
  } catch (error) {
    logger.error(`Ошибка при сбросе статистики: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при сбросе статистики' });
  }
});

module.exports = router;
