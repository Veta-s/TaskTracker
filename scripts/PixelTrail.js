export class PixelTrail {
    constructor() {
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseMoveThrottle = 0;
    }

    init() {
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
        if (currentTime - this.mouseMoveThrottle < 50) return;
        this.mouseMoveThrottle = currentTime;

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const distance = Math.sqrt(
            Math.pow(mouseX - this.lastMouseX, 2) + Math.pow(mouseY - this.lastMouseY, 2)
        );

        if (distance > 10) {
            this.createPixelTrail(mouseX, mouseY);
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }

    createPixelTrail(x, y, isRed = false) {
        const pixelContainer = document.getElementById('pixel-trail');
        if (!pixelContainer) return;

        const pixelCount = isRed ? 
            Math.min(Math.floor(Math.random() * 8) + 5, 12) : 
            Math.min(Math.floor(Math.random() * 6) + 3, 8);

        for (let i = 0; i < pixelCount; i++) {
            const pixel = document.createElement('div');
            pixel.className = isRed ? 'pixel-trail__pixel pixel-trail__pixel--red' : 'pixel-trail__pixel';
            
            const offsetRange = isRed ? 30 : 20;
            const offsetX = (Math.random() - 0.5) * offsetRange;
            const offsetY = (Math.random() - 0.5) * offsetRange;
            
            pixel.style.left = (x + offsetX) + 'px';
            pixel.style.top = (y + offsetY) + 'px';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = isRed ? Math.random() * 150 + 80 : Math.random() * 100 + 50;
            const scatterX = Math.cos(angle) * distance;
            const scatterY = Math.sin(angle) * distance;
            
            pixel.style.setProperty('--scatter-x', scatterX + 'px');
            pixel.style.setProperty('--scatter-y', scatterY + 'px');
            
            const size = isRed ? Math.random() * 3 + 3 : Math.random() * 2 + 2;
            const opacity = isRed ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4 + 0.4;
            
            pixel.style.width = size + 'px';
            pixel.style.height = size + 'px';
            pixel.style.opacity = opacity;
            
            pixelContainer.appendChild(pixel);
            
            setTimeout(() => {
                if (pixel.parentNode) {
                    pixel.parentNode.removeChild(pixel);
                }
            }, isRed ? 1500 : 2000);
        }
    }

    handleMouseClick(e) {
        this.createPixelTrail(e.clientX, e.clientY, true);
    }
}