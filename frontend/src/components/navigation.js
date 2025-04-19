/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Компонент навигации
 */

import { isAuthenticated, logout } from '../auth/auth.js';
import { showNotification } from '../utils/notifications.js';

/**
 * Инициализация компонента навигации
 */
export function initNavigation() {
  const appContainer = document.getElementById('app');
  
  if (!appContainer) {
    console.error('Контейнер приложения не найден');
    return;
  }
  
  // Если пользователь не авторизован и не на странице входа, перенаправляем на страницу входа
  if (!isAuthenticated() && window.location.hash !== '#login') {
    window.location.hash = '#login';
    return;
  }
  
  // Если пользователь авторизован и на странице входа, перенаправляем на дашборд
  if (isAuthenticated() && window.location.hash === '#login') {
    window.location.hash = '#dashboard';
    return;
  }
  
  // Если пользователь не авторизован, отображаем только страницу входа
  if (!isAuthenticated()) {
    appContainer.innerHTML = '<div id="content"></div>';
    return;
  }
  
  // Создаем структуру приложения для авторизованного пользователя
  appContainer.innerHTML = `
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h1>ModBusEtherMon</h1>
          <p>Монитор ModBus по Ethernet</p>
        </div>
        <nav>
          <ul class="nav-list">
            <li class="nav-item">
              <a href="#dashboard" class="nav-link" id="nav-dashboard">
                <i class="fas fa-tachometer-alt"></i>
                <span>Дашборд</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="#devices" class="nav-link" id="nav-devices">
                <i class="fas fa-server"></i>
                <span>Устройства</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="#archives" class="nav-link" id="nav-archives">
                <i class="fas fa-archive"></i>
                <span>Архивы</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="#settings" class="nav-link" id="nav-settings">
                <i class="fas fa-cog"></i>
                <span>Настройки</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link" id="nav-logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Выход</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      <main class="main-content">
        <div id="content"></div>
      </main>
    </div>
  `;
  
  // Добавляем обработчик для кнопки выхода
  document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
    showNotification('Вы успешно вышли из системы', 'info');
    window.location.hash = '#login';
  });
  
  // Активируем текущий пункт меню
  const currentHash = window.location.hash || '#dashboard';
  const activeLink = document.querySelector(`.nav-link[href="${currentHash}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}
