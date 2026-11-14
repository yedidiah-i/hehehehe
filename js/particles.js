/**
 * Neon Arcade Particle & Visual FX System
 * Handles screen shake, explosion sparks, shockwaves, engine thrusters, and floating text.
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.shakeTimeRemaining = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
    }

    reset() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.shakeTimeRemaining = 0;
        this.shakeOffset = { x: 0, y: 0 };
    }

    /**
     * Trigger dynamic camera screen shake
     */
    triggerScreenShake(intensity = 18, durationMs = 450) {
        this.shakeIntensity = intensity;
        this.shakeDuration = durationMs / 1000;
        this.shakeTimeRemaining = this.shakeDuration;
    }

    /**
     * Massive collision explosion
     */
    createCollisionExplosion(x, y, color = '#ff007f', secondaryColor = '#00f3ff') {
        this.triggerScreenShake(20, 500);

        // 1. Shockwave rings
        this.shockwaves.push({
            x, y,
            radius: 5,
            maxRadius: 140,
            growSpeed: 380,
            color: color,
            alpha: 1.0,
            lineWidth: 4
        });
        this.shockwaves.push({
            x, y,
            radius: 2,
            maxRadius: 90,
            growSpeed: 240,
            color: secondaryColor,
            alpha: 0.9,
            lineWidth: 3
        });

        // 2. High energy sparks & debris
        const count = 55;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 420;
            const life = 0.4 + Math.random() * 0.7;
            const useAltColor = Math.random() > 0.4;
            const pColor = useAltColor ? color : (Math.random() > 0.5 ? secondaryColor : '#ffffff');

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60, // Slight upward bias
                size: 2 + Math.random() * 4,
                color: pColor,
                alpha: 1,
                life: life,
                maxLife: life,
                gravity: 280,
                drag: 0.97
            });
        }

        // 3. Floating impact banner
        this.floatingTexts.push({
            x,
            y: y - 20,
            text: '💥 IMPACT!',
            color: '#fff',
            glowColor: color,
            alpha: 1.0,
            life: 1.2,
            maxLife: 1.2,
            vy: -45,
            fontSize: 22
        });
    }

    /**
     * Emits thruster particles from paddle bottom
     */
    emitThruster(x, y, vx, color = '#00f3ff') {
        const pColor = Math.random() > 0.3 ? color : '#ffffff';
        this.particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + 2,
            vx: vx * 0.2 + (Math.random() - 0.5) * 35,
            vy: 40 + Math.random() * 70,
            size: 2 + Math.random() * 2.5,
            color: pColor,
            alpha: 0.8,
            life: 0.25 + Math.random() * 0.2,
            maxLife: 0.45,
            gravity: 20,
            drag: 0.95
        });
    }

    /**
     * Emits subtle atmospheric speed trail behind fast bricks
     */
    emitBrickSpeedTrail(x, y, width, color = '#ff007f') {
        if (Math.random() > 0.4) return;
        this.particles.push({
            x: x + 8 + Math.random() * (width - 16),
            y: y - 2,
            vx: (Math.random() - 0.5) * 15,
            vy: -20 - Math.random() * 40,
            size: 1.5 + Math.random() * 2,
            color: color,
            alpha: 0.5,
            life: 0.2 + Math.random() * 0.15,
            maxLife: 0.35,
            gravity: -10,
            drag: 0.98
        });
    }

    /**
     * Update all particles and shake timers
     */
    update(dt) {
        // 1. Screen shake
        if (this.shakeTimeRemaining > 0) {
            this.shakeTimeRemaining -= dt;
            const progress = this.shakeTimeRemaining / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * (progress * progress); // Quadratic falloff
            this.shakeOffset.x = (Math.random() * 2 - 1) * currentIntensity;
            this.shakeOffset.y = (Math.random() * 2 - 1) * currentIntensity;
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }

        // 2. Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growSpeed * dt;
            const progress = sw.radius / sw.maxRadius;
            sw.alpha = Math.max(0, 1 - progress);
            if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        // 3. Spark & engine particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity * dt;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.alpha = Math.max(0, p.life / p.maxLife);
        }

        // 4. Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            ft.y += ft.vy * dt;
            ft.alpha = Math.max(0, ft.life / ft.maxLife);
        }
    }

    /**
     * Render particles to the canvas context
     */
    draw(ctx) {
        ctx.save();

        // 1. Draw Shockwaves
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = sw.alpha;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = sw.lineWidth;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
        }

        // 2. Draw Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Draw Floating Texts
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `900 ${ft.fontSize}px 'Outfit', 'Inter', system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.glowColor;
            ctx.shadowBlur = 12;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        ctx.restore();
    }
}

window.particleSystem = new ParticleSystem();
