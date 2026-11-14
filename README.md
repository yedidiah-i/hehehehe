# 🎮 Arcade Dodge: Name Crash Elimination Game

A fast-paced, polished 2D browser arcade game built using **HTML5 Canvas**, modern **CSS3**, and **clean vanilla JavaScript**. 

Designed as a **pass-and-play group elimination and pairing tool**, players dodge falling bricks labeled with people's names. There is no traditional "You Win" screen—the game continuously matches each player with a target until the queue is finished or all targets are eliminated.

---

## 🕹️ Core Game Mechanics & Dual Lists

### 1. Dual List Architecture
- **List 1 — Active Players Queue (Who is playing):**
  - A sequential queue of people taking turns controlling the character at the bottom.
  - Players strictly play in the order listed.
  - Before each round, the game displays a **Ready Overlay** allowing the next person to take the controls.
- **List 2 — Target Bricks Pool (Who gets crashed into):**
  - A pool of names assigned to the falling bricks.
  - When the active player collides with a falling brick:
    1. Action freezes with a dynamic **screen shake**, **shockwave rings**, **spark explosion**, and an arcade punch sound effect.
    2. An overlay announces: `[Player Name] crashed into [Brick Name]!`
    3. That brick's name is **permanently removed** from the Target Bricks Pool.
    4. The current player finishes their turn and advances to the next person in queue.
    5. The pairing is permanently recorded in the **Match Log & History Drawer**.

### 2. Gameplay & Physics
- **Movement:** Left/Right Arrow keys, `A` / `D` keys, or direct **Touch / Mouse drag**. Snappy physics with instant acceleration, zero input lag, and aerodynamic banking tilt.
- **Falling Bricks:** Labeled clearly with names from the target pool, featuring high-contrast dark plates, neon borders, and auto-scaling typography so names never clip.
- **Anti-Overlap Spawning:** Non-overlapping spacing algorithm prevents bricks from stacking awkwardly while keeping the screen chaotic and challenging.
- **No Victory Condition:** Once either the Active Queue or Target Pool is depleted, an **Elimination Complete** recap modal opens with full stats, longest survivor MVP crown, and rematch options.

---

## ⚙️ Comprehensive Settings & Live Controls

Click the **Settings (⚙️)** button in the top HUD at any time to customize:

1. **Dual Lists Manager:**
   - **Active Players Queue:** Add names individually or bulk-paste (comma- or newline-separated). Reorder players up/down, delete individual players, shuffle, or clear.
   - **Target Bricks Pool:** Add targets individually or bulk-paste. Delete names, shuffle, or reset to presets.
   - **Party Presets:**
     - 🎉 *Party Crew* (Friends & Celebrities)
     - 💻 *Tech Titans & Pioneers*
     - 🦹 *Legendary Movie Villains*
     - 🏢 *Office Chaos & Corporate Legends*
2. **Extreme Speed Slider (1 to 10):**
   - From Level 1 (Normal ~180 px/s) to Level 10 (Insane ~1460 px/s).
   - At high levels (7–10), bricks drop at reflex-testing speeds!
   - **Gradual Speed Ramp:** Toggle on to continuously accelerate the fall speed the longer an active player survives their turn (+3.2% per second).
3. **On-Screen Brick Density Slider (3 to 18):**
   - Controls maximum simultaneous falling bricks (defaults to 9).
   - If the Target Bricks Pool has fewer names than the density setting, bricks share names from the remaining pool so the screen stays packed and difficult.
4. **Controls Mode:** Choose between *Both Keyboard & Mouse/Touch*, *Keyboard Only*, or *Mouse/Touch Only*.
5. **Synthesized Web Audio Engine:**
   - Pure Web Audio API synthesized sound effects: crash explosion, whoosh near-miss sounds, round start chimes, and UI blips.
   - Zero external audio files required—works 100% offline. Volume slider and mute toggle included.

---

## 📁 File Structure

```text
├── index.html          # Semantic HTML5 layout, HUD, Canvas arena, and modal overlays
├── css/
│   └── style.css       # Sleek cyberpunk / neon arcade dark theme, glassmorphic HUD & drawers
├── js/
│   ├── audio.js        # Pure Web Audio API sound synthesis engine (crashes, whooshes, chimes)
│   ├── particles.js    # Particle explosion physics, shockwaves, thrusters & screen shake
│   ├── lists.js        # Dual lists state manager, presets, history logger & localStorage persistence
│   ├── game.js         # Canvas engine, high-DPI scaling, paddle physics, spawning & collision
│   └── app.js          # App controller, event wiring, HUD updates, modal handling & shortcuts
└── README.md           # Documentation and user guide
```

---

## 🚀 How to Run

1. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari, etc.).
2. No installation, server, build tools, or internet connection required.
3. Press **Spacebar** or click **Start Round** to begin dodging!
