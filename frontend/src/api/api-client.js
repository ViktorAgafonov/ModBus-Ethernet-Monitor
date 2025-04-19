/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * API клиент для взаимодействия с сервером
 */

import { getAuthToken } from '../auth/auth.js';

// Базовый URL API
const API_BASE_URL = 'http://localhost:3000';

/**
 * API клиент для выполнения запросов к серверу
 */
export const apiClient = {
  /**
   * Выполнение GET запроса
   * @param {string} endpoint - Конечная точка API
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Object>} - Результат запроса
   */
  async get(endpoint, params = {}) {
    const url = new URL(API_BASE_URL + endpoint);
    
    // Добавляем параметры запроса в URL
    if (Object.keys(params).length > 0) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }
    
    const options = {
      method: 'GET',
      headers: this._getHeaders()
    };
    
    return this._fetchWithErrorHandling(url, options);
  },
  
  /**
   * Выполнение POST запроса
   * @param {string} endpoint - Конечная точка API
   * @param {Object} data - Данные для отправки
   * @returns {Promise<Object>} - Результат запроса
   */
  async post(endpoint, data = {}) {
    const url = new URL(API_BASE_URL + endpoint);
    
    const options = {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data)
    };
    
    return this._fetchWithErrorHandling(url, options);
  },
  
  /**
   * Выполнение PUT запроса
   * @param {string} endpoint - Конечная точка API
   * @param {Object} data - Данные для отправки
   * @returns {Promise<Object>} - Результат запроса
   */
  async put(endpoint, data = {}) {
    const url = new URL(API_BASE_URL + endpoint);
    
    const options = {
      method: 'PUT',
      headers: this._getHeaders(),
      body: JSON.stringify(data)
    };
    
    return this._fetchWithErrorHandling(url, options);
  },
  
  /**
   * Выполнение DELETE запроса
   * @param {string} endpoint - Конечная точка API
   * @returns {Promise<Object>} - Результат запроса
   */
  async delete(endpoint) {
    const url = new URL(API_BASE_URL + endpoint);
    
    const options = {
      method: 'DELETE',
      headers: this._getHeaders()
    };
    
    return this._fetchWithErrorHandling(url, options);
  },
  
  /**
   * Получение заголовков для запроса
   * @returns {Object} - Заголовки запроса
   * @private
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Добавляем токен авторизации, если пользователь авторизован
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  },
  
  /**
   * Выполнение запроса с обработкой ошибок
   * @param {URL} url - URL запроса
   * @param {Object} options - Опции запроса
   * @returns {Promise<Object>} - Результат запроса
   * @private
   */
  async _fetchWithErrorHandling(url, options) {
    try {
      const response = await fetch(url, options);
      
      // Если ответ не успешный, выбрасываем ошибку
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
      }
      
      // Проверяем, есть ли контент в ответе
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('Ошибка API запроса:', error);
      throw error;
    }
  }
};
