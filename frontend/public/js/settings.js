/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с настройками
 */

// Класс для работы с настройками
class SettingsService {
  constructor() {
    // Элементы страницы настроек
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // Формы настроек
    this.generalSettingsForm = document.getElementById('general-settings-form');
    this.pollingSettingsForm = document.getElementById('polling-settings-form');
    this.archivingSettingsForm = document.getElementById('archiving-settings-form');
    
    // Элементы форм
    this.serverAddress = document.getElementById('server-address');
    this.refreshInterval = document.getElementById('refresh-interval');
    this.themeSelect = document.getElementById('theme-select');
    
    this.defaultInterval = document.getElementById('default-interval');
    this.pollingEnabled = document.getElementById('polling-enabled');
    this.pollingStartTime = document.getElementById('polling-start-time');
    this.pollingEndTime = document.getElementById('polling-end-time');
    
    this.dailyArchiveEnabled = document.getElementById('daily-archive-enabled');
    this.dailyArchiveTime = document.getElementById('daily-archive-time');
    this.monthlyZipEnabled = document.getElementById('monthly-zip-enabled');
    this.monthlyZipDay = document.getElementById('monthly-zip-day');
    this.retentionDaily = document.getElementById('retention-daily');
    this.retentionMonthly = document.getElementById('retention-monthly');
    
    // Таблица пользователей
    this.usersTable = document.getElementById('users-table');
    this.addUserBtn = document.getElementById('add-user-btn');
    
    // Инициализация
    this.init();
  }

  /**
   * Инициализация модуля настроек
   */
  init() {
    // Подписка на событие смены страницы
    document.addEventListener('pageChange', (e) => {
      if (e.detail.page === 'settings') {
        this.loadSettings();
      }
    });
    
    // Если текущая страница - настройки, загружаем данные
    if (document.querySelector('.page.active').id === 'settings-page') {
      this.loadSettings();
    }
    
    // Обработчики вкладок
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.showTab(button.getAttribute('data-tab'));
      });
    });
    
    // Обработчики форм
    this.generalSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGeneralSettings();
    });
    
    this.pollingSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePollingSettings();
    });
    
    this.archivingSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveArchivingSettings();
    });
    
    // Обработчик кнопки добавления пользователя
    if (this.addUserBtn) {
      this.addUserBtn.addEventListener('click', () => {
        this.showAddUserForm();
      });
    }
    
    // Заполняем выпадающий список дней месяца
    this.populateMonthDays();
  }

  /**
   * Загрузка настроек
   */
  async loadSettings() {
    try {
      // Загружаем общие настройки
      this.loadGeneralSettings();
      
      // Загружаем настройки опроса
      await this.loadPollingSettings();
      
      // Загружаем настройки архивации
      await this.loadArchivingSettings();
      
      // Загружаем список пользователей (если есть права)
      if (auth.isAuthenticated() && auth.isAdmin()) {
        await this.loadUsers();
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      
      // Записываем в журнал с детальной информацией
      if (typeof logError === 'function') {
        // Создаем объект с деталями ошибки
        const errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        };
        
        logError('Консоль', 'Ошибка загрузки настроек:', errorDetails);
      }
      
      ui.showNotification('Ошибка загрузки настроек', 'error');
    }
  }

  /**
   * Показ вкладки
   * @param {string} tabName - Имя вкладки
   */
  showTab(tabName) {
    // Удаляем активный класс у всех кнопок и содержимого вкладок
    this.tabButtons.forEach(button => {
      button.classList.remove('active');
    });
    
    this.tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Добавляем активный класс нужной кнопке и содержимому
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  /**
   * Загрузка общих настроек
   */
  loadGeneralSettings() {
    // Загружаем настройки из localStorage
    const serverAddress = localStorage.getItem('serverAddress') || 'http://localhost:3000';
    const refreshInterval = localStorage.getItem('refreshInterval') || '5000';
    const theme = localStorage.getItem('theme') || 'light';
    
    // Устанавливаем значения в форму
    this.serverAddress.value = serverAddress;
    this.refreshInterval.value = refreshInterval;
    this.themeSelect.value = theme;
  }

  /**
   * Сохранение общих настроек
   */
  saveGeneralSettings() {
    try {
      // Получаем значения из формы
      const serverAddress = this.serverAddress.value;
      const refreshInterval = this.refreshInterval.value;
      const theme = this.themeSelect.value;
      
      // Сохраняем настройки в localStorage
      localStorage.setItem('serverAddress', serverAddress);
      localStorage.setItem('refreshInterval', refreshInterval);
      localStorage.setItem('theme', theme);
      
      // Обновляем настройки API
      api.setBaseUrl(serverAddress);
      
      // Обновляем тему
      const themeEvent = new CustomEvent('themeChange', { detail: { theme } });
      document.dispatchEvent(themeEvent);
      
      // Показываем уведомление
      ui.showNotification('Общие настройки сохранены', 'success');
    } catch (error) {
      console.error('Ошибка сохранения общих настроек:', error);
      ui.showNotification('Ошибка сохранения общих настроек', 'error');
    }
  }

  /**
   * Загрузка настроек опроса
   */
  async loadPollingSettings() {
    try {
      // Получаем настройки опроса с сервера
      const pollingSettings = await api.getPollingSettings();
      
      // Устанавливаем значения в форму
      this.defaultInterval.value = pollingSettings.default.interval;
      this.pollingEnabled.checked = pollingSettings.default.enabled;
      this.pollingStartTime.value = pollingSettings.default.startTime.slice(0, 5);
      this.pollingEndTime.value = pollingSettings.default.endTime.slice(0, 5);
    } catch (error) {
      console.error('Ошибка загрузки настроек опроса:', error);
      
      // Записываем в журнал с детальной информацией
      if (typeof logError === 'function') {
        // Создаем объект с деталями ошибки
        const errorDetails = {
          url: '/api/config/polling',
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        };
        
        logError('Консоль', 'Ошибка загрузки настроек опроса:', errorDetails);
      }
      
      // Устанавливаем значения по умолчанию
      this.defaultInterval.value = 5000;
      this.pollingEnabled.checked = true;
      this.pollingStartTime.value = '00:00';
      this.pollingEndTime.value = '23:59';
    }
  }

  /**
   * Сохранение настроек опроса
   */
  async savePollingSettings() {
    try {
      // Получаем значения из формы
      const settings = {
        default: {
          interval: parseInt(this.defaultInterval.value),
          enabled: this.pollingEnabled.checked,
          startTime: this.pollingStartTime.value + ':00',
          endTime: this.pollingEndTime.value + ':00'
        }
      };
      
      // Сохраняем настройки на сервере
      await api.updatePollingSettings(settings);
      
      // Показываем уведомление
      ui.showNotification('Настройки опроса сохранены', 'success');
    } catch (error) {
      console.error('Ошибка сохранения настроек опроса:', error);
      ui.showNotification('Ошибка сохранения настроек опроса', 'error');
    }
  }

  /**
   * Загрузка настроек архивации
   */
  async loadArchivingSettings() {
    try {
      // Получаем настройки архивации с сервера
      const archivingSettings = await api.getArchivingSettings();
      
      // Устанавливаем значения в форму
      this.dailyArchiveEnabled.checked = archivingSettings.dailyArchive.enabled;
      this.dailyArchiveTime.value = archivingSettings.dailyArchive.time.slice(0, 5);
      this.monthlyZipEnabled.checked = archivingSettings.monthlyZip.enabled;
      this.monthlyZipDay.value = archivingSettings.monthlyZip.day;
      this.retentionDaily.value = archivingSettings.retention.dailyFiles;
      this.retentionMonthly.value = archivingSettings.retention.monthlyZips;
    } catch (error) {
      console.error('Ошибка загрузки настроек архивации:', error);
      
      // Записываем в журнал с детальной информацией
      if (typeof logError === 'function') {
        // Создаем объект с деталями ошибки
        const errorDetails = {
          url: '/api/config/archiving',
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        };
        
        logError('Консоль', 'Ошибка загрузки настроек архивации:', errorDetails);
      }
      
      // Устанавливаем значения по умолчанию
      this.dailyArchiveEnabled.checked = true;
      this.dailyArchiveTime.value = '23:59';
      this.monthlyZipEnabled.checked = true;
      this.monthlyZipDay.value = 'last';
      this.retentionDaily.value = 31;
      this.retentionMonthly.value = 12;
    }
  }

  /**
   * Сохранение настроек архивации
   */
  async saveArchivingSettings() {
    try {
      // Получаем значения из формы
      const settings = {
        dailyArchive: {
          enabled: this.dailyArchiveEnabled.checked,
          time: this.dailyArchiveTime.value + ':00'
        },
        monthlyZip: {
          enabled: this.monthlyZipEnabled.checked,
          day: this.monthlyZipDay.value,
          time: '23:59:30' // Фиксированное время для месячного архива
        },
        retention: {
          dailyFiles: parseInt(this.retentionDaily.value),
          monthlyZips: parseInt(this.retentionMonthly.value)
        }
      };
      
      // Сохраняем настройки на сервере
      await api.updateArchivingSettings(settings);
      
      // Показываем уведомление
      ui.showNotification('Настройки архивации сохранены', 'success');
    } catch (error) {
      console.error('Ошибка сохранения настроек архивации:', error);
      ui.showNotification('Ошибка сохранения настроек архивации', 'error');
    }
  }

  /**
   * Заполнение выпадающего списка дней месяца
   */
  populateMonthDays() {
    // Если элемент не найден, выходим
    if (!this.monthlyZipDay) return;
    
    // Очищаем список
    this.monthlyZipDay.innerHTML = '<option value="last">Последний день месяца</option>';
    
    // Добавляем дни месяца
    for (let i = 1; i <= 28; i++) {
      const option = document.createElement('option');
      option.value = i.toString();
      option.textContent = i.toString();
      this.monthlyZipDay.appendChild(option);
    }
  }

  /**
   * Загрузка списка пользователей
   */
  async loadUsers() {
    try {
      // Проверяем, есть ли таблица пользователей
      if (!this.usersTable) return;
      
      // Показываем индикатор загрузки
      this.usersTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Загрузка пользователей...</td>
        </tr>
      `;
      
      // Получаем список пользователей
      const users = await auth.getUsers();
      
      // Обновляем таблицу
      this.updateUsersTable(users);
    } catch (error) {
      console.error('Ошибка загрузки списка пользователей:', error);
      
      // Показываем сообщение об ошибке
      if (this.usersTable) {
        this.usersTable.querySelector('tbody').innerHTML = `
          <tr>
            <td colspan="4" class="text-center">Ошибка загрузки пользователей: ${error.message}</td>
          </tr>
        `;
      }
    }
  }

  /**
   * Обновление таблицы пользователей
   * @param {Array} users - Список пользователей
   */
  updateUsersTable(users) {
    // Проверяем, есть ли таблица пользователей
    if (!this.usersTable) return;
    
    // Получаем tbody таблицы
    const tbody = this.usersTable.querySelector('tbody');
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    // Если нет пользователей, показываем сообщение
    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Нет доступных пользователей</td>
        </tr>
      `;
      return;
    }
    
    // Добавляем строки для каждого пользователя
    users.forEach(user => {
      const row = document.createElement('tr');
      
      // Форматируем дату последнего входа
      const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Никогда';
      
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${this.getRoleName(user.role)}</td>
        <td>${lastLogin}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary edit-user-btn" data-id="${user.id}" title="Редактировать">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}" title="Удалить">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      // Добавляем обработчики кнопок
      row.querySelector('.edit-user-btn').addEventListener('click', () => {
        this.showEditUserForm(user);
      });
      
      row.querySelector('.delete-user-btn').addEventListener('click', () => {
        this.deleteUser(user.id);
      });
      
      // Добавляем строку в таблицу
      tbody.appendChild(row);
    });
  }

  /**
   * Получение названия роли
   * @param {string} role - Роль пользователя
   * @returns {string} - Название роли
   */
  getRoleName(role) {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'operator':
        return 'Оператор';
      case 'viewer':
        return 'Наблюдатель';
      default:
        return role;
    }
  }

  /**
   * Показ формы добавления пользователя
   */
  showAddUserForm() {
    // Формируем содержимое модального окна
    const content = `
      <form id="add-user-form" class="user-form">
        <div class="form-group">
          <label for="username">Имя пользователя:</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Пароль:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div class="form-group">
          <label for="role">Роль:</label>
          <select id="role" name="role" required>
            <option value="viewer">Наблюдатель</option>
            <option value="operator">Оператор</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <div id="add-user-error" class="error-message hidden"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Добавить</button>
          <button type="button" class="btn btn-secondary" id="cancel-add-user">Отмена</button>
        </div>
      </form>
    `;
    
    // Показываем модальное окно
    ui.showModal('Добавление пользователя', content);
    
    // Добавляем обработчики
    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Получаем данные формы
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;
      
      try {
        // Создаем пользователя
        const result = await auth.createUser({ username, password, role });
        
        if (result.success) {
          // Закрываем модальное окно
          ui.closeModal();
          
          // Показываем уведомление
          ui.showNotification('Пользователь успешно добавлен', 'success');
          
          // Обновляем список пользователей
          await this.loadUsers();
        } else {
          // Показываем ошибку
          const errorElement = document.getElementById('add-user-error');
          errorElement.textContent = result.error || 'Ошибка добавления пользователя';
          errorElement.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Ошибка добавления пользователя:', error);
        
        // Показываем ошибку
        const errorElement = document.getElementById('add-user-error');
        errorElement.textContent = error.message || 'Ошибка добавления пользователя';
        errorElement.classList.remove('hidden');
      }
    });
    
    document.getElementById('cancel-add-user').addEventListener('click', () => {
      ui.closeModal();
    });
  }

  /**
   * Показ формы редактирования пользователя
   * @param {Object} user - Данные пользователя
   */
  showEditUserForm(user) {
    // Формируем содержимое модального окна
    const content = `
      <form id="edit-user-form" class="user-form">
        <div class="form-group">
          <label for="username">Имя пользователя:</label>
          <input type="text" id="username" name="username" value="${user.username}" readonly>
        </div>
        <div class="form-group">
          <label for="password">Новый пароль (оставьте пустым, чтобы не менять):</label>
          <input type="password" id="password" name="password">
        </div>
        <div class="form-group">
          <label for="role">Роль:</label>
          <select id="role" name="role" required>
            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Наблюдатель</option>
            <option value="operator" ${user.role === 'operator' ? 'selected' : ''}>Оператор</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
          </select>
        </div>
        <div id="edit-user-error" class="error-message hidden"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Сохранить</button>
          <button type="button" class="btn btn-secondary" id="cancel-edit-user">Отмена</button>
        </div>
      </form>
    `;
    
    // Показываем модальное окно
    ui.showModal(`Редактирование пользователя: ${user.username}`, content);
    
    // Добавляем обработчики
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Получаем данные формы
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;
      
      // Формируем данные для обновления
      const userData = { role };
      if (password) {
        userData.password = password;
      }
      
      try {
        // Обновляем пользователя
        const result = await auth.updateUser(user.id, userData);
        
        if (result.success) {
          // Закрываем модальное окно
          ui.closeModal();
          
          // Показываем уведомление
          ui.showNotification('Пользователь успешно обновлен', 'success');
          
          // Обновляем список пользователей
          await this.loadUsers();
        } else {
          // Показываем ошибку
          const errorElement = document.getElementById('edit-user-error');
          errorElement.textContent = result.error || 'Ошибка обновления пользователя';
          errorElement.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        
        // Показываем ошибку
        const errorElement = document.getElementById('edit-user-error');
        errorElement.textContent = error.message || 'Ошибка обновления пользователя';
        errorElement.classList.remove('hidden');
      }
    });
    
    document.getElementById('cancel-edit-user').addEventListener('click', () => {
      ui.closeModal();
    });
  }

  /**
   * Удаление пользователя
   * @param {string} userId - ID пользователя
   */
  async deleteUser(userId) {
    // Запрашиваем подтверждение
    const confirmContent = `
      <p>Вы действительно хотите удалить пользователя?</p>
      <p>Это действие нельзя отменить.</p>
      <div class="form-actions">
        <button type="button" class="btn btn-danger" id="confirm-delete">Удалить</button>
        <button type="button" class="btn btn-secondary" id="cancel-delete">Отмена</button>
      </div>
    `;
    
    ui.showModal('Подтверждение удаления', confirmContent);
    
    // Добавляем обработчики кнопок
    document.getElementById('confirm-delete').addEventListener('click', async () => {
      try {
        // Удаляем пользователя
        const result = await auth.deleteUser(userId);
        
        // Закрываем модальное окно
        ui.closeModal();
        
        if (result.success) {
          // Показываем уведомление
          ui.showNotification('Пользователь успешно удален', 'success');
          
          // Обновляем список пользователей
          await this.loadUsers();
        } else {
          // Показываем ошибку
          ui.showNotification(result.error || 'Ошибка удаления пользователя', 'error');
        }
      } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        ui.showNotification('Ошибка удаления пользователя', 'error');
      }
    });
    
    document.getElementById('cancel-delete').addEventListener('click', () => {
      ui.closeModal();
    });
  }
}

// Создаем экземпляр сервиса настроек
const settings = new SettingsService();
