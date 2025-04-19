/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с отчетами
 */

// Класс для работы с отчетами
class ReportsService {
  constructor() {
    // Элементы страницы отчетов
    this.reportType = document.getElementById('report-type');
    this.reportDevice = document.getElementById('report-device');
    this.reportStartDate = document.getElementById('report-start-date');
    this.reportEndDate = document.getElementById('report-end-date');
    this.reportFormat = document.getElementById('report-format');
    this.generateReportBtn = document.getElementById('generate-report-btn');
    this.reportsTable = document.getElementById('reports-table');
    
    // Инициализация
    this.init();
  }

  /**
   * Инициализация модуля отчетов
   */
  init() {
    // Подписка на событие смены страницы
    document.addEventListener('pageChange', (e) => {
      if (e.detail.page === 'reports') {
        this.loadReportsPage();
      }
    });
    
    // Если текущая страница - отчеты, загружаем данные
    if (document.querySelector('.page.active').id === 'reports-page') {
      this.loadReportsPage();
    }
    
    // Обработчик изменения типа отчета
    this.reportType.addEventListener('change', () => {
      this.updateDateInputs();
    });
    
    // Обработчик кнопки генерации отчета
    this.generateReportBtn.addEventListener('click', () => {
      this.generateReport();
    });
    
    // Устанавливаем начальные значения дат
    this.setDefaultDates();
  }

  /**
   * Загрузка страницы отчетов
   */
  async loadReportsPage() {
    try {
      // Загружаем список устройств
      const devicesResponse = await api.getDevices();
      this.updateDeviceSelect(devicesResponse.devices);
      
      // Загружаем историю отчетов
      await this.loadReportsHistory();
      
      // Обновляем поля дат
      this.updateDateInputs();
    } catch (error) {
      console.error('Ошибка загрузки страницы отчетов:', error);
      ui.showNotification('Ошибка загрузки данных для страницы отчетов', 'error');
    }
  }

  /**
   * Обновление выпадающего списка устройств
   * @param {Array} devices - Список устройств
   */
  updateDeviceSelect(devices) {
    // Очищаем список
    this.reportDevice.innerHTML = '<option value="all">Все устройства</option>';
    
    // Если нет устройств, выходим
    if (!devices || devices.length === 0) {
      return;
    }
    
    // Добавляем устройства в список
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name;
      this.reportDevice.appendChild(option);
    });
  }

  /**
   * Установка дат по умолчанию
   */
  setDefaultDates() {
    const today = new Date();
    
    // Форматируем дату для input[type="date"]
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Устанавливаем конечную дату (сегодня)
    this.reportEndDate.value = formatDate(today);
    
    // Устанавливаем начальную дату (30 дней назад)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    this.reportStartDate.value = formatDate(startDate);
  }

  /**
   * Обновление полей дат в зависимости от типа отчета
   */
  updateDateInputs() {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // Устанавливаем конечную дату (сегодня)
    this.reportEndDate.value = formatDate(today);
    
    // В зависимости от типа отчета устанавливаем начальную дату
    switch (this.reportType.value) {
      case 'daily':
        // Сегодня
        this.reportStartDate.value = formatDate(today);
        break;
      case 'weekly':
        // 7 дней назад
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.reportStartDate.value = formatDate(weekAgo);
        break;
      case 'monthly':
        // 30 дней назад
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        this.reportStartDate.value = formatDate(monthAgo);
        break;
      case 'custom':
        // Не меняем, пользователь сам выберет
        break;
    }
    
    // Блокируем/разблокируем поля дат
    const isCustom = this.reportType.value === 'custom';
    this.reportStartDate.disabled = !isCustom;
    this.reportEndDate.disabled = !isCustom;
  }

  /**
   * Загрузка истории отчетов
   */
  async loadReportsHistory() {
    try {
      // Показываем индикатор загрузки
      this.reportsTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Загрузка истории отчетов...</td>
        </tr>
      `;
      
      // Получаем список отчетов
      const reports = await api.getReports();
      
      // Обновляем таблицу
      this.updateReportsTable(reports);
    } catch (error) {
      console.error('Ошибка загрузки истории отчетов:', error);
      
      // Показываем сообщение об ошибке
      this.reportsTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Ошибка загрузки истории отчетов: ${error.message}</td>
        </tr>
      `;
    }
  }

  /**
   * Обновление таблицы истории отчетов
   * @param {Array} reports - Список отчетов
   */
  updateReportsTable(reports) {
    // Получаем tbody таблицы
    const tbody = this.reportsTable.querySelector('tbody');
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    // Если нет отчетов, показываем сообщение
    if (!reports || reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Нет доступных отчетов</td>
        </tr>
      `;
      return;
    }
    
    // Сортируем отчеты по дате создания (новые в начале)
    reports.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Добавляем строки для каждого отчета
    reports.forEach(report => {
      const row = document.createElement('tr');
      
      // Форматируем дату создания
      const createdAt = new Date(report.createdAt).toLocaleString();
      
      // Форматируем период
      const period = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`;
      
      row.innerHTML = `
        <td>${createdAt}</td>
        <td>${this.getReportTypeName(report.type)}</td>
        <td>${period}</td>
        <td>${report.format.toUpperCase()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary download-report-btn" data-id="${report.id}" data-format="${report.format}" title="Скачать">
              <i class="fas fa-download"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-report-btn" data-id="${report.id}" title="Удалить">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      // Добавляем обработчики кнопок
      row.querySelector('.download-report-btn').addEventListener('click', () => {
        this.downloadReport(report.id, report.format);
      });
      
      row.querySelector('.delete-report-btn').addEventListener('click', () => {
        this.deleteReport(report.id);
      });
      
      // Добавляем строку в таблицу
      tbody.appendChild(row);
    });
  }

  /**
   * Получение названия типа отчета
   * @param {string} type - Тип отчета
   * @returns {string} - Название типа отчета
   */
  getReportTypeName(type) {
    switch (type) {
      case 'daily':
        return 'Ежедневный';
      case 'weekly':
        return 'Еженедельный';
      case 'monthly':
        return 'Ежемесячный';
      case 'custom':
        return 'Произвольный период';
      default:
        return type;
    }
  }

  /**
   * Генерация отчета
   */
  async generateReport() {
    try {
      // Собираем параметры отчета
      const reportParams = {
        type: this.reportType.value,
        deviceId: this.reportDevice.value,
        startDate: this.reportStartDate.value,
        endDate: this.reportEndDate.value,
        format: this.reportFormat.value
      };
      
      // Проверяем корректность дат
      const startDate = new Date(reportParams.startDate);
      const endDate = new Date(reportParams.endDate);
      
      if (startDate > endDate) {
        ui.showNotification('Начальная дата не может быть позже конечной', 'error');
        return;
      }
      
      // Показываем индикатор загрузки
      this.generateReportBtn.disabled = true;
      this.generateReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация...';
      
      // Генерируем отчет
      const response = await api.generateReport(reportParams);
      
      // Восстанавливаем кнопку
      this.generateReportBtn.disabled = false;
      this.generateReportBtn.innerHTML = '<i class="fas fa-file-export"></i> Сгенерировать отчет';
      
      // Показываем уведомление
      ui.showNotification('Отчет успешно сгенерирован', 'success');
      
      // Обновляем историю отчетов
      await this.loadReportsHistory();
      
      // Предлагаем скачать отчет
      this.showDownloadReportDialog(response.reportId, reportParams.format);
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      
      // Восстанавливаем кнопку
      this.generateReportBtn.disabled = false;
      this.generateReportBtn.innerHTML = '<i class="fas fa-file-export"></i> Сгенерировать отчет';
      
      // Показываем уведомление
      ui.showNotification('Ошибка генерации отчета', 'error');
    }
  }

  /**
   * Показ диалога скачивания отчета
   * @param {string} reportId - ID отчета
   * @param {string} format - Формат отчета
   */
  showDownloadReportDialog(reportId, format) {
    // Формируем содержимое модального окна
    const content = `
      <div class="download-report-dialog">
        <p>Отчет успешно сгенерирован. Хотите скачать его сейчас?</p>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="download-report-now">
            <i class="fas fa-download"></i> Скачать
          </button>
          <button type="button" class="btn btn-secondary" id="download-report-later">
            Позже
          </button>
        </div>
      </div>
    `;
    
    // Показываем модальное окно
    ui.showModal('Скачать отчет', content);
    
    // Добавляем обработчики кнопок
    document.getElementById('download-report-now').addEventListener('click', () => {
      this.downloadReport(reportId, format);
      ui.closeModal();
    });
    
    document.getElementById('download-report-later').addEventListener('click', () => {
      ui.closeModal();
    });
  }

  /**
   * Скачивание отчета
   * @param {string} reportId - ID отчета
   * @param {string} format - Формат отчета
   */
  async downloadReport(reportId, format) {
    try {
      // Скачиваем отчет
      await api.downloadReport(reportId, format);
      
      // Показываем уведомление
      ui.showNotification('Отчет успешно скачан', 'success');
    } catch (error) {
      console.error(`Ошибка скачивания отчета ${reportId}:`, error);
      ui.showNotification('Ошибка скачивания отчета', 'error');
    }
  }

  /**
   * Удаление отчета
   * @param {string} reportId - ID отчета
   */
  async deleteReport(reportId) {
    // Запрашиваем подтверждение
    const confirmContent = `
      <p>Вы действительно хотите удалить отчет?</p>
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
        // Удаляем отчет
        await api.delete(`/api/reports/${reportId}`);
        
        // Закрываем модальное окно
        ui.closeModal();
        
        // Показываем уведомление
        ui.showNotification('Отчет успешно удален', 'success');
        
        // Обновляем историю отчетов
        await this.loadReportsHistory();
      } catch (error) {
        console.error(`Ошибка удаления отчета ${reportId}:`, error);
        ui.showNotification('Ошибка удаления отчета', 'error');
      }
    });
    
    document.getElementById('cancel-delete').addEventListener('click', () => {
      ui.closeModal();
    });
  }
}

// Создаем экземпляр сервиса отчетов
const reports = new ReportsService();
