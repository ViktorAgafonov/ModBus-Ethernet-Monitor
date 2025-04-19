/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль авторизации
 * Отвечает за авторизацию пользователей и управление сессиями
 */

class AuthService {
  constructor() {
    // Инициализация данных пользователя
    this.token = localStorage.getItem('authToken') || null;
    this.user = JSON.parse(localStorage.getItem('user')) || null;
    
    // Событие изменения статуса авторизации
    this.authChangeEvent = new Event('authChange');
    
    // Если есть токен, устанавливаем его для API
    if (this.token) {
      api.setToken(this.token);
    }
  }

  /**
   * Вход в систему
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} - Результат авторизации
   */
  async login(username, password) {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      
      if (response.token) {
        // Сохраняем токен и данные пользователя
        this.token = response.token;
        this.user = response.user;
        
        // Сохраняем в локальное хранилище
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Устанавливаем токен для API
        api.setToken(this.token);
        
        // Уведомляем об изменении статуса авторизации
        document.dispatchEvent(this.authChangeEvent);
        
        return { success: true, user: this.user };
      }
      
      throw new Error(response.error || 'Ошибка авторизации');
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      
      // Проверяем, ожидает ли пользователь подтверждения
      if (error.response && error.response.pendingApproval) {
        return { 
          success: false, 
          error: 'Ваша учетная запись ожидает подтверждения администратором',
          pendingApproval: true 
        };
      }
      
      return { success: false, error: error.message || 'Ошибка авторизации' };
    }
  }

  /**
   * Регистрация нового пользователя
   * @param {Object} userData - Данные пользователя
   * @returns {Promise<Object>} - Результат регистрации
   */
  async register(userData) {
    try {
      const response = await api.post('/api/auth/register', userData);
      return { 
        success: true, 
        message: response.message || 'Регистрация выполнена успешно. Ваша учетная запись ожидает подтверждения администратором.', 
        pendingApproval: true 
      };
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      return { success: false, error: error.message || 'Ошибка регистрации' };
    }
  }

  /**
   * Выход из системы
   */
  logout() {
    // Удаляем токен и данные пользователя
    this.token = null;
    this.user = null;
    
    // Удаляем из локального хранилища
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Сбрасываем токен для API
    api.setToken(null);
    
    // Уведомляем об изменении статуса авторизации
    document.dispatchEvent(this.authChangeEvent);
  }

  /**
   * Проверка авторизации
   * @returns {boolean} - Авторизован ли пользователь
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Проверка, является ли пользователь администратором
   * @returns {boolean} - Является ли пользователь администратором
   */
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  /**
   * Получение текущего пользователя
   * @returns {Object|null} - Данные пользователя или null
   */
  getCurrentUser() {
    return this.user;
  }
  
  /**
   * Получение информации о пользователе
   * @returns {Object} - Информация о пользователе
   */
  getUserInfo() {
    return this.user || {};
  }
  
  /**
   * Получение роли пользователя
   * @returns {string} - Роль пользователя (admin, user или guest)
   */
  getUserRole() {
    if (!this.isAuthenticated()) {
      return 'guest';
    }
    return this.user && this.user.role === 'admin' ? 'admin' : 'user';
  }

  /**
   * Получение токена авторизации
   * @returns {string|null} - Токен или null
   */
  getToken() {
    return this.token;
  }
  
  /**
   * Получение списка пользователей, ожидающих подтверждения
   * @returns {Promise<Object>} - Список пользователей
   */
  async getPendingUsers() {
    try {
      if (!this.isAuthenticated() || !this.isAdmin()) {
        throw new Error('Недостаточно прав для выполнения операции');
      }
      
      const response = await api.get('/api/auth/pending');
      return { success: true, users: response.users || [] };
    } catch (error) {
      console.error('Ошибка получения списка ожидающих подтверждения:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Подтверждение регистрации пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат операции
   */
  async approveUser(userId) {
    try {
      if (!this.isAuthenticated() || !this.isAdmin()) {
        throw new Error('Недостаточно прав для выполнения операции');
      }
      
      const response = await api.post(`/api/auth/approve/${userId}`);
      return { success: true, message: response.message || 'Пользователь подтвержден' };
    } catch (error) {
      console.error('Ошибка подтверждения пользователя:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Отклонение регистрации пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат операции
   */
  async rejectUser(userId) {
    try {
      if (!this.isAuthenticated() || !this.isAdmin()) {
        throw new Error('Недостаточно прав для выполнения операции');
      }
      
      const response = await api.post(`/api/auth/reject/${userId}`);
      return { success: true, message: response.message || 'Регистрация отклонена' };
    } catch (error) {
      console.error('Ошибка отклонения пользователя:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Получение списка всех пользователей
   * @returns {Promise<Object>} - Список пользователей
   */
  async getAllUsers() {
    try {
      if (!this.isAuthenticated() || !this.isAdmin()) {
        throw new Error('Недостаточно прав для выполнения операции');
      }
      
      const response = await api.get('/api/auth/users');
      return { success: true, users: response.users || [] };
    } catch (error) {
      console.error('Ошибка получения списка пользователей:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Загрузка информации о текущем пользователе
   * @returns {Promise<Object>} - Результат операции
   */
  async loadUserInfo() {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Пользователь не авторизован' };
      }
      
      const response = await api.get('/api/auth/me');
      
      if (response && response.id) {
        // Обновляем данные пользователя
        this.user = response;
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Уведомляем об изменении статуса авторизации
        document.dispatchEvent(this.authChangeEvent);
        
        return { success: true, user: this.user };
      }
      
      throw new Error('Не удалось загрузить информацию о пользователе');
    } catch (error) {
      console.error('Ошибка загрузки информации о пользователе:', error);
      
      // Если получили 401, значит токен недействителен
      if (error.message && error.message.includes('401')) {
        this.logout(); // Выходим из системы
        return { success: false, error: 'Сессия истекла, необходимо войти заново' };
      }
      
      return { success: false, error: error.message || 'Ошибка загрузки информации о пользователе' };
    }
  }
}

// Создаем экземпляр сервиса авторизации
const auth = new AuthService();
