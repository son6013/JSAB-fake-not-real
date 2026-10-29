// Viewport: canvas на весь экран, чёткость через devicePixelRatio,
// масштабирование логических координат поля (CONFIG.field) с letterbox.
(function () {
  const C = window.CONFIG;

  class Viewport {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cssW = 0;
      this.cssH = 0;
      this.dpr = 1;
      this.scale = 1;   // css-пикселей на одну логическую единицу
      this.offsetX = 0; // отступ поля (css-пиксели)
      this.offsetY = 0;
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();
    }

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, C.viewport.maxDpr);
      this.cssW = window.innerWidth;
      this.cssH = window.innerHeight;
      this.canvas.width = Math.round(this.cssW * this.dpr);
      this.canvas.height = Math.round(this.cssH * this.dpr);
      this.canvas.style.width = this.cssW + 'px';
      this.canvas.style.height = this.cssH + 'px';

      // Вписываем поле 16:9 в окно, сохраняя пропорции
      this.scale = Math.min(this.cssW / C.field.width, this.cssH / C.field.height);
      this.offsetX = (this.cssW - C.field.width * this.scale) / 2;
      this.offsetY = (this.cssH - C.field.height * this.scale) / 2;
    }

    // Очистка всего экрана (в пиксельных координатах, без трансформаций)
    clear(color) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // После вызова рисуем в логических координатах поля (0..width, 0..height)
    beginField(shakeX = 0, shakeY = 0) {
      const k = this.dpr * this.scale;
      this.ctx.setTransform(
        k, 0, 0, k,
        (this.offsetX + shakeX) * this.dpr,
        (this.offsetY + shakeY) * this.dpr
      );
    }
  }

  window.Viewport = Viewport;
})();
