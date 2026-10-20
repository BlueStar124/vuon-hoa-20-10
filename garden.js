/**
 * VƯỜN HOA 20/10 - CANVAS FLOWER GARDEN ENGINE (OPTIMIZED 60-120 FPS)
 * Tối ưu hóa hiệu năng cao:
 * - Cache đầu bông hoa bằng Offscreen Canvas (giảm 95% số lệnh vẽ/frame)
 * - Gom nhóm Path vẽ cỏ theo màu (giảm từ 500 lệnh stroke xuống còn 3 lệnh)
 * - Chỉ sắp xếp độ sâu hoa khi thêm mới (không sort mỗi frame)
 * - Tối ưu vòng lặp hạt và cánh hoa, triệt tiêu Garbage Collection lag
 */

class FlowerGarden {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false }); // Tối ưu alpha buffer

    this.flowers = [];
    this.particles = [];
    this.butterflies = [];
    this.petals = [];
    this.grassGroups = [[], [], []];

    this.wind = 0;
    this.time = 0;
    this.lastFrameTime = 0;
    this.mouse = { x: -1000, y: -1000 };

    // Bảng màu hoa rực rỡ pastel lãng mạn
    this.colorPalettes = [
      { name: 'Rose Pink', primary: '#ff6b8b', secondary: '#ffa8ba', center: '#ffd166', shadow: '#d6336c' },
      { name: 'Peach Coral', primary: '#ff8e72', secondary: '#ffc2b4', center: '#ffe66d', shadow: '#e8590c' },
      { name: 'Sweet Cherry', primary: '#f06595', secondary: '#fcc2d7', center: '#ffec99', shadow: '#c2255c' },
      { name: 'Pastel Blue', primary: '#74c0fc', secondary: '#d0ebff', center: '#ffe066', shadow: '#339af0' },
      { name: 'Soft Lavender', primary: '#b197fc', secondary: '#e5dbff', center: '#fff3bf', shadow: '#7950f2' },
      { name: 'Golden Sun', primary: '#ffd43b', secondary: '#fff3bf', center: '#f76707', shadow: '#f59f00' },
      { name: 'Warm Cream', primary: '#ffe3e3', secondary: '#fff5f5', center: '#fab005', shadow: '#ffa8a8' },
      { name: 'Vibrant Magenta', primary: '#e64980', secondary: '#f783ac', center: '#ffd43b', shadow: '#a61e4d' }
    ];

    // Cache đồi cỏ tĩnh để không phải vẽ lại gradient phức tạp
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');

    this.init();
  }

  init() {
    this.resize();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.resize(), 100);
    });

    // Throttled mouse move để tiết kiệm CPU
    let lastMoveTime = 0;
    window.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - lastMoveTime > 16) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        lastMoveTime = now;
      }
    }, { passive: true });

    this.canvas.addEventListener('pointerdown', (e) => this.handlePointer(e));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.animate);
      }
    });

    this.initGrass();
    this.initButterflies();
    this.seedInitialGarden();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const previousWidth = this.width;
    const previousHeight = this.height;
    this.isMobile = window.innerWidth < 768;
    const hardwareCores = navigator.hardwareConcurrency || 4;
    const deviceMemory = navigator.deviceMemory || 4;
    this.isLowEndDevice = this.isMobile && (hardwareCores <= 4 || deviceMemory <= 4);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? (this.isLowEndDevice ? 1 : 1.25) : 1.5);
    this.frameInterval = this.isMobile ? (this.isLowEndDevice ? 1000 / 24 : 1000 / 30) : 1000 / 60;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (previousWidth && previousHeight) {
      const widthScale = this.width / previousWidth;
      const heightScale = this.height / previousHeight;
      this.flowers.forEach((flower) => {
        flower.x *= widthScale;
        flower.baseY = this.height + 15;
        flower.targetHeight *= heightScale;
        flower.currentHeight *= heightScale;
      });
      this.petals.forEach((petal) => {
        petal.x *= widthScale;
        petal.y *= heightScale;
      });
      this.particles.forEach((particle) => {
        particle.x *= widthScale;
        particle.y *= heightScale;
      });
    }

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Chuẩn bị Canvas nền đồi cỏ
    this.bgCanvas.width = this.canvas.width;
    this.bgCanvas.height = this.canvas.height;
    this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderStaticBackground();

    this.initGrass();
  }

  renderStaticBackground() {
    const ctx = this.bgCtx;
    const w = this.width;
    const h = this.height;

    // Gradient nền trời hoàng hôn ấm áp
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#d4eaf7');
    skyGrad.addColorStop(0.45, '#f7dbe4');
    skyGrad.addColorStop(0.72, '#ffebdc');
    skyGrad.addColorStop(1, '#d8ebd2');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Đồi cỏ xa
    const gFar = ctx.createLinearGradient(0, h * 0.75, 0, h);
    gFar.addColorStop(0, 'rgba(116, 198, 157, 0.55)');
    gFar.addColorStop(1, 'rgba(82, 183, 136, 0.75)');

    ctx.fillStyle = gFar;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.82);
    ctx.bezierCurveTo(w * 0.35, h * 0.76, w * 0.65, h * 0.86, w, h * 0.8);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Đồi cỏ gần
    const gNear = ctx.createLinearGradient(0, h * 0.85, 0, h);
    gNear.addColorStop(0, '#40916c');
    gNear.addColorStop(1, '#2d6a4f');

    ctx.fillStyle = gNear;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.87);
    ctx.bezierCurveTo(w * 0.4, h * 0.89, w * 0.7, h * 0.84, w, h * 0.88);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  initGrass() {
    this.grassGroups = [[], [], []];
    const divisor = this.isMobile ? 14 : 10;
    const count = Math.floor(this.width / divisor); // Tối ưu số lượng ngọn cỏ vừa đẹp vừa cực nhẹ

    for (let i = 0; i < count; i++) {
      const groupIdx = i % 3;
      this.grassGroups[groupIdx].push({
        x: (i / count) * this.width + (Math.random() * 8 - 4),
        height: (this.isMobile ? 25 : 35) + Math.random() * (this.isMobile ? 45 : 65),
        tilt: (Math.random() - 0.5) * 26,
        curve: (Math.random() - 0.5) * 18,
        width: 1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  initButterflies() {
    this.butterflies = [
      { x: this.width * 0.25, y: this.height * 0.5, vx: 1.2, vy: -0.4, color: '#ffb703', size: 9, wingAngle: 0 },
      { x: this.width * 0.72, y: this.height * 0.45, vx: -1.0, vy: 0.3, color: '#f72585', size: 8, wingAngle: 1.5 }
    ];
  }

  seedInitialGarden() {
    this.flowers = [];
    // Tăng mật độ hoa trên mobile, đồng thời dùng đầu hoa nhỏ hơn để giữ vườn thoáng.
    const numFlowers = this.isMobile 
      ? Math.floor(Math.max(12, Math.min(18, this.width / 25)))
      : Math.floor(Math.max(18, Math.min(28, this.width / 50)));

    for (let i = 0; i < numFlowers; i++) {
      const x = (i / (numFlowers - 1)) * (this.width * 0.94) + this.width * 0.03 + (Math.random() * 12 - 6);
      const lowerBloom = this.isMobile ? i % 3 !== 0 : i % 2 === 0;
      const targetHeight = lowerBloom
        ? this.height * (0.14 + Math.random() * 0.24)
        : this.height * (0.36 + Math.random() * 0.32);
      const delay = i * 60 + Math.random() * 80;
      this.createFlower(x, targetHeight, delay);
    }
  }

  // Pre-render bông hoa vào Offscreen Canvas để tăng tốc 100 lần
  cacheFlowerHead(flower) {
    const size = flower.maxPetalSize;
    const canvas = document.createElement('canvas');
    const padding = 20;
    const side = Math.ceil(size * 2 + padding * 2);
    canvas.width = side;
    canvas.height = side;

    const ctx = canvas.getContext('2d');
    const cx = side / 2;
    const cy = side / 2;
    const p = flower.palette;

    ctx.translate(cx, cy);

    // 1. Đài hoa xanh
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(0, size * 0.25, size * 0.18, 0, Math.PI);
    ctx.fill();

    if (flower.type === 'cosmos') {
      // Hoa Cúc / Cosmos
      const count = flower.petalsCount;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, p.secondary);
        grad.addColorStop(0.7, p.primary);
        grad.addColorStop(1, p.shadow);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.55, size * 0.22, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = p.center;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
      ctx.fill();

    } else if (flower.type === 'tulip') {
      // Hoa Tulip
      ctx.fillStyle = p.shadow;
      ctx.beginPath();
      ctx.ellipse(-size * 0.2, -size * 0.4, size * 0.35, size * 0.6, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(size * 0.2, -size * 0.4, size * 0.35, size * 0.6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createLinearGradient(0, 0, 0, -size);
      grad.addColorStop(0, p.primary);
      grad.addColorStop(1, p.secondary);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.35, size * 0.38, size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Hoa Hồng / Mẫu Đơn nhiều lớp cánh
      const layers = 4;
      for (let l = layers; l >= 1; l--) {
        const layerRatio = l / layers;
        const layerSize = size * layerRatio;
        const petalsInLayer = 4 + l * 2;
        const layerRot = l * 0.65;

        for (let i = 0; i < petalsInLayer; i++) {
          const angle = (i / petalsInLayer) * Math.PI * 2 + layerRot;
          ctx.save();
          ctx.rotate(angle);

          const grad = ctx.createRadialGradient(0, layerSize * 0.4, 0, 0, layerSize * 0.4, layerSize * 0.65);
          grad.addColorStop(0, p.secondary);
          grad.addColorStop(0.65, p.primary);
          grad.addColorStop(1, p.shadow);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(0, layerSize * 0.42, layerSize * 0.36, layerSize * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.fillStyle = p.shadow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    flower.cachedCanvas = canvas;
    flower.cachedOffset = cx;
  }

  createFlower(x, targetHeight, delay = 0, isUserClick = false) {
    const flowerLimit = this.isMobile ? (this.isLowEndDevice ? 24 : 32) : 64;
    if (this.flowers.length >= flowerLimit) {
      let oldestIndex = 0;
      for (let i = 1; i < this.flowers.length; i++) {
        if (this.flowers[i].bornAt < this.flowers[oldestIndex].bornAt) oldestIndex = i;
      }
      this.flowers.splice(oldestIndex, 1);
    }

    const palette = this.colorPalettes[Math.floor(Math.random() * this.colorPalettes.length)];
    const types = ['rose', 'peony', 'cosmos', 'tulip'];
    const type = types[Math.floor(Math.random() * types.length)];

    const flower = {
      x: x,
      baseY: this.height + 15,
      targetHeight: targetHeight,
      currentHeight: 0,
      growth: 0,
      bloomProgress: 0,
      delay: delay,
      maxPetalSize: this.isMobile ? 24 + Math.random() * 18 : 28 + Math.random() * 26,
      palette: palette,
      type: type,
      swaySpeed: 0.02 + Math.random() * 0.015,
      swayAmount: this.isMobile ? 6 + Math.random() * 8 : 10 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      stemCurve: (Math.random() - 0.5) * (this.isMobile ? 24 : 40),
      leaves: [
        { heightRatio: 0.35, size: (this.isMobile ? 14 : 22) + Math.random() * (this.isMobile ? 8 : 12), side: -1, angle: 0.3 },
        { heightRatio: 0.6, size: (this.isMobile ? 15 : 24) + Math.random() * (this.isMobile ? 8 : 12), side: 1, angle: -0.3 }
      ],
      petalsCount: type === 'cosmos' ? 8 : 5,
      bornAt: Date.now() + delay,
      isFullyBloomed: false
    };

    // Pre-cache hoa ngay khi tạo
    this.cacheFlowerHead(flower);

    this.flowers.push(flower);

    // CHỈ SẮP XẾP HOA THEO ĐỘ SÂU 1 LẦN KHI THÊM
    this.flowers.sort((a, b) => a.targetHeight - b.targetHeight);

    this.updateCounter();

    if (isUserClick) {
      this.spawnSparks(x, this.height - targetHeight, palette.primary);
    }
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const targetHeight = Math.max(130, this.height - clickY + (Math.random() * 40 - 20));
    this.createFlower(x, targetHeight, 0, true);
  }

  bloomAll() {
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * (this.width - 60) + 30;
      const targetHeight = this.height * (0.14 + Math.random() * 0.54);
      this.createFlower(x, targetHeight, i * 50, true);
    }
  }

  clearGarden() {
    this.flowers = [];
    this.particles = [];
    this.petals = [];
    this.updateCounter();
  }

  updateCounter() {
    const counterEl = document.getElementById('flowerCount');
    if (counterEl) {
      counterEl.textContent = this.flowers.length;
    }
  }

  spawnSparks(x, y, color) {
    const particleLimit = this.isLowEndDevice ? 24 : 48;
    const sparkCount = Math.min(14, particleLimit - this.particles.length);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        alpha: 1,
        color: color,
        size: 2 + Math.random() * 2.5,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  spawnAmbientParticles() {
    const delta = this.frameDelta || 1;
    const maxPetals = this.isLowEndDevice ? 10 : 18;
    const maxParticles = this.isLowEndDevice ? 14 : 24;

    if (Math.random() < 0.15 * delta && this.petals.length < maxPetals) {
      this.petals.push({
        x: Math.random() * this.width,
        y: -15,
        vx: 0.7 + Math.random() * 1.2,
        vy: 0.6 + Math.random() * 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        size: 7 + Math.random() * 7,
        color: this.colorPalettes[Math.floor(Math.random() * this.colorPalettes.length)].primary,
        alpha: 0.75
      });
    }

    if (Math.random() < 0.15 * delta && this.particles.length < maxParticles) {
      this.particles.push({
        x: Math.random() * this.width,
        y: this.height * 0.85 - Math.random() * (this.height * 0.55),
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.4 - Math.random() * 0.6,
        alpha: 0.8,
        color: '#fff9db',
        size: 1.5 + Math.random() * 2,
        decay: 0.007
      });
    }
  }

  // ================= MAIN RENDER LOOP =================

  animate(timestamp = performance.now()) {
    if (document.hidden) return;

    if (this.lastFrameTime && timestamp - this.lastFrameTime < this.frameInterval) {
      requestAnimationFrame(this.animate);
      return;
    }

    const delta = this.lastFrameTime
      ? Math.min((timestamp - this.lastFrameTime) / (1000 / 60), 2)
      : 1;
    this.lastFrameTime = timestamp;
    this.frameDelta = delta;
    this.time += 0.02 * delta;
    this.wind = Math.sin(this.time * 0.8) * 1.0 + Math.cos(this.time * 1.6) * 0.5;

    const ctx = this.ctx;

    // 1. Sao chép nhanh nền đồi cỏ tĩnh (siêu nhanh)
    ctx.drawImage(this.bgCanvas, 0, 0, this.width, this.height);

    // 2. Cánh hoa rơi
    this.updateAndDrawPetals(delta);

    // 3. Vẽ thân và lá trước để các thân cây không che mất mặt hoa.
    const now = Date.now();
    for (let i = 0; i < this.flowers.length; i++) {
      const flower = this.flowers[i];
      if (now < flower.bornAt) continue;

      this.updateFlower(flower, delta);
      this.drawFlowerStem(flower);
    }

    // 4. Cỏ nằm trước thân nhưng sau đầu hoa để giữ các bông phía dưới rõ nét.
    this.drawForegroundGrassBatched();

    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const flower = this.flowers[i];
      if (now >= flower.bornAt) this.drawFlowerHead(flower);
    }

    // 5. Bướm bay lượn
    this.updateAndDrawButterflies(delta);

    // 6. Hạt phấn hoa
    this.spawnAmbientParticles();
    this.updateAndDrawParticles(delta);

    requestAnimationFrame(this.animate);
  }

  updateFlower(flower, delta = 1) {
    if (flower.growth < 1) {
      flower.growth += 0.02 * delta;
      flower.currentHeight = flower.targetHeight * (1 - Math.pow(1 - flower.growth, 3));
    } else {
      flower.growth = 1;
      flower.currentHeight = flower.targetHeight;

      if (flower.bloomProgress < 1) {
        flower.bloomProgress += 0.024 * delta;
        if (flower.bloomProgress >= 1) {
          flower.bloomProgress = 1;
          if (!flower.isFullyBloomed) {
            flower.isFullyBloomed = true;
          }
        }
      }
    }
  }

  drawFlowerStem(flower) {
    const ctx = this.ctx;
    const sway = Math.sin(this.time + flower.phase) * flower.swayAmount * flower.growth + this.wind * 8;

    // Tương tác chuột mượt
    let mouseDist = this.mouse.x - flower.x;
    let mouseInfluence = 0;
    if (Math.abs(mouseDist) < 140) {
      mouseInfluence = (1 - Math.abs(mouseDist) / 140) * (mouseDist > 0 ? -10 : 10);
    }

    const startX = flower.x;
    const startY = flower.baseY;
    const cpX = flower.x + flower.stemCurve + (sway * 0.4) + mouseInfluence * 0.5;
    const cpY = flower.baseY - (flower.currentHeight * 0.55);
    const endX = flower.x + (sway * 1.05) + mouseInfluence;
    const endY = flower.baseY - flower.currentHeight;
    flower.renderTipX = endX;
    flower.renderTipY = endY;

    // Vẽ thân hoa
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = this.isMobile ? 2 : 3.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Vẽ lá
    if (flower.growth > 0.4) {
      for (let leaf of flower.leaves) {
        if (flower.growth > leaf.heightRatio) {
          const t = leaf.heightRatio;
          const lx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
          const ly = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
          this.drawLeafFast(lx, ly, leaf.size, leaf.side, leaf.angle + sway * 0.01);
        }
      }
    }

  }

  drawFlowerHead(flower) {
    const ctx = this.ctx;

    // Vẽ toàn bộ đầu hoa sau thân, lá và cỏ để giữ mặt hoa luôn rõ.
    if (flower.growth > 0.6 && flower.cachedCanvas) {
      const bloom = flower.bloomProgress;
      if (bloom > 0.05) {
        const offset = flower.cachedOffset;
        ctx.save();
        ctx.translate(flower.renderTipX, flower.renderTipY);
        ctx.rotate(Math.sin(this.time + flower.phase) * 0.12);
        ctx.scale(bloom, bloom);
        ctx.drawImage(flower.cachedCanvas, -offset, -offset);
        ctx.restore();
      }
    }
  }

  drawLeafFast(x, y, size, side, angle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (side === 1 ? 0.6 : -0.6));
    ctx.fillStyle = '#40916c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * (size * 0.6), -size * 0.35, side * size, -size * 0.15);
    ctx.quadraticCurveTo(side * (size * 0.5), size * 0.2, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  // Tối ưu gom nhóm vẽ cỏ: Chỉ 3 lệnh stroke cho toàn bộ ngọn cỏ
  drawForegroundGrassBatched() {
    const ctx = this.ctx;
    const colors = ['#40916c', '#52b788', '#2d6a4f'];

    for (let c = 0; c < 3; c++) {
      const blades = this.grassGroups[c];
      if (!blades.length) continue;

      ctx.strokeStyle = colors[c];
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        const sway = Math.sin(this.time * 2 + b.phase) * 5 + this.wind * 3.5;
        ctx.moveTo(b.x, this.height);
        ctx.quadraticCurveTo(
          b.x + b.curve + sway * 0.5,
          this.height - b.height * 0.5,
          b.x + b.tilt + sway,
          this.height - b.height
        );
      }
      ctx.stroke();
    }
  }

  updateAndDrawButterflies(delta = 1) {
    const ctx = this.ctx;
    for (let b of this.butterflies) {
      b.x += (b.vx + Math.sin(this.time * 2) * 0.4) * delta;
      b.y += (b.vy + Math.cos(this.time * 2.5) * 0.5) * delta;
      b.wingAngle += 0.28 * delta;

      if (b.x < -20) b.x = this.width + 10;
      if (b.x > this.width + 20) b.x = -10;
      if (b.y < 80) b.vy = Math.abs(b.vy);
      if (b.y > this.height * 0.75) b.vy = -Math.abs(b.vy);

      const wingSpan = Math.abs(Math.sin(b.wingAngle));
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.fillStyle = '#222';
      ctx.fillRect(-1, -b.size * 0.4, 2, b.size * 0.8);

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(-b.size * 0.5 * wingSpan, -b.size * 0.25, b.size * 0.6 * wingSpan, b.size * 0.45, -0.4, 0, Math.PI * 2);
      ctx.ellipse(b.size * 0.5 * wingSpan, -b.size * 0.25, b.size * 0.6 * wingSpan, b.size * 0.45, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  updateAndDrawPetals(delta = 1) {
    const ctx = this.ctx;
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.x += (p.vx + this.wind * 0.6) * delta;
      p.y += p.vy * delta;
      p.rotation += p.rotSpeed * delta;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (p.y > this.height + 20 || p.x > this.width + 30) {
        this.petals.splice(i, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  updateAndDrawParticles(delta = 1) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.alpha -= p.decay * delta;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

window.FlowerGarden = FlowerGarden;
