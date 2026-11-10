// --- AUDIO SYNTHESIZER (Web Audio API) ---
// Generates authentic 8-bit sound effects without external audio files
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  jump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.error(e);
    }
  }

  pointMilestone() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Tone 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // Tone 2
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(880, now + 0.09); // A5
      gain2.gain.setValueAtTime(0.1, now + 0.09);
      gain2.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.23);
    } catch (e) {}
  }

  hit() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  }
}

// --- GAME LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const finalScoreSpan = document.getElementById('finalScore');
const soundToggleBtn = document.getElementById('soundToggle');

const sound = new SoundFX();

// Sound toggle handler
soundToggleBtn.addEventListener('click', () => {
  sound.init();
  sound.enabled = !sound.enabled;
  soundToggleBtn.textContent = sound.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
});

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 250;
const GROUND_Y = 210;
const GRAVITY = 0.65;

let isRunning = false;
let isGameOver = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('dino_high_score') || '0', 10);
let speed = 6;
let nextSpawnDistance = 0;
let lastMilestone = 0;

// Clouds & Ground details
let clouds = [];
let groundOffset = 0;
let obstacles = [];

// Dino object
const dino = {
  x: 50,
  y: GROUND_Y - 44,
  width: 44,
  height: 48,
  vy: 0,
  jumpStrength: -11.5,
  isJumping: false,
  isDucking: false,
  legState: 0,
  animTimer: 0,

  reset() {
    this.x = 50;
    this.y = GROUND_Y - 44;
    this.width = 44;
    this.height = 48;
    this.vy = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.legState = 0;
    this.animTimer = 0;
  },

  jump() {
    if (!this.isJumping && !this.isDucking) {
      this.vy = this.jumpStrength;
      this.isJumping = true;
      sound.jump();
    }
  },

  duck(state) {
    if (this.isJumping) return;
    this.isDucking = state;
    if (state) {
      this.height = 28;
      this.width = 56;
      this.y = GROUND_Y - this.height;
    } else {
      this.height = 48;
      this.width = 44;
      this.y = GROUND_Y - this.height;
    }
  },

  update() {
    if (this.isJumping) {
      this.vy += GRAVITY;
      this.y += this.vy;

      const baseHeight = this.isDucking ? 28 : 48;
      if (this.y >= GROUND_Y - baseHeight) {
        this.y = GROUND_Y - baseHeight;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Running animation step
    this.animTimer++;
    if (this.animTimer > 5) {
      this.animTimer = 0;
      this.legState = (this.legState + 1) % 2;
    }
  },

  draw(c) {
    c.fillStyle = '#535353';

    if (this.isDucking) {
      // Ducking Dino
      c.fillRect(this.x, this.y + 10, 48, 14); // body
      c.fillRect(this.x + 36, this.y + 2, 20, 14); // head extended
      c.fillStyle = '#f7f7f7'; // eye
      c.fillRect(this.x + 48, this.y + 5, 3, 3);
      c.fillStyle = '#535353';

      // legs
      if (this.legState === 0) {
        c.fillRect(this.x + 12, this.y + 24, 6, 4);
      } else {
        c.fillRect(this.x + 28, this.y + 24, 6, 4);
      }
      return;
    }

    // Normal standing / running / jumping Dino
    // Head & Snout
    c.fillRect(this.x + 20, this.y, 24, 18);
    // Eye
    c.fillStyle = '#f7f7f7';
    c.fillRect(this.x + 24, this.y + 4, 4, 4);
    c.fillStyle = '#535353';

    // Body
    c.fillRect(this.x + 10, this.y + 14, 22, 22);
    // Tail
    c.fillRect(this.x, this.y + 18, 10, 10);
    c.fillRect(this.x + 4, this.y + 28, 6, 6);

    // Arms
    c.fillRect(this.x + 28, this.y + 20, 8, 4);

    // Legs
    if (this.isJumping) {
      // Both legs bent
      c.fillRect(this.x + 12, this.y + 36, 4, 8);
      c.fillRect(this.x + 22, this.y + 36, 4, 8);
    } else {
      // Alternating legs
      if (this.legState === 0) {
        c.fillRect(this.x + 12, this.y + 36, 4, 12);
        c.fillRect(this.x + 22, this.y + 36, 4, 7);
      } else {
        c.fillRect(this.x + 12, this.y + 36, 4, 7);
        c.fillRect(this.x + 22, this.y + 36, 4, 12);
      }
    }
  }
};

// Obstacle Classes
class Cactus {
  constructor(x, type) {
    this.x = x;
    this.type = type; // 'small', 'big', 'cluster'
    if (type === 'small') {
      this.width = 16;
      this.height = 36;
    } else if (type === 'big') {
      this.width = 24;
      this.height = 48;
    } else {
      this.width = 44;
      this.height = 38;
    }
    this.y = GROUND_Y - this.height;
    this.isBird = false;
  }

  update(currSpeed) {
    this.x -= currSpeed;
  }

  draw(c) {
    c.fillStyle = '#535353';
    if (this.type === 'cluster') {
      // Group of cacti
      c.fillRect(this.x, this.y + 6, 12, this.height - 6);
      c.fillRect(this.x + 16, this.y, 14, this.height);
      c.fillRect(this.x + 32, this.y + 10, 12, this.height - 10);
    } else if (this.type === 'big') {
      // Tall Cactus with branches
      c.fillRect(this.x + 8, this.y, 8, this.height);
      // left arm
      c.fillRect(this.x, this.y + 12, 8, 4);
      c.fillRect(this.x, this.y + 8, 4, 8);
      // right arm
      c.fillRect(this.x + 16, this.y + 18, 8, 4);
      c.fillRect(this.x + 20, this.y + 14, 4, 8);
    } else {
      // Small Cactus
      c.fillRect(this.x + 5, this.y, 6, this.height);
      c.fillRect(this.x, this.y + 8, 5, 4);
      c.fillRect(this.x, this.y + 4, 3, 6);
      c.fillRect(this.x + 11, this.y + 12, 5, 4);
      c.fillRect(this.x + 13, this.y + 8, 3, 6);
    }
  }
}

class Pterodactyl {
  constructor(x) {
    this.x = x;
    this.width = 42;
    this.height = 30;
    // Two altitudes: can duck under (middle) or jump over (low)
    const flightHeights = [GROUND_Y - 32, GROUND_Y - 58];
    this.y = flightHeights[Math.floor(Math.random() * flightHeights.length)];
    this.wingState = 0;
    this.animTimer = 0;
    this.isBird = true;
  }

  update(currSpeed) {
    this.x -= currSpeed * 1.08; // slightly faster than ground speed
    this.animTimer++;
    if (this.animTimer > 8) {
      this.animTimer = 0;
      this.wingState = (this.wingState + 1) % 2;
    }
  }

  draw(c) {
    c.fillStyle = '#535353';
    // Body & Beak
    c.fillRect(this.x + 10, this.y + 10, 22, 10);
    c.fillRect(this.x, this.y + 12, 10, 4); // beak

    if (this.wingState === 0) {
      // Wings pointing UP
      c.fillRect(this.x + 16, this.y, 10, 10);
      c.fillRect(this.x + 20, this.y - 6, 6, 6);
    } else {
      // Wings pointing DOWN
      c.fillRect(this.x + 16, this.y + 18, 10, 10);
      c.fillRect(this.x + 20, this.y + 26, 6, 6);
    }
  }
}

// Clouds
function initClouds() {
  clouds = [
    { x: 150, y: 50 },
    { x: 380, y: 35 },
    { x: 650, y: 65 }
  ];
}

function updateAndDrawClouds(c) {
  c.fillStyle = '#dcdcdc';
  clouds.forEach(cloud => {
    cloud.x -= speed * 0.15;
    if (cloud.x < -80) {
      cloud.x = CANVAS_WIDTH + Math.random() * 100;
      cloud.y = 30 + Math.random() * 60;
    }
    // Simple pixelated cloud
    c.fillRect(cloud.x + 10, cloud.y, 30, 10);
    c.fillRect(cloud.x, cloud.y + 8, 50, 12);
  });
}

// Ground
function updateAndDrawGround(c) {
  groundOffset = (groundOffset + speed) % 24;
  c.fillStyle = '#535353';
  c.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);

  // Ground bumps / pebbles
  for (let i = 0; i < CANVAS_WIDTH + 24; i += 24) {
    const x = i - groundOffset;
    c.fillRect(x, GROUND_Y + 6, 8, 2);
    c.fillRect(x + 14, GROUND_Y + 14, 4, 2);
  }
}

// Spawn Obstacles
function handleObstacles() {
  if (obstacles.length === 0 || CANVAS_WIDTH - obstacles[obstacles.length - 1].x > nextSpawnDistance) {
    // Generate new obstacle
    const canSpawnBird = score > 120 && Math.random() < 0.35;
    let newObs;
    if (canSpawnBird) {
      newObs = new Pterodactyl(CANVAS_WIDTH + 20);
    } else {
      const types = ['small', 'big', 'cluster'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      newObs = new Cactus(CANVAS_WIDTH + 20, chosen);
    }
    obstacles.push(newObs);
    // Random distance to next obstacle (scales with speed)
    nextSpawnDistance = 220 + Math.random() * 260 + speed * 10;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.update(speed);
    obs.draw(ctx);

    // Collision detection (with a slight padding margin for fair gameplay)
    const padding = 5;
    if (
      dino.x + padding < obs.x + obs.width - padding &&
      dino.x + dino.width - padding > obs.x + padding &&
      dino.y + padding < obs.y + obs.height - padding &&
      dino.y + dino.height - padding > obs.y + padding
    ) {
      triggerGameOver();
      return;
    }

    // Remove off-screen obstacles
    if (obs.x + obs.width < -10) {
      obstacles.splice(i, 1);
    }
  }
}

// Score display
function drawScore() {
  ctx.fillStyle = '#535353';
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.textAlign = 'right';

  const currentScoreStr = String(Math.floor(score)).padStart(5, '0');
  const highScoreStr = String(highScore).padStart(5, '0');

  ctx.fillText(`HI ${highScoreStr}  ${currentScoreStr}`, CANVAS_WIDTH - 20, 30);
}

function triggerGameOver() {
  isGameOver = true;
  isRunning = false;
  sound.hit();

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('dino_high_score', highScore);
  }

  finalScoreSpan.textContent = Math.floor(score);
  gameOverScreen.classList.remove('hidden');
}

function startGame() {
  sound.init();
  dino.reset();
  obstacles = [];
  score = 0;
  speed = 6;
  lastMilestone = 0;
  nextSpawnDistance = 180;
  isGameOver = false;
  isRunning = true;

  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  initClouds();

  requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop() {
  if (!isRunning) return;

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Update game state
  score += 0.15;
  speed += 0.0007; // subtle acceleration over time

  // Sound cue on every 100 points
  const currentHundred = Math.floor(score / 100);
  if (currentHundred > lastMilestone && currentHundred > 0) {
    lastMilestone = currentHundred;
    sound.pointMilestone();
  }

  // Draw background and world
  updateAndDrawClouds(ctx);
  updateAndDrawGround(ctx);

  // Player & Obstacles
  dino.update();
  dino.draw(ctx);
  handleObstacles();

  // HUD
  drawScore();

  if (isRunning) {
    requestAnimationFrame(gameLoop);
  }
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!isRunning && !isGameOver) {
      startGame();
    } else if (isRunning) {
      dino.jump();
    } else if (isGameOver) {
      startGame();
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (isRunning) {
      dino.duck(true);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// Canvas / Screen touch & click handling
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!isRunning && !isGameOver) {
    startGame();
  } else if (isRunning) {
    dino.jump();
  }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial setup
initClouds();
dino.draw(ctx);
updateAndDrawGround(ctx);

