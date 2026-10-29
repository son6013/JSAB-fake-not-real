(function () {
  window.Obstacle = class {
    constructor(x, y, width, height, speedX, speedY) {
      this.x = x;
      this.y = y;
      this.w = width;
      this.h = height;
      this.vx = speedX;
      this.vy = speedY;
      this.dead = false;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Если препятствие улетело далеко за экран — удаляем его
      if (this.x > 2000 || this.x < -500 || this.y > 2000 || this.y < -500) {
        this.dead = true;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff2bd6'; // Магента
      ctx.fillStyle = '#ff2bd6';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.restore();
    }

    // Проверка столкновения AABB (прямоугольник с прямоугольником)
    collidesWith(player) {
      const pSize = player.size;
      const px = player.x - pSize / 2;
      const py = player.y - pSize / 2;
      return (
        px < this.x + this.w &&
        px + pSize > this.x &&
        py < this.y + this.h &&
        py + pSize > this.y
      );
    }
  };
})();