/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Страница настроек
 */

import { apiClient } from '../api/api-client.js';
import { showNotification } from '../utils/notifications.js';
import { getCurrentUser } from '../auth/auth.js';

// Объявляем переменные для хранения данных
let devices = [];
let scheduleConfig = {};
let userPermissions = [];

/**
 * Инициализация страницы настроек
 * @param {HTMLElement} container - Контейнер для содержимого
 */
export async function initSettings(container) {
  // Проверяем права пользователя
  const currentUser = getCurrentUser();
  const isAdmin = currentUser && currentUser.role === 'admin';
  
  // Отображаем заголовок и структуру страницы
  container.innerHTML = `
    <div class="content-header">
      <h2>Настройки</h2>
      <p>Управление настройками системы</p>
    </div>
    
    <div class="settings-container">
      <div class="settings-tabs">
        <ul class="tabs-nav">
          <li><a href="#" class="tab-link active" data-tab="devices">Устройства</a></li>
          <li><a href="#" class="tab-link" data-tab="schedule">Расписание опроса</a></li>
          <li><a href="#" class="tab-link" data-tab="archive">Архивация</a></li>
          ${isAdmin ? '<li><a href="#" class="tab-link" data-tab="users">Пользователи</a></li>' : ''}
          <li><a href="#" class="tab-link" data-tab="system">Система</a></li>
        </ul>
      </div>
      
      <div class="tab-content">
        <div id="devices-tab" class="tab-pane active">
          <div class="loading-container">
            <div class="loader"></div>
          </div>
        </div>
        <div id="schedule-tab" class="tab-pane">
          <div class="loading-container">
            <div class="loader"></div>
          </div>
        </div>
        <div id="archive-tab" class="tab-pane">
          <div class="loading-container">
            <div class="loader"></div>
          </div>
        </div>
        ${isAdmin ? `
        <div id="users-tab" class="tab-pane">
          <div class="loading-container">
            <div class="loader"></div>
          </div>
        </div>
        ` : ''}
        <div id="system-tab" class="tab-pane">
          <div class="loading-container">
            <div class="loader"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Добавляем стили для вкладок, если их еще нет
  addTabStyles();
  
  // Добавляем обработчики для вкладок
  setupTabHandlers();
  
  // Загружаем данные для активной вкладки
  loadTabData('devices');
  
  // Добавляем обработчики для кнопок и форм
  setupEventHandlers();
}

/**
 * Добавление стилей для вкладок
 */
function addTabStyles() {
  // Проверяем, есть ли уже стили для вкладок
  if (!document.getElementById('tab-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'tab-styles';
    styleElement.textContent = `
      .settings-container {
        display: flex;
        flex-direction: column;
      }
      
      .settings-tabs {
        margin-bottom: 20px;
      }
      
      .tabs-nav {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
        border-bottom: 1px solid #ddd;
      }
      
      .tabs-nav li {
        margin-right: 5px;
      }
      
      .tab-link {
        display: block;
        padding: 10px 15px;
        text-decoration: none;
        color: #333;
        background-color: #f8f9fa;
        border: 1px solid #ddd;
        border-bottom: none;
        border-radius: 4px 4px 0 0;
      }
      
      .tab-link.active {
        background-color: #fff;
        border-bottom: 1px solid #fff;
        margin-bottom: -1px;
        color: #3498db;
        font-weight: bold;
      }
      
      .tab-pane {
        display: none;
        padding: 20px;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 0 0 4px 4px;
      }
      
      .tab-pane.active {
        display: block;
      }
    `;
    document.head.appendChild(styleElement);
  }
}

/**
 * Настройка обработчиков для вкладок
 */
function setupTabHandlers() {
  document.querySelectorAll('.tab-link').forEach(tabLink => {
    tabLink.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Получаем ID вкладки
      const tabId = tabLink.getAttribute('data-tab');
      
      // Деактивируем все вкладки
      document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('active');
      });
      
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      
      // Активируем выбранную вкладку
      tabLink.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Загружаем данные для выбранной вкладки
      loadTabData(tabId);
    });
  });
}

/**
 * Загрузка данных для выбранной вкладки
 * @param {string} tabId - ID вкладки
 */
async function loadTabData(tabId) {
  try {
    switch (tabId) {
      case 'devices':
        await loadDevicesTab();
        break;
      case 'schedule':
        await loadScheduleTab();
        break;
      case 'archive':
        await loadArchiveTab();
        break;
      case 'users':
        await loadUsersTab();
        break;
      case 'system':
        await loadSystemTab();
        break;
    }
  } catch (error) {
    console.error(`Ошибка загрузки данных для вкладки ${tabId}:`, error);
    showNotification(`Ошибка загрузки данных для вкладки ${tabId}`, 'error');
    
    // Отображаем сообщение об ошибке
    document.getElementById(`${tabId}-tab`).innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Ошибка загрузки данных</h3>
        </div>
        <p>Не удалось загрузить данные. Пожалуйста, попробуйте позже.</p>
        <button class="btn btn-primary retry-button" data-tab="${tabId}">Повторить</button>
      </div>
    `;
    
    // Добавляем обработчик для кнопки повтора
    document.querySelector(`.retry-button[data-tab="${tabId}"]`).addEventListener('click', () => {
      loadTabData(tabId);
    });
  }
}

/**
 * Настройка обработчиков событий для форм и кнопок
 */
function setupEventHandlers() {
  // Обработчики будут добавлены при загрузке соответствующих вкладок
}
