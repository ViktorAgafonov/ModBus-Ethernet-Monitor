/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с пользовательским интерфейсом
 */

// Класс для работы с UI
class UIService {
  constructor() {
    // Инициализация переменных
    this.sidebar = document.querySelector('.sidebar');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.navLinks = document.querySelectorAll('.sidebar-nav a');
    this.pages = document.querySelectorAll('.page');
    this.currentPageTitle = document.getElementById('current-page-title');
    this.connectionIndicator = document.getElementById('connection-indicator');
    this.connectionText = document.getElementById('connection-text');
    this.currentTimeDisplay = document.getElementById('current-time');
    this.loginBtn = document.getElementById('login-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.usernameDisplay = document.getElementById('username');
    this.modalContainer = document.getElementById('modal-container');
    this.modalTitle = document.getElementById('modal-title');
    this.modalContent = document.getElementById('modal-content');
    this.modalClose = document.getElementById('modal-close');
    this.notificationsContainer = document.getElementById('notifications-container');
    
    // Интервал обновления времени
    this.timeInterval = null;
    
    // Интервал проверки соединения
    this.connectionInterval = null;
    
    // Инициализация обработчиков событий
    this.initEventListeners();
    
    // Запуск обновления времени
    this.startTimeUpdate();
    
    // Запуск проверки соединения
    this.startConnectionCheck();
    
    // Обновление UI в зависимости от статуса авторизации
    this.updateAuthUI();
  }

  /**
   * Инициализация обработчиков событий
   */
  initEventListeners() {
    // Переключение бокового меню
    this.sidebarToggle.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', this.sidebar.classList.contains('collapsed'));
    });
    
    // Переключение страниц
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageName = link.getAttribute('data-page');
        this.showPage(pageName);
      });
    });
    
    // Обработка кнопки журнала
    const logBtn = document.getElementById('log-btn');
    if (logBtn) {
      logBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('log');
      });
    }
    
    // Закрытие модального окна
    this.modalClose.addEventListener('click', () => {
      this.closeModal();
    });
    
    // Закрытие модального окна при клике вне его содержимого
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.closeModal();
      }
    });
    
    // Обработка события изменения статуса авторизации
    document.addEventListener('authChange', () => {
      this.updateAuthUI();
    });
    
    // Обработка кнопки выхода
    this.logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
      this.updateAuthUI();
      this.showNotification('Вы вышли из системы', 'info');
      
      // Добавляем запись в журнал событий
      if (typeof log !== 'undefined' && log.logEvent) {
        log.logEvent('Авторизация', 'Выход из системы');
      }
    });
    
    // Обработка кнопки входа
    this.loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginModal();
    });
  }

  /**
   * Показ указанной страницы
   * @param {string} pageName - Имя страницы
   */
  showPage(pageName) {
    // Скрываем все страницы
    this.pages.forEach(page => {
      page.classList.remove('active');
    });
    
    // Убираем активный класс у всех ссылок
    this.navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // Показываем выбранную страницу
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
      selectedPage.classList.add('active');
      
      // Обновляем заголовок страницы
      const pageTitle = this.getPageTitle(pageName);
      this.currentPageTitle.textContent = pageTitle;
      
      // Активируем соответствующую ссылку
      const activeLink = document.querySelector(`.sidebar-nav a[data-page="${pageName}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
      
      // Сохраняем выбранную страницу в localStorage
      localStorage.setItem('currentPage', pageName);
      
      // Вызываем соответствующую функцию инициализации страницы
      this.initPageContent(pageName);
    }
  }

  /**
   * Инициализация содержимого страницы
   * @param {string} pageName - Имя страницы
   */
  initPageContent(pageName) {
    // Генерируем событие смены страницы
    const pageChangeEvent = new CustomEvent('pageChange', { detail: { page: pageName } });
    document.dispatchEvent(pageChangeEvent);
    
    // Инициализация содержимого страницы в зависимости от её типа
    if (pageName === 'log' && typeof log !== 'undefined') {
      log.showLog();
    } else if (pageName === 'devices' && typeof devices !== 'undefined') {
      devices.loadDevices();
    } else if (pageName === 'dashboard' && typeof dashboard !== 'undefined') {
      dashboard.loadDashboardData();
    } else if (pageName === 'archives' && typeof archives !== 'undefined') {
      archives.loadArchives();
    } else if (pageName === 'reports' && typeof reports !== 'undefined') {
      reports.loadReports();
    } else if (pageName === 'settings' && typeof settings !== 'undefined') {
      settings.loadSettings();
    }
  }

  /**
   * Запуск обновления времени
   */
  startTimeUpdate() {
    // Обновляем время сразу
    this.updateTime();
    
    // Запускаем интервал обновления времени
    this.timeInterval = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  /**
   * Обновление отображения времени
   */
  updateTime() {
    const now = new Date();
    this.currentTimeDisplay.textContent = now.toLocaleTimeString();
  }

  /**
   * Запуск проверки соединения с сервером
   */
  startConnectionCheck() {
    // Проверяем соединение сразу
    this.checkConnection();
    
    // Запускаем интервал проверки соединения
    this.connectionInterval = setInterval(() => {
      this.checkConnection();
    }, 10000); // Проверка каждые 10 секунд
  }

  /**
   * Проверка соединения с сервером
   */
  async checkConnection() {
    try {
      const response = await fetch('/api/status', { method: 'GET' });
      
      if (response.ok) {
        this.connectionIndicator.classList.remove('status-offline');
        this.connectionIndicator.classList.add('status-online');
        this.connectionText.textContent = 'Соединение установлено';
      } else {
        this.connectionIndicator.classList.remove('status-online');
        this.connectionIndicator.classList.add('status-offline');
        this.connectionText.textContent = 'Соединение потеряно';
      }
    } catch (error) {
      this.connectionIndicator.classList.remove('status-online');
      this.connectionIndicator.classList.add('status-offline');
      this.connectionText.textContent = 'Соединение потеряно';
    }
  }

  /**
   * Обновление UI в зависимости от статуса авторизации
   */
  updateAuthUI() {
    const isAuthenticated = auth.isAuthenticated();
    
    // Обновляем отображение кнопок входа/выхода
    if (isAuthenticated) {
      this.loginBtn.style.display = 'none';
      this.logoutBtn.style.display = 'block';
      
      // Отображаем имя пользователя
      const user = auth.getCurrentUser();
      if (user && this.usernameDisplay) {
        this.usernameDisplay.textContent = user.username;
        this.usernameDisplay.style.display = 'block';
      }
      
      // Показываем элементы, доступные только авторизованным пользователям
      document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = 'block';
      });
      
      // Показываем элементы, доступные только администраторам
      if (auth.isAdmin()) {
        document.querySelectorAll('.admin-required').forEach(el => {
          el.style.display = 'block';
        });
      } else {
        document.querySelectorAll('.admin-required').forEach(el => {
          el.style.display = 'none';
        });
      }
    } else {
      this.loginBtn.style.display = 'block';
      this.logoutBtn.style.display = 'none';
      
      // Скрываем имя пользователя
      if (this.usernameDisplay) {
        this.usernameDisplay.style.display = 'none';
      }
      
      // Скрываем элементы, доступные только авторизованным пользователям
      document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = 'none';
      });
      
      // Скрываем элементы, доступные только администраторам
      document.querySelectorAll('.admin-required').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  /**
   * Отображение модального окна
   * @param {string} title - Заголовок модального окна
   * @param {string} content - Содержимое модального окна
   */
  showModal(title, content) {
    this.modalTitle.textContent = title;
    this.modalContent.innerHTML = content;
    this.modalContainer.classList.remove('hidden');
  }

  /**
   * Закрытие модального окна
   */
  closeModal() {
    this.modalContainer.classList.add('hidden');
  }

  /**
   * Показ модального окна для входа
   */
  showLoginModal() {
    const loginFormContent = `
      <form id="login-form">
        <div class="form-group">
          <label for="login-username">Имя пользователя:</label>
          <input type="text" id="login-username" required>
        </div>
        <div class="form-group">
          <label for="login-password">Пароль:</label>
          <input type="password" id="login-password" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Войти</button>
          <button type="button" class="btn btn-secondary" id="register-btn">Регистрация</button>
        </div>
      </form>
    `;
    
    this.showModal('Вход в систему', loginFormContent);
    
    // Обработчик формы входа
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const result = await auth.login(username, password);
        
        if (result.success) {
          this.closeModal();
          this.updateAuthUI();
          this.showNotification('Вы успешно вошли в систему', 'success');
          
          // Добавляем запись в журнал событий
          if (typeof log !== 'undefined' && log.logEvent) {
            log.logEvent('Авторизация', 'Вход в систему', { username });
          }
        } else {
          this.showNotification(result.error || 'Ошибка входа', 'error');
        }
      } catch (error) {
        console.error('Ошибка входа:', error);
        this.showNotification('Ошибка входа: ' + error.message, 'error');
      }
    });
    
    // Обработчик кнопки регистрации
    document.getElementById('register-btn').addEventListener('click', () => {
      this.showRegisterModal();
    });
  }

  /**
   * Показ модального окна для регистрации
   */
  showRegisterModal() {
    const registerFormContent = `
      <form id="register-form">
        <div class="form-group">
          <label for="register-username">Имя пользователя:</label>
          <input type="text" id="register-username" required>
        </div>
        <div class="form-group">
          <label for="register-email">Email:</label>
          <input type="email" id="register-email" required>
        </div>
        <div class="form-group">
          <label for="register-password">Пароль:</label>
          <input type="password" id="register-password" required>
        </div>
        <div class="form-group">
          <label for="register-confirm-password">Подтверждение пароля:</label>
          <input type="password" id="register-confirm-password" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
          <button type="button" class="btn btn-secondary" id="back-to-login-btn">Назад к входу</button>
        </div>
      </form>
    `;
    
    this.showModal('Регистрация', registerFormContent);
    
    // Обработчик формы регистрации
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      
      // Проверка совпадения паролей
      if (password !== confirmPassword) {
        this.showNotification('Пароли не совпадают', 'error');
        return;
      }
      
      try {
        const result = await auth.register(username, email, password);
        
        if (result.success) {
          this.closeModal();
          this.showNotification('Регистрация успешна. Теперь вы можете войти.', 'success');
          
          // Показываем форму входа
          setTimeout(() => {
            this.showLoginModal();
          }, 1000);
          
          // Добавляем запись в журнал событий
          if (typeof log !== 'undefined' && log.logEvent) {
            log.logEvent('Регистрация', 'Регистрация нового пользователя', { username, email });
          }
        } else {
          this.showNotification(result.error || 'Ошибка регистрации', 'error');
        }
      } catch (error) {
        console.error('Ошибка регистрации:', error);
        this.showNotification('Ошибка регистрации: ' + error.message, 'error');
      }
    });
    
    // Обработчик кнопки возврата к форме входа
    document.getElementById('back-to-login-btn').addEventListener('click', () => {
      this.showLoginModal();
    });
  }

  /**
   * Показ модального окна управления пользователями (для администраторов)
   */
  showUsersManagementModal() {
    // Проверяем, является ли текущий пользователь администратором
    if (!auth.isAdmin()) {
      this.showNotification('У вас нет прав для управления пользователями', 'error');
      return;
    }
    
    // Загружаем содержимое для управления пользователями
    this.loadUsersManagementContent();
  }

  /**
   * Загрузка содержимого для управления пользователями
   */
  async loadUsersManagementContent() {
    try {
      // Показываем модальное окно с индикатором загрузки
      this.showModal('Управление пользователями', '<div class="loading">Загрузка пользователей...</div>');
      
      // Получаем список пользователей
      const users = await auth.getUsers();
      
      // Формируем HTML для таблицы пользователей
      let usersTableHtml = `
        <div class="users-management-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Имя пользователя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Добавляем строки для каждого пользователя
      users.forEach(user => {
        usersTableHtml += `
          <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
            <td>${user.active ? '<span class="status-badge status-active">Активен</span>' : '<span class="status-badge status-inactive">Неактивен</span>'}</td>
            <td>
              <button class="btn btn-sm btn-secondary edit-user-btn" data-user-id="${user.id}">
                <i class="fas fa-edit"></i> Редактировать
              </button>
              <button class="btn btn-sm btn-danger delete-user-btn" data-user-id="${user.id}">
                <i class="fas fa-trash"></i> Удалить
              </button>
            </td>
          </tr>
        `;
      });
      
      usersTableHtml += `
            </tbody>
          </table>
          <div class="form-actions mt-md">
            <button id="add-new-user-btn" class="btn btn-primary">
              <i class="fas fa-user-plus"></i> Добавить пользователя
            </button>
            <button id="close-users-management-btn" class="btn btn-secondary">
              <i class="fas fa-times"></i> Закрыть
            </button>
          </div>
        </div>
      `;
      
      // Обновляем содержимое модального окна
      this.modalContent.innerHTML = usersTableHtml;
      
      // Инициализируем обработчики событий
      this.initUsersManagementEvents();
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      this.modalContent.innerHTML = `
        <div class="error-message">
          <p>Ошибка загрузки пользователей: ${error.message}</p>
          <button id="close-users-management-btn" class="btn btn-secondary">
            <i class="fas fa-times"></i> Закрыть
          </button>
        </div>
      `;
      
      document.getElementById('close-users-management-btn').addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  /**
   * Инициализация обработчиков событий для управления пользователями
   */
  initUsersManagementEvents() {
    // Обработчик кнопки закрытия
    document.getElementById('close-users-management-btn').addEventListener('click', () => {
      this.closeModal();
    });
    
    // Обработчик кнопки добавления пользователя
    document.getElementById('add-new-user-btn').addEventListener('click', () => {
      // Показываем форму добавления пользователя
      const addUserFormHtml = `
        <form id="add-user-form">
          <div class="form-group">
            <label for="new-username">Имя пользователя:</label>
            <input type="text" id="new-username" required>
          </div>
          <div class="form-group">
            <label for="new-email">Email:</label>
            <input type="email" id="new-email" required>
          </div>
          <div class="form-group">
            <label for="new-password">Пароль:</label>
            <input type="password" id="new-password" required>
          </div>
          <div class="form-group">
            <label for="new-role">Роль:</label>
            <select id="new-role">
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Добавить</button>
            <button type="button" class="btn btn-secondary" id="cancel-add-user">Отмена</button>
          </div>
        </form>
      `;
      
      this.showModal('Добавление пользователя', addUserFormHtml);
      
      // Обработчик формы добавления пользователя
      document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('new-username').value;
        const email = document.getElementById('new-email').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;
        
        try {
          const result = await auth.addUser(username, email, password, role);
          
          if (result.success) {
            this.showNotification('Пользователь успешно добавлен', 'success');
            this.loadUsersManagementContent(); // Перезагружаем список пользователей
          } else {
            this.showNotification(result.error || 'Ошибка добавления пользователя', 'error');
          }
        } catch (error) {
          console.error('Ошибка добавления пользователя:', error);
          this.showNotification('Ошибка добавления пользователя: ' + error.message, 'error');
        }
      });
      
      // Обработчик кнопки отмены
      document.getElementById('cancel-add-user').addEventListener('click', () => {
        this.loadUsersManagementContent(); // Возвращаемся к списку пользователей
      });
    });
    
    // Обработчики для кнопок редактирования пользователей
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        this.showEditUserModal(userId);
      });
    });
    
    // Обработчики для кнопок удаления пользователей
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        this.showDeleteUserConfirmation(userId);
      });
    });
  }

  /**
   * Показ уведомления
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления (success, error, warning, info)
   * @param {number} duration - Длительность показа в миллисекундах
   */
  showNotification(message, type = 'info', duration = 3000) {
    const id = 'notification-' + Date.now();
    const icon = this.getNotificationIcon(type);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = id;
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    this.notificationsContainer.appendChild(notification);
    
    // Добавляем обработчик для закрытия уведомления
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // Автоматически скрываем уведомление через указанное время
    setTimeout(() => {
      if (document.getElementById(id)) {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
          if (document.getElementById(id)) {
            notification.remove();
          }
        }, 300);
      }
    }, duration);
  }

  /**
   * Получение иконки для уведомления в зависимости от типа
   * @param {string} type - Тип уведомления
   * @returns {string} - Класс иконки
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  }

  /**
   * Получение заголовка страницы по её имени
   * @param {string} pageName - Имя страницы
   * @returns {string} - Заголовок страницы
   */
  getPageTitle(pageName) {
    const titles = {
      'dashboard': 'Панель мониторинга',
      'devices': 'Устройства',
      'archives': 'Архивы',
      'reports': 'Отчеты',
      'settings': 'Настройки',
      'users': 'Управление пользователями',
      'log': 'Журнал'
    };
    
    return titles[pageName] || 'Неизвестная страница';
  }
}

// Создаем экземпляр сервиса UI и делаем его глобально доступным
const ui = new UIService();
