/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с панелью мониторинга
 */

// Класс для работы с панелью мониторинга
class DashboardService {
  constructor() {
    // Элементы панели мониторинга
    this.devicesCount = document.getElementById('devices-count');
    this.pollsCount = document.getElementById('polls-count');
    this.errorsCount = document.getElementById('errors-count');
    this.archivesCount = document.getElementById('archives-count');
    this.devicesStatus = document.getElementById('devices-status');
    
    // График активности
    this.activityChart = null;
    
    // Интервал обновления данных
    this.updateInterval = null;
    
    // Инициализация
    this.init();
  }

  /**
   * Инициализация панели мониторинга
   */
  async init() {
    // Подписка на событие смены страницы
    document.addEventListener('pageChange', (e) => {
      if (e.detail.page === 'dashboard') {
        // При переходе на страницу панели мониторинга
        this.loadDashboardData();
        this.startAutoUpdate();
      } else {
        // При переходе на другую страницу
        this.stopAutoUpdate();
        
        // Уничтожаем график, чтобы освободить ресурсы
        if (this.activityChart) {
          this.activityChart.destroy();
          this.activityChart = null;
        }
      }
    });
    
    // Если текущая страница - панель мониторинга, загружаем данные
    if (document.querySelector('.page.active').id === 'dashboard-page') {
      this.loadDashboardData();
      this.startAutoUpdate();
    }
  }

  /**
   * Загрузка данных для панели мониторинга
   */
  async loadDashboardData() {
    try {
      // Получаем данные о устройствах
      const devicesData = await api.getDevices();
      
      // Обновляем счетчики
      this.updateCounters(devicesData);
      
      // Обновляем статус устройств
      this.updateDevicesStatus(devicesData);
      
      // Инициализируем график активности только при первой загрузке
      // или при переходе на страницу панели мониторинга
      if (!this.activityChart) {
        this.initActivityChart();
      }
      
    } catch (error) {
      console.error('Ошибка загрузки данных для панели мониторинга:', error);
      ui.showNotification('Ошибка загрузки данных для панели мониторинга', 'error');
      
      // Если произошла ошибка и график не создан, создаем пустой график
      if (!this.activityChart) {
        this.initActivityChart();
      }
    }
  }

  /**
   * Обновление счетчиков на панели мониторинга
   * @param {Object} data - Данные для обновления
   */
  async updateCounters(data) {
    try {
      // Количество активных устройств
      const activeDevices = data && data.devices ? data.devices.filter(device => device.enabled).length : 0;
      this.devicesCount.textContent = `${activeDevices} активных`;
      
      // Проверяем наличие эндпойнта статистики
      try {
        const stats = await api.get('/api/modbus/stats');
        this.pollsCount.textContent = `${stats && stats.totalPolls ? stats.totalPolls : 0} сегодня`;
        this.errorsCount.textContent = `${stats && stats.errors ? stats.errors : 0} ошибок`;
      } catch (error) {
        console.warn('Эндпойнт статистики недоступен:', error.message);
        // Устанавливаем значения по умолчанию
        this.pollsCount.textContent = 'Н/Д';
        this.errorsCount.textContent = 'Н/Д';
      }
      
      // Получаем список архивов
      try {
        const archives = await api.get('/api/archives');
        this.archivesCount.textContent = `${archives && archives.archives ? archives.archives.length : 0} файлов`;
      } catch (error) {
        console.warn('Ошибка получения списка архивов:', error.message);
        this.archivesCount.textContent = 'Н/Д';
      }
    } catch (error) {
      console.error('Ошибка обновления счетчиков:', error);
      // Устанавливаем значения по умолчанию в случае ошибки
      this.devicesCount.textContent = 'Н/Д';
      this.pollsCount.textContent = 'Н/Д';
      this.errorsCount.textContent = 'Н/Д';
      this.archivesCount.textContent = 'Н/Д';
    }
  }

  /**
   * Обновление статуса устройств
   * @param {Object} data - Данные для обновления
   */
  async updateDevicesStatus(data) {
    // Очищаем контейнер
    this.devicesStatus.innerHTML = '';
    
    if (!data.devices || data.devices.length === 0) {
      this.devicesStatus.innerHTML = `
        <div class="device-status-card">
          <div class="device-status-header">
            <h4>Нет доступных устройств</h4>
          </div>
        </div>
      `;
      return;
    }
    
    // Для каждого устройства получаем текущие данные и создаем карточку
    for (const device of data.devices) {
      try {
        // Создаем карточку устройства
        const deviceCard = document.createElement('div');
        deviceCard.className = 'device-status-card';
        deviceCard.innerHTML = `
          <div class="device-status-header">
            <h4>${device.name}</h4>
            <span class="device-status ${device.enabled ? 'online' : 'offline'}">
              <i class="fas ${device.enabled ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </span>
          </div>
          <div class="device-status-body">
            <div class="device-status-item">
              <span class="label">ID:</span>
              <span class="value">${device.id}</span>
            </div>
            <div class="device-status-item">
              <span class="label">IP:</span>
              <span class="value">${device.ip}:${device.port}</span>
            </div>
            <div class="device-status-item">
              <span class="label">Unit ID:</span>
              <span class="value">${device.unitId}</span>
            </div>
            <div class="device-status-item">
              <span class="label">Статус:</span>
              <span class="value">${device.enabled ? 'Включено' : 'Отключено'}</span>
            </div>
          </div>
        `;
        
        // Если устройство включено, получаем текущие данные
        if (device.enabled) {
          try {
            const deviceData = await api.getDeviceData(device.id);
            
            // Добавляем данные в карточку
            const dataContainer = document.createElement('div');
            dataContainer.className = 'device-data';
            
            if (deviceData && deviceData.data) {
              // Создаем таблицу с данными
              const dataTable = document.createElement('table');
              dataTable.className = 'device-data-table';
              dataTable.innerHTML = `
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Значение</th>
                  </tr>
                </thead>
                <tbody></tbody>
              `;
              
              const tbody = dataTable.querySelector('tbody');
              
              // Добавляем строки с данными
              for (const [key, value] of Object.entries(deviceData.data)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${key}</td>
                  <td>${value}</td>
                `;
                tbody.appendChild(row);
              }
              
              dataContainer.appendChild(dataTable);
            } else {
              dataContainer.innerHTML = '<p>Нет данных</p>';
            }
            
            deviceCard.querySelector('.device-status-body').appendChild(dataContainer);
          } catch (error) {
            console.error(`Ошибка получения данных устройства ${device.id}:`, error);
            
            // Добавляем сообщение об ошибке
            const errorContainer = document.createElement('div');
            errorContainer.className = 'device-error';
            errorContainer.innerHTML = `
              <p>Ошибка получения данных: ${error.message}</p>
            `;
            
            deviceCard.querySelector('.device-status-body').appendChild(errorContainer);
          }
        }
        
        // Добавляем карточку в контейнер
        this.devicesStatus.appendChild(deviceCard);
      } catch (error) {
        console.error(`Ошибка обработки устройства ${device.id}:`, error);
      }
    }
  }

  /**
   * Инициализация графика активности
   */
  async initActivityChart() {
    // Проверяем, что мы находимся на странице дашборда
    const dashboardPage = document.getElementById('dashboard-page');
    if (!dashboardPage || !dashboardPage.classList.contains('active')) {
      // Не инициализируем график, если мы не на странице дашборда
      return;
    }
    
    // Получаем контекст графика
    const canvas = document.getElementById('activity-chart');
    if (!canvas) {
      console.error('Элемент графика не найден');
      return;
    }
    
    // Уничтожаем предыдущий экземпляр графика, если он существует
    try {
      if (this.activityChart) {
        this.activityChart.destroy();
        this.activityChart = null;
      }
      
      // Также проверим, есть ли другие графики с этим же ID в Chart.js
      const chartInstance = Chart.getChart(canvas);
      if (chartInstance) {
        chartInstance.destroy();
      }
    } catch (error) {
      console.error('Ошибка при очистке предыдущего графика:', error);
    }
    
    const ctx = canvas.getContext('2d');
    
    try {
      // Получаем данные для графика
      const data = await api.get('/api/modbus/stats/hourly')
        .catch(error => {
          console.error('Ошибка получения данных для графика:', error);
          // Возвращаем пустой массив в случае ошибки
          return [];
        });
      
      // Подготавливаем данные для графика
      const labels = [];
      const pollsData = [];
      const errorsData = [];
      
      // Заполняем данные по часам
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const hour = i;
        labels.push(`${hour}:00`);
        
        // Находим данные для текущего часа
        const date = new Date(now);
        date.setHours(hour, 0, 0, 0);
        
        const hourData = Array.isArray(data) ? data.find(item => {
          if (!item || !item.timestamp) return false;
          const itemDate = new Date(item.timestamp);
          return itemDate.getHours() === date.getHours() && 
                 itemDate.getDate() === date.getDate() && 
                 itemDate.getMonth() === date.getMonth();
        }) : null;
        
        pollsData.push(hourData ? hourData.polls : 0);
        errorsData.push(hourData ? hourData.errors : 0);
      }
      
      // Создаем график
      this.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Опросы',
              data: pollsData,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Ошибки',
              data: errorsData,
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Ошибка инициализации графика активности:', error);
      
      // Создаем пустой график
      this.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(24).fill(0).map((_, i) => `${i}:00`),
          datasets: [
            {
              label: 'Опросы',
              data: Array(24).fill(0),
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Ошибки',
              data: Array(24).fill(0),
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }
  }

  /**
   * Запуск автоматического обновления данных
   */
  startAutoUpdate() {
    // Получаем интервал обновления из настроек
    const refreshInterval = parseInt(localStorage.getItem('refreshInterval')) || 5000;
    
    // Запускаем интервал обновления
    this.updateInterval = setInterval(() => {
      this.loadDashboardData();
    }, refreshInterval);
  }

  /**
   * Остановка автоматического обновления данных
   */
  stopAutoUpdate() {
    // Останавливаем интервал обновления
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Создаем экземпляр сервиса панели мониторинга
const dashboard = new DashboardService();
