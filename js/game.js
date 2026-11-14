/**
 * Neon Arcade Game Engine
 * Manages HTML5 Canvas, high-DPI scaling, paddle physics, brick spawning,
 * non-overlapping distribution, collision detection, and speed ramping.
 */

// Canvas roundRect polyfill for older browser support
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        if (!Array.isArray(r)) r = [0, 0, 0, 0];
        const [tl, tr, br, bl] = r;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

class GameEngine {
    constructor(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks; // onCrash, onStateChange, onHudUpdate

        // Logical virtual resolution for consistent physics & rendering
        this.virtualWidth = 960;
        this.virtualHeight = 660;

        // Settings (customizable from UI)
        this.settings = {
            baseSpeedLevel: 5,        // 1 to 10
            gradualSpeedRamp: true,   // toggle
            brickDensity: 9,          // 3 to 15+
            controlMode: 'both',      // 'keyboard', 'mouse', 'both'
            mouseSensitivity: 1.0
        };

        // Speed mapping for levels 1 to 10 (pixels per second)
        this.speedMap = {
            1: 180,
            2: 240,
            3: 320,
            4: 420,
            5: 530,
            6: 660,
            7: 820,
            8: 1010,
            9: 1220,
            10: 1460 // Insane reflex-testing speed!
        };

        // Paddle definition
        this.paddle = {
            width: 116,
            height: 22,
            x: (this.virtualWidth - 116) / 2,
            y: this.virtualHeight - 48,
            vx: 0,
            targetX: (this.virtualWidth - 116) / 2,
            maxSpeed: 880,
            acceleration: 4800,
            friction: 0.82,
            tilt: 0
        };

        // Input state
        this.keys = {
            left: false,
            right: false
        };
        this.mousePos = { x: null, y: null };
        this.isPointerActive = false;

        // Falling bricks & spawn timing
        this.activeBricks = [];
        this.spawnTimer = 0;
        this.minSpawnInterval = 0.18; // Seconds between spawn attempts

        // Round & survival state
        this.state = 'STANDBY'; // 'STANDBY', 'ROUND_READY', 'PLAYING', 'CRASH_PAUSE', 'ROUND_OVER', 'GAME_OVER', 'PAUSED'
        this.survivalTime = 0;
        this.dodgedCount = 0;
        this.currentRampMultiplier = 1.0;
        this.currentEffectiveSpeed = 530;

        // Frame timing
        this.lastTime = 0;
        this.animationFrameId = null;

        // Impact freeze timer
        this.impactFreezeTime = 0;
        this.collidedBrick = null;

        // Neon color palette for bricks
        this.neonColors = [
            '#00f3ff', // Neon Cyan
            '#ff007f', // Hot Pink
            '#ffd600', // Electric Gold
            '#00ff88', // Toxic Mint
            '#b800ff', // Violet Neon
            '#ff5500', // Bright Orange
            '#00d4ff', // Sky Blue
            '#ff2a6d'  // Cyber Magenta
        ];

        this.initCanvasDPI();
        this.initInputListeners();
    }

    /**
     * High DPI retina canvas initialization
     */
    initCanvasDPI() {
        const dpr = window.devicePixelRatio || 1;
        
        // Internal pixel size
        this.canvas.width = Math.round(this.virtualWidth * dpr);
        this.canvas.height = Math.round(this.virtualHeight * dpr);

        // Scaling context
        if (this.ctx.setTransform) {
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
            this.ctx.scale(dpr, dpr);
        }
    }

    /**
     * Input listeners (keyboard, mouse, touch)
     */
    initInputListeners() {
        // Keyboard listeners
        window.addEventListener('keydown', (e) => {
            // Do not capture gameplay keys if user is typing in form inputs
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = true;
                e.preventDefault();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = true;
                e.preventDefault();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                // If round ready or in crash overlay, trigger ready
                if (this.callbacks.onSpacePressed) {
                    this.callbacks.onSpacePressed();
                }
            }
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        });

        // Pointer / Touch / Mouse tracking
        const getCanvasCoordX = (clientX) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.virtualWidth / rect.width;
            return (clientX - rect.left) * scaleX;
        };

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.settings.controlMode === 'keyboard') return;
            const mouseX = getCanvasCoordX(e.clientX);
            this.paddle.targetX = mouseX - this.paddle.width / 2;
            this.isPointerActive = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isPointerActive = false;
        });

        // Touch support for mobile / tablets
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const touchX = getCanvasCoordX(e.touches[0].clientX);
                this.paddle.targetX = touchX - this.paddle.width / 2;
                this.isPointerActive = true;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const touchX = getCanvasCoordX(e.touches[0].clientX);
                this.paddle.targetX = touchX - this.paddle.width / 2;
                this.isPointerActive = true;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
            this.isPointerActive = false;
        });

        window.addEventListener('resize', () => {
            this.initCanvasDPI();
        });
    }

    /**
     * Start the master animation loop
     */
    start() {
        if (this.animationFrameId) return;
        this.lastTime = performance.now();
        const loop = (currentTime) => {
            const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // clamp delta
            this.lastTime = currentTime;

            this.update(dt);
            this.render();

            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Start a round for the active player
     */
    startRound() {
        this.state = 'PLAYING';
        this.survivalTime = 0;
        this.dodgedCount = 0;
        this.activeBricks = [];
        this.spawnTimer = 0;
        this.impactFreezeTime = 0;
        this.collidedBrick = null;

        // Center paddle
        this.paddle.x = (this.virtualWidth - this.paddle.width) / 2;
        this.paddle.targetX = this.paddle.x;
        this.paddle.vx = 0;
        this.paddle.tilt = 0;

        window.particleSystem.reset();
        window.soundEngine.playRoundStart();

        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.state);
        }
    }

    /**
     * Pause / Resume toggle
     */
    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
        }
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.state);
        }
    }

    /**
     * Updates settings dynamically from UI
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
    }

    /**
     * Calculate current falling brick speed
     */
    calculateCurrentSpeed() {
        const baseSpeed = this.speedMap[this.settings.baseSpeedLevel] || 530;
        if (this.settings.gradualSpeedRamp && this.state === 'PLAYING') {
            // Speed ramps up +3.2% per second survived, up to 2.5x base
            this.currentRampMultiplier = 1 + Math.min(1.5, this.survivalTime * 0.032);
        } else {
            this.currentRampMultiplier = 1.0;
        }
        this.currentEffectiveSpeed = Math.round(baseSpeed * this.currentRampMultiplier);
        return this.currentEffectiveSpeed;
    }

    /**
     * Spawn falling bricks with staggered spacing and no awkward overlap
     */
    handleBrickSpawning(dt) {
        if (this.state !== 'PLAYING') return;

        const targetPool = window.listManager.targetBricksPool;
        if (targetPool.length === 0) return;

        const maxDensity = Math.max(3, parseInt(this.settings.brickDensity, 10) || 9);
        this.spawnTimer += dt;

        // Dynamic spawn rate: at higher speeds, spawn slightly faster
        const baseSpeed = this.calculateCurrentSpeed();
        const adjustedInterval = Math.max(0.08, this.minSpawnInterval * (500 / baseSpeed));

        if (this.activeBricks.length < maxDensity && this.spawnTimer >= adjustedInterval) {
            this.spawnTimer = 0;

            // Pick a name from target pool (uniform random)
            const targetItem = targetPool[Math.floor(Math.random() * targetPool.length)];
            const brickName = targetItem.name;

            // Calculate width based on text length
            const estimatedWidth = Math.max(105, Math.min(190, 48 + brickName.length * 9.5));
            const brickHeight = 36;

            // Pick candidate X with anti-collision spacing check
            const candidateX = this.findClearSpawnX(estimatedWidth);

            if (candidateX !== null) {
                // Color palette assignment
                const colorTheme = this.neonColors[Math.floor(Math.random() * this.neonColors.length)];

                // Individual speed jitter (+/- 6% for organic fluid feel)
                const speedJitter = 1 + (Math.random() * 0.12 - 0.06);
                const individualSpeed = baseSpeed * speedJitter;

                this.activeBricks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 6),
                    name: brickName,
                    x: candidateX,
                    y: -brickHeight - (Math.random() * 30),
                    width: estimatedWidth,
                    height: brickHeight,
                    speed: individualSpeed,
                    colorTheme: colorTheme,
                    hasDodged: false
                });
            }
        }
    }

    /**
     * Non-overlapping spawn positioning algorithm
     */
    findClearSpawnX(brickWidth) {
        const margin = 16;
        const maxAttempts = 14;
        const safeZoneY = 110; // Clearance height from top
        const maxX = this.virtualWidth - brickWidth - margin;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidateX = margin + Math.random() * (maxX - margin);

            // Check if any existing brick in the upper zone overlaps candidate
            let hasCollision = false;
            for (const brick of this.activeBricks) {
                if (brick.y < safeZoneY) {
                    const candidateCenter = candidateX + brickWidth / 2;
                    const brickCenter = brick.x + brick.width / 2;
                    const minAllowedDistance = (brickWidth + brick.width) / 2 + 18;

                    if (Math.abs(candidateCenter - brickCenter) < minAllowedDistance) {
                        hasCollision = true;
                        break;
                    }
                }
            }

            if (!hasCollision) {
                return candidateX;
            }
        }

        // If top area is crowded, allow slight delay or stagger
        return null;
    }

    /**
     * Physics and state update
     */
    update(dt) {
        // Always update visual particles and shake
        window.particleSystem.update(dt);

        // If impact freeze is active
        if (this.state === 'CRASH_PAUSE') {
            this.impactFreezeTime -= dt;
            if (this.impactFreezeTime <= 0) {
                this.state = 'ROUND_OVER';
                if (this.callbacks.onCrash) {
                    this.callbacks.onCrash(
                        this.collidedBrick.name,
                        this.survivalTime,
                        this.dodgedCount
                    );
                }
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        // 1. Survival time & stats update
        this.survivalTime += dt;
        this.calculateCurrentSpeed();

        // 2. Paddle movement update (Snappy, Zero-Lag Physics)
        this.updatePaddlePhysics(dt);

        // 3. Falling bricks update & spawning
        this.handleBrickSpawning(dt);

        // 4. Update active bricks positions
        for (let i = this.activeBricks.length - 1; i >= 0; i--) {
            const brick = this.activeBricks[i];
            brick.y += brick.speed * dt;

            // Emit subtle high-speed trail if moving fast (speed level 6+)
            if (this.settings.baseSpeedLevel >= 6 || this.currentRampMultiplier > 1.25) {
                window.particleSystem.emitBrickSpeedTrail(brick.x, brick.y, brick.width, brick.colorTheme);
            }

            // Check collision with paddle
            if (this.checkCollision(this.paddle, brick)) {
                this.triggerCrash(brick);
                return;
            }

            // Check if passed safely bottom
            if (brick.y > this.virtualHeight + 10) {
                this.dodgedCount++;
                this.activeBricks.splice(i, 1);

                // Near-miss sound if close to paddle X
                const paddleCenterX = this.paddle.x + this.paddle.width / 2;
                const brickCenterX = brick.x + brick.width / 2;
                if (Math.abs(paddleCenterX - brickCenterX) < this.paddle.width * 0.9) {
                    window.soundEngine.playNearMiss();
                }
            }
        }

        // 5. Notify HUD
        if (this.callbacks.onHudUpdate) {
            this.callbacks.onHudUpdate({
                survivalTime: this.survivalTime,
                dodgedCount: this.dodgedCount,
                effectiveSpeed: this.currentEffectiveSpeed,
                rampMultiplier: this.currentRampMultiplier
            });
        }
    }

    /**
     * Paddle Movement with instant responsiveness and snappy stopping
     */
    updatePaddlePhysics(dt) {
        let inputDirection = 0;
        if (this.keys.left) inputDirection -= 1;
        if (this.keys.right) inputDirection += 1;

        if (inputDirection !== 0) {
            // Snappy keyboard acceleration
            this.paddle.vx += inputDirection * this.paddle.acceleration * dt;
            this.paddle.vx = Math.max(-this.paddle.maxSpeed, Math.min(this.paddle.maxSpeed, this.paddle.vx));
            this.paddle.x += this.paddle.vx * dt;
            this.paddle.tilt = inputDirection * 0.12; // tilt angle
        } else if (this.isPointerActive && this.settings.controlMode !== 'keyboard') {
            // Direct snappy pointer following with smooth spring
            const dx = this.paddle.targetX - this.paddle.x;
            this.paddle.vx = dx * 28; // tight direct tracking
            this.paddle.vx = Math.max(-this.paddle.maxSpeed * 1.3, Math.min(this.paddle.maxSpeed * 1.3, this.paddle.vx));
            this.paddle.x += this.paddle.vx * dt;
            this.paddle.tilt = Math.max(-0.15, Math.min(0.15, (this.paddle.vx / this.paddle.maxSpeed) * 0.12));
        } else {
            // Instant crisp stop
            this.paddle.vx *= Math.pow(this.paddle.friction, dt * 60);
            if (Math.abs(this.paddle.vx) < 5) this.paddle.vx = 0;
            this.paddle.x += this.paddle.vx * dt;
            this.paddle.tilt *= 0.85;
        }

        // Clamp paddle to canvas bounds
        const minX = 6;
        const maxX = this.virtualWidth - this.paddle.width - 6;
        if (this.paddle.x < minX) {
            this.paddle.x = minX;
            this.paddle.vx = 0;
        } else if (this.paddle.x > maxX) {
            this.paddle.x = maxX;
            this.paddle.vx = 0;
        }

        // Engine thrusters emission
        if (this.state === 'PLAYING') {
            const centerX = this.paddle.x + this.paddle.width / 2;
            const bottomY = this.paddle.y + this.paddle.height;
            window.particleSystem.emitThruster(centerX - 24, bottomY, this.paddle.vx);
            window.particleSystem.emitThruster(centerX + 24, bottomY, this.paddle.vx);
        }
    }

    /**
     * Precise AABB Collision Detection with edge tolerance
     */
    checkCollision(paddle, brick) {
        // Inset margins for fair, polished arcade hitboxes
        const pBox = {
            left: paddle.x + 6,
            right: paddle.x + paddle.width - 6,
            top: paddle.y + 4,
            bottom: paddle.y + paddle.height - 2
        };

        const bBox = {
            left: brick.x + 4,
            right: brick.x + brick.width - 4,
            top: brick.y + 3,
            bottom: brick.y + brick.height - 3
        };

        return !(
            pBox.right < bBox.left ||
            pBox.left > bBox.right ||
            pBox.bottom < bBox.top ||
            pBox.top > bBox.bottom
        );
    }

    /**
     * Trigger collision sequence
     */
    triggerCrash(brick) {
        this.state = 'CRASH_PAUSE';
        this.collidedBrick = brick;
        this.impactFreezeTime = 0.45; // 450ms freeze frame impact

        const contactX = Math.max(this.paddle.x, Math.min(this.paddle.x + this.paddle.width, brick.x + brick.width / 2));
        const contactY = this.paddle.y;

        // Visual & Audio effects
        window.particleSystem.createCollisionExplosion(contactX, contactY, brick.colorTheme, '#ffffff');
        window.soundEngine.playCrash();
    }

    /**
     * Full Canvas Render Pass
     */
    render() {
        const ctx = this.ctx;
        ctx.save();

        // 1. Apply Screen Shake offset
        const shake = window.particleSystem.shakeOffset;
        ctx.translate(shake.x, shake.y);

        // 2. Clear background with subtle cyber grid
        this.renderBackground(ctx);

        // 3. Render falling bricks
        this.renderBricks(ctx);

        // 4. Render player paddle
        this.renderPaddle(ctx);

        // 5. Render particle effects & shockwaves
        window.particleSystem.draw(ctx);

        // 6. Pause overlay indicator
        if (this.state === 'PAUSED') {
            this.renderPauseOverlay(ctx);
        }

        ctx.restore();
    }

    /**
     * Deep arcade background with retro grid lines
     */
    renderBackground(ctx) {
        // Deep gradient fill
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
        bgGrad.addColorStop(0, '#090a10');
        bgGrad.addColorStop(1, '#0e111a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

        // Subtle glowing cyber grid lines
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
        ctx.lineWidth = 1;

        const gridSize = 48;
        // Vertical grid lines
        for (let x = 0; x < this.virtualWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.virtualHeight);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = 0; y < this.virtualHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.virtualWidth, y);
            ctx.stroke();
        }

        // Bottom danger zone glow line
        const dangerY = this.virtualHeight - 55;
        const dangerGrad = ctx.createLinearGradient(0, 0, this.virtualWidth, 0);
        dangerGrad.addColorStop(0, 'rgba(255, 0, 127, 0.05)');
        dangerGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.25)');
        dangerGrad.addColorStop(1, 'rgba(255, 0, 127, 0.05)');

        ctx.strokeStyle = dangerGrad;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, dangerY);
        ctx.lineTo(this.virtualWidth, dangerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    /**
     * Render falling bricks with maximum contrast and neon borders
     */
    renderBricks(ctx) {
        for (const brick of this.activeBricks) {
            ctx.save();

            const radius = 6;
            const x = brick.x;
            const y = brick.y;
            const w = brick.width;
            const h = brick.height;
            const color = brick.colorTheme;

            // 1. Dark high-contrast background plate
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, radius);
            ctx.fillStyle = '#0a0d16'; // Deep charcoal/black
            ctx.fill();

            // Inner subtle gradient fill
            const innerGrad = ctx.createLinearGradient(x, y, x, y + h);
            innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = innerGrad;
            ctx.fill();

            // 2. Glowing Neon Border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.0;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();

            // 3. Neon side accent tag
            ctx.fillStyle = color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.roundRect(x + 4, y + 6, 4, h - 12, 2);
            ctx.fill();

            // 4. High-contrast typography for name
            // Dynamic auto-scaling font size for readability
            let fontSize = 14;
            if (brick.name.length > 16) fontSize = 11.5;
            else if (brick.name.length > 12) fontSize = 12.5;

            ctx.font = `700 ${fontSize}px 'Outfit', 'Inter', system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Shadow for maximum contrast against any background
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;

            ctx.fillStyle = '#ffffff';
            ctx.fillText(brick.name, x + w / 2 + 2, y + h / 2);

            ctx.restore();
        }
    }

    /**
     * Render high-tech hover glider paddle
     */
    renderPaddle(ctx) {
        ctx.save();
        const p = this.paddle;
        const centerX = p.x + p.width / 2;
        const centerY = p.y + p.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate(p.tilt); // Dynamic banking tilt
        ctx.translate(-centerX, -centerY);

        const x = p.x;
        const y = p.y;
        const w = p.width;
        const h = p.height;

        // 1. Glowing outer shield hull
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // High-tech neon cyan border
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 2. Wingtip accent stabilizers
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 2, y + 4, 6, h - 8);
        ctx.fillRect(x + w - 8, y + 4, 6, h - 8);

        // 3. Central glowing energy core
        const coreGrad = ctx.createLinearGradient(centerX - 18, y, centerX + 18, y);
        coreGrad.addColorStop(0, '#00f3ff');
        coreGrad.addColorStop(0.5, '#ffffff');
        coreGrad.addColorStop(1, '#00f3ff');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(centerX - 16, y + 5, 32, h - 10, 4);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render pause overlay
     */
    renderPauseOverlay(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 7, 13, 0.75)';
        ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

        ctx.font = `900 36px 'Outfit', 'Inter', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 16;
        ctx.fillText('GAME PAUSED', this.virtualWidth / 2, this.virtualHeight / 2 - 15);

        ctx.font = `500 15px 'Inter', system-ui, sans-serif`;
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.fillText('Press Pause Button or Escape to Resume', this.virtualWidth / 2, this.virtualHeight / 2 + 25);
        ctx.restore();
    }
}

window.GameEngine = GameEngine;
