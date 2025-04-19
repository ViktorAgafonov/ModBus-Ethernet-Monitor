/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Модуль для работы с устройствами
 */

// Класс для работы с устройствами
class DevicesService {
  constructor() {
    // Элементы страницы устройств
    this.devicesTable = document.getElementById('devices-table');
    this.refreshDevicesBtn = document.getElementById('refresh-devices-btn');
    this.addDeviceBtn = document.getElementById('add-device-btn');
    
    // Инициализация
    this.init();
  }

  /**
   * Инициализация модуля устройств
   */
  init() {
    // Подписка на событие смены страницы
    document.addEventListener('pageChange', (e) => {
      if (e.detail.page === 'devices') {
        this.loadDevices();
      }
    });
    
    // Если текущая страница - устройства, загружаем данные
    if (document.querySelector('.page.active').id === 'devices-page') {
      this.loadDevices();
    }
    
    // Обработчик кнопки обновления
    this.refreshDevicesBtn.addEventListener('click', () => {
      this.loadDevices();
    });
    
    // Обработчик кнопки добавления устройства
    this.addDeviceBtn.addEventListener('click', () => {
      this.showDeviceForm();
    });
  }

  /**
   * Загрузка списка устройств
   */
  async loadDevices() {
    try {
      // Показываем индикатор загрузки
      this.devicesTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="7" class="text-center">Загрузка устройств...</td>
        </tr>
      `;
      
      // Получаем список устройств
      const devicesData = await api.getDevices();
      
      // Проверяем, что полученные данные являются массивом
      const devicesList = Array.isArray(devicesData) ? devicesData : 
                        (devicesData && Array.isArray(devicesData.devices)) ? devicesData.devices : [];
      
      // Записываем в журнал с детальной информацией
      if (typeof logEvent === 'function' && devicesList.length > 0) {
        // Создаем более информативные детали с данными устройств
        const devicesDetails = devicesList.map(device => {
          return {
            id: device.id,
            name: device.name,
            ip: device.ip,
            port: device.port,
            type: device.type,
            status: device.status || 'Неизвестно'
          };
        });
        
        logEvent('Информация', `Загружено ${devicesList.length} устройств`, devicesDetails);
      }
      
      // Получаем текущие данные устройств для определения статуса
      let deviceStatuses = {};
      try {
        const dataResponse = await api.get('/api/modbus/data');
        if (dataResponse && typeof dataResponse === 'object') {
          deviceStatuses = dataResponse;
        }
      } catch (dataError) {
        // Если не удалось получить данные, продолжаем с пустым объектом
        console.warn('Не удалось получить статусы устройств:', dataError);
        // Записываем ошибку в журнал
        if (typeof logError === 'function') {
          logError('Ошибка устройств', 'Не удалось получить статусы устройств', dataError.message);
        }
      }
      
      // Обогащаем список устройств информацией о статусе
      const devices = devicesList.map(device => {
        const isOnline = !!(deviceStatuses[device.id] && Object.keys(deviceStatuses[device.id]).length > 0);
        return {
          ...device,
          status: isOnline ? 'online' : 'offline'
        };
      });
      
      // Обновляем таблицу
      this.updateDevicesTable(devices);
    } catch (error) {
      console.error('Ошибка загрузки устройств:', error);
      
      // Записываем ошибку в журнал
      if (typeof logError === 'function') {
        logError('Ошибка устройств', 'Ошибка загрузки списка устройств', error.message);
      }
      
      // Показываем сообщение об ошибке
      this.devicesTable.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="7" class="text-center">Ошибка загрузки устройств: ${error.message}</td>
        </tr>
      `;
      
      ui.showNotification('Ошибка загрузки устройств', 'error');
    }
  }

  /**
   * Обновление таблицы устройств
   * @param {Array} devices - Список устройств
   */
  updateDevicesTable(devices) {
    // Получаем tbody таблицы
    const tbody = this.devicesTable.querySelector('tbody');
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    // Если нет устройств, показываем сообщение
    if (!devices || devices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">Нет доступных устройств</td>
        </tr>
      `;
      return;
    }
    
    // Добавляем строки для каждого устройства
    devices.forEach(device => {
      const row = document.createElement('tr');
      
      // Определяем статус устройства
      const statusClass = device.status === 'online' ? 'status-online' : 'status-offline';
      const statusText = device.status === 'online' ? 'Доступно' : 'Недоступно';
      
      // Определяем активность
      const enabledClass = device.enabled ? 'status-active' : 'status-inactive';
      const enabledText = device.enabled ? 'Активно' : 'Неактивно';
      
      row.innerHTML = `
        <td>${device.id}</td>
        <td>${device.name}</td>
        <td>${device.ip}</td>
        <td>${device.port}</td>
        <td>${device.unitId}</td>
        <td>
          <div class="device-status">
            <span class="status-badge ${enabledClass}">
              ${enabledText}
            </span>
            <span class="status-badge ${statusClass}">
              ${statusText}
            </span>
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary view-device-btn" data-id="${device.id}" title="Просмотр">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary edit-device-btn" data-id="${device.id}" title="Редактировать">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-device-btn" data-id="${device.id}" title="Удалить">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      // Добавляем обработчики кнопок
      row.querySelector('.view-device-btn').addEventListener('click', () => {
        this.viewDevice(device.id);
      });
      
      row.querySelector('.edit-device-btn').addEventListener('click', () => {
        this.editDevice(device.id);
      });
      
      row.querySelector('.delete-device-btn').addEventListener('click', () => {
        this.deleteDevice(device.id);
      });
      
      // Добавляем строку в таблицу
      tbody.appendChild(row);
    });
  }

  /**
   * Просмотр информации об устройстве
   * @param {string} deviceId - ID устройства
   */
  async viewDevice(deviceId) {
    try {
      // Получаем информацию об устройстве
      const device = await api.getDevice(deviceId);
      
      // Получаем текущие данные устройства
      let deviceData = null;
      try {
        deviceData = await api.getDeviceData(deviceId);
      } catch (error) {
        console.error(`Ошибка получения данных устройства ${deviceId}:`, error);
      }
      
      // Формируем содержимое модального окна
      let content = `
        <div class="device-info">
          <div class="device-info-header">
            <h4>${device.name}</h4>
            <span class="status-badge ${device.enabled ? 'status-active' : 'status-inactive'}">
              ${device.enabled ? 'Активно' : 'Неактивно'}
            </span>
          </div>
          
          <div class="device-info-section">
            <h5>Основная информация</h5>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">ID:</span>
                <span class="info-value">${device.id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Описание:</span>
                <span class="info-value">${device.description || 'Нет описания'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">IP-адрес:</span>
                <span class="info-value">${device.ip}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Порт:</span>
                <span class="info-value">${device.port}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Unit ID:</span>
                <span class="info-value">${device.unitId}</span>
              </div>
            </div>
          </div>
          
          <div class="device-info-section">
            <h5>Регистры</h5>
            <div class="registers-list">
      `;
      
      // Добавляем информацию о регистрах
      if (device.registers && device.registers.length > 0) {
        content += `
          <table class="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Адрес</th>
                <th>Тип</th>
                <th>Длина</th>
                <th>Тип данных</th>
                <th>Единица измерения</th>
                <th>Множитель</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        device.registers.forEach(register => {
          content += `
            <tr>
              <td>${register.name}</td>
              <td>${register.address}</td>
              <td>${this.getRegisterTypeName(register.type)}</td>
              <td>${register.length}</td>
              <td>${register.dataType}</td>
              <td>${register.unit || '-'}</td>
              <td>${register.multiplier || '1'}</td>
            </tr>
          `;
        });
        
        content += `
            </tbody>
          </table>
        `;
      } else {
        content += '<p>Нет настроенных регистров</p>';
      }
      
      content += `
            </div>
          </div>
      `;
      
      // Добавляем текущие данные, если они доступны
      if (deviceData && deviceData.data) {
        content += `
          <div class="device-info-section">
            <h5>Текущие данные</h5>
            <div class="current-data">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Значение</th>
                    <th>Единица измерения</th>
                    <th>Время обновления</th>
                  </tr>
                </thead>
                <tbody>
        `;
        
        for (const [key, value] of Object.entries(deviceData.data)) {
          // Находим соответствующий регистр для получения единицы измерения
          const register = device.registers.find(r => r.name === key);
          const unit = register ? register.unit : '';
          
          content += `
            <tr>
              <td>${key}</td>
              <td>${value}</td>
              <td>${unit}</td>
              <td>${new Date(deviceData.timestamp).toLocaleString()}</td>
            </tr>
          `;
        }
        
        content += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      content += `
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary edit-device-btn" data-id="${device.id}">
            <i class="fas fa-edit"></i> Редактировать
          </button>
          <button type="button" class="btn btn-secondary" id="close-device-view">
            Закрыть
          </button>
        </div>
      `;
      
      // Показываем модальное окно
      ui.showModal(`Устройство: ${device.name}`, content);
      
      // Добавляем обработчики кнопок
      document.querySelector('#close-device-view').addEventListener('click', () => {
        ui.closeModal();
      });
      
      document.querySelector('.edit-device-btn').addEventListener('click', () => {
        ui.closeModal();
        this.editDevice(device.id);
      });
    } catch (error) {
      console.error(`Ошибка получения информации об устройстве ${deviceId}:`, error);
      ui.showNotification('Ошибка получения информации об устройстве', 'error');
    }
  }

  /**
   * Получение названия типа регистра
   * @param {string} type - Тип регистра
   * @returns {string} - Название типа регистра
   */
  getRegisterTypeName(type) {
    switch (type) {
      case 'holding':
        return 'Holding Register';
      case 'input':
        return 'Input Register';
      case 'coil':
        return 'Coil';
      case 'discrete':
        return 'Discrete Input';
      default:
        return type;
    }
  }

  /**
   * Показ формы добавления/редактирования устройства
   * @param {Object} device - Данные устройства (null для нового устройства)
   */
  showDeviceForm(device = null) {
    // Формируем заголовок модального окна
    const title = device ? `Редактирование устройства: ${device.name}` : 'Добавление нового устройства';
    
    // Получаем HTML-код формы
    const content = ui.createDeviceForm(device);
    
    // Показываем модальное окно
    ui.showModal(title, content);
    
    // Получаем форму
    const form = document.getElementById('device-form');
    
    // Добавляем обработчик кнопки отмены
    document.getElementById('cancel-device-form').addEventListener('click', () => {
      ui.closeModal();
    });
    
    // Добавляем обработчик кнопки добавления регистра
    document.getElementById('add-register-btn').addEventListener('click', () => {
      const registersContainer = document.getElementById('registers-container');
      const registerIndex = registersContainer.children.length;
      
      // Создаем новый элемент регистра
      const registerElement = document.createElement('div');
      registerElement.innerHTML = ui.createEmptyRegisterTemplate(registerIndex);
      
      // Добавляем элемент в контейнер
      registersContainer.appendChild(registerElement);
      
      // Добавляем обработчик кнопки удаления регистра
      registerElement.querySelector('.remove-register-btn').addEventListener('click', (e) => {
        e.preventDefault();
        registersContainer.removeChild(registerElement);
        
        // Обновляем индексы оставшихся регистров
        this.updateRegisterIndices();
      });
    });
    
    // Добавляем обработчики кнопок удаления регистров
    document.querySelectorAll('.remove-register-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const registerItem = btn.closest('.register-item');
        registerItem.parentNode.removeChild(registerItem);
        
        // Обновляем индексы оставшихся регистров
        this.updateRegisterIndices();
      });
    });
    
    // Добавляем обработчик отправки формы
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Собираем данные формы
      const formData = new FormData(form);
      const deviceData = {
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        ip: formData.get('ip'),
        port: parseInt(formData.get('port')),
        unitId: parseInt(formData.get('unitId')),
        enabled: formData.get('enabled') === 'on',
        registers: []
      };
      
      // Собираем данные о регистрах
      const registerItems = document.querySelectorAll('.register-item');
      registerItems.forEach((item, index) => {
        const registerData = {
          name: formData.get(`registers[${index}].name`),
          address: parseInt(formData.get(`registers[${index}].address`)),
          type: formData.get(`registers[${index}].type`),
          length: parseInt(formData.get(`registers[${index}].length`)),
          dataType: formData.get(`registers[${index}].dataType`),
          unit: formData.get(`registers[${index}].unit`),
          multiplier: parseFloat(formData.get(`registers[${index}].multiplier`) || 1)
        };
        
        deviceData.registers.push(registerData);
      });
      
      try {
        let response;
        
        if (device) {
          // Обновление существующего устройства
          response = await api.updateDevice(device.id, deviceData);
          ui.showNotification(`Устройство "${deviceData.name}" успешно обновлено`, 'success');
        } else {
          // Добавление нового устройства
          response = await api.addDevice(deviceData);
          ui.showNotification(`Устройство "${deviceData.name}" успешно добавлено`, 'success');
        }
        
        // Закрываем модальное окно
        ui.closeModal();
        
        // Обновляем список устройств
        this.loadDevices();
      } catch (error) {
        console.error('Ошибка сохранения устройства:', error);
        ui.showNotification('Ошибка сохранения устройства', 'error');
      }
    });
  }

  /**
   * Обновление индексов регистров после удаления
   */
  updateRegisterIndices() {
    const registerItems = document.querySelectorAll('.register-item');
    
    registerItems.forEach((item, index) => {
      // Обновляем атрибут data-index
      item.setAttribute('data-index', index);
      
      // Обновляем заголовок
      item.querySelector('h5').textContent = `Регистр #${index + 1}`;
      
      // Обновляем id и name всех полей
      const inputs = item.querySelectorAll('input, select');
      inputs.forEach(input => {
        const name = input.getAttribute('name');
        if (name) {
          const newName = name.replace(/registers\[\d+\]/, `registers[${index}]`);
          input.setAttribute('name', newName);
        }
        
        const id = input.getAttribute('id');
        if (id) {
          const newId = id.replace(/register-[a-z]+-\d+/, `register-$1-${index}`);
          input.setAttribute('id', newId);
        }
      });
      
      // Обновляем for у label
      const labels = item.querySelectorAll('label');
      labels.forEach(label => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const newFor = forAttr.replace(/register-[a-z]+-\d+/, `register-$1-${index}`);
          label.setAttribute('for', newFor);
        }
      });
    });
  }

  /**
   * Редактирование устройства
   * @param {string} deviceId - ID устройства
   */
  async editDevice(deviceId) {
    try {
      // Получаем информацию об устройстве
      const device = await api.getDevice(deviceId);
      
      // Показываем форму редактирования
      this.showDeviceForm(device);
    } catch (error) {
      console.error(`Ошибка получения информации об устройстве ${deviceId}:`, error);
      ui.showNotification('Ошибка получения информации об устройстве', 'error');
    }
  }

  /**
   * Удаление устройства
   * @param {string} deviceId - ID устройства
   */
  async deleteDevice(deviceId) {
    // Запрашиваем подтверждение
    const confirmContent = `
      <p>Вы действительно хотите удалить устройство с ID "${deviceId}"?</p>
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
        // Удаляем устройство
        await api.deleteDevice(deviceId);
        
        // Закрываем модальное окно
        ui.closeModal();
        
        // Показываем уведомление
        ui.showNotification('Устройство успешно удалено', 'success');
        
        // Обновляем список устройств
        this.loadDevices();
      } catch (error) {
        console.error(`Ошибка удаления устройства ${deviceId}:`, error);
        ui.showNotification('Ошибка удаления устройства', 'error');
      }
    });
    
    document.getElementById('cancel-delete').addEventListener('click', () => {
      ui.closeModal();
    });
  }
}

// Создаем экземпляр сервиса устройств
const devices = new DevicesService();
