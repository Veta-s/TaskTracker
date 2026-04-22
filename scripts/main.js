import { TaskTracker } from './TaskTracker.js';
import { PixelTrail } from './PixelTrail.js';

document.addEventListener('DOMContentLoaded', () => {
    const pixelTrail = new PixelTrail();
    const taskTracker = new TaskTracker(pixelTrail);
    
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('focus', () => {
            taskInput.select();
        });
    }

    // Для обратной совместимости, если где-то используется глобально
    window.taskTracker = taskTracker;
});