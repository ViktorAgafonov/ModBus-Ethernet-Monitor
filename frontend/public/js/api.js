/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с API
 */

// Класс для работы с API
class ApiService {
  constructor() {
    // Базовый URL API (по умолчанию - локальный сервер)
    this.baseUrl = localStorage.getItem('serverAddress') || 'http://localhost:3000';
    
    // Токен авторизации
    this.token = localStorage.getItem('authToken') || null;
  }

  /**
   * Установка базового URL для API
   * @param {string} url - Базовый URL
   */
  setBaseUrl(url) {
    this.baseUrl = url;
    localStorage.setItem('serverAddress', url);
  }

  /**
   * Установка токена авторизации
   * @param {string} token - JWT токен
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  /**
   * Формирование заголовков для запросов
   * @returns {Object} - Заголовки запроса
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Выполнение GET-запроса
   * @param {string} endpoint - Конечная точка API
   * @returns {Promise} - Промис с результатом запроса
   */
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Ошибка GET-запроса к ${endpoint}:`, error);
      
      // Записываем в журнал с детальной информацией
      if (typeof logError === 'function') {
        // Создаем объект с деталями ошибки
        const errorDetails = {
          url: `${this.baseUrl}${endpoint}`,
          name: error.name,
          message: error.message,
          stack: error.stack,
          status: error.status,
          statusText: error.statusText,
          timestamp: new Date().toISOString()
        };
        
        logError('Консоль', `Ошибка GET-запроса к ${endpoint}:`, errorDetails);
      }
      
      throw error;
    }
  }

  /**
   * Выполнение POST-запроса
   * @param {string} endpoint - Конечная точка API
   * @param {Object} data - Данные для отправки
   * @returns {Promise} - Промис с результатом запроса
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Ошибка POST-запроса к ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Выполнение PUT-запроса
   * @param {string} endpoint - Конечная точка API
   * @param {Object} data - Данные для отправки
   * @returns {Promise} - Промис с результатом запроса
   */
  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Ошибка PUT-запроса к ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Выполнение DELETE-запроса
   * @param {string} endpoint - Конечная точка API
   * @returns {Promise} - Промис с результатом запроса
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Ошибка DELETE-запроса к ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Скачивание файла
   * @param {string} endpoint - Конечная точка API
   * @param {string} filename - Имя файла для сохранения
   */
  async downloadFile(endpoint, filename) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Ошибка скачивания файла с ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Проверка соединения с сервером
   * @returns {Promise<boolean>} - Результат проверки
   */
  async checkConnection() {
    try {
      // Используем эндпойнт /api/health, который не требует авторизации
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ошибка проверки соединения:', error);
      return false;
    }
  }

  // API для работы с устройствами
  
  /**
   * Получение списка устройств
   * @returns {Promise<Array>} - Список устройств
   */
  async getDevices() {
    return this.get('/api/modbus/devices');
  }

  /**
   * Получение информации об устройстве
   * @param {string} deviceId - ID устройства
   * @returns {Promise<Object>} - Информация об устройстве
   */
  async getDevice(deviceId) {
    return this.get(`/api/modbus/devices/${deviceId}`);
  }

  /**
   * Добавление нового устройства
   * @param {Object} deviceData - Данные устройства
   * @returns {Promise<Object>} - Результат операции
   */
  async addDevice(deviceData) {
    return this.post('/api/modbus/devices', deviceData);
  }

  /**
   * Обновление устройства
   * @param {string} deviceId - ID устройства
   * @param {Object} deviceData - Данные устройства
   * @returns {Promise<Object>} - Результат операции
   */
  async updateDevice(deviceId, deviceData) {
    return this.put(`/api/modbus/devices/${deviceId}`, deviceData);
  }

  /**
   * Удаление устройства
   * @param {string} deviceId - ID устройства
   * @returns {Promise<Object>} - Результат операции
   */
  async deleteDevice(deviceId) {
    return this.delete(`/api/modbus/devices/${deviceId}`);
  }

  /**
   * Получение текущих данных устройства
   * @param {string} deviceId - ID устройства
   * @returns {Promise<Object>} - Текущие данные устройства
   */
  async getDeviceData(deviceId) {
    return this.get(`/api/modbus/data/${deviceId}`);
  }

  /**
   * Запись данных в регистр устройства
   * @param {string} deviceId - ID устройства
   * @param {Object} writeData - Данные для записи
   * @returns {Promise<Object>} - Результат операции
   */
  async writeDeviceRegister(deviceId, writeData) {
    return this.post(`/api/modbus/write/${deviceId}`, writeData);
  }

  // API для работы с архивами

  /**
   * Получение списка архивов
   * @returns {Promise<Array>} - Список архивов
   */
  async getArchives() {
    return this.get('/api/archives');
  }

  /**
   * Получение данных архива за указанную дату
   * @param {string} date - Дата в формате YYYY-MM-DD
   * @returns {Promise<Object>} - Данные архива
   */
  async getArchiveByDate(date) {
    return this.get(`/api/archives/${date}`);
  }

  /**
   * Создание ZIP-архива за указанный месяц
   * @param {string} month - Месяц в формате YYYYMM
   * @returns {Promise<Object>} - Результат операции
   */
  async createZipArchive(month) {
    return this.post(`/api/archives/create-zip/${month}`, {});
  }

  /**
   * Скачивание ZIP-архива
   * @param {string} month - Месяц в формате YYYYMM
   */
  async downloadZipArchive(month) {
    await this.downloadFile(`/api/archives/zip/${month}`, `${month}.zip`);
  }

  // API для работы с отчетами

  /**
   * Генерация отчета
   * @param {Object} reportParams - Параметры отчета
   * @returns {Promise<Object>} - Результат операции
   */
  async generateReport(reportParams) {
    return this.post('/api/reports/generate', reportParams);
  }

  /**
   * Получение списка отчетов
   * @returns {Promise<Array>} - Список отчетов
   */
  async getReports() {
    return this.get('/api/reports');
  }

  /**
   * Скачивание отчета
   * @param {string} reportId - ID отчета
   * @param {string} format - Формат отчета (excel, csv, pdf)
   */
  async downloadReport(reportId, format) {
    await this.downloadFile(`/api/reports/${reportId}/download?format=${format}`, `report_${reportId}.${format}`);
  }

  // API для работы с настройками

  /**
   * Получение настроек опроса устройств
   * @returns {Promise<Object>} - Настройки опроса
   */
  async getPollingSettings() {
    return this.get('/api/config/polling');
  }

  /**
   * Обновление настроек опроса устройств
   * @param {Object} settings - Настройки опроса
   * @returns {Promise<Object>} - Результат операции
   */
  async updatePollingSettings(settings) {
    return this.put('/api/config/polling', settings);
  }

  /**
   * Получение настроек архивации
   * @returns {Promise<Object>} - Настройки архивации
   */
  async getArchivingSettings() {
    return this.get('/api/config/archiving');
  }

  /**
   * Обновление настроек архивации
   * @param {Object} settings - Настройки архивации
   * @returns {Promise<Object>} - Результат операции
   */
  async updateArchivingSettings(settings) {
    return this.put('/api/config/archiving', settings);
  }
}

// Создаем экземпляр API и делаем его глобально доступным
const api = new ApiService();
