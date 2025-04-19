/**
 * ModBusEtherMon - Универсальный Монитор ModBus по Ethernet
 * Файл для запуска бэкенда и фронтенда
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Функция для логирования с временной меткой и цветом
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

// Проверка наличия необходимых директорий
function checkDirectories() {
  const requiredDirs = [
    'backend',
    'frontend',
    'configs',
    'archives',
    'logs'
  ];

  let allExist = true;

  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      log(`Директория ${dir} не найдена. Создаем...`, colors.yellow);
      fs.mkdirSync(dirPath, { recursive: true });
      allExist = false;
    }
  }

  return allExist;
}

// Запуск бэкенда
function startBackend() {
  log('Запуск бэкенда...', colors.cyan);
  
  const backendPath = path.join(__dirname, 'backend');
  const packageJsonPath = path.join(backendPath, 'package.json');
  
  // Проверяем наличие package.json
  if (!fs.existsSync(packageJsonPath)) {
    log('Файл package.json для бэкенда не найден!', colors.red);
    return null;
  }
  
  // Запускаем процесс
  const backend = spawn('npm', ['start'], {
    cwd: backendPath,
    shell: true,
    stdio: 'pipe'
  });
  
  // Обработка вывода
  backend.stdout.on('data', (data) => {
    log(`BACKEND: ${data.toString().trim()}`, colors.green);
  });
  
  backend.stderr.on('data', (data) => {
    log(`BACKEND ERROR: ${data.toString().trim()}`, colors.red);
  });
  
  // Обработка завершения процесса
  backend.on('close', (code) => {
    if (code !== 0) {
      log(`Процесс бэкенда завершился с кодом ${code}`, colors.red);
    } else {
      log('Процесс бэкенда завершен', colors.yellow);
    }
  });
  
  return backend;
}

// Запуск фронтенда
function startFrontend() {
  log('Проверка фронтенда...', colors.magenta);
  
  const frontendPath = path.join(__dirname, 'frontend');
  const packageJsonPath = path.join(frontendPath, 'package.json');
  
  // Проверяем наличие package.json
  if (!fs.existsSync(packageJsonPath)) {
    log('Фронтенд еще не реализован или package.json не найден', colors.yellow);
    return null;
  }
  
  log('Запуск фронтенда...', colors.magenta);
  
  // Запускаем процесс
  const frontend = spawn('npm', ['start'], {
    cwd: frontendPath,
    shell: true,
    stdio: 'pipe'
  });
  
  // Обработка вывода
  frontend.stdout.on('data', (data) => {
    log(`FRONTEND: ${data.toString().trim()}`, colors.blue);
  });
  
  frontend.stderr.on('data', (data) => {
    log(`FRONTEND ERROR: ${data.toString().trim()}`, colors.red);
  });
  
  // Обработка завершения процесса
  frontend.on('close', (code) => {
    if (code !== 0) {
      log(`Процесс фронтенда завершился с кодом ${code}`, colors.red);
    } else {
      log('Процесс фронтенда завершен', colors.yellow);
    }
  });
  
  return frontend;
}

// Основная функция
function main() {
  log('ModBusEtherMon - Универсальный Монитор ModBus по Ethernet', colors.bright + colors.cyan);
  log('Запуск системы...', colors.cyan);
  
  // Проверяем наличие необходимых директорий
  checkDirectories();
  
  // Запускаем бэкенд
  const backendProcess = startBackend();
  
  // Запускаем фронтенд (если есть)
  const frontendProcess = startFrontend();
  
  // Обработка завершения работы
  process.on('SIGINT', () => {
    log('Получен сигнал завершения. Останавливаем процессы...', colors.yellow);
    
    if (backendProcess) {
      backendProcess.kill();
    }
    
    if (frontendProcess) {
      frontendProcess.kill();
    }
    
    log('Все процессы остановлены. Завершение работы.', colors.yellow);
    process.exit(0);
  });
}

// Запуск
main();
