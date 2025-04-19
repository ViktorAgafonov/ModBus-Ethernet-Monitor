/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Утилита для отображения уведомлений
 */

/**
 * Отображение уведомления
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления (info, success, warning, error)
 * @param {number} duration - Длительность отображения в миллисекундах
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Проверяем, существует ли контейнер для уведомлений
  let notificationContainer = document.getElementById('notification-container');
  
  // Если контейнер не существует, создаем его
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Добавляем уведомление в контейнер
  notificationContainer.appendChild(notification);
  
  // Отображаем уведомление с анимацией
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Удаляем уведомление через указанное время
  setTimeout(() => {
    notification.classList.remove('show');
    
    // Удаляем элемент после завершения анимации
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}
