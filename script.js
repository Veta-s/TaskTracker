class StorageService {
    static getTasks() {
        try {
            return JSON.parse(localStorage.getItem('tasks')) || [];
        } catch (e) {
            console.error('Failed to parse tasks from localStorage', e);
            return [];
        }
    }

    static saveTasks(tasks) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    static getTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    static saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }
}

class TaskTracker {
    constructor() {
        this.tasks = StorageService.getTasks();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setFilter('all'); 
        this.render();
        this.updateStats();
        this.initPixelTrail();
    }

    bindEvents() {
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const filterButtons = document.querySelectorAll('.filter-buttons__button');
        const themeToggle = document.getElementById('themeToggle');
        const tasksList = document.getElementById('tasksList');

        // Переключение темы
        themeToggle.addEventListener('click', () => this.toggleTheme());

        // Проверка сохраненной темы
        if (StorageService.getTheme() === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
        }

        // Добавление задачи
        addTaskBtn.addEventListener('click', () => this.addTask());
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Делегирование событий в списке задач
        tasksList.addEventListener('click', (e) => {
            const item = e.target.closest('.tasks-list__item');
            if (!item) return;
            const id = parseInt(item.dataset.id);

            if (e.target.closest('.tasks-list__checkbox')) {
                this.toggleTask(id);
            } else if (e.target.closest('.tasks-list__delete-button')) {
                this.deleteTask(id);
            }
        });

        tasksList.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.tasks-list__item');
            if (item && e.target.classList.contains('tasks-list__text')) {
                this.startEditTask(parseInt(item.dataset.id));
            }
        });

        // Поддержка клавиатуры для чекбоксов и текста (редактирование)
        tasksList.addEventListener('keydown', (e) => {
            const item = e.target.closest('.tasks-list__item');
            if (!item) return;
            const id = parseInt(item.dataset.id);

            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('.tasks-list__checkbox')) {
                    e.preventDefault();
                    this.toggleTask(id);
                } else if (e.target.classList.contains('tasks-list__text')) {
                    e.preventDefault();
                    this.startEditTask(id);
                }
            }
        });

        // Фильтрация
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Очистка выполненных задач
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        clearCompletedBtn.addEventListener('click', () => {
            this.clearCompletedTasks();
        });

        // Интерактивная иконка
        this.initInteractiveIcon();
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        StorageService.saveTheme(isDark ? 'dark' : 'light');
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const text = taskInput.value.trim();

        if (text === '' || text.length > 50) {
            return;
        }

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        this.updateStats();
        
        // Анимация новой задачи
        const firstItem = document.querySelector('.tasks-list__item');
        if (firstItem) {
            firstItem.style.animation = 'none';
            firstItem.offsetHeight; // trigger reflow
            const animationName = document.body.classList.contains('dark-theme') ? 'highlight-dark' : 'highlight';
            firstItem.style.animation = `${animationName} 1s ease-out`;
        }
        
        taskInput.value = '';
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
            this.updateStats();
        }
    }

    deleteTask(id) {
        const taskItem = document.querySelector(`[data-id="${id}"]`);
        if (!taskItem) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
            this.updateStats();
            return;
        }

        // Анимация удаления
        taskItem.style.transform = 'translateX(50px)';
        taskItem.style.opacity = '0';
        
        // Показываем кнопку Undo (упрощенная реализация через временное удаление)
        const deletedTask = this.tasks.find(t => t.id === id);
        const taskIndex = this.tasks.indexOf(deletedTask);
        
        setTimeout(() => {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
            this.updateStats();
            
            this.showUndoToast(() => {
                this.tasks.splice(taskIndex, 0, deletedTask);
                this.saveTasks();
                this.render();
                this.updateStats();
            });
        }, 300);
    }

    showUndoToast(undoCallback) {
        const existingToast = document.querySelector('.undo-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'undo-toast';
        toast.innerHTML = `
            <span>Task deleted</span>
            <button class="undo-toast__button">Undo</button>
        `;
        
        document.body.appendChild(toast);
        
        toast.querySelector('.undo-toast__button').onclick = () => {
            undoCallback();
            toast.remove();
        };

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Обновляем активную кнопку фильтра
        document.querySelectorAll('.filter-buttons__button').forEach(btn => {
            btn.classList.remove('filter-buttons__button--active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('filter-buttons__button--active');
        
        this.render();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            default:
                return this.tasks;
        }
    }

    render() {
        const tasksList = document.getElementById('tasksList');
        const emptyState = document.getElementById('emptyState');
        const tasksSection = document.querySelector('.app__tasks-section');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '';
            tasksSection.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        tasksSection.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        tasksList.innerHTML = filteredTasks.map(task => `
            <li class="tasks-list__item ${task.completed ? 'tasks-list__item--completed' : ''}" data-id="${task.id}">
                <div class="tasks-list__checkbox ${task.completed ? 'tasks-list__checkbox--checked' : ''}" 
                     role="checkbox" 
                     aria-checked="${task.completed}" 
                     tabindex="0"
                     aria-label="Toggle task status">
                </div>
                <span class="tasks-list__text" tabindex="0">${this.escapeHtml(task.text)}</span>
                <div class="tasks-list__actions">
                    <button class="tasks-list__delete-button" aria-label="Delete task">
                        Delete
                    </button>
                </div>
            </li>
        `).join('');
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;

        document.getElementById('pendingTasks').textContent = totalTasks - completedTasks;
        
        // Показываем/скрываем кнопку "Clear completed"
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (completedTasks > 0) {
            clearCompletedBtn.style.visibility = 'visible';
        } else {
            clearCompletedBtn.style.visibility = 'hidden';
        }
    }

    saveTasks() {
        StorageService.saveTasks(this.tasks);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    clearCompletedTasks() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.render();
        this.updateStats();
    }

    // Методы редактирования задач
    startEditTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const taskItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = taskItem.querySelector('.tasks-list__text');
        
        // Создаем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tasks-list__edit-input';
        input.value = task.text;
        input.maxLength = 50;
        
        // Заменяем текст на поле ввода
        textElement.style.display = 'none';
        textElement.parentNode.insertBefore(input, textElement);
        
        // Фокусируемся и выделяем текст
        input.focus();
        input.select();
        
        // Предотвращаем срабатывание blur при клике на сам input
        input.addEventListener('mousedown', (e) => e.stopPropagation());

        // Обработчики событий
        const finishEdit = () => {
            if (input._isFinishing) return;
            input._isFinishing = true;

            const newText = input.value.trim();
            if (newText && newText !== task.text) {
                task.text = newText;
                this.saveTasks();
            }
            this.render();
            this.updateStats();
        };
        
        const cancelEdit = () => {
            this.render();
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });
    }

    // Методы интерактивной иконки
    initInteractiveIcon() {
        this.iconPosition = { x: 0, y: 0 };
        this.iconSpeed = 2;
        this.iconBounds = { minX: -50, maxX: 50, minY: -30, maxY: 30 };
        this.bindIconEvents();
    }

    bindIconEvents() {
        const emptyState = document.getElementById('emptyState');
        const icon = document.querySelector('.app__empty-icon');
        
        if (!emptyState || !icon) return;

        // Обработчик движения мыши для "убегания" иконки
        emptyState.addEventListener('mousemove', (e) => {
            this.handleIconMouseMove(e, icon);
        });

        // Обработчик клика для добавления секретной задачи
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addSecretTask();
        });
    }

    handleIconMouseMove(e, icon) {
        const rect = icon.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const iconCenterY = rect.top + rect.height / 2;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const distance = Math.sqrt(
            Math.pow(mouseX - iconCenterX, 2) + Math.pow(mouseY - iconCenterY, 2)
        );

        // Если мышь близко к иконке (в радиусе 100px), иконка "убегает"
        if (distance < 100) {
            const angle = Math.atan2(iconCenterY - mouseY, iconCenterX - mouseX);
            const moveX = Math.cos(angle) * this.iconSpeed;
            const moveY = Math.sin(angle) * this.iconSpeed;
            
            this.iconPosition.x = Math.max(this.iconBounds.minX, 
                Math.min(this.iconBounds.maxX, this.iconPosition.x + moveX));
            this.iconPosition.y = Math.max(this.iconBounds.minY, 
                Math.min(this.iconBounds.maxY, this.iconPosition.y + moveY));
            
            icon.style.transform = `translate(${this.iconPosition.x}px, ${this.iconPosition.y}px) scale(1.1)`;
        } else {
            // Плавно возвращаем иконку в исходное положение
            this.iconPosition.x *= 0.9;
            this.iconPosition.y *= 0.9;
            icon.style.transform = `translate(${this.iconPosition.x}px, ${this.iconPosition.y}px) scale(1)`;
        }
    }

    addSecretTask() {
        const secretTask = {
            id: Date.now(),
            text: 'Secret task',
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(secretTask);
        this.saveTasks();
        this.render();
        this.updateStats();
    }

    // Методы анимации пикселей
    initPixelTrail() {
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseMoveThrottle = 0;
        this.bindMouseEvents();
    }

    bindMouseEvents() {
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        document.addEventListener('click', (e) => {
            this.handleMouseClick(e);
        });
    }

    handleMouseMove(e) {
        const currentTime = Date.now();
        
        // Ограничиваем события мыши, чтобы избежать слишком много пикселей
        if (currentTime - this.mouseMoveThrottle < 50) {
            return;
        }
        this.mouseMoveThrottle = currentTime;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Вычисляем пройденное расстояние
        const distance = Math.sqrt(
            Math.pow(mouseX - this.lastMouseX, 2) + Math.pow(mouseY - this.lastMouseY, 2)
        );

        // Создаем пиксели в зависимости от скорости движения
        if (distance > 10) {
            this.createPixelTrail(mouseX, mouseY);
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }

    createPixelTrail(x, y, isRed = false) {
        const pixelContainer = document.getElementById('pixel-trail');
        const pixelCount = isRed ? 
            Math.min(Math.floor(Math.random() * 8) + 5, 12) : // 5-12 red pixels on click
            Math.min(Math.floor(Math.random() * 6) + 3, 8);   // 3-8 black pixels on move

        for (let i = 0; i < pixelCount; i++) {
            const pixel = document.createElement('div');
            pixel.className = isRed ? 'pixel-trail__pixel pixel-trail__pixel--red' : 'pixel-trail__pixel';
            
            // Случайное смещение от позиции мыши
            const offsetRange = isRed ? 30 : 20;
            const offsetX = (Math.random() - 0.5) * offsetRange;
            const offsetY = (Math.random() - 0.5) * offsetRange;
            
            pixel.style.left = (x + offsetX) + 'px';
            pixel.style.top = (y + offsetY) + 'px';
            
            // Случайное направление и расстояние рассеивания
            const angle = Math.random() * Math.PI * 2;
            const distance = isRed ? 
                Math.random() * 150 + 80 : // Red pixels scatter further
                Math.random() * 100 + 50;  // Black pixels normal distance
            const scatterX = Math.cos(angle) * distance;
            const scatterY = Math.sin(angle) * distance;
            
            pixel.style.setProperty('--scatter-x', scatterX + 'px');
            pixel.style.setProperty('--scatter-y', scatterY + 'px');
            
            // Случайный размер и прозрачность
            const size = isRed ? 
                Math.random() * 3 + 3 : // 3-6px for red pixels
                Math.random() * 2 + 2;  // 2-4px for black pixels
            const opacity = isRed ? 
                Math.random() * 0.3 + 0.7 : // 0.7-1.0 for red pixels
                Math.random() * 0.4 + 0.4;  // 0.4-0.8 for black pixels
            
            pixel.style.width = size + 'px';
            pixel.style.height = size + 'px';
            pixel.style.opacity = opacity;
            
            pixelContainer.appendChild(pixel);
            
            // Удаляем пиксель после анимации
            const animationDuration = isRed ? 1500 : 2000;
            setTimeout(() => {
                if (pixel.parentNode) {
                    pixel.parentNode.removeChild(pixel);
                }
            }, animationDuration);
        }
    }

    handleMouseClick(e) {
        this.createPixelTrail(e.clientX, e.clientY, true);
    }
}

// Инициализация приложения
let taskTracker;
document.addEventListener('DOMContentLoaded', () => {
    taskTracker = new TaskTracker();
    
    // Добавляем обработчик для очистки поля ввода при фокусе
    const taskInput = document.getElementById('taskInput');
    taskInput.addEventListener('focus', () => {
        taskInput.select();
    });
});

// Глобальные функции для использования в HTML
window.taskTracker = taskTracker;
