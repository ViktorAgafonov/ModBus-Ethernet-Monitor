/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с архивами
 */

// Класс для работы с архивами
class ArchivesService {
  constructor() {
    // Элементы страницы архивов
    this.archivesTable = document.getElementById('archives-table');
    this.refreshArchivesBtn = document.getElementById('refresh-archives-btn');
    this.createZipBtn = document.getElementById('create-zip-btn');
    this.archiveMonthFilter = document.getElementById('archive-month-filter');
    this.archiveTypeFilter = document.getElementById('archive-type-filter');
    
    // Инициализация
    this.init();
  }

  /**
   * Инициализация модуля архивов
   */
  init() {
    // Подписка на событие смены страницы
    document.addEventListener('pageChange', (e) => {
      if (e.detail.page === 'archives') {
        this.loadArchives();
      }
    });
    
    // Если текущая страница - архивы, загружаем данные
    if (document.querySelector('.page.active').id === 'archives-page') {
      this.loadArchives();
    }
    
    // Обработчик кнопки обновления
    this.refreshArchivesBtn.addEventListener('click', () => {
      this.loadArchives();
    });
    
    // Обработчик кнопки создания ZIP-архива
    this.createZipBtn.addEventListener('click', () => {
      this.showCreateZipForm();
    });
    
    // Обработчики фильтров
    this.archiveMonthFilter.addEventListener('change', () => {
      this.filterArchives();
    });
    
    this.archiveTypeFilter.addEventListener('change', () => {
      this.filterArchives();
    });
  }

  /**
   * Загрузка списка архивов
   */
  async loadArchives() {
    try {
      // Показываем индикатор загрузки
      this.archivesTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Загрузка архивов...</td>
        </tr>
      `;
      
      // Получаем список архивов
      const response = await api.getArchives();
      
      // Обновляем таблицу
      this.updateArchivesTable(response.archives);
      
      // Обновляем фильтр по месяцам
      this.updateMonthFilter(response.archives);
    } catch (error) {
      console.error('Ошибка загрузки архивов:', error);
      
      // Показываем сообщение об ошибке
      this.archivesTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Ошибка загрузки архивов: ${error.message}</td>
        </tr>
      `;
      
      ui.showNotification('Ошибка загрузки архивов', 'error');
    }
  }

  /**
   * Обновление таблицы архивов
   * @param {Array} archives - Список архивов
   */
  updateArchivesTable(archives) {
    // Получаем tbody таблицы
    const tbody = this.archivesTable.querySelector('tbody');
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    // Если нет архивов, показываем сообщение
    if (!archives || archives.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Нет доступных архивов</td>
        </tr>
      `;
      return;
    }
    
    // Сортируем архивы по дате (новые в начале)
    archives.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Добавляем строки для каждого архива
    archives.forEach(archive => {
      const row = document.createElement('tr');
      
      // Определяем тип архива
      const isZip = archive.name.endsWith('.zip');
      const fileType = isZip ? 'ZIP' : 'JSON';
      
      // Форматируем дату
      const date = isZip 
        ? `${archive.name.slice(0, 4)}-${archive.name.slice(4, 6)}` 
        : archive.name.replace('.json', '');
      
      // Форматируем размер
      const size = this.formatFileSize(archive.size);
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${fileType}</td>
        <td>${size}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary view-archive-btn" data-name="${archive.name}" title="Просмотр">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary download-archive-btn" data-name="${archive.name}" title="Скачать">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </td>
      `;
      
      // Добавляем обработчики кнопок
      row.querySelector('.view-archive-btn').addEventListener('click', () => {
        this.viewArchive(archive.name);
      });
      
      row.querySelector('.download-archive-btn').addEventListener('click', () => {
        this.downloadArchive(archive.name);
      });
      
      // Добавляем строку в таблицу
      tbody.appendChild(row);
      
      // Добавляем атрибуты для фильтрации
      row.setAttribute('data-date', date);
      row.setAttribute('data-type', fileType.toLowerCase());
      
      // Получаем месяц для фильтрации
      const month = isZip ? date : date.slice(0, 7);
      row.setAttribute('data-month', month);
    });
  }

  /**
   * Форматирование размера файла
   * @param {number} bytes - Размер в байтах
   * @returns {string} - Отформатированный размер
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Байт';
    
    const k = 1024;
    const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Обновление фильтра по месяцам
   * @param {Array} archives - Список архивов
   */
  updateMonthFilter(archives) {
    // Очищаем фильтр
    this.archiveMonthFilter.innerHTML = '<option value="all">Все месяцы</option>';
    
    // Если нет архивов, выходим
    if (!archives || archives.length === 0) {
      return;
    }
    
    // Получаем уникальные месяцы
    const months = new Set();
    
    archives.forEach(archive => {
      const isZip = archive.name.endsWith('.zip');
      const date = isZip 
        ? `${archive.name.slice(0, 4)}-${archive.name.slice(4, 6)}` 
        : archive.name.replace('.json', '');
      
      const month = isZip ? date : date.slice(0, 7);
      months.add(month);
    });
    
    // Сортируем месяцы
    const sortedMonths = Array.from(months).sort((a, b) => {
      return new Date(b) - new Date(a);
    });
    
    // Добавляем опции в фильтр
    sortedMonths.forEach(month => {
      const option = document.createElement('option');
      option.value = month;
      option.textContent = this.formatMonth(month);
      this.archiveMonthFilter.appendChild(option);
    });
  }

  /**
   * Форматирование месяца для отображения
   * @param {string} month - Месяц в формате YYYY-MM
   * @returns {string} - Отформатированный месяц
   */
  formatMonth(month) {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const [year, monthNum] = month.split('-');
    const monthName = months[parseInt(monthNum) - 1];
    
    return `${monthName} ${year}`;
  }

  /**
   * Фильтрация архивов
   */
  filterArchives() {
    const selectedMonth = this.archiveMonthFilter.value;
    const selectedType = this.archiveTypeFilter.value;
    
    // Получаем все строки таблицы
    const rows = this.archivesTable.querySelectorAll('tbody tr');
    
    // Если нет строк, выходим
    if (rows.length === 0 || rows[0].cells.length <= 1) {
      return;
    }
    
    // Фильтруем строки
    rows.forEach(row => {
      const monthMatch = selectedMonth === 'all' || row.getAttribute('data-month') === selectedMonth;
      const typeMatch = selectedType === 'all' || row.getAttribute('data-type') === selectedType;
      
      if (monthMatch && typeMatch) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
    
    // Проверяем, есть ли видимые строки
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    
    if (visibleRows.length === 0) {
      // Если нет видимых строк, показываем сообщение
      const tbody = this.archivesTable.querySelector('tbody');
      
      // Проверяем, есть ли уже сообщение
      const noDataRow = Array.from(rows).find(row => row.cells[0].colSpan === 4);
      
      if (!noDataRow) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="4" class="text-center">Нет архивов, соответствующих выбранным фильтрам</td>
        `;
        tbody.appendChild(row);
      }
    } else {
      // Если есть видимые строки, удаляем сообщение
      const noDataRow = Array.from(rows).find(row => row.cells[0].colSpan === 4);
      
      if (noDataRow) {
        noDataRow.remove();
      }
    }
  }

  /**
   * Просмотр архива
   * @param {string} archiveName - Имя архива
   */
  async viewArchive(archiveName) {
    try {
      // Проверяем тип архива
      const isZip = archiveName.endsWith('.zip');
      
      if (isZip) {
        // Для ZIP-архивов показываем информацию о содержимом
        ui.showModal(`Архив: ${archiveName}`, `
          <div class="archive-info">
            <p>Архив содержит данные за месяц.</p>
            <p>Для просмотра содержимого скачайте архив и распакуйте его.</p>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary download-archive-btn" data-name="${archiveName}">
              <i class="fas fa-download"></i> Скачать
            </button>
            <button type="button" class="btn btn-secondary" id="close-archive-view">
              Закрыть
            </button>
          </div>
        `);
        
        // Добавляем обработчики кнопок
        document.querySelector('.download-archive-btn').addEventListener('click', () => {
          this.downloadArchive(archiveName);
        });
        
        document.getElementById('close-archive-view').addEventListener('click', () => {
          ui.closeModal();
        });
      } else {
        // Для JSON-архивов показываем содержимое
        const date = archiveName.replace('.json', '');
        
        // Показываем индикатор загрузки
        ui.showModal(`Архив за ${date}`, `
          <div class="archive-content">
            <p class="text-center">Загрузка данных архива...</p>
          </div>
        `);
        
        // Получаем данные архива
        const archiveData = await api.getArchiveByDate(date);
        
        // Формируем содержимое
        let content = `
          <div class="archive-content">
            <div class="archive-header">
              <h4>Данные за ${date}</h4>
            </div>
        `;
        
        // Если нет данных, показываем сообщение
        if (!archiveData || Object.keys(archiveData).length === 0) {
          content += `
            <p class="text-center">Архив пуст или не содержит данных</p>
          `;
        } else {
          // Для каждого устройства показываем данные
          for (const [deviceId, deviceData] of Object.entries(archiveData)) {
            content += `
              <div class="device-archive">
                <h5>Устройство: ${deviceId}</h5>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>Параметр</th>
                      <th>Значение</th>
                    </tr>
                  </thead>
                  <tbody>
            `;
            
            // Для каждой временной метки показываем данные
            for (const [timestamp, values] of Object.entries(deviceData)) {
              // Форматируем время
              const time = new Date(parseInt(timestamp)).toLocaleTimeString();
              
              // Для каждого параметра показываем значение
              for (const [param, value] of Object.entries(values)) {
                content += `
                  <tr>
                    <td>${time}</td>
                    <td>${param}</td>
                    <td>${value}</td>
                  </tr>
                `;
              }
            }
            
            content += `
                  </tbody>
                </table>
              </div>
            `;
          }
        }
        
        content += `
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary download-archive-btn" data-name="${archiveName}">
              <i class="fas fa-download"></i> Скачать
            </button>
            <button type="button" class="btn btn-secondary" id="close-archive-view">
              Закрыть
            </button>
          </div>
        `;
        
        // Обновляем содержимое модального окна
        document.querySelector('.modal-content').innerHTML = content;
        
        // Добавляем обработчики кнопок
        document.querySelector('.download-archive-btn').addEventListener('click', () => {
          this.downloadArchive(archiveName);
        });
        
        document.getElementById('close-archive-view').addEventListener('click', () => {
          ui.closeModal();
        });
      }
    } catch (error) {
      console.error(`Ошибка просмотра архива ${archiveName}:`, error);
      
      // Обновляем содержимое модального окна
      document.querySelector('.modal-content').innerHTML = `
        <div class="archive-content">
          <p class="text-center text-danger">Ошибка загрузки данных архива: ${error.message}</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="close-archive-view">
            Закрыть
          </button>
        </div>
      `;
      
      document.getElementById('close-archive-view').addEventListener('click', () => {
        ui.closeModal();
      });
      
      ui.showNotification('Ошибка просмотра архива', 'error');
    }
  }

  /**
   * Скачивание архива
   * @param {string} archiveName - Имя архива
   */
  async downloadArchive(archiveName) {
    try {
      // Проверяем тип архива
      const isZip = archiveName.endsWith('.zip');
      
      if (isZip) {
        // Для ZIP-архивов используем специальный метод
        const month = archiveName.replace('.zip', '');
        await api.downloadZipArchive(month);
      } else {
        // Для JSON-архивов используем общий метод
        const date = archiveName.replace('.json', '');
        await api.downloadFile(`/api/archives/${date}`, archiveName);
      }
      
      ui.showNotification(`Архив ${archiveName} успешно скачан`, 'success');
    } catch (error) {
      console.error(`Ошибка скачивания архива ${archiveName}:`, error);
      ui.showNotification('Ошибка скачивания архива', 'error');
    }
  }

  /**
   * Показ формы создания ZIP-архива
   */
  showCreateZipForm() {
    // Получаем текущую дату
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Формируем список месяцев за последний год
    const months = [];
    for (let i = 0; i < 12; i++) {
      const year = currentMonth - i <= 0 ? currentYear - 1 : currentYear;
      const month = currentMonth - i <= 0 ? currentMonth - i + 12 : currentMonth - i;
      
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const monthName = this.formatMonth(monthStr);
      
      months.push({ value: monthStr.replace('-', ''), name: monthName });
    }
    
    // Формируем содержимое модального окна
    const content = `
      <div class="create-zip-form">
        <p>Выберите месяц для создания ZIP-архива:</p>
        <div class="form-group">
          <select id="zip-month" class="form-control">
            ${months.map(month => `<option value="${month.value}">${month.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="create-zip-confirm">
            <i class="fas fa-file-archive"></i> Создать
          </button>
          <button type="button" class="btn btn-secondary" id="create-zip-cancel">
            Отмена
          </button>
        </div>
      </div>
    `;
    
    // Показываем модальное окно
    ui.showModal('Создание ZIP-архива', content);
    
    // Добавляем обработчики кнопок
    document.getElementById('create-zip-confirm').addEventListener('click', async () => {
      const month = document.getElementById('zip-month').value;
      
      try {
        // Показываем индикатор загрузки
        document.querySelector('.modal-content').innerHTML = `
          <div class="text-center">
            <p>Создание ZIP-архива за ${this.formatMonth(month.slice(0, 4) + '-' + month.slice(4))}...</p>
            <div class="spinner"></div>
          </div>
        `;
        
        // Создаем ZIP-архив
        const response = await api.createZipArchive(month);
        
        // Закрываем модальное окно
        ui.closeModal();
        
        // Показываем уведомление
        ui.showNotification(`ZIP-архив за ${this.formatMonth(month.slice(0, 4) + '-' + month.slice(4))} успешно создан`, 'success');
        
        // Обновляем список архивов
        this.loadArchives();
      } catch (error) {
        console.error(`Ошибка создания ZIP-архива за ${month}:`, error);
        
        // Обновляем содержимое модального окна
        document.querySelector('.modal-content').innerHTML = `
          <div class="text-center">
            <p class="text-danger">Ошибка создания ZIP-архива: ${error.message}</p>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="close-error">
              Закрыть
            </button>
          </div>
        `;
        
        document.getElementById('close-error').addEventListener('click', () => {
          ui.closeModal();
        });
        
        ui.showNotification('Ошибка создания ZIP-архива', 'error');
      }
    });
    
    document.getElementById('create-zip-cancel').addEventListener('click', () => {
      ui.closeModal();
    });
  }
}

// Создаем экземпляр сервиса архивов
const archives = new ArchivesService();
