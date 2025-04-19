/**
 * Основной API роутер
 * Обработка общих запросов и маршрутизация
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const { getLogger } = require('../config/logger');
const { authMiddleware } = require('../auth/middleware');
const healthRouter = require('./health');

// Получаем логгер
const logger = getLogger('api-router');

// Подключаем маршрут проверки работоспособности
router.use('/health', healthRouter);

/**
 * GET /api/status
 * Проверка статуса сервера
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * GET /api/archives
 * Получение списка доступных архивов
 */
router.get('/archives', authMiddleware, (req, res) => {
  try {
    const archivesDir = path.join(__dirname, '../../../archives');
    
    // Проверяем существование директории
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
      return res.json({ archives: [] });
    }
    
    // Получаем список файлов в директории
    const files = fs.readdirSync(archivesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(archivesDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          date: file.replace('.json', ''),
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Сортируем по дате (новые сверху)
    
    res.json({ archives: files });
  } catch (error) {
    logger.error(`Ошибка при получении списка архивов: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении списка архивов' });
  }
});

/**
 * GET /api/archives/:date
 * Получение архива за конкретную дату
 */
router.get('/archives/:date', authMiddleware, (req, res) => {
  try {
    const { date } = req.params;
    const archiveFile = path.join(__dirname, `../../../archives/${date}.json`);
    
    if (!fs.existsSync(archiveFile)) {
      return res.status(404).json({ error: 'Архив не найден' });
    }
    
    const archiveData = fs.readFileSync(archiveFile, 'utf8');
    res.json(JSON.parse(archiveData));
  } catch (error) {
    logger.error(`Ошибка при получении архива: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении архива' });
  }
});

/**
 * GET /api/archives/zip/:month
 * Получение ZIP-архива за месяц
 */
router.get('/archives/zip/:month', authMiddleware, (req, res) => {
  try {
    const { month } = req.params; // Формат: YYYYMM
    const zipFile = path.join(__dirname, `../../../archives/Zip/${month}.zip`);
    
    if (!fs.existsSync(zipFile)) {
      return res.status(404).json({ error: 'ZIP-архив не найден' });
    }
    
    res.download(zipFile);
  } catch (error) {
    logger.error(`Ошибка при получении ZIP-архива: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении ZIP-архива' });
  }
});

/**
 * POST /api/archives/create-zip/:month
 * Создание ZIP-архива за месяц
 */
router.post('/archives/create-zip/:month', authMiddleware, (req, res) => {
  try {
    const { month } = req.params; // Формат: YYYYMM
    
    if (!month.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Неверный формат месяца. Используйте YYYYMM' });
    }
    
    const year = month.substring(0, 4);
    const monthNum = month.substring(4, 6);
    
    // Проверяем права доступа (только админ или оператор)
    if (req.user.role !== 'admin' && req.user.role !== 'operator') {
      return res.status(403).json({ error: 'Нет прав доступа для создания архивов' });
    }
    
    const archivesDir = path.join(__dirname, '../../../archives');
    const zipDir = path.join(archivesDir, 'Zip');
    
    // Создаем директорию для ZIP-архивов, если она не существует
    if (!fs.existsSync(zipDir)) {
      fs.mkdirSync(zipDir, { recursive: true });
    }
    
    const zipFile = path.join(zipDir, `${month}.zip`);
    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Максимальный уровень сжатия
    });
    
    // Обработка событий
    output.on('close', () => {
      logger.info(`ZIP-архив за ${month} создан. Размер: ${archive.pointer()} байт`);
      res.json({
        success: true,
        message: `ZIP-архив за ${month} успешно создан`,
        file: `${month}.zip`,
        size: archive.pointer()
      });
    });
    
    archive.on('error', (err) => {
      logger.error(`Ошибка при создании ZIP-архива: ${err.message}`);
      res.status(500).json({ error: 'Ошибка при создании ZIP-архива' });
    });
    
    // Подключаем архив к потоку записи
    archive.pipe(output);
    
    // Получаем список файлов архивов за указанный месяц
    const files = fs.readdirSync(archivesDir)
      .filter(file => {
        return file.endsWith('.json') && 
               file.startsWith(`${year}-${monthNum}`) || 
               file.startsWith(`${year}-0${monthNum}`);
      });
    
    if (files.length === 0) {
      archive.abort();
      return res.status(404).json({ error: 'Архивы за указанный месяц не найдены' });
    }
    
    // Добавляем файлы в архив
    files.forEach(file => {
      const filePath = path.join(archivesDir, file);
      archive.file(filePath, { name: file });
    });
    
    // Завершаем архивацию
    archive.finalize();
  } catch (error) {
    logger.error(`Ошибка при создании ZIP-архива: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при создании ZIP-архива' });
  }
});

/**
 * GET /api/reports/excel/:date
 * Генерация Excel-отчета за указанную дату
 */
router.get('/reports/excel/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const archiveFile = path.join(__dirname, `../../../archives/${date}.json`);
    
    if (!fs.existsSync(archiveFile)) {
      return res.status(404).json({ error: 'Архив не найден' });
    }
    
    // Загружаем данные архива
    const archiveData = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    
    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ModBusEtherMon';
    workbook.lastModifiedBy = req.user.username;
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Для каждого устройства создаем отдельный лист
    for (const [deviceId, deviceData] of Object.entries(archiveData)) {
      // Получаем информацию об устройстве из конфигурации
      const devicesConfigPath = path.join(__dirname, '../../../configs/devices.json');
      let deviceName = deviceId;
      
      if (fs.existsSync(devicesConfigPath)) {
        const devicesConfig = JSON.parse(fs.readFileSync(devicesConfigPath, 'utf8'));
        const device = devicesConfig.find(d => d.id === deviceId);
        if (device) {
          deviceName = device.name;
        }
      }
      
      // Создаем лист для устройства
      const worksheet = workbook.addWorksheet(deviceName);
      
      // Добавляем заголовки
      worksheet.columns = [
        { header: 'Параметр', key: 'parameter', width: 30 },
        { header: 'Значение', key: 'value', width: 15 },
        { header: 'Адрес регистра', key: 'address', width: 15 },
        { header: 'Тип регистра', key: 'type', width: 15 },
        { header: 'Время обновления', key: 'timestamp', width: 25 }
      ];
      
      // Стилизуем заголовки
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Добавляем данные
      for (const [paramName, paramData] of Object.entries(deviceData)) {
        if (paramName === 'lastUpdate') continue;
        
        const { value, timestamp, register } = paramData;
        
        worksheet.addRow({
          parameter: paramName,
          value: Array.isArray(value) ? value.join(', ') : value,
          address: register ? register.address : 'N/A',
          type: register ? register.type : 'N/A',
          timestamp: timestamp
        });
      }
      
      // Автоматическая фильтрация
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 5 }
      };
    }
    
    // Устанавливаем заголовки для скачивания файла
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${date}.xlsx`);
    
    // Отправляем файл
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Ошибка при генерации Excel-отчета: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при генерации Excel-отчета' });
  }
});

/**
 * GET /api/config/:type
 * Получение конфигурации указанного типа
 */
router.get('/config/:type', authMiddleware, (req, res) => {
  try {
    const { type } = req.params;
    
    // Проверяем, что тип конфигурации допустим
    const allowedTypes = ['devices', 'schedule', 'permissions'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Неверный тип конфигурации' });
    }
    
    const configFile = path.join(__dirname, `../../../configs/${type}.json`);
    
    if (!fs.existsSync(configFile)) {
      // Возвращаем пустую конфигурацию, если файл не существует
      return res.json(type === 'devices' ? [] : {});
    }
    
    const configData = fs.readFileSync(configFile, 'utf8');
    res.json(JSON.parse(configData));
  } catch (error) {
    logger.error(`Ошибка при получении конфигурации: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при получении конфигурации' });
  }
});

/**
 * PUT /api/config/:type
 * Обновление конфигурации указанного типа (только для администраторов)
 */
router.put('/config/:type', authMiddleware, (req, res) => {
  try {
    const { type } = req.params;
    const configData = req.body;
    
    // Проверяем права доступа (только админ)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администраторы могут изменять конфигурацию' });
    }
    
    // Проверяем, что тип конфигурации допустим
    const allowedTypes = ['devices', 'schedule', 'permissions'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Неверный тип конфигурации' });
    }
    
    // Создаем директорию configs, если она не существует
    const configsDir = path.join(__dirname, '../../../configs');
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }
    
    const configFile = path.join(configsDir, `${type}.json`);
    
    // Сохраняем конфигурацию
    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2), 'utf8');
    
    logger.info(`Конфигурация ${type} обновлена пользователем ${req.user.username}`);
    res.json({ success: true, message: `Конфигурация ${type} успешно обновлена` });
  } catch (error) {
    logger.error(`Ошибка при обновлении конфигурации: ${error.message}`);
    res.status(500).json({ error: 'Ошибка при обновлении конфигурации' });
  }
});

module.exports = router;
