(function () {
  const C = window.CONFIG;

  class Player {
    constructor() {
      this.x = C.field.width / 2;
      this.y = C.field.height / 2;
      this.size = 30; // Размер кубика
      
      // Физика
      this.vx = 0;
      this.vy = 0;
      this.speed = 600; // Базовая скорость (пикселей в секунду)
      this.friction = 0.85; // Трение
      
      // Dash
      this.dashDuration = 0.5;
      this.dashCooldown = 1.0; // 1 секунда кулдауна
      this.isDashing = false;
      this.dashTimer = 0;
      this.cooldownTimer = 0;
      this.dashDirX = 0;
      this.dashDirY = 0;

      // Ввод
      this.keys = { w: false, a: false, s: false, d: false };
      this.bindInput();
    }

    bindInput() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') this.keys.w = true;
        if (e.code === 'KeyA') this.keys.a = true;
        if (e.code === 'KeyS') this.keys.s = true;
        if (e.code === 'KeyD') this.keys.d = true;
        if (e.code === 'Space') this.tryDash();
      });
      window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') this.keys.w = false;
        if (e.code === 'KeyA') this.keys.a = false;
        if (e.code === 'KeyS') this.keys.s = false;
        if (e.code === 'KeyD') this.keys.d = false;
      });
    }

    tryDash() {
      if (this.cooldownTimer <= 0 && !this.isDashing) {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        
        // Определяем направление рывка (по кнопкам, если зажаты, иначе — просто текущая скорость)
        let dx = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
        let dy = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);
        
        if (dx === 0 && dy === 0) {
          // Если кнопки не зажаты, делаем рывок туда, куда летим
          const len = Math.hypot(this.vx, this.vy);
          if (len > 0) {
            this.dashDirX = this.vx / len;
            this.dashDirY = this.vy / len;
          } else {
            this.dashDirX = 1; // По умолчанию вправо
            this.dashDirY = 0;
          }
        } else {
          const len = Math.hypot(dx, dy);
          this.dashDirX = dx / len;
          this.dashDirY = dy / len;
        }
      }
    }

    update(dt) {
      // Таймеры Dash
      if (this.isDashing) {
        this.dashTimer -= dt;
        if (this.dashTimer <= 0) {
          this.isDashing = false;
          this.cooldownTimer = this.dashCooldown;
        }
      } else if (this.cooldownTimer > 0) {
        this.cooldownTimer -= dt;
      }

      // Движение
      let moveX = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
      let moveY = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);

      if (this.isDashing) {
        // Во время рывка летим с огромной скоростью в заданном направлении
        this.x += this.dashDirX * 2000 * dt;
        this.y += this.dashDirY * 2000 * dt;
      } else {
        // Обычное движение
        const len = Math.hypot(moveX, moveY);
        if (len > 0) {
          this.vx += (moveX / len) * this.speed * 10 * dt;
          this.vy += (moveY / len) * this.speed * 10 * dt;
        }
        
        // Применяем трение
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Ограничиваем максимальную скорость
        const speedLimit = this.speed;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > speedLimit) {
          this.vx = (this.vx / currentSpeed) * speedLimit;
          this.vy = (this.vy / currentSpeed) * speedLimit;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }

      // Коллизии с границами поля
      const halfSize = this.size / 2;
      if (this.x < halfSize) { this.x = halfSize; this.vx = 0; }
      if (this.x > C.field.width - halfSize) { this.x = C.field.width - halfSize; this.vx = 0; }
      if (this.y < halfSize) { this.y = halfSize; this.vy = 0; }
      if (this.y > C.field.height - halfSize) { this.y = C.field.height - halfSize; this.vy = 0; }
    }

    draw(ctx) {
      ctx.save();
      
      // Визуал: если рывок — кубик становится белым, иначе — циан
      const color = this.isDashing ? '#ffffff' : '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      
      // Отрисовка кубика (центр в this.x, this.y)
      const halfSize = this.size / 2;
      ctx.fillRect(this.x - halfSize, this.y - halfSize, this.size, this.size);

      ctx.restore();
    }
  }

  window.Player = Player;
})();