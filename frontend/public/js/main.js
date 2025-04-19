/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Главный файл инициализации приложения
 */

// Функция инициализации приложения
function initApp() {
  console.log('Инициализация приложения ModBusEtherMon...');
  
  // Проверяем, есть ли сохраненная активная страница
  const activePage = localStorage.getItem('activePage') || 'dashboard';
  
  // Показываем активную страницу
  ui.showPage(activePage);
  
  // Проверяем соединение с сервером
  checkServerConnection();
}

// Функция проверки соединения с сервером
async function checkServerConnection() {
  try {
    const isConnected = await api.checkConnection();
    
    if (isConnected) {
      console.log('Соединение с сервером установлено');
      
      // Если пользователь авторизован, загружаем информацию о нем
      if (auth.token) {
        await auth.loadUserInfo();
      }
    } else {
      console.error('Нет соединения с сервером');
      ui.showNotification('Нет соединения с сервером. Проверьте настройки подключения.', 'error');
    }
  } catch (error) {
    console.error('Ошибка проверки соединения с сервером:', error);
    ui.showNotification('Ошибка проверки соединения с сервером', 'error');
  }
}

// Запуск приложения после загрузки страницы
document.addEventListener('DOMContentLoaded', initApp);

// Обработка ошибок
window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);
  ui.showNotification('Произошла ошибка в приложении', 'error');
  
  // Записываем ошибку в журнал
  if (typeof logError === 'function') {
    logError('Глобальная ошибка', event.error ? event.error.message : 'Неизвестная ошибка', event.error ? event.error.stack : null);
  }
});

// Обработка необработанных отклонений промисов
window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанное отклонение промиса:', event.reason);
  ui.showNotification('Произошла ошибка в приложении', 'error');
  
  // Записываем ошибку в журнал
  if (typeof logError === 'function') {
    logError('Необработанное отклонение промиса', event.reason ? event.reason.message : 'Неизвестная ошибка', event.reason ? event.reason.stack : null);
  }
});
