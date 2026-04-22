import { StorageService } from './StorageService.js';

export class TaskTracker {
    constructor(pixelTrail) {
        this.tasks = StorageService.getTasks();
        this.currentFilter = 'all';
        this.pixelTrail = pixelTrail;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setFilter('all'); 
        this.render();
        this.updateStats();
        if (this.pixelTrail) {
            this.pixelTrail.init();
        }
    }

    bindEvents() {
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const filterButtons = document.querySelectorAll('.filter-buttons__button');
        const themeToggle = document.getElementById('themeToggle');
        const tasksList = document.getElementById('tasksList');

        themeToggle.addEventListener('click', () => this.toggleTheme());

        if (StorageService.getTheme() === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
        }

        addTaskBtn.addEventListener('click', () => this.addTask());
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        taskInput.addEventListener('input', () => this.handleInput(taskInput));
        taskInput.addEventListener('keydown', (e) => {
            if (taskInput.value.length >= 50 && 
                e.key !== 'Backspace' && 
                e.key !== 'Delete' && 
                e.key !== 'ArrowLeft' && 
                e.key !== 'ArrowRight' &&
                !e.ctrlKey && !e.metaKey) {
                this.shakeInput(taskInput);
            }
        });

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

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        clearCompletedBtn.addEventListener('click', () => {
            this.clearCompletedTasks();
        });

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
        this.handleInput(taskInput); 
        
        const firstItem = document.querySelector('.tasks-list__item');
        if (firstItem) {
            firstItem.style.animation = 'none';
            firstItem.offsetHeight; 
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

        taskItem.style.transform = 'translateX(50px)';
        taskItem.style.opacity = '0';
        
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
        
        document.querySelectorAll('.filter-buttons__button').forEach(btn => {
            btn.classList.remove('filter-buttons__button--active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeBtn) activeBtn.classList.add('filter-buttons__button--active');
        
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

    handleInput(input) {
        const length = input.value.length;
        input.classList.remove('input-group__field--warning', 'input-group__field--error');

        if (length >= 50) {
            input.classList.add('input-group__field--error');
        } else if (length >= 40) {
            input.classList.add('input-group__field--warning');
        }
    }

    shakeInput(input) {
        input.classList.remove('input-group__field--shake');
        input.offsetHeight; 
        input.classList.add('input-group__field--shake');
        
        setTimeout(() => {
            input.classList.remove('input-group__field--shake');
        }, 400);
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

    startEditTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const taskItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = taskItem.querySelector('.tasks-list__text');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tasks-list__edit-input';
        input.value = task.text;
        input.maxLength = 50;
        
        textElement.style.display = 'none';
        textElement.parentNode.insertBefore(input, textElement);
        
        input.focus();
        input.select();
        
        input.addEventListener('mousedown', (e) => e.stopPropagation());

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
        
        input.addEventListener('input', () => this.handleInput(input));
        input.addEventListener('keydown', (e) => {
            if (input.value.length >= 50 && 
                e.key !== 'Backspace' && 
                e.key !== 'Delete' && 
                e.key !== 'ArrowLeft' && 
                e.key !== 'ArrowRight' &&
                !e.ctrlKey && !e.metaKey && e.key !== 'Enter' && e.key !== 'Escape') {
                this.shakeInput(input);
            }
        });

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });
    }

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

        emptyState.addEventListener('mousemove', (e) => {
            this.handleIconMouseMove(e, icon);
        });

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
}