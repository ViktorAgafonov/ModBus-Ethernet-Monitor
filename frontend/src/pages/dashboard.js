/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Страница дашборда
 */

import { apiClient } from '../api/api-client.js';
import { showNotification } from '../utils/notifications.js';

/**
 * Инициализация страницы дашборда
 * @param {HTMLElement} container - Контейнер для содержимого
 */
export async function initDashboard(container) {
  // Отображаем заголовок и загрузчик
  container.innerHTML = `
    <div class="content-header">
      <h2>Дашборд</h2>
      <p>Обзор состояния системы и устройств</p>
    </div>
    <div class="loading-container">
      <div class="loader"></div>
    </div>
  `;
  
  try {
    // Загружаем данные устройств
    const devices = await apiClient.get('/api/modbus/devices');
    
    // Загружаем текущие данные устройств
    const deviceData = await apiClient.get('/api/modbus/data');
    
    // Загружаем статистику
    const stats = await apiClient.get('/api/modbus/stats');
    
    // Отображаем дашборд
    renderDashboard(container, devices, deviceData, stats);
  } catch (error) {
    console.error('Ошибка загрузки данных для дашборда:', error);
    showNotification('Ошибка загрузки данных для дашборда', 'error');
    
    // Отображаем сообщение об ошибке
    container.innerHTML = `
      <div class="content-header">
        <h2>Дашборд</h2>
        <p>Обзор состояния системы и устройств</p>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Ошибка загрузки данных</h3>
        </div>
        <p>Не удалось загрузить данные для дашборда. Пожалуйста, попробуйте позже.</p>
        <button class="btn btn-primary" id="retry-button">Повторить</button>
      </div>
    `;
    
    // Добавляем обработчик для кнопки повтора
    document.getElementById('retry-button').addEventListener('click', () => {
      initDashboard(container);
    });
  }
}

/**
 * Отображение дашборда
 * @param {HTMLElement} container - Контейнер для содержимого
 * @param {Array} devices - Список устройств
 * @param {Object} deviceData - Данные устройств
 * @param {Object} stats - Статистика
 */
function renderDashboard(container, devices, deviceData, stats) {
  // Формируем HTML для карточек устройств
  const deviceCardsHtml = devices
    .filter(device => device.enabled)
    .map(device => {
      const deviceStats = stats.devices ? stats.devices[device.id] : null;
      const isOnline = deviceData && deviceData[device.id] && deviceData[device.id].online;
      
      return `
        <div class="card">
          <div class="card-header">
            <h3>
              <span class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}"></span>
              ${device.name}
            </h3>
          </div>
          <div class="device-info">
            <p><strong>IP:</strong> ${device.ip}:${device.port || 502}</p>
            <p><strong>Unit ID:</strong> ${device.unitId || 1}</p>
            <p><strong>Статус:</strong> ${isOnline ? 'Онлайн' : 'Офлайн'}</p>
            ${deviceStats ? `
              <p><strong>Опросов:</strong> ${deviceStats.totalPolls || 0}</p>
              <p><strong>Ошибок:</strong> ${deviceStats.errors || 0}</p>
              <p><strong>Последний опрос:</strong> ${deviceStats.lastPollTime ? new Date(deviceStats.lastPollTime).toLocaleString() : 'Нет данных'}</p>
            ` : '<p>Нет статистики</p>'}
          </div>
          <div class="device-actions">
            <button class="btn btn-primary device-details-btn" data-device-id="${device.id}">Подробнее</button>
          </div>
        </div>
      `;
    })
    .join('');
  
  // Формируем HTML для общей статистики
  const systemStatsHtml = `
    <div class="card">
      <div class="card-header">
        <h3>Статистика системы</h3>
      </div>
      <div class="system-stats">
        <p><strong>Всего устройств:</strong> ${devices.length}</p>
        <p><strong>Активных устройств:</strong> ${devices.filter(d => d.enabled).length}</p>
        <p><strong>Устройств онлайн:</strong> ${devices.filter(d => deviceData && deviceData[d.id] && deviceData[d.id].online).length}</p>
        <p><strong>Всего опросов:</strong> ${stats.totalPolls || 0}</p>
        <p><strong>Всего ошибок:</strong> ${stats.totalErrors || 0}</p>
        <p><strong>Время работы:</strong> ${formatUptime(stats.uptime)}</p>
      </div>
    </div>
  `;
  
  // Отображаем дашборд
  container.innerHTML = `
    <div class="content-header">
      <h2>Дашборд</h2>
      <p>Обзор состояния системы и устройств</p>
    </div>
    <div class="dashboard-grid">
      ${systemStatsHtml}
      ${deviceCardsHtml}
    </div>
  `;
  
  // Добавляем обработчики для кнопок "Подробнее"
  document.querySelectorAll('.device-details-btn').forEach(button => {
    button.addEventListener('click', () => {
      const deviceId = button.getAttribute('data-device-id');
      window.location.hash = `#devices?id=${deviceId}`;
    });
  });
  
  // Обновляем данные каждые 10 секунд
  setTimeout(() => {
    if (window.location.hash === '#dashboard') {
      initDashboard(container);
    }
  }, 10000);
}

/**
 * Форматирование времени работы
 * @param {number} uptime - Время работы в секундах
 * @returns {string} - Отформатированное время работы
 */
function formatUptime(uptime) {
  if (!uptime) return 'Нет данных';
  
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} д.`);
  if (hours > 0) parts.push(`${hours} ч.`);
  if (minutes > 0) parts.push(`${minutes} мин.`);
  if (seconds > 0) parts.push(`${seconds} сек.`);
  
  return parts.join(' ');
}
