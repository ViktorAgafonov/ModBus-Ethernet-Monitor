/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль журнала (ошибки и события)
 */

// Класс для работы с журналом
class LogService {
  constructor() {
    console.log('Инициализация LogService');
    
    // Максимальное количество записей в журнале (ограничено до 100)
    this.maxLogEntries = 100;
    
    // Инициализация журналов
    this.errorLog = [];
    this.eventLog = [];
    
    try {
      // Загружаем журналы из localStorage
      this.loadLogs();
      
      // Инициализируем обработчики ошибок
      this.initErrorHandlers();
      
      // Инициализируем обработчики вкладок
      this.initTabHandlers();
      
      // Добавляем стили для журнала
      this.addStyles();
      
      // Обновляем счетчики
      this.updateErrorCount();
      this.updateEventCount();
      
      console.log('LogService успешно инициализирован');
    } catch (error) {
      console.error('Ошибка при инициализации LogService:', error);
    }
  }
  
  /**
   * Загрузка журналов из localStorage
   */
  loadLogs() {
    console.log('Загрузка журналов');
    
    // Загрузка журнала ошибок
    try {
      const savedErrorLog = JSON.parse(localStorage.getItem('errorLog')) || [];
      // Ограничиваем количество загруженных записей
      this.errorLog = savedErrorLog.slice(0, this.maxLogEntries);
      console.log(`Загружено ${this.errorLog.length} записей ошибок`);
    } catch (e) {
      console.error('Ошибка при загрузке журнала ошибок:', e);
      this.errorLog = [];
      localStorage.removeItem('errorLog');
    }
    
    // Загрузка журнала событий
    try {
      const savedEventLog = JSON.parse(localStorage.getItem('eventLog')) || [];
      // Ограничиваем количество загруженных записей
      this.eventLog = savedEventLog.slice(0, this.maxLogEntries);
      console.log(`Загружено ${this.eventLog.length} записей событий`);
    } catch (e) {
      console.error('Ошибка при загрузке журнала событий:', e);
      this.eventLog = [];
      localStorage.removeItem('eventLog');
    }
  }
  
  /**
   * Инициализация обработчиков ошибок
   */
  initErrorHandlers() {
    // Перехват необработанных ошибок
    window.addEventListener('error', (event) => {
      this.logError('Ошибка JavaScript', event.message, event.error ? event.error.stack : null);
      return false;
    });
    
    // Перехват отклоненных промисов
    window.addEventListener('unhandledrejection', (event) => {
      let message = 'Необработанное отклонение промиса';
      let details = null;
      
      if (event.reason) {
        if (typeof event.reason === 'string') {
          message += ': ' + event.reason;
        } else if (event.reason.message) {
          message += ': ' + event.reason.message;
          details = event.reason.stack;
        }
      }
      
      this.logError('Ошибка промиса', message, details);
    });
    
    // Перехват ошибок AJAX
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.logError(
            'Ошибка сети',
            `Ошибка ${response.status}: ${response.statusText}`,
            `URL: ${args[0]}`
          );
        }
        
        return response;
      } catch (error) {
        this.logError(
          'Ошибка сети',
          error.message,
          `URL: ${args[0]}\nСтек: ${error.stack}`
        );
        throw error;
      }
    };
    
    // Перехват ошибок console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      let message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      // Проверяем, не является ли это сообщение от самого логгера
      if (!message.includes('[Журнал]')) {
        this.logError('Консоль', message);
      }
      
      originalConsoleError.apply(console, args);
    };
  }
  
  /**
   * Инициализация обработчиков вкладок
   */
  initTabHandlers() {
    // Немедленно инициализируем обработчики, а также повторно при загрузке DOM
    this.attachTabHandlers();
    
    document.addEventListener('DOMContentLoaded', () => {
      this.attachTabHandlers();
    });
  }
  
  /**
   * Прикрепление обработчиков к элементам вкладок
   */
  attachTabHandlers() {
    console.log('Прикрепление обработчиков вкладок');
    
    // Обработчики вкладок
    const errorTab = document.getElementById('errors-tab');
    const eventTab = document.getElementById('events-tab');
    const clearBtn = document.getElementById('clear-log-btn');
    
    // Функция обновления текста кнопки очистки
    const updateClearButtonText = (tabName) => {
      if (clearBtn) {
        if (tabName === 'errors') {
          clearBtn.innerHTML = '<i class="fas fa-trash"></i> Очистить ошибки';
        } else {
          clearBtn.innerHTML = '<i class="fas fa-trash"></i> Очистить события';
        }
      }
    };
    
    if (errorTab && eventTab) {
      // Удаляем старые обработчики, чтобы избежать дублирования
      const newErrorTab = errorTab.cloneNode(true);
      const newEventTab = eventTab.cloneNode(true);
      
      errorTab.parentNode.replaceChild(newErrorTab, errorTab);
      eventTab.parentNode.replaceChild(newEventTab, eventTab);
      
      // Добавляем новые обработчики
      newErrorTab.addEventListener('click', (e) => {
        e.preventDefault();
        this.showTab('errors');
        updateClearButtonText('errors');
      });
      
      newEventTab.addEventListener('click', (e) => {
        e.preventDefault();
        this.showTab('events');
        updateClearButtonText('events');
      });
      
      console.log('Обработчики вкладок добавлены');
    } else {
      console.error('Элементы вкладок не найдены');
    }
    
    // Обработчик кнопки очистки
    if (clearBtn) {
      // Удаляем старые обработчики
      const newClearBtn = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
      
      // Добавляем новый обработчик
      newClearBtn.addEventListener('click', () => {
        const errorsTab = document.getElementById('errors-tab');
        const errorsContent = document.getElementById('errors-content');
        
        // Проверяем, какая вкладка активна
        if (errorsContent && errorsContent.classList.contains('show') && errorsContent.classList.contains('active')) {
          this.clearErrorLog();
        } else {
          this.clearEventLog();
        }
      });
      
      // Устанавливаем начальный текст кнопки
      updateClearButtonText('errors');
      
      console.log('Обработчик кнопки очистки добавлен');
    } else {
      console.error('Кнопка очистки не найдена');
    }
  }
  
  /**
   * Показ журнала (рендер вкладки по умолчанию и инициализация обработчиков)
   */
  showLog() {
    console.log('Показ журнала');
    
    // Получаем страницу журнала
    const logPage = document.getElementById('log-page');
    if (!logPage) {
      console.error('Не найдена страница журнала');
      return;
    }
    
    // Обновляем содержимое журнала
    this.renderErrorLog();
    this.renderEventLog();
    
    // Инициализируем обработчики вкладок и очистки
    this.attachTabHandlers();
    
    // Отображаем вкладку ошибок по умолчанию
    this.showTab('errors');
  }
  
  /**
   * Переключение между вкладками
   * @param {string} tabName - Имя вкладки ('errors' или 'events')
   */
  showTab(tabName) {
    console.log(`Переключение на вкладку: ${tabName}`);
    const errorsTab = document.getElementById('errors-tab');
    const eventsTab = document.getElementById('events-tab');
    const errorsContent = document.getElementById('errors-content');
    const eventsContent = document.getElementById('events-content');
    if (!errorsTab || !eventsTab || !errorsContent || !eventsContent) {
      console.error('Элементы вкладок не найдены');
      return;
    }
    // Сброс классов у всех вкладок и контента
    [errorsTab, eventsTab].forEach(tab => tab.classList.remove('active'));
    [errorsContent, eventsContent].forEach(content => content.classList.remove('show', 'active'));
    
    if (tabName === 'errors') {
      errorsTab.classList.add('active');
      errorsContent.classList.add('show', 'active');
      this.renderErrorLog();
    } else {
      eventsTab.classList.add('active');
      eventsContent.classList.add('show', 'active');
      this.renderEventLog();
    }
    
    // Обновляем текст кнопки очистки
    const clearBtn = document.getElementById('clear-log-btn');
    if (clearBtn) {
      clearBtn.innerHTML = `<i class="fas fa-trash"></i> Очистить ${tabName === 'errors' ? 'ошибки' : 'события'}`;
    }
  }
  
  /**
   * Запись ошибки в журнал
   * @param {string} type - Тип ошибки
   * @param {string} message - Сообщение об ошибке
   * @param {string} details - Детали ошибки (стек вызовов)
   */
  logError(type, message, details = null) {
    // Проверяем, не дублируется ли ошибка
    const isDuplicate = this.isDuplicateError(type, message);
    if (isDuplicate) {
      // Просто обновляем счетчик на существующей ошибке
      this.updateDuplicateError(type, message);
      return;
    }
    
    // Создаем запись об ошибке
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
      url: window.location.href,
      count: 1 // Счетчик повторений ошибки
    };
    
    // Добавляем в начало журнала
    this.errorLog.unshift(errorEntry);
    
    // Ограничиваем размер журнала
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(0, this.maxLogEntries);
    }
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
    } catch (e) {
      console.error('[Журнал] Ошибка при сохранении журнала ошибок:', e);
      // В случае ошибки сохранения (например, превышен лимит localStorage)
      // очищаем половину журнала и пробуем снова
      this.errorLog = this.errorLog.slice(0, Math.floor(this.maxLogEntries / 2));
      try {
        localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
      } catch (e2) {
        // Если и это не помогло, просто очищаем журнал
        this.errorLog = [errorEntry];
        localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
      }
    }
    
    // Обновляем счетчик на кнопке
    this.updateErrorCount();
    
    console.error(`[Журнал] [${type}] ${message}`, details);
  }
  
  /**
   * Запись события в журнал
   * @param {string} type - Тип события
   * @param {string} message - Сообщение о событии
   * @param {Object} data - Дополнительные данные о событии
   */
  logEvent(type, message, data = null) {
    // Создаем запись о событии
    const eventEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
      url: window.location.href
    };
    
    // Добавляем в начало журнала
    this.eventLog.unshift(eventEntry);
    
    // Ограничиваем размер журнала
    if (this.eventLog.length > this.maxLogEntries) {
      this.eventLog = this.eventLog.slice(0, this.maxLogEntries);
    }
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('eventLog', JSON.stringify(this.eventLog));
    } catch (e) {
      console.error('[Журнал] Ошибка при сохранении журнала событий:', e);
      // В случае ошибки сохранения (например, превышен лимит localStorage)
      // очищаем половину журнала и пробуем снова
      this.eventLog = this.eventLog.slice(0, Math.floor(this.maxLogEntries / 2));
      try {
        localStorage.setItem('eventLog', JSON.stringify(this.eventLog));
      } catch (e2) {
        // Если и это не помогло, просто очищаем журнал
        this.eventLog = [eventEntry];
        localStorage.setItem('eventLog', JSON.stringify(this.eventLog));
      }
    }
    
    // Обновляем счетчик на кнопке
    this.updateEventCount();
    
    console.log(`[Журнал] [${type}] ${message}`, data);
  }
  
  /**
   * Проверка наличия дублирующейся ошибки
   * @param {string} type - Тип ошибки
   * @param {string} message - Сообщение об ошибке
   * @returns {boolean} - True, если ошибка дублируется
   */
  isDuplicateError(type, message) {
    return this.errorLog.some(error => error.type === type && error.message === message);
  }
  
  /**
   * Обновление счетчика повторений ошибки
   * @param {string} type - Тип ошибки
   * @param {string} message - Сообщение об ошибке
   */
  updateDuplicateError(type, message) {
    const errorIndex = this.errorLog.findIndex(error => error.type === type && error.message === message);
    if (errorIndex !== -1) {
      this.errorLog[errorIndex].count = (this.errorLog[errorIndex].count || 1) + 1;
      this.errorLog[errorIndex].timestamp = new Date().toISOString(); // Обновляем время последнего появления
      try {
        localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
      } catch (e) {
        console.error('[Журнал] Ошибка при обновлении счетчика ошибок:', e);
      }
    }
  }
  
  /**
   * Обновление счетчика ошибок в боковом меню и на панели мониторинга
   */
  updateErrorCount() {
    const errorCount = this.errorLog.length;
    
    // Обновляем счетчик на вкладке
    const errorTabBadge = document.querySelector('#errors-tab .badge');
    if (errorTabBadge) {
      if (errorCount > 0) {
        errorTabBadge.textContent = errorCount;
        errorTabBadge.style.display = 'inline-block';
      } else {
        errorTabBadge.style.display = 'none';
      }
    }
    
    // Обновляем счетчик в боковом меню
    const logBtn = document.getElementById('log-btn');
    if (logBtn) {
      // Обновляем бейдж ошибок в меню
      const errorCountBadge = document.getElementById('error-count-badge');
      if (errorCountBadge) {
        if (errorCount > 0) {
          errorCountBadge.textContent = errorCount > 99 ? '99+' : errorCount;
          errorCountBadge.style.display = 'inline-block';
          // Добавляем класс has-errors для выделения кнопки
          logBtn.classList.add('has-errors');
        } else {
          errorCountBadge.style.display = 'none';
          // Если нет ни ошибок, ни событий, убираем класс has-errors
          const eventCountBadge = document.getElementById('event-count-badge');
          if (eventCountBadge && eventCountBadge.style.display === 'none') {
            logBtn.classList.remove('has-errors');
          }
        }
      }
      
      // Обновляем счетчик ошибок (error-count)
      const errorCount2 = logBtn.querySelector('.error-count');
      if (errorCount2) {
        if (errorCount > 0) {
          errorCount2.textContent = errorCount > 99 ? '99+' : errorCount;
          errorCount2.style.display = 'inline-block';
        } else {
          errorCount2.style.display = 'none';
        }
      }
    }
    
    // Обновляем счетчик на панели мониторинга
    const errorsCountElement = document.getElementById('errors-count');
    if (errorsCountElement) {
      if (errorCount > 0) {
        errorsCountElement.textContent = errorCount === 1 ? '1 ошибка' : `${errorCount} ошибок`;
        errorsCountElement.style.display = 'inline-block';
      } else {
        errorsCountElement.style.display = 'none';
      }
    }
  }
  
  /**
   * Обновление счетчика событий
   */
  updateEventCount() {
    const eventCount = this.eventLog.length;
    
    // Обновляем счетчик на вкладке
    const eventTabBadge = document.querySelector('#events-tab .badge');
    if (eventTabBadge) {
      if (eventCount > 0) {
        eventTabBadge.textContent = eventCount;
        eventTabBadge.style.display = 'inline-block';
      } else {
        eventTabBadge.style.display = 'none';
      }
    }
    
    // Обновляем счетчик в боковом меню
    const logBtn = document.getElementById('log-btn');
    if (logBtn) {
      // Обновляем бейдж событий в меню
      const eventCountBadge = document.getElementById('event-count-badge');
      if (eventCountBadge) {
        if (eventCount > 0) {
          eventCountBadge.textContent = eventCount > 99 ? '99+' : eventCount;
          eventCountBadge.style.display = 'inline-block';
          // Добавляем класс has-errors для выделения кнопки
          logBtn.classList.add('has-errors');
        } else {
          eventCountBadge.style.display = 'none';
          // Если нет ни ошибок, ни событий, убираем класс has-errors
          const errorCountBadge = document.getElementById('error-count-badge');
          if (errorCountBadge && errorCountBadge.style.display === 'none') {
            logBtn.classList.remove('has-errors');
          }
        }
      }
    }
    
    // Обновляем счетчик событий на панели мониторинга, если он есть
    const eventsCountElement = document.getElementById('events-count');
    if (eventsCountElement) {
      if (eventCount > 0) {
        eventsCountElement.textContent = eventCount === 1 ? '1 событие' : `${eventCount} событий`;
        eventsCountElement.style.display = 'inline-block';
      } else {
        eventsCountElement.style.display = 'none';
      }
    }
  }
  
  /**
   * Рендеринг журнала ошибок
   */
  renderErrorLog() {
    try {
      console.log('Рендеринг журнала ошибок');
      
      const errorLogContent = document.getElementById('error-log-content');
      if (!errorLogContent) {
        console.error('Контейнер для журнала ошибок не найден');
        return;
      }
      
      // Если журнал пуст, отображаем сообщение
      if (this.errorLog.length === 0) {
        errorLogContent.innerHTML = '<div class="empty-state">Журнал ошибок пуст</div>';
        return;
      }
      
      let html = `
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>Время</th>
                <th>Тип</th>
                <th>Сообщение</th>
                <th>Повторы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      this.errorLog.forEach(error => {
        const date = new Date(error.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        const count = error.count || 1;
        
        html += `
          <tr>
            <td>${formattedDate}</td>
            <td>${error.type}</td>
            <td>${error.message}</td>
            <td>${count > 1 ? `<span class="badge bg-warning">${count}</span>` : '1'}</td>
            <td>
              ${error.details ? `<button class="btn btn-sm btn-secondary toggle-details" data-id="${error.id}">Показать детали</button>` : '-'}
            </td>
          </tr>
        `;
        
        if (error.details) {
          // Преобразуем детали ошибки в текст, учитывая различные типы данных
          let detailsText = '';
          
          try {
            if (error.details === null || error.details === undefined) {
              detailsText = 'Детали отсутствуют';
            } else if (typeof error.details === 'object' && error.details !== null) {
              // Если это пустой объект, показываем это
              if (Object.keys(error.details).length === 0) {
                detailsText = 'Пустой объект {}';
              } else {
                // Если это объект с данными, преобразуем его в JSON-строку с форматированием
                detailsText = JSON.stringify(error.details, null, 2);
                
                // Добавляем пояснения к ключевым полям
                if (error.details.url) {
                  detailsText += `\n\nЗапрос к: ${error.details.url}`;
                }
                if (error.details.status) {
                  detailsText += `\nСтатус ответа: ${error.details.status} ${error.details.statusText || ''}`;
                }
                if (error.details.message) {
                  detailsText += `\nСообщение: ${error.details.message}`;
                }
              }
            } else if (typeof error.details === 'string') {
              // Если это строка, используем как есть
              detailsText = error.details;
            } else if (Array.isArray(error.details)) {
              // Если это массив, преобразуем в JSON с форматированием
              detailsText = JSON.stringify(error.details, null, 2);
            } else {
              // Для других типов данных преобразуем в строку
              detailsText = String(error.details);
            }
          } catch (e) {
            // В случае ошибки при преобразовании
            detailsText = 'Ошибка при отображении деталей: ' + String(e);
          }
          
          html += `
            <tr class="details-row">
              <td colspan="5" class="error-details" id="error-details-${error.id}" style="display: none;">
                <pre>${detailsText}</pre>
              </td>
            </tr>
          `;
        }
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      errorLogContent.innerHTML = html;
      
      // Добавляем обработчики для кнопок показа/скрытия деталей
      const toggleButtons = errorLogContent.querySelectorAll('.toggle-details');
      toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const detailsId = btn.getAttribute('data-id');
          const detailsElement = document.getElementById(`error-details-${detailsId}`);
          
          if (detailsElement.style.display === 'none') {
            detailsElement.style.display = 'block';
            btn.textContent = 'Скрыть детали';
          } else {
            detailsElement.style.display = 'none';
            btn.textContent = 'Показать детали';
          }
        });
      });
      
      console.log('Журнал ошибок успешно отрендерен');
    } catch (error) {
      console.error('Ошибка при рендеринге журнала ошибок:', error);
      const errorLogContent = document.getElementById('error-log-content');
      if (errorLogContent) {
        errorLogContent.innerHTML = `<div class="empty-state">Ошибка при отображении журнала: ${error.message}</div>`;
      }
    }
  }
  
  /**
   * Рендеринг журнала событий
   */
  renderEventLog() {
    const eventLogContent = document.getElementById('event-log-content');
    if (!eventLogContent) return;
    
    if (this.eventLog.length === 0) {
      eventLogContent.innerHTML = '<div class="empty-state">Журнал событий пуст</div>';
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Время</th>
              <th>Тип</th>
              <th>Сообщение</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    this.eventLog.forEach(event => {
      const date = new Date(event.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      html += `
        <tr>
          <td>${formattedDate}</td>
          <td>${event.type}</td>
          <td>${event.message}</td>
          <td>
            ${event.data ? `<button class="btn btn-sm btn-secondary toggle-event-details" data-id="${event.id}">Показать детали</button>` : '-'}
          </td>
        </tr>
      `;
      
      if (event.data) {
        let details = '';
        try {
          if (event.data === null || event.data === undefined) {
            details = 'Детали отсутствуют';
          } else if (typeof event.data === 'object' && event.data !== null) {
            // Если это пустой объект, показываем это
            if (Object.keys(event.data).length === 0) {
              details = 'Пустой объект {}';
            } else {
              // Если это объект с данными, преобразуем его в JSON-строку с форматированием
              details = JSON.stringify(event.data, null, 2);
              
              // Добавляем пояснения к ключевым полям для устройств
              if (Array.isArray(event.data) && event.data.length > 0 && event.data[0].name) {
                details += '\n\nСписок устройств:';
                event.data.forEach((device, index) => {
                  details += `\n${index + 1}. ${device.name} (${device.ip}:${device.port}) - ${device.type}`;
                });
              }
            }
          } else if (typeof event.data === 'string') {
            // Если это строка, используем как есть
            details = event.data;
          } else if (Array.isArray(event.data)) {
            // Если это массив, преобразуем в JSON с форматированием
            details = JSON.stringify(event.data, null, 2);
          } else {
            // Для других типов данных преобразуем в строку
            details = String(event.data);
          }
        } catch (e) {
          // В случае ошибки при преобразовании
          details = 'Ошибка при отображении деталей: ' + String(e);
        }
        
        html += `
          <tr class="details-row">
            <td colspan="4" class="event-details" id="event-details-${event.id}" style="display: none;">
              <pre>${details}</pre>
            </td>
          </tr>
        `;
      }
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    eventLogContent.innerHTML = html;
    
    // Добавляем обработчики для кнопок показа/скрытия деталей
    const toggleButtons = eventLogContent.querySelectorAll('.toggle-event-details');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const detailsId = btn.getAttribute('data-id');
        const detailsElement = document.getElementById(`event-details-${detailsId}`);
        
        if (detailsElement.style.display === 'none') {
          detailsElement.style.display = 'block';
          btn.textContent = 'Скрыть детали';
        } else {
          detailsElement.style.display = 'none';
          btn.textContent = 'Показать детали';
        }
      });
    });
  }
  
  /**
   * Очистка журнала ошибок
   */
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('errorLog');
    this.updateErrorCount();
    
    // Обновляем содержимое журнала ошибок
    const errorLogContent = document.getElementById('error-log-content');
    if (errorLogContent) {
      errorLogContent.innerHTML = '<div class="empty-state">Журнал ошибок пуст</div>';
    }
    
    // Показываем уведомление об успешной очистке
    if (typeof ui !== 'undefined' && ui.showNotification) {
      ui.showNotification('Журнал ошибок очищен', 'success');
    }
  }
  
  /**
   * Очистка журнала событий
   */
  clearEventLog() {
    this.eventLog = [];
    localStorage.removeItem('eventLog');
    this.updateEventCount();
    
    // Обновляем содержимое журнала событий
    const eventLogContent = document.getElementById('event-log-content');
    if (eventLogContent) {
      eventLogContent.innerHTML = '<div class="empty-state">Журнал событий пуст</div>';
    }
    
    // Показываем уведомление об успешной очистке
    if (typeof ui !== 'undefined' && ui.showNotification) {
      ui.showNotification('Журнал событий очищен', 'success');
    }
  }
  
  /**
   * Добавление стилей для журнала
   */
  addStyles() {
    // Проверяем, существуют ли уже стили
    if (document.getElementById('log-styles')) {
      return;
    }
    
    // Создаем элемент стилей
    const style = document.createElement('style');
    style.id = 'log-styles';
    style.textContent = `
      /* Стили для пункта меню журнала ошибок */
      #error-log-btn {
        position: relative;
      }
      
      #error-log-btn .error-count {
        display: inline-block;
        position: absolute;
        right: 25%;
        background-color: #dc3545;
        color: white;
        border-radius: 50%;
        min-width: 18px;
        height: 18px;
        font-size: 11px;
        text-align: center;
        line-height: 18px;
        font-weight: bold;
      }
      
      #error-log-btn.has-errors {
        color: #dc3545;
      }
      
      /* Стили для страницы журнала */
      .log-content {
        padding: 15px;
        background-color: var(--card-bg);
        border-radius: var(--card-border-radius);
        box-shadow: var(--box-shadow);
        margin-top: 15px;
      }
      
      /* Стили для пустого состояния */
      .empty-state {
        padding: 30px;
        text-align: center;
        color: var(--gray-color);
        font-style: italic;
      }
    `;
    
    // Добавляем стили в head
    document.head.appendChild(style);
  }
}

// Создаем экземпляр сервиса журнала
const log = new LogService();

// Экспортируем функцию для логирования ошибок для обратной совместимости с error-log.js
function logError(type, message, details = null) {
  log.logError(type, message, details);
}

// Экспортируем функцию для логирования событий
function logEvent(type, message, data = null) {
  log.logEvent(type, message, data);
}
