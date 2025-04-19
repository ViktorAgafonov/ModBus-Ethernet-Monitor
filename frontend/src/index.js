/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Основной файл клиентской части
 */

// Импорт стилей
import './styles/main.css';

// Импорт компонентов
import { initNavigation } from './components/navigation.js';
import { initDashboard } from './pages/dashboard.js';
import { initDevicesList } from './pages/devices.js';
import { initArchives } from './pages/archives.js';
import { initSettings } from './pages/settings.js';
import { initAuth } from './auth/auth.js';
import { showNotification } from './utils/notifications.js';

// API клиент
import { apiClient } from './api/api-client.js';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Проверка состояния авторизации
  initAuth();
  
  // Инициализация навигации
  initNavigation();
  
  // Проверка доступности API
  checkApiHealth();
  
  // Маршрутизация на основе хэша в URL
  handleRouting();
  
  // Обработка изменения хэша (маршрута)
  window.addEventListener('hashchange', handleRouting);
});

/**
 * Проверка работоспособности API
 */
async function checkApiHealth() {
  try {
    const response = await apiClient.get('/api/health');
    console.log('API статус:', response.status);
  } catch (error) {
    showNotification('Ошибка соединения с сервером', 'error');
    console.error('Ошибка соединения с API:', error);
  }
}

/**
 * Обработка маршрутизации на основе хэша в URL
 */
function handleRouting() {
  const hash = window.location.hash || '#dashboard';
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error('Контейнер для контента не найден');
    return;
  }
  
  // Очистка активных классов в навигации
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Активация соответствующего пункта меню
  const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Загрузка соответствующего контента
  switch (hash) {
    case '#dashboard':
      initDashboard(contentContainer);
      break;
    case '#devices':
      initDevicesList(contentContainer);
      break;
    case '#archives':
      initArchives(contentContainer);
      break;
    case '#settings':
      initSettings(contentContainer);
      break;
    case '#login':
      // Страница входа обрабатывается отдельно в auth.js
      break;
    default:
      contentContainer.innerHTML = '<div class="error-container"><h2>Страница не найдена</h2><p>Запрашиваемая страница не существует.</p></div>';
  }
}
