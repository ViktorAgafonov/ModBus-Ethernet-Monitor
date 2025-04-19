/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль аутентификации
 */

import { apiClient } from '../api/api-client.js';
import { showNotification } from '../utils/notifications.js';

// Ключи для хранения данных в localStorage
const TOKEN_KEY = 'modbus_auth_token';
const USER_KEY = 'modbus_user';

/**
 * Инициализация модуля аутентификации
 */
export function initAuth() {
  // Если пользователь не на странице входа и не авторизован, перенаправляем на страницу входа
  if (window.location.hash !== '#login' && !isAuthenticated()) {
    window.location.hash = '#login';
    return;
  }
  
  // Если пользователь на странице входа, отображаем форму входа
  if (window.location.hash === '#login') {
    renderLoginForm();
  }
}

/**
 * Проверка авторизации пользователя
 * @returns {boolean} - Авторизован ли пользователь
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Получение токена авторизации
 * @returns {string|null} - Токен авторизации
 */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Получение данных текущего пользователя
 * @returns {Object|null} - Данные пользователя
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Вход в систему
 * @param {string} username - Имя пользователя
 * @param {string} password - Пароль
 * @returns {Promise<boolean>} - Результат входа
 */
export async function login(username, password) {
  try {
    const response = await apiClient.post('/api/auth/login', { username, password });
    
    if (response.token) {
      // Сохраняем токен и данные пользователя
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      showNotification('Вход выполнен успешно', 'success');
      return true;
    }
    
    return false;
  } catch (error) {
    showNotification(error.message || 'Ошибка входа в систему', 'error');
    return false;
  }
}

/**
 * Регистрация нового пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<boolean>} - Результат регистрации
 */
export async function register(userData) {
  try {
    await apiClient.post('/api/auth/register', userData);
    showNotification('Регистрация выполнена успешно. Ожидайте подтверждения администратора.', 'success');
    return true;
  } catch (error) {
    showNotification(error.message || 'Ошибка регистрации', 'error');
    return false;
  }
}

/**
 * Выход из системы
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Отображение формы входа
 */
function renderLoginForm() {
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error('Контейнер для контента не найден');
    return;
  }
  
  contentContainer.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h2>ModBusEtherMon</h2>
          <p>Вход в систему</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label for="username">Имя пользователя</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-primary" style="width: 100%;">Войти</button>
          </div>
        </form>
        <div style="text-align: center; margin-top: 20px;">
          <a href="#" id="register-link">Зарегистрироваться</a>
        </div>
      </div>
    </div>
  `;
  
  // Обработчик отправки формы входа
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const success = await login(username, password);
    if (success) {
      window.location.hash = '#dashboard';
    }
  });
  
  // Обработчик клика по ссылке регистрации
  document.getElementById('register-link').addEventListener('click', (e) => {
    e.preventDefault();
    renderRegisterForm();
  });
}

/**
 * Отображение формы регистрации
 */
function renderRegisterForm() {
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error('Контейнер для контента не найден');
    return;
  }
  
  contentContainer.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h2>ModBusEtherMon</h2>
          <p>Регистрация нового пользователя</p>
        </div>
        <form id="register-form">
          <div class="form-group">
            <label for="username">Имя пользователя</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Подтверждение пароля</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-primary" style="width: 100%;">Зарегистрироваться</button>
          </div>
        </form>
        <div style="text-align: center; margin-top: 20px;">
          <a href="#" id="login-link">Вернуться к входу</a>
        </div>
      </div>
    </div>
  `;
  
  // Обработчик отправки формы регистрации
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value;
    
    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      showNotification('Пароли не совпадают', 'error');
      return;
    }
    
    const success = await register({ username, password, email });
    if (success) {
      renderLoginForm();
    }
  });
  
  // Обработчик клика по ссылке входа
  document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    renderLoginForm();
  });
}
