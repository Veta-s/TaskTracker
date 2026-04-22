export class StorageService {
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