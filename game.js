/* ==========================================================================
   FURRYBABY - SANCTUARY GAME CONTROLLER & PET INTERACTION ENGINE
   Coordinates 10 Living Pixel Pets, Roaming AI, Care Systems & Camera
   ========================================================================== */

(function(window) {
  'use strict';

  class GameController {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.minimapCanvas = null;
      this.minimapCtx = null;
      this.map = null;

      // Camera State
      this.camera = {
        x: 800,
        y: 650,
        targetX: 800,
        targetY: 650,
        zoom: 1.0,
        targetZoom: 1.0,
        viewWidth: 1000,
        viewHeight: 700,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        camStartX: 0,
        camStartY: 0
      };

      // Pets state & entities
      this.petTemplates = [];
      this.pets = [];
      this.selectedPet = null;

      // Couple nursery state
      this.coupleTasks = [
        { id: 'feed', label: 'Bữa ăn chung', icon: '🍖', action: 'Cho ăn' },
        { id: 'bond', label: 'Gắn kết tình cảm', icon: '❤️', action: 'Vuốt ve' },
        { id: 'play', label: 'Chơi đùa đôi', icon: '⭐', action: 'Chơi đùa' },
        { id: 'rest', label: 'Nghỉ ngơi chuẩn bị', icon: '💤', action: 'Ru ngủ' }
      ];
      this.incubationItem = {
        key: 'timeEssence',
        label: 'Tinh Chất Ấp',
        icon: '⏳',
        reduceMs: 6 * 60 * 60 * 1000
      };
      this.coupleState = this.createEmptyCoupleState();
      this.coupleStorageKey = 'furrybaby.coupleNursery.v1';
      this.coupleIncubationRange = { min: 7 * 24 * 60 * 60 * 1000, max: 14 * 24 * 60 * 60 * 1000 };
      this.incubationItemTaskCooldown = 25 * 60 * 1000;
      this.minimumEggTimeAfterBoost = 30 * 60 * 1000;
      this.nextCoupleUiRefresh = 0;
      this.notificationTimer = null;

      // Game Clock & Ambience
      this.timeOfDay = 'day'; // 'day', 'sunset', 'night'
      this.weather = 'sakura';
      this.sanctuaryLevel = 1;
      this.totalInteractions = 0;

      // Floating VFX Particles (Hearts, Food, Zzz)
      this.fxParticles = [];

      // Loop
      this.lastTime = performance.now();
      this.isRunning = false;

      // Key states
      this.keys = {};
    }

    init() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.minimapCanvas = document.getElementById('minimapCanvas');
      this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

      this.map = new window.PixelMap();

      // Initialize pet entities
      this.initPets();

      // Setup window resize & event listeners
      this.setupCanvasSize();
      window.addEventListener('resize', () => this.setupCanvasSize());

      this.setupInputHandlers();
      this.setupUIHandlers();

      // Start centered on the sanctuary meadow village
      this.centerOn(1000, 750);

      this.isRunning = true;
      requestAnimationFrame(time => this.loop(time));

      // Build bottom showcase bar
      this.renderShowcaseBar('all');
    }

    setupCanvasSize() {
      const container = document.getElementById('canvasContainer');
      const w = container ? container.clientWidth : window.innerWidth;
      const h = container ? container.clientHeight : window.innerHeight;
      this.canvas.width = w;
      this.canvas.height = h;
      this.camera.viewWidth = w;
      this.camera.viewHeight = h;
    }

    initPets() {
      const rawPets = window.FurryBabyPets || [];
      this.petTemplates = rawPets;
      this.pets = rawPets.map(p => this.createPetEntity(p));
      this.loadCoupleState();
      this.restoreCoupleBabies();
      this.sanitizeCoupleState();
    }

    createPetEntity(p, overrides = {}) {
      const now = performance.now();
      const startX = overrides.x !== undefined ? overrides.x : p.x;
      const startY = overrides.y !== undefined ? overrides.y : p.y;

      return {
        data: p,
        templateId: overrides.templateId || p.id,
        id: overrides.id || p.id,
        name: overrides.name || p.name,
        species: overrides.species || p.species,
        element: overrides.element || p.element,
        biome: overrides.biome || p.biome,
        biomeName: overrides.biomeName || p.biomeName,
        favoriteFood: overrides.favoriteFood || p.favoriteFood,
        personality: overrides.personality || p.personality,
        dialogues: overrides.dialogues || p.dialogues,
        isBaby: Boolean(overrides.isBaby),

        // World coordinates & roaming
        w: overrides.w || p.w || 96,
        h: overrides.h || p.h || 96,
        x: startX,
        y: startY,
        homeX: overrides.homeX !== undefined ? overrides.homeX : startX,
        homeY: overrides.homeY !== undefined ? overrides.homeY : startY,
        targetX: overrides.targetX !== undefined ? overrides.targetX : startX,
        targetY: overrides.targetY !== undefined ? overrides.targetY : startY,
        scale: overrides.scale !== undefined ? overrides.scale : (p.scale || 0.85),
        facing: overrides.facing || 1, // 1: right, -1: left
        isMoving: false,
        moveSpeed: overrides.moveSpeed || (20 + Math.random() * 15),
        nextRoamTime: now + 2000 + Math.random() * 4000,

        // Status & Mood
        stats: { ...(overrides.stats || p.stats) },
        currentPose: overrides.currentPose !== undefined ? overrides.currentPose : (p.poseIndex || 0),
        currentColor: overrides.currentColor !== undefined ? overrides.currentColor : (p.colorIndex !== undefined ? p.colorIndex : 2),
        state: 'idle', // 'idle', 'walk', 'eating', 'sleeping', 'playing'
        stateTimer: 0,

        // Speech bubble
        speech: null,
        speechTimer: 0,
        lastSpeechTime: now + Math.random() * 5000
      };
    }

    createEmptyCoupleState() {
      const progress = {};
      this.coupleTasks.forEach(task => {
        progress[task.id] = { one: false, two: false };
      });

      return {
        partners: [null, null],
        progress,
        items: { [this.incubationItem.key]: 0 },
        itemCooldowns: {},
        egg: null,
        babies: [],
        history: []
      };
    }

    normalizeCoupleProgress(savedProgress) {
      const progress = {};
      this.coupleTasks.forEach(task => {
        const savedTask = savedProgress && savedProgress[task.id] ? savedProgress[task.id] : {};
        progress[task.id] = {
          one: Boolean(savedTask.one),
          two: Boolean(savedTask.two)
        };
      });
      return progress;
    }

    loadCoupleState() {
      try {
        const raw = localStorage.getItem(this.coupleStorageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const empty = this.createEmptyCoupleState();
        const savedEgg = saved.egg && saved.egg.hatchAt ? { ...saved.egg } : null;
        if (savedEgg) {
          savedEgg.duration = savedEgg.duration || Math.max(1000, savedEgg.hatchAt - (savedEgg.createdAt || Date.now()));
          savedEgg.x = Number.isFinite(savedEgg.x) ? savedEgg.x : 1000;
          savedEgg.y = Number.isFinite(savedEgg.y) ? savedEgg.y : 750;
        }
        this.coupleState = {
          partners: Array.isArray(saved.partners) ? [saved.partners[0] || null, saved.partners[1] || null] : empty.partners,
          progress: this.normalizeCoupleProgress(saved.progress),
          items: { ...empty.items, ...(saved.items || {}) },
          itemCooldowns: saved.itemCooldowns && typeof saved.itemCooldowns === 'object' ? saved.itemCooldowns : {},
          egg: savedEgg,
          babies: Array.isArray(saved.babies) ? saved.babies : [],
          history: Array.isArray(saved.history) ? saved.history.slice(-12) : []
        };
      } catch (err) {
        console.warn('Could not load couple nursery state:', err);
        this.coupleState = this.createEmptyCoupleState();
      }
    }

    saveCoupleState() {
      try {
        localStorage.setItem(this.coupleStorageKey, JSON.stringify(this.coupleState));
      } catch (err) {
        console.warn('Could not save couple nursery state:', err);
      }
    }

    sanitizeCoupleState() {
      this.coupleState.partners = this.coupleState.partners.map(id => {
        return this.findPetById(id) ? id : null;
      });
      this.coupleState.progress = this.normalizeCoupleProgress(this.coupleState.progress);
      this.coupleState.items = { [this.incubationItem.key]: Math.max(0, Number(this.coupleState.items && this.coupleState.items[this.incubationItem.key]) || 0) };
      this.coupleState.itemCooldowns = this.coupleState.itemCooldowns && typeof this.coupleState.itemCooldowns === 'object'
        ? this.coupleState.itemCooldowns
        : {};
      this.saveCoupleState();
    }

    restoreCoupleBabies() {
      this.coupleState.babies.forEach(baby => {
        if (!baby || this.findPetById(baby.id)) return;
        const template = this.findPetTemplate(baby.templateId);
        if (!template) return;

        this.pets.push(this.createPetEntity(template, {
          id: baby.id,
          name: baby.name || `Bé ${template.name}`,
          x: baby.x,
          y: baby.y,
          homeX: baby.homeX,
          homeY: baby.homeY,
          scale: baby.scale || Math.max(0.44, (template.scale || 0.85) * 0.64),
          stats: baby.stats,
          currentColor: baby.currentColor,
          currentPose: baby.currentPose || 0,
          isBaby: true
        }));
      });
    }

    findPetById(petId) {
      if (!petId) return null;
      return this.pets.find(pet => pet.id === petId) || null;
    }

    findPetTemplate(templateId) {
      if (!templateId) return null;
      return this.petTemplates.find(pet => pet.id === templateId) || null;
    }

    centerOn(worldX, worldY, zoom) {
      if (zoom) this.camera.targetZoom = Math.max(0.65, Math.min(1.75, zoom));
      const z = Math.max(0.5, this.camera.targetZoom);
      this.camera.targetX = worldX - (this.camera.viewWidth / (2 * z));
      this.camera.targetY = worldY - (this.camera.viewHeight / (2 * z));
      this.clampCamera();
    }

    setZoom(newZoom, focalX, focalY) {
      const oldZoom = this.camera.targetZoom;
      const clamped = Math.max(0.65, Math.min(1.75, newZoom));
      if (Math.abs(clamped - oldZoom) < 0.001) return;

      const fx = focalX !== undefined ? focalX : this.camera.viewWidth / 2;
      const fy = focalY !== undefined ? focalY : this.camera.viewHeight / 2;

      // World point before zoom
      const worldX = this.camera.targetX + fx / oldZoom;
      const worldY = this.camera.targetY + fy / oldZoom;

      this.camera.targetZoom = clamped;
      this.camera.targetX = worldX - fx / clamped;
      this.camera.targetY = worldY - fy / clamped;
      this.clampCamera();
    }

    clampCamera() {
      const z = Math.max(0.5, this.camera.targetZoom);
      const visibleW = this.camera.viewWidth / z;
      const visibleH = this.camera.viewHeight / z;
      const maxCamX = window.MAP_WIDTH - visibleW;
      const maxCamY = window.MAP_HEIGHT - visibleH;

      if (maxCamX <= 0) {
        this.camera.targetX = maxCamX / 2;
      } else {
        this.camera.targetX = Math.max(0, Math.min(maxCamX, this.camera.targetX));
      }

      if (maxCamY <= 0) {
        this.camera.targetY = maxCamY / 2;
      } else {
        this.camera.targetY = Math.max(0, Math.min(maxCamY, this.camera.targetY));
      }
    }

    setupInputHandlers() {
      const cv = this.canvas;

      // Mouse Drag & Click
      cv.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        this.camera.isDragging = true;
        this.camera.dragStartX = e.clientX;
        this.camera.dragStartY = e.clientY;
        this.camera.camStartX = this.camera.x;
        this.camera.camStartY = this.camera.y;
        this.hasMovedDrag = false;
      });

      window.addEventListener('mousemove', e => {
        if (!this.camera.isDragging) return;
        const dx = (e.clientX - this.camera.dragStartX) / this.camera.zoom;
        const dy = (e.clientY - this.camera.dragStartY) / this.camera.zoom;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.hasMovedDrag = true;
        }
        this.camera.targetX = this.camera.camStartX - dx;
        this.camera.targetY = this.camera.camStartY - dy;
        this.clampCamera();
      });

      window.addEventListener('mouseup', e => {
        if (this.camera.isDragging && !this.hasMovedDrag) {
          // It was a click on the map!
          this.handleMapClick(e.clientX, e.clientY);
        }
        this.camera.isDragging = false;
      });

      // Touch handlers for mobile / tablet
      cv.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.camera.isDragging = true;
          this.camera.dragStartX = t.clientX;
          this.camera.dragStartY = t.clientY;
          this.camera.camStartX = this.camera.x;
          this.camera.camStartY = this.camera.y;
          this.hasMovedDrag = false;
        }
      }, { passive: true });

      window.addEventListener('touchmove', e => {
        if (!this.camera.isDragging || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = (t.clientX - this.camera.dragStartX) / this.camera.zoom;
        const dy = (t.clientY - this.camera.dragStartY) / this.camera.zoom;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this.hasMovedDrag = true;
        }
        this.camera.targetX = this.camera.camStartX - dx;
        this.camera.targetY = this.camera.camStartY - dy;
        this.clampCamera();
      }, { passive: true });

      window.addEventListener('touchend', e => {
        if (this.camera.isDragging && !this.hasMovedDrag && e.changedTouches.length) {
          const t = e.changedTouches[0];
          this.handleMapClick(t.clientX, t.clientY);
        }
        this.camera.isDragging = false;
      });

      // Zoom via Mouse Wheel centered on cursor
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = cv.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = Math.sign(e.deltaY) * -0.15;
        this.setZoom(this.camera.targetZoom + delta, mouseX, mouseY);
      }, { passive: false });

      // Keyboard WASD / Arrow navigation
      window.addEventListener('keydown', e => {
        this.keys[e.key.toLowerCase()] = true;
      });
      window.addEventListener('keyup', e => {
        this.keys[e.key.toLowerCase()] = false;
      });

      // Minimap click navigation
      if (this.minimapCanvas) {
        this.minimapCanvas.addEventListener('click', e => {
          const rect = this.minimapCanvas.getBoundingClientRect();
          const mx = (e.clientX - rect.left) / rect.width;
          const my = (e.clientY - rect.top) / rect.height;
          this.centerOn(mx * window.MAP_WIDTH, my * window.MAP_HEIGHT);
          window.SoundEngine.playClick();
        });
      }
    }

    handleMapClick(screenX, screenY) {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = screenX - rect.left;
      const clickY = screenY - rect.top;

      // Convert screen coords to world coords
      const worldX = this.camera.x + clickX / this.camera.zoom;
      const worldY = this.camera.y + clickY / this.camera.zoom;

      // Check if clicked any pet
      let hitPet = null;
      for (let i = this.pets.length - 1; i >= 0; i--) {
        const pet = this.pets[i];
        const rad = 45 * pet.scale;
        const dist = Math.hypot(worldX - pet.x, worldY - (pet.y - rad * 0.8));
        if (dist <= rad * 1.3) {
          hitPet = pet;
          break;
        }
      }

      if (hitPet) {
        this.selectPet(hitPet, true);
      } else {
        // Click on ground: if pet selected, move pet there and face the direction
        if (this.selectedPet && this.selectedPet.state !== 'sleeping') {
          // cute tap ripple
          this.spawnFxParticle(worldX, worldY, '✨', '#fee440');
          this.selectedPet.targetX = Math.max(60, Math.min(window.MAP_WIDTH - 60, worldX));
          this.selectedPet.targetY = Math.max(60, Math.min(window.MAP_HEIGHT - 60, worldY));
          this.selectedPet.isMoving = true;
          if (Math.abs(worldX - this.selectedPet.x) > 2) {
            this.selectedPet.facing = worldX >= this.selectedPet.x ? 1 : -1;
          }
          if (this.selectedPet.state === 'idle') {
            this.selectedPet.state = 'walk';
          }
        }
      }
    }

    selectPet(pet, playAudio = true) {
      this.selectedPet = pet;
      // Smooth camera glide to pet
      this.centerOn(pet.x, pet.y, 1.15);

      if (playAudio) {
        window.SoundEngine.playChirp();
      }

      // Trigger dialogue speech bubble
      const lines = pet.dialogues;
      const line = lines[Math.floor(Math.random() * lines.length)];
      this.showPetSpeech(pet, line, 4000);

      // Open inspector modal in UI
      this.openPetInspector(pet);

      // Highlight in showcase bar
      this.highlightShowcaseItem(pet.id);
    }

    showPetSpeech(pet, text, duration = 3500) {
      pet.speech = text;
      pet.speechTimer = performance.now() + duration;
    }

    spawnFxParticle(x, y, symbol, color) {
      this.fxParticles.push({
        x: x + (Math.random() * 20 - 10),
        y: y - 20,
        symbol: symbol,
        color: color || '#ff4081',
        vy: -1.4 - Math.random() * 0.8,
        vx: Math.random() * 1.0 - 0.5,
        alpha: 1.0,
        size: 18 + Math.random() * 6,
        life: 1.0
      });
    }

    // --- PET CARE & INTERACTION ACTIONS ---
    feedPet(pet) {
      if (!pet) return;
      window.SoundEngine.playNom();
      this.spawnFxParticle(pet.x, pet.y - 40, '🍖', '#e76f51');
      this.spawnFxParticle(pet.x + 10, pet.y - 50, '💖', '#ff4d6d');

      // Update stats
      pet.stats.hunger = Math.min(100, pet.stats.hunger + 25);
      pet.stats.affection = Math.min(100, pet.stats.affection + 5);
      pet.stats.mood = 'No Nê & Vui Vẻ';

      // Dialogue reaction
      const feedLines = [
        `Mlem mlem! Món ${pet.favoriteFood} ngon tuyệt cú mèo!`,
        `Cảm ơn chủ nhân nhiều nha, ngon đỉnh chóp luôn!`,
        `Bụng ta ấm áp quá nè, yêu người nhất trần đời!`
      ];
      this.showPetSpeech(pet, feedLines[Math.floor(Math.random() * feedLines.length)], 3500);

      this.completeCoupleTask('feed', pet);
      this.trackInteraction();
      this.updatePetCardUI();
    }

    petAnimal(pet) {
      if (!pet) return;
      window.SoundEngine.playHeart();
      this.spawnFxParticle(pet.x - 10, pet.y - 45, '❤️', '#ff0054');
      this.spawnFxParticle(pet.x + 12, pet.y - 55, '✨', '#ffe66d');
      this.spawnFxParticle(pet.x, pet.y - 65, '💖', '#ff758f');

      pet.stats.affection = Math.min(100, pet.stats.affection + 8);
      pet.stats.mood = 'Cực Kì Hạnh Phúc';

      const petLines = [
        `Ưm... cảm giác xoa đầu thật là dễ chịu meoo~`,
        `Thích quá à! Được xoa xoa vuốt ve là sướng nhất!`,
        `Tay của chủ nhân ấm áp và dịu dàng quá đi!`
      ];
      this.showPetSpeech(pet, petLines[Math.floor(Math.random() * petLines.length)], 3500);

      this.completeCoupleTask('bond', pet);
      this.trackInteraction();
      this.updatePetCardUI();
    }

    playWithPet(pet) {
      if (!pet) return;
      window.SoundEngine.playJump();
      this.spawnFxParticle(pet.x, pet.y - 50, '⭐', '#f9c74f');
      this.spawnFxParticle(pet.x + 15, pet.y - 40, '🎵', '#90be6d');

      pet.state = 'playing';
      pet.stateTimer = performance.now() + 2500;
      pet.stats.affection = Math.min(100, pet.stats.affection + 6);
      pet.stats.energy = Math.max(10, pet.stats.energy - 8);
      pet.stats.mood = 'Hăng Say & Tinh Nghịch';

      const playLines = [
        `Bật nhảy tung nóc! Xem chiêu của ta nè!`,
        `Chơi đùa cùng chủ nhân vui hết sảy luôn á!`,
        `Ha ha ha! Đuổi bắt với ta một vòng nào!`
      ];
      this.showPetSpeech(pet, playLines[Math.floor(Math.random() * playLines.length)], 3500);

      this.completeCoupleTask('play', pet);
      this.trackInteraction();
      this.updatePetCardUI();
    }

    napPet(pet) {
      if (!pet) return;
      window.SoundEngine.playZzz();
      this.spawnFxParticle(pet.x + 10, pet.y - 45, '💤', '#64dfdf');

      pet.state = 'sleeping';
      pet.stateTimer = performance.now() + 15000; // Sleep for 15s
      pet.stats.energy = Math.min(100, pet.stats.energy + 35);
      pet.stats.mood = 'Thư Giãn / Ngủ Ngon';

      this.showPetSpeech(pet, 'Khò khò... ngủ ngoan một giấc nạp lại năng lượng nha... zZZ', 4000);

      this.completeCoupleTask('rest', pet);
      this.trackInteraction();
      this.updatePetCardUI();
    }

    // --- COUPLE NURSERY: SHARED QUESTS, INCUBATION & RANDOM HATCHING ---
    setCouplePartner(slot, pet) {
      if (!pet || slot < 0 || slot > 1) return;
      if (this.coupleState.egg) {
        this.showGameNotification('Trứng đang được ấp, hãy đợi bé nở trước khi đổi couple.');
        return;
      }

      const otherSlot = slot === 0 ? 1 : 0;
      const oldPartners = [...this.coupleState.partners];
      this.coupleState.partners[slot] = pet.id;

      if (this.coupleState.partners[otherSlot] === pet.id) {
        this.coupleState.partners[otherSlot] = null;
      }

      if (oldPartners[0] !== this.coupleState.partners[0] || oldPartners[1] !== this.coupleState.partners[1]) {
        this.resetCoupleProgress();
      }

      this.spawnFxParticle(pet.x, pet.y - 55, slot === 0 ? '💗' : '💞', '#ff80b5');
      this.showPetSpeech(pet, slot === 0 ? 'Ta sẽ làm Bé A trong couple nha!' : 'Ta sẽ làm Bé B trong couple nha!', 3200);
      this.saveCoupleState();
      this.renderCouplePanel();
      window.SoundEngine.playHeart();
    }

    resetCoupleProgress() {
      this.coupleState.progress = this.normalizeCoupleProgress(null);
    }

    getCouplePet(slot) {
      return this.findPetById(this.coupleState.partners[slot]);
    }

    getActiveNurseryPets() {
      return [this.getCouplePet(0), this.getCouplePet(1)].filter(Boolean);
    }

    hasNurseryParent() {
      return this.getActiveNurseryPets().length > 0;
    }

    getActiveNurserySlots() {
      const slots = [];
      if (this.getCouplePet(0)) slots.push({ slot: 0, key: 'one', label: 'A' });
      if (this.getCouplePet(1)) slots.push({ slot: 1, key: 'two', label: 'B' });
      return slots;
    }

    getCoupleSlotForPet(pet) {
      if (!pet) return -1;
      if (this.coupleState.partners[0] === pet.id) return 0;
      if (this.coupleState.partners[1] === pet.id) return 1;
      return -1;
    }

    hasCompleteCouplePair() {
      return Boolean(this.getCouplePet(0) && this.getCouplePet(1));
    }

    completeCoupleTask(taskId, pet) {
      if (!this.hasNurseryParent()) return;
      const slot = this.getCoupleSlotForPet(pet);
      if (slot === -1 || !this.coupleState.progress[taskId]) return;

      const key = slot === 0 ? 'one' : 'two';
      const task = this.coupleTasks.find(item => item.id === taskId);
      const earnedItem = this.tryEarnIncubationItem(taskId, pet);

      if (this.coupleState.egg) {
        if (!earnedItem) {
          this.showGameNotification(`${this.incubationItem.label} đang hồi theo nhịp học 25 phút.`);
        }
        this.saveCoupleState();
        this.renderCouplePanel();
        return;
      }

      if (this.coupleState.progress[taskId][key]) {
        if (earnedItem) {
          this.saveCoupleState();
          this.renderCouplePanel();
        }
        return;
      }

      this.coupleState.progress[taskId][key] = true;
      this.spawnFxParticle(pet.x, pet.y - 70, '💞', '#ff80b5');

      const taskDoneByBoth = this.coupleState.progress[taskId].one && this.coupleState.progress[taskId].two;
      if (taskDoneByBoth && task) {
        this.showGameNotification(`Couple hoàn thành: ${task.label}.`);
      }

      if (this.areCoupleTasksComplete()) {
        const petA = this.getCouplePet(0);
        const petB = this.getCouplePet(1);
        if (petA) this.showPetSpeech(petA, 'Nhiệm vụ đôi xong rồi, sẵn sàng ấp trứng nha!', 3600);
        if (petB) this.showPetSpeech(petB, 'Tụi mình chăm trứng thật khéo nhé!', 3600);
        this.showGameNotification('Đủ nhiệm vụ couple. Có thể bắt đầu ấp trứng.');
      }

      this.saveCoupleState();
      this.renderCouplePanel();
    }

    getCoupleProgressCount() {
      return this.coupleTasks.reduce((count, task) => {
        const taskProgress = this.coupleState.progress[task.id] || {};
        return count + (taskProgress.one ? 1 : 0) + (taskProgress.two ? 1 : 0);
      }, 0);
    }

    areCoupleTasksComplete() {
      const activeSlots = this.getActiveNurserySlots();
      if (!activeSlots.length) return false;
      return this.coupleTasks.every(task => {
        const taskProgress = this.coupleState.progress[task.id] || {};
        return activeSlots.every(slot => taskProgress[slot.key]);
      });
    }

    tryEarnIncubationItem(taskId, pet) {
      if (!pet) return false;
      const task = this.coupleTasks.find(item => item.id === taskId);
      if (!task) return false;

      const now = Date.now();
      const cooldownKey = `${pet.id}:${taskId}`;
      const lastEarnedAt = Number(this.coupleState.itemCooldowns[cooldownKey]) || 0;
      if (now - lastEarnedAt < this.incubationItemTaskCooldown) {
        return false;
      }

      this.coupleState.itemCooldowns[cooldownKey] = now;
      this.coupleState.items[this.incubationItem.key] = (this.coupleState.items[this.incubationItem.key] || 0) + 1;
      this.spawnFxParticle(pet.x + 12, pet.y - 78, this.incubationItem.icon, '#fee440');
      this.showGameNotification(`${pet.name} nhận 1 ${this.incubationItem.label} từ ${task.label}.`);
      return true;
    }

    grantStudySessionReward(minutes = 25, sourceLabel = 'Phiên học') {
      const safeMinutes = Math.max(1, Number(minutes) || 25);
      const rewardCount = Math.max(1, Math.floor(safeMinutes / 25));
      this.coupleState.items[this.incubationItem.key] = (this.coupleState.items[this.incubationItem.key] || 0) + rewardCount;

      const pet = this.getActiveNurseryPets()[0] || this.selectedPet;
      if (pet) {
        pet.stats.affection = Math.min(100, pet.stats.affection + Math.min(10, rewardCount * 2));
        pet.stats.mood = 'Tự Hào Vì Chủ Nhân Học Tập';
        this.spawnFxParticle(pet.x, pet.y - 75, this.incubationItem.icon, '#fee440');
        this.showPetSpeech(pet, 'Phiên học xong rồi, trứng cũng nhận thêm năng lượng nha!', 4200);
      }

      this.saveCoupleState();
      this.renderCouplePanel();
      this.updatePetCardUI();
      this.showGameNotification(`${sourceLabel} +${rewardCount} ${this.incubationItem.label}.`);
      return rewardCount;
    }

    applyIncubationItem() {
      const itemCount = this.coupleState.items[this.incubationItem.key] || 0;
      if (!this.coupleState.egg) {
        this.showGameNotification('Chưa có trứng để nạp tinh chất.');
        return;
      }
      if (itemCount <= 0) {
        this.showGameNotification(`Chưa có ${this.incubationItem.label}. Hãy chăm pet hoặc hoàn thành phiên học.`);
        return;
      }

      const now = Date.now();
      const remaining = this.coupleState.egg.hatchAt - now;
      if (remaining <= this.minimumEggTimeAfterBoost) {
        this.showGameNotification('Trứng đã gần nở, không cần nạp thêm tinh chất.');
        return;
      }

      const reducedMs = Math.min(this.incubationItem.reduceMs, remaining - this.minimumEggTimeAfterBoost);
      this.coupleState.egg.hatchAt -= reducedMs;
      this.coupleState.egg.reducedMs = (this.coupleState.egg.reducedMs || 0) + reducedMs;
      this.coupleState.items[this.incubationItem.key] = itemCount - 1;

      this.spawnFxParticle(this.coupleState.egg.x, this.coupleState.egg.y - 60, this.incubationItem.icon, '#fee440');
      this.spawnFxParticle(this.coupleState.egg.x + 18, this.coupleState.egg.y - 46, '✨', '#ff80b5');
      this.saveCoupleState();
      this.renderCouplePanel();
      this.showGameNotification(`Đã nạp ${this.incubationItem.label}: trứng giảm ${this.formatDuration(reducedMs)}.`);
      window.SoundEngine.playFanfare();
    }

    startIncubation() {
      if (this.coupleState.egg) return;
      if (!this.hasNurseryParent()) {
        this.showGameNotification('Hãy chọn ít nhất 1 pet trưởng thành để bắt đầu ổ trứng.');
        return;
      }
      if (!this.areCoupleTasksComplete()) {
        this.showGameNotification('Pet tham gia cần hoàn thành đủ nhiệm vụ trước khi ấp trứng.');
        return;
      }

      const now = Date.now();
      const duration = Math.floor(
        this.coupleIncubationRange.min +
        Math.random() * (this.coupleIncubationRange.max - this.coupleIncubationRange.min)
      );
      const activePets = this.getActiveNurseryPets();
      const centerX = activePets.reduce((sum, parent) => sum + parent.x, 0) / activePets.length;
      const centerY = activePets.reduce((sum, parent) => sum + parent.y, 0) / activePets.length;
      const eggX = Math.max(80, Math.min(window.MAP_WIDTH - 80, centerX + (Math.random() * 80 - 40)));
      const eggY = Math.max(80, Math.min(window.MAP_HEIGHT - 80, centerY + 35 + (Math.random() * 40 - 20)));

      this.coupleState.egg = {
        id: `egg_${now}`,
        parents: activePets.map(parent => parent.id),
        createdAt: now,
        hatchAt: now + duration,
        duration,
        reducedMs: 0,
        x: eggX,
        y: eggY
      };

      activePets.forEach(parent => {
        if (!parent) return;
        parent.stats.mood = 'Đang Ấp Trứng';
        this.spawnFxParticle(parent.x, parent.y - 65, '🥚', '#f9d56e');
        this.showPetSpeech(parent, 'Ấp trứng bắt đầu rồi, cùng canh bé con nha!', 3600);
      });

      this.centerOn(eggX, eggY, 1.2);
      this.saveCoupleState();
      this.renderCouplePanel();
      this.showGameNotification(`Trứng đang ấp ${this.formatCountdown(duration)}. Nạp tinh chất để rút ngắn thời gian.`);
      window.SoundEngine.playFanfare();
    }

    updateCoupleNursery() {
      const now = Date.now();
      if (this.coupleState.egg && now >= this.coupleState.egg.hatchAt) {
        this.hatchCoupleEgg();
        return;
      }

      if (this.coupleState.egg && now >= this.nextCoupleUiRefresh) {
        this.nextCoupleUiRefresh = now + 1000;
        this.renderCouplePanel();
      }
    }

    hatchCoupleEgg() {
      const egg = this.coupleState.egg;
      if (!egg || !this.petTemplates.length) return;

      const template = this.petTemplates[Math.floor(Math.random() * this.petTemplates.length)];
      const createdAt = Date.now();
      const babyId = `${template.id}_baby_${createdAt}`;
      const babyX = Math.max(80, Math.min(window.MAP_WIDTH - 80, egg.x + (Math.random() * 90 - 45)));
      const babyY = Math.max(80, Math.min(window.MAP_HEIGHT - 80, egg.y + (Math.random() * 60 - 20)));
      const babyStats = {
        affection: 70,
        hunger: 82,
        energy: 92,
        mood: 'Vừa Nở'
      };
      const babyRecord = {
        id: babyId,
        templateId: template.id,
        name: `Bé ${template.name}`,
        x: babyX,
        y: babyY,
        homeX: babyX,
        homeY: babyY,
        scale: Math.max(0.44, (template.scale || 0.85) * 0.64),
        stats: babyStats,
        currentPose: 0,
        currentColor: template.colors ? Math.floor(Math.random() * template.colors.length) : (template.colorIndex !== undefined ? template.colorIndex : 2),
        parents: [...egg.parents],
        createdAt
      };

      const baby = this.createPetEntity(template, {
        id: babyRecord.id,
        name: babyRecord.name,
        x: babyRecord.x,
        y: babyRecord.y,
        homeX: babyRecord.homeX,
        homeY: babyRecord.homeY,
        scale: babyRecord.scale,
        stats: babyRecord.stats,
        currentPose: babyRecord.currentPose,
        currentColor: babyRecord.currentColor,
        isBaby: true
      });

      this.pets.push(baby);
      this.coupleState.babies.push(babyRecord);
      this.coupleState.babies = this.coupleState.babies.slice(-24);
      this.coupleState.history.push({
        id: babyRecord.id,
        name: babyRecord.name,
        templateId: babyRecord.templateId,
        parents: babyRecord.parents,
        createdAt
      });
      this.coupleState.history = this.coupleState.history.slice(-12);
      this.coupleState.egg = null;
      this.resetCoupleProgress();

      this.spawnFxParticle(baby.x, baby.y - 55, '✨', '#fee440');
      this.spawnFxParticle(baby.x + 15, baby.y - 65, '💖', '#ff80b5');
      this.spawnFxParticle(baby.x - 15, baby.y - 60, '🎉', '#f4c542');
      this.showPetSpeech(baby, 'Píu píu! Con vừa nở nè!', 4500);

      this.saveCoupleState();
      this.renderShowcaseBar('all');
      this.selectPet(baby, false);
      this.showGameNotification(`Trứng đã nở ngẫu nhiên: ${baby.name}!`);
      window.SoundEngine.playFanfare();
    }

    formatCountdown(ms) {
      const safeMs = Math.max(0, ms);
      const totalSeconds = Math.ceil(safeMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (days > 0) return `${days} ngày ${hours}h`;
      if (hours > 0) return `${hours}h ${Math.floor((totalSeconds % 3600) / 60)}m`;
      if (minutes <= 0) return `${seconds}s`;
      return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    formatDuration(ms) {
      return this.formatCountdown(ms);
    }

    trackInteraction() {
      this.totalInteractions++;
      if (this.totalInteractions >= 5 && this.sanctuaryLevel === 1) {
        this.sanctuaryLevel = 2;
        this.triggerLevelUp();
      } else if (this.totalInteractions >= 15 && this.sanctuaryLevel === 2) {
        this.sanctuaryLevel = 3;
        this.triggerLevelUp();
      } else if (this.totalInteractions >= 30 && this.sanctuaryLevel === 3) {
        this.sanctuaryLevel = 4;
        this.triggerLevelUp();
      } else if (this.totalInteractions >= 50 && this.sanctuaryLevel === 4) {
        this.sanctuaryLevel = 5;
        this.triggerLevelUp();
      }
      this.updateSanctuaryHUD();
    }

    triggerLevelUp() {
      window.SoundEngine.playFanfare();
      this.showGameNotification(`🎉 THUNG LŨNG THÚ CƯNG LÊN CẤP ${this.sanctuaryLevel}! TẤT CẢ PET CỰC KỲ HẠNH PHÚC!`, 5000);
    }

    showGameNotification(message, duration = 4200) {
      const notif = document.getElementById('levelUpNotif');
      if (notif) {
        notif.textContent = message;
        notif.classList.add('show');
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => notif.classList.remove('show'), duration);
      }
    }

    // --- GAME LOOP & UPDATES ---
    loop(currentTime) {
      if (!this.isRunning) return;
      const rawDt = (currentTime - this.lastTime) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, Number.isFinite(rawDt) ? rawDt : 0.016));
      this.lastTime = currentTime;

      // 1. Update Camera
      this.updateCamera(dt);

      // 2. Update Pets AI & Behavior
      this.updatePets(currentTime, dt);

      // 3. Update couple egg countdown / hatching
      this.updateCoupleNursery();

      // 4. Render World
      this.render(currentTime);

      // 5. Update Minimap
      this.renderMinimap(currentTime);

      // 6. Live animate inspector preview card if open
      const inspectorCard = document.getElementById('petInspectorCard');
      if (this.selectedPet && inspectorCard && inspectorCard.classList.contains('open')) {
        this.updatePreviewCanvas(this.selectedPet);
      }

      requestAnimationFrame(time => this.loop(time));
    }

    updateCamera(dt) {
      const safeDt = Math.min(0.05, Math.max(0.001, dt));

      // Keyboard WASD panning
      const curZoom = Math.max(0.5, this.camera.zoom);
      const panSpeed = (650 * safeDt) / curZoom;
      if (this.keys['w'] || this.keys['arrowup']) this.camera.targetY -= panSpeed;
      if (this.keys['s'] || this.keys['arrowdown']) this.camera.targetY += panSpeed;
      if (this.keys['a'] || this.keys['arrowleft']) this.camera.targetX -= panSpeed;
      if (this.keys['d'] || this.keys['arrowright']) this.camera.targetX += panSpeed;
      this.clampCamera();

      // Exponential decay smoothing: NEVER overshoots or oscillates, guaranteed mathematically stable
      const decay = 1 - Math.exp(-14 * safeDt);
      this.camera.x += (this.camera.targetX - this.camera.x) * decay;
      this.camera.y += (this.camera.targetY - this.camera.y) * decay;
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * decay;

      // Absolute safety bounds
      if (!Number.isFinite(this.camera.x)) this.camera.x = 800;
      if (!Number.isFinite(this.camera.y)) this.camera.y = 650;
      if (!Number.isFinite(this.camera.zoom) || this.camera.zoom < 0.5) this.camera.zoom = 1.0;
      if (!Number.isFinite(this.camera.targetZoom) || this.camera.targetZoom < 0.5) this.camera.targetZoom = 1.0;
    }

    updatePets(now, dt) {
      this.pets.forEach(pet => {
        // Sleep timeout
        if (pet.state === 'sleeping' && now > pet.stateTimer) {
          pet.state = 'idle';
        }
        // Play trick timeout
        if (pet.state === 'playing' && now > pet.stateTimer) {
          pet.state = 'idle';
        }

        // Random roaming within their biome
        if (pet.state !== 'sleeping' && pet.state !== 'eating' && now > pet.nextRoamTime) {
          pet.nextRoamTime = now + 4000 + Math.random() * 6000;
          // 65% chance to wander nearby, 35% chance to stay idle
          if (Math.random() < 0.65) {
            const wanderRad = 110;
            const targetX = pet.homeX + (Math.random() * 2 - 1) * wanderRad;
            const targetY = pet.homeY + (Math.random() * 2 - 1) * wanderRad * 0.7;
            pet.targetX = Math.max(50, Math.min(window.MAP_WIDTH - 50, targetX));
            pet.targetY = Math.max(50, Math.min(window.MAP_HEIGHT - 50, targetY));
            pet.isMoving = true;
            pet.facing = pet.targetX >= pet.x ? 1 : -1;
          } else {
            pet.isMoving = false;
          }
        }

        // Move towards target
        if (pet.isMoving && (pet.state === 'idle' || pet.state === 'walk')) {
          const dx = pet.targetX - pet.x;
          const dy = pet.targetY - pet.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 3) {
            const step = pet.moveSpeed * dt;
            pet.x += (dx / dist) * Math.min(dist, step);
            pet.y += (dy / dist) * Math.min(dist, step);
            if (Math.abs(dx) > 0.5) {
              pet.facing = dx > 0 ? 1 : -1;
            }
          } else {
            pet.isMoving = false;
            if (pet.state === 'walk') pet.state = 'idle';
          }
        }

        // Automatic spontaneous speech bubble every 15-25 seconds
        if (!pet.speech && now > pet.lastSpeechTime + 18000 + Math.random() * 12000) {
          pet.lastSpeechTime = now;
          if (pet.state !== 'sleeping') {
            const lines = pet.dialogues;
            pet.speech = lines[Math.floor(Math.random() * lines.length)];
            pet.speechTimer = now + 3500;
          }
        }

        // Speech timer expiration
        if (pet.speech && now > pet.speechTimer) {
          pet.speech = null;
        }
      });

      // Update FX particles (Floating hearts & nom particles)
      for (let i = this.fxParticles.length - 1; i >= 0; i--) {
        const p = this.fxParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 0.9;
        p.alpha = Math.max(0, p.life);
        if (p.life <= 0) {
          this.fxParticles.splice(i, 1);
        }
      }
    }

    render(currentTime) {
      const ctx = this.ctx;
      const cam = this.camera;
      const t = currentTime / 1000;

      ctx.clearRect(0, 0, cam.viewWidth, cam.viewHeight);

      ctx.save();
      // Apply Camera Zoom & Pan
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 1. Draw Static Map from offscreen cache
      ctx.drawImage(this.map.bgCanvas, 0, 0);

      // 2. Draw active couple egg if incubation is running
      this.renderCoupleEgg(ctx, t);

      // 3. Draw Pets (Sorted by Y for depth layering, with Frustum Culling!)
      const sortedPets = [...this.pets].sort((a, b) => a.y - b.y);
      const curZoom = Math.max(0.5, cam.zoom);
      const camLeft = cam.x - 120 / curZoom;
      const camRight = cam.x + (cam.viewWidth + 120) / curZoom;
      const camTop = cam.y - 120 / curZoom;
      const camBottom = cam.y + (cam.viewHeight + 120) / curZoom;

      sortedPets.forEach(pet => {
        if (pet.x >= camLeft && pet.x <= camRight && pet.y >= camTop && pet.y <= camBottom) {
          this.renderPetEntity(ctx, pet, t);
        }
      });

      // 4. Draw Floating World FX Particles
      this.fxParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = `${Math.round(p.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.symbol, p.x, p.y);
        ctx.restore();
      });

      ctx.restore();

      // 5. Ambient Weather Particles (drawn in screen space with camera offset)
      this.map.updateAndDrawParticles(ctx, cam, t);

      // 6. Day / Night Lighting Pass
      this.map.renderLightingPass(ctx, cam, this.timeOfDay);

      // 7. Draw Speech Bubbles & Selection Rings over pets in Screen Space
      this.renderPetHUDOverlays(ctx, t);
    }

    renderCoupleEgg(ctx, t) {
      const egg = this.coupleState.egg;
      if (!egg) return;

      const pulse = Math.sin(t * 3.2);
      const bob = Math.sin(t * 2.1) * 2;
      const crackGlow = Math.max(0, 1 - Math.max(0, egg.hatchAt - Date.now()) / egg.duration);

      ctx.save();
      ctx.translate(egg.x, egg.y + bob);

      ctx.fillStyle = 'rgba(18, 12, 30, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 20, 32, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff1b8';
      ctx.strokeStyle = '#8f5f2c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -10, 24 + pulse * 0.8, 34 + pulse * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffd36e';
      ctx.fillRect(-12, -18, 6, 5);
      ctx.fillRect(8, -2, 7, 5);
      ctx.fillRect(-4, 12, 5, 4);

      ctx.strokeStyle = `rgba(255, 128, 181, ${0.35 + crackGlow * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-2, -33);
      ctx.lineTo(5, -21);
      ctx.lineTo(0, -10);
      ctx.lineTo(7, 2);
      ctx.stroke();

      ctx.fillStyle = '#fee440';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥚', 0, -48 + pulse * 2);
      ctx.restore();
    }

    renderPetEntity(ctx, pet, t) {
      ctx.save();
      const scale = pet.scale;

      // Handle facing direction for pets that do not handle directional sprites internally
      // Compare pet.facing (1: moving right, -1: moving left) with defaultFacing (1: faces right by default, -1: faces left by default)
      const defaultFacing = pet.data.defaultFacing || 1;
      const shouldFlip = !pet.data.handlesFacing && (pet.facing !== defaultFacing);
      if (shouldFlip) {
        ctx.translate(pet.x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-pet.x, 0);
      }

      // Draw the actual pet using its custom pixel art renderer
      const stateObj = {
        isMoving: pet.isMoving,
        facing: pet.facing,
        pose: pet.state === 'sleeping' ? (pet.data.id === 'pixel_pet' ? 5 : (pet.data.id === 'ho_ly' ? 1 : 0)) : pet.currentPose,
        color: pet.currentColor
      };

      try {
        pet.data.draw(ctx, pet.x, pet.y, scale, t, stateObj);
      } catch (err) {
        console.error('Error drawing pet:', pet.id, err);
      }

      ctx.restore();
    }

    renderPetHUDOverlays(ctx, t) {
      const cam = this.camera;

      this.pets.forEach(pet => {
        const sx = (pet.x - cam.x) * cam.zoom;
        const sy = (pet.y - cam.y) * cam.zoom;

        // Outside screen view check
        if (sx < -100 || sx > cam.viewWidth + 100 || sy < -100 || sy > cam.viewHeight + 100) return;

        // Selected Pet Highlight Ring
        if (this.selectedPet && this.selectedPet.id === pet.id) {
          ctx.save();
          const ringRad = (46 * pet.scale + Math.sin(t * 6) * 3) * cam.zoom;
          ctx.strokeStyle = '#fee440';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(sx, sy, ringRad, ringRad * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Selection arrow bouncing above head
          const arrowY = sy - (pet.h * pet.scale + 22 + Math.sin(t * 6) * 5) * cam.zoom;
          ctx.fillStyle = '#fee440';
          ctx.beginPath();
          ctx.moveTo(sx, arrowY + 8 * cam.zoom);
          ctx.lineTo(sx - 7 * cam.zoom, arrowY);
          ctx.lineTo(sx + 7 * cam.zoom, arrowY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Speech Bubble
        if (pet.speech) {
          this.drawSpeechBubble(ctx, sx, sy - (pet.h * pet.scale + 16) * cam.zoom, pet.speech);
        }
      });
    }

    drawSpeechBubble(ctx, x, y, text) {
      ctx.save();
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      const textMetrics = ctx.measureText(text);
      const padding = 10;
      const bw = textMetrics.width + padding * 2;
      const bh = 26;
      const bx = x - bw / 2;
      const by = y - bh;

      // Bubble Background (Retro Glassmorphic Frame)
      ctx.fillStyle = 'rgba(28, 20, 48, 0.92)';
      ctx.strokeStyle = '#f4c542';
      ctx.lineWidth = 2;

      // Rounded bubble
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // Tail pointer
      ctx.fillStyle = '#f4c542';
      ctx.beginPath();
      ctx.moveTo(x - 5, by + bh);
      ctx.lineTo(x + 5, by + bh);
      ctx.lineTo(x, by + bh + 6);
      ctx.closePath();
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, by + bh / 2);
      ctx.restore();
    }

    renderMinimap(t) {
      if (!this.minimapCtx) return;
      const mc = this.minimapCtx;
      const mw = this.minimapCanvas.width;
      const mh = this.minimapCanvas.height;

      mc.clearRect(0, 0, mw, mh);

      // Draw mini map background (ultra-fast pre-scaled canvas)
      if (this.map.minimapBgCanvas) {
        mc.drawImage(this.map.minimapBgCanvas, 0, 0, mw, mh);
      } else {
        mc.drawImage(this.map.bgCanvas, 0, 0, mw, mh);
      }

      // Draw pets as colored blips
      this.pets.forEach(p => {
        const mx = (p.x / window.MAP_WIDTH) * mw;
        const my = (p.y / window.MAP_HEIGHT) * mh;
        mc.fillStyle = this.selectedPet && this.selectedPet.id === p.id ? '#fee440' : '#ffffff';
        mc.beginPath();
        mc.arc(mx, my, this.selectedPet && this.selectedPet.id === p.id ? 4.5 : 3, 0, Math.PI * 2);
        mc.fill();
        mc.strokeStyle = '#1b1035';
        mc.lineWidth = 1;
        mc.stroke();
      });

      if (this.coupleState.egg) {
        const ex = (this.coupleState.egg.x / window.MAP_WIDTH) * mw;
        const ey = (this.coupleState.egg.y / window.MAP_HEIGHT) * mh;
        mc.fillStyle = '#fee440';
        mc.strokeStyle = '#8f5f2c';
        mc.lineWidth = 1.5;
        mc.beginPath();
        mc.ellipse(ex, ey, 4.5, 6, 0, 0, Math.PI * 2);
        mc.fill();
        mc.stroke();
      }

      // Draw camera viewport box
      const curZoom = Math.max(0.5, this.camera.zoom);
      const vx = (this.camera.x / window.MAP_WIDTH) * mw;
      const vy = (this.camera.y / window.MAP_HEIGHT) * mh;
      const vw = ((this.camera.viewWidth / curZoom) / window.MAP_WIDTH) * mw;
      const vh = ((this.camera.viewHeight / curZoom) / window.MAP_HEIGHT) * mh;

      mc.strokeStyle = '#fee440';
      mc.lineWidth = 2;
      mc.strokeRect(vx, vy, vw, vh);
    }

    // --- UI SETUP & EVENT BINDINGS ---
    setupUIHandlers() {
      // Day/Night button
      const timeBtn = document.getElementById('btnTimeOfDay');
      if (timeBtn) {
        timeBtn.addEventListener('click', () => {
          if (this.timeOfDay === 'day') this.timeOfDay = 'sunset';
          else if (this.timeOfDay === 'sunset') this.timeOfDay = 'night';
          else this.timeOfDay = 'day';

          timeBtn.textContent = this.timeOfDay === 'day' ? '☀️ Ban Ngày' : (this.timeOfDay === 'sunset' ? '🌅 Hoàng Hôn' : '🌙 Ban Đêm');
          window.SoundEngine.playClick();
        });
      }

      // Music BGM button
      const bgmBtn = document.getElementById('btnBGM');
      if (bgmBtn) {
        bgmBtn.addEventListener('click', () => {
          const isPlaying = window.SoundEngine.toggleBGM();
          bgmBtn.textContent = isPlaying ? '🎵 Nhạc: Bật' : '🔇 Nhạc: Tắt';
          bgmBtn.classList.toggle('active', isPlaying);
        });
      }

      // Sound SFX button
      const sfxBtn = document.getElementById('btnSFX');
      if (sfxBtn) {
        sfxBtn.addEventListener('click', () => {
          const muted = window.SoundEngine.toggleMute();
          sfxBtn.textContent = muted ? '🔇 Âm thanh: Tắt' : '🔊 Âm thanh: Bật';
          sfxBtn.classList.toggle('active', !muted);
        });
      }

      // Zoom Buttons
      const zoomInBtn = document.getElementById('btnZoomIn');
      const zoomOutBtn = document.getElementById('btnZoomOut');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          this.setZoom(this.camera.targetZoom + 0.2);
          window.SoundEngine.playClick();
        });
      }
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          this.setZoom(this.camera.targetZoom - 0.2);
          window.SoundEngine.playClick();
        });
      }

      // Reset camera to center
      const homeBtn = document.getElementById('btnHome');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          this.centerOn(1000, 750, 1.0);
          window.SoundEngine.playClick();
        });
      }

      // Biome Filter tabs in bottom showcase
      const filterBtns = document.querySelectorAll('.biome-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const biome = btn.dataset.biome;
          this.renderShowcaseBar(biome);
          window.SoundEngine.playClick();
        });
      });

      // Pet Care Action Buttons in Inspector Card
      const btnFeed = document.getElementById('btnFeed');
      const btnPet = document.getElementById('btnPet');
      const btnPlay = document.getElementById('btnPlay');
      const btnNap = document.getElementById('btnNap');
      const btnSetCoupleA = document.getElementById('btnSetCoupleA');
      const btnSetCoupleB = document.getElementById('btnSetCoupleB');
      const btnStartIncubation = document.getElementById('btnStartIncubation');
      const btnUseIncubationItem = document.getElementById('btnUseIncubationItem');
      const btnCloseCard = document.getElementById('btnCloseCard');

      if (btnFeed) btnFeed.addEventListener('click', () => this.feedPet(this.selectedPet));
      if (btnPet) btnPet.addEventListener('click', () => this.petAnimal(this.selectedPet));
      if (btnPlay) btnPlay.addEventListener('click', () => this.playWithPet(this.selectedPet));
      if (btnNap) btnNap.addEventListener('click', () => this.napPet(this.selectedPet));
      if (btnSetCoupleA) btnSetCoupleA.addEventListener('click', () => this.setCouplePartner(0, this.selectedPet));
      if (btnSetCoupleB) btnSetCoupleB.addEventListener('click', () => this.setCouplePartner(1, this.selectedPet));
      if (btnStartIncubation) btnStartIncubation.addEventListener('click', () => this.startIncubation());
      if (btnUseIncubationItem) btnUseIncubationItem.addEventListener('click', () => this.applyIncubationItem());
      if (btnCloseCard) {
        btnCloseCard.addEventListener('click', () => {
          document.getElementById('petInspectorCard').classList.remove('open');
          window.SoundEngine.playClick();
        });
      }
    }

    renderShowcaseBar(biomeFilter = 'all') {
      const container = document.getElementById('showcaseList');
      if (!container) return;

      container.innerHTML = '';
      const filtered = biomeFilter === 'all'
        ? this.pets
        : this.pets.filter(p => p.biome === biomeFilter);

      filtered.forEach(pet => {
        const item = document.createElement('div');
        item.className = `showcase-pet-card ${this.selectedPet && this.selectedPet.id === pet.id ? 'selected' : ''}`;
        item.id = `showcase-${pet.id}`;

        // Live preview canvas
        const cv = document.createElement('canvas');
        cv.width = 64;
        cv.height = 64;
        const cCtx = cv.getContext('2d');
        cCtx.imageSmoothingEnabled = false;

        // Draw preview sprite
        try {
          pet.data.draw(cCtx, 32, 54, 0.45, 1.0, { pose: 0, color: pet.currentColor });
        } catch(e) {}

        item.appendChild(cv);

        const info = document.createElement('div');
        info.className = 'showcase-info';
        info.innerHTML = `
          <div class="showcase-name">${pet.name}</div>
          <div class="showcase-meta">${pet.element} • ${pet.biomeName.split('&')[0]}</div>
        `;
        item.appendChild(info);

        item.addEventListener('click', () => {
          this.selectPet(pet, true);
        });

        container.appendChild(item);
      });
    }

    highlightShowcaseItem(petId) {
      document.querySelectorAll('.showcase-pet-card').forEach(el => el.classList.remove('selected'));
      const activeEl = document.getElementById(`showcase-${petId}`);
      if (activeEl) {
        activeEl.classList.add('selected');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    renderCouplePanel() {
      const btnA = document.getElementById('btnSetCoupleA');
      const btnB = document.getElementById('btnSetCoupleB');
      const taskList = document.getElementById('coupleTaskList');
      const eggStatus = document.getElementById('coupleEggStatus');
      const incubateBtn = document.getElementById('btnStartIncubation');
      const itemStatus = document.getElementById('incubationItemStatus');
      const useItemBtn = document.getElementById('btnUseIncubationItem');
      if (!btnA || !btnB || !taskList || !eggStatus || !incubateBtn || !itemStatus || !useItemBtn) return;

      const petA = this.getCouplePet(0);
      const petB = this.getCouplePet(1);
      const selectedId = this.selectedPet ? this.selectedPet.id : null;
      const hasParent = this.hasNurseryParent();
      const tasksComplete = this.areCoupleTasksComplete();
      const isIncubating = Boolean(this.coupleState.egg);
      const activeSlotKeys = this.getActiveNurserySlots().map(slot => slot.key);
      const itemCount = this.coupleState.items[this.incubationItem.key] || 0;

      [
        { btn: btnA, pet: petA, label: 'Pet chính', slot: 0 },
        { btn: btnB, pet: petB, label: 'Pet ghép', slot: 1 }
      ].forEach(item => {
        item.btn.textContent = item.pet ? `${item.label}: ${item.pet.name}` : `${item.label}: ${item.slot === 0 ? 'Chọn pet này' : 'Optional'}`;
        item.btn.classList.toggle('active', Boolean(item.pet));
        item.btn.classList.toggle('selected-current', item.pet && item.pet.id === selectedId);
        item.btn.disabled = isIncubating || !this.selectedPet;
      });

      taskList.innerHTML = '';
      this.coupleTasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'couple-task-item';

        const name = document.createElement('div');
        name.className = 'couple-task-name';
        name.textContent = `${task.icon} ${task.label}`;

        const checks = document.createElement('div');
        checks.className = 'couple-task-checks';

        [
          { pet: petA, key: 'one', label: 'A' },
          { pet: petB, key: 'two', label: 'B' }
        ].forEach(item => {
          const badge = document.createElement('span');
          const done = Boolean(this.coupleState.progress[task.id] && this.coupleState.progress[task.id][item.key]);
          const optional = !item.pet;
          badge.className = `couple-check ${done ? 'done' : ''} ${optional ? 'optional' : ''}`;
          badge.textContent = done ? '✓' : (optional ? '•' : item.label);
          badge.title = item.pet ? `${item.pet.name} - ${task.action}` : `Slot ${item.label} chưa tham gia`;
          checks.appendChild(badge);
        });

        row.appendChild(name);
        row.appendChild(checks);
        taskList.appendChild(row);
      });

      const totalSteps = this.coupleTasks.length * Math.max(1, activeSlotKeys.length);
      const doneSteps = this.getCoupleProgressCount();
      if (this.coupleState.egg) {
        const remaining = Math.max(0, this.coupleState.egg.hatchAt - Date.now());
        const percent = Math.max(0, Math.min(100, ((this.coupleState.egg.duration - remaining) / this.coupleState.egg.duration) * 100));
        eggStatus.innerHTML = `
          <div class="couple-egg-line"><span>🥚 Đang ấp</span><strong>${this.formatCountdown(remaining)}</strong></div>
          <div class="couple-egg-note">Đã giảm: ${this.formatDuration(this.coupleState.egg.reducedMs || 0)}</div>
          <div class="couple-egg-track"><div class="couple-egg-fill" style="width: ${percent.toFixed(1)}%;"></div></div>
        `;
      } else if (!hasParent) {
        eggStatus.innerHTML = '<div class="couple-egg-line"><span>Chọn ít nhất 1 pet</span><strong>0%</strong></div>';
      } else if (tasksComplete) {
        eggStatus.innerHTML = '<div class="couple-egg-line"><span>Sẵn sàng ấp 7-14 ngày</span><strong>100%</strong></div>';
      } else {
        eggStatus.innerHTML = `<div class="couple-egg-line"><span>Tiến độ nhiệm vụ</span><strong>${doneSteps}/${totalSteps}</strong></div>`;
      }

      itemStatus.innerHTML = `
        <span>${this.incubationItem.icon} ${this.incubationItem.label}: <strong>${itemCount}</strong></span>
        <small>Mỗi viên giảm ${this.formatDuration(this.incubationItem.reduceMs)}</small>
      `;
      useItemBtn.disabled = !isIncubating || itemCount <= 0;
      useItemBtn.textContent = `${this.incubationItem.icon} Nạp Tinh Chất`;

      incubateBtn.disabled = !hasParent || !tasksComplete || isIncubating;
      incubateBtn.textContent = isIncubating
        ? '🥚 Đang Ấp...'
        : (tasksComplete ? '🥚 Ấp Trứng 7-14 Ngày' : `🥚 Cần ${Math.max(0, totalSteps - doneSteps)} lượt`);
    }

    openPetInspector(pet) {
      const card = document.getElementById('petInspectorCard');
      if (!card) return;

      card.classList.add('open');

      document.getElementById('inspectorPetName').textContent = pet.name;
      document.getElementById('inspectorPetSpecies').textContent = `${pet.species} • ${pet.element}`;
      document.getElementById('inspectorPetBiome').textContent = `Khu vực: ${pet.biomeName}`;
      document.getElementById('inspectorPetPersonality').textContent = pet.personality;
      document.getElementById('inspectorPetFavFood').textContent = pet.favoriteFood;

      // Poses buttons
      const poseContainer = document.getElementById('inspectorPosesList');
      if (poseContainer) {
        poseContainer.innerHTML = '';
        pet.data.poses.forEach((poseName, idx) => {
          const btn = document.createElement('button');
          btn.className = `pose-btn ${pet.currentPose === idx ? 'active' : ''}`;
          btn.textContent = poseName;
          btn.addEventListener('click', () => {
            pet.currentPose = idx;
            document.querySelectorAll('.pose-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.SoundEngine.playClick();
            this.updatePreviewCanvas(pet);
          });
          poseContainer.appendChild(btn);
        });
      }

      // Colors selection for Hồ Ly
      const colorContainer = document.getElementById('inspectorColorsContainer');
      if (colorContainer) {
        if (pet.data.id === 'ho_ly' && pet.data.colors) {
          colorContainer.style.display = 'block';
          const list = document.getElementById('inspectorColorsList');
          list.innerHTML = '';
          pet.data.colors.forEach((colName, cIdx) => {
            const btn = document.createElement('button');
            btn.className = `color-btn ${pet.currentColor === cIdx ? 'active' : ''}`;
            btn.textContent = colName;
            btn.addEventListener('click', () => {
              pet.currentColor = cIdx;
              document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              window.SoundEngine.playClick();
              this.updatePreviewCanvas(pet);
            });
            list.appendChild(btn);
          });
        } else {
          colorContainer.style.display = 'none';
        }
      }

      this.updatePetCardUI();
      this.updatePreviewCanvas(pet);
    }

    updatePetCardUI() {
      if (!this.selectedPet) return;
      const pet = this.selectedPet;

      const affEl = document.getElementById('statAffection');
      const affBar = document.getElementById('barAffection');
      const hungEl = document.getElementById('statHunger');
      const hungBar = document.getElementById('barHunger');
      const nrgEl = document.getElementById('statEnergy');
      const nrgBar = document.getElementById('barEnergy');
      const moodEl = document.getElementById('statMood');

      if (affEl) affEl.textContent = `${pet.stats.affection}/100`;
      if (affBar) affBar.style.width = `${pet.stats.affection}%`;
      if (hungEl) hungEl.textContent = `${pet.stats.hunger}%`;
      if (hungBar) hungBar.style.width = `${pet.stats.hunger}%`;
      if (nrgEl) nrgEl.textContent = `${pet.stats.energy}%`;
      if (nrgBar) nrgBar.style.width = `${pet.stats.energy}%`;
      if (moodEl) moodEl.textContent = pet.stats.mood;
      this.renderCouplePanel();
    }

    updatePreviewCanvas(pet) {
      const cv = document.getElementById('inspectorPreviewCanvas');
      if (!cv) return;
      if (cv.width !== 160) cv.width = 160;
      if (cv.height !== 160) cv.height = 160;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 160, 160);

      try {
        pet.data.draw(ctx, 80, 140, 0.95, performance.now() / 1000, {
          pose: pet.currentPose,
          isMoving: pet.currentPose === 1,
          facing: 1,
          color: pet.currentColor
        });
      } catch(e) {}
    }

    updateSanctuaryHUD() {
      const lvlEl = document.getElementById('hudSanctuaryLevel');
      const heartEl = document.getElementById('hudHeartsCount');
      if (lvlEl) lvlEl.textContent = `Cấp ${this.sanctuaryLevel}`;
      if (heartEl) heartEl.textContent = `${this.totalInteractions * 5} ❤️`;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameController();
    window.game.init();
  });

})(window);
