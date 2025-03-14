// Global Variables and Game Constants
let globalHighScore = 0;
// Removed dangerous powerup durations that affect invincibility (red, orange) and lava.
let pinkPowerupEndTime = 0; // Pink powerup active time
let brownPowerupEndTime = 0; // Brown powerup active time
let whitePowerupEndTime = 0; // White powerup active time (new)
let jumpBoostEndTime = 0;  // For jump boost powerup

// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const messageDiv = document.getElementById("message");
const retryButton = document.getElementById("retryButton");
const startMenu = document.getElementById("startMenu");
const tutorialToggle = document.getElementById("tutorialToggle");
const tutorialGuide = document.getElementById("tutorialGuide");
const tabPowerup = document.getElementById("tabPowerup");
const tabPlatform = document.getElementById("tabPlatform");
const contentPowerup = document.getElementById("contentPowerup");
const contentPlatform = document.getElementById("contentPlatform");
const backgroundMusic = document.getElementById("backgroundMusic");

// Powerup durations and multipliers
const PINK_DURATION = 5000;  // 5 seconds
const BROWN_DURATION = 5000; // 5 seconds
const WHITE_DURATION = 10000; // 10 seconds for white powerup

// Helper: returns 2 if pink powerup active, else 1.
const pinkMultiplier = () => performance.now() < pinkPowerupEndTime ? 2 : 1;
// Helper: For Brown powerup, used later.
const isBrownActive = () => performance.now() < brownPowerupEndTime;

// Game constants (base values)
const GRAVITY = 0.5;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 10;
const baseJumpStrength = -12;
const boostedJumpStrength = -16;
const HUGE_JUMP_STRENGTH = -40;

// For Brown powerup: reduce jump strength and increase gravity.
const BROWN_JUMP_MULTIPLIER = 0.75;  // lighter jump
const BROWN_GRAVITY_MULTIPLIER = 1.25; // heavier

// Note: In Baby Mode, we remove the lava system and spike events completely.
// Remove all lava-related variables and functions.

// Score and Camera
let baseY = 0;
let maxScore = 0;
let cameraOffset = 0;

// Player Object
let player = {
  x: 0,
  y: 0,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0,
  vy: 0
};

// Removed Spike Event & Cover Settings (entire feature removed)

// Variables for jump physics enhancements
let jumpKeyHeld = false;
let jumpStartTime = 0;

// Easing functions for animations
function easeOutQuad(t) {
  return t * (2 - t);
}
function easeInQuad(t) {
  return t * t;
}

// --- UI and Tutorial Setup ---
document.addEventListener("DOMContentLoaded", function() {
  // Tutorial toggle event
  tutorialToggle.addEventListener("click", function() {
    tutorialGuide.style.display = (tutorialGuide.style.display === "none" || tutorialGuide.style.display === "") ? "block" : "none";
  });
  tabPowerup.addEventListener("click", function() {
    contentPowerup.style.display = "block";
    contentPlatform.style.display = "none";
  });
  tabPlatform.addEventListener("click", function() {
    contentPowerup.style.display = "none";
    contentPlatform.style.display = "block";
  });
});

// --- Platform Generation ---
// Removed ghost platform creation.
let platforms = [];
function createPlatform(x, y) {
  let platform = {
    x: x,
    y: y,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    moving: false,
    disappearing: false,
    disappearStartTime: null,
    powerup: null
  };
  let movingChance = globalHighScore >= 3000 ? 0.5 : 0.3;
  let disappearingChance = globalHighScore >= 3000 ? 0.4 : 0.2;
  if (Math.random() < movingChance) {
    platform.moving = true;
    platform.moveSpeed = 1 + Math.random();
    platform.direction = Math.random() < 0.5 ? 1 : -1;
    platform.minX = Math.max(0, platform.x - 30);
    platform.maxX = Math.min(canvas.width - PLATFORM_WIDTH, platform.x + 30);
  }
  if (Math.random() < disappearingChance) {
    platform.disappearing = true;
  }
  // Powerup assignment with adjusted probabilities for Baby Mode.
  if (Math.random() < 0.2) {
    let r = Math.random();
    // Out of the 20% chance, 5% overall for white powerup.
    if (r < 0.05) {
      platform.powerup = { type: "white", collected: false };
    } else if (r < 0.05 + 0.125) { // jump powerup
      platform.powerup = { type: "jump", collected: false };
    } else if (r < 0.05 + 0.125 + 0.075) { // redorange (safe huge jump)
      platform.powerup = { type: "redorange", collected: false };
    } else if (r < 0.05 + 0.125 + 0.075 + 0.075) { // cyan invincibility
      platform.powerup = { type: "cyan", collected: false };
    } else if (r < 0.05 + 0.125 + 0.075 + 0.075 + 0.1) { // purple teleport
      platform.powerup = { type: "purple", collected: false };
    } else if (r < 0.05 + 0.125 + 0.075 + 0.075 + 0.1 + 0.05) { // darkblue effect
      platform.powerup = { type: "darkblue", collected: false };
    } else if (r < 0.05 + 0.125 + 0.075 + 0.075 + 0.1 + 0.05 + 0.1) { // pink speed up
      platform.powerup = { type: "pink", collected: false };
    } else { // brown (heavier player)
      platform.powerup = { type: "brown", collected: false };
    }
  }
  return platform;
}

function generateInitialPlatforms() {
  platforms = [];
  let startPlatformY = 580;
  let startPlatformX = canvas.width / 2 - PLATFORM_WIDTH / 2;
  let spawnPlatform = {
    x: startPlatformX,
    y: startPlatformY,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    moving: false,
    disappearing: false,
    disappearStartTime: null,
    powerup: null
  };
  platforms.push(spawnPlatform);
  let highestPlatformY = startPlatformY;
  for (let i = 0; i < 15; i++) {
    let gapY = 30 + Math.random() * 40;
    let newY = highestPlatformY - gapY;
    let newX = Math.random() * (canvas.width - PLATFORM_WIDTH);
    platforms.push(createPlatform(newX, newY));
    highestPlatformY = newY;
  }
}

function generatePlatformsIfNeeded() {
  // Generate more platforms as needed
  let highestPlatformY = Math.min(...platforms.map(p => p.y));
  while (highestPlatformY > cameraOffset - 100) {
    let gapY = 30 + Math.random() * 40;
    let newY = highestPlatformY - gapY;
    let newX = Math.random() * (canvas.width - PLATFORM_WIDTH);
    platforms.push(createPlatform(newX, newY));
    highestPlatformY = newY;
  }
}

// --- Teleport for Purple Powerup ---
function teleportPlayerUpwards(currentPlatform) {
  let platformsAbove = platforms.filter(p => p.y < currentPlatform.y);
  if (platformsAbove.length === 0) return;
  platformsAbove.sort((a, b) => b.y - a.y);
  let targetIndex = 6;
  while (targetIndex < platformsAbove.length && platformsAbove[targetIndex].powerup && !platformsAbove[targetIndex].powerup.collected) {
    targetIndex++;
  }
  let targetPlatform = targetIndex < platformsAbove.length ? platformsAbove[targetIndex] : platformsAbove[platformsAbove.length - 1];
  if (targetPlatform) {
    player.x = targetPlatform.x + (PLATFORM_WIDTH - PLAYER_WIDTH) / 2;
    player.y = targetPlatform.y - PLAYER_HEIGHT;
    cameraOffset = player.y - canvas.height / 2;
    console.log("Teleported to platform at y:", targetPlatform.y);
  }
}

// --- Reset Game ---
function resetGame() {
  gameOver = false;
  messageDiv.innerText = "";
  retryButton.style.display = "none";
  // Removed lava variables reset.

  // Reset powerup timers
  jumpBoostEndTime = 0;
  pinkPowerupEndTime = 0;
  brownPowerupEndTime = 0;
  whitePowerupEndTime = 0;
  
  generateInitialPlatforms();
  let startPlatform = platforms[0];
  player.x = startPlatform.x + (PLATFORM_WIDTH - PLAYER_WIDTH) / 2;
  player.y = startPlatform.y - PLAYER_HEIGHT;
  player.vx = 0;
  player.vy = 0;
  baseY = startPlatform.y;
  maxScore = 0;
  cameraOffset = player.y - canvas.height / 2;
  
  requestAnimationFrame(gameLoop);
}

retryButton.addEventListener("click", resetGame);

// --- Input Handling ---
let keys = {};
document.addEventListener("keydown", function(e) {
  const key = e.key.toLowerCase();
  keys[key] = true;
  // Handle jump initiation when on ground and jump key is pressed (W or Space)
  if ((e.key === "w" || e.key === " " || e.key === "W") && isOnGround && !jumpKeyHeld) {
    jumpKeyHeld = true;
    jumpStartTime = performance.now();
    let jumpStrength = (performance.now() < jumpBoostEndTime) ? boostedJumpStrength : baseJumpStrength;
    // If moving sideways, increase jump strength by 20%
    if (keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"]) {
      jumpStrength *= 1.2;
    }
    // If Brown powerup is active, reduce jump strength
    if (isBrownActive()) {
      jumpStrength *= BROWN_JUMP_MULTIPLIER;
    }
    player.vy = jumpStrength;
    isOnGround = false;
  }
});
document.addEventListener("keyup", function(e) {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if (e.key === "w" || e.key === " " || e.key === "W") {
    jumpKeyHeld = false;
  }
});

// --- Collision Detection ---
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
function getPlayerRect() {
  if (isBrownActive()) {
    return {
      x: player.x,
      y: player.y - cameraOffset,
      width: player.width * 1.25,
      height: player.height * 1.25
    };
  } else {
    return {
      x: player.x,
      y: player.y - cameraOffset,
      width: player.width,
      height: player.height
    };
  }
}

// --- Update Functions ---
function updatePlayerMovement() {
  let speedMultiplier = pinkMultiplier();
  if (isBrownActive()) {
    speedMultiplier *= 0.75;
  }
  if (keys["a"] || keys["arrowleft"]) {
    player.vx = -PLAYER_SPEED * speedMultiplier;
  } else if (keys["d"] || keys["arrowright"]) {
    player.vx = PLAYER_SPEED * speedMultiplier;
  } else {
    player.vx = 0;
  }
  
  player.vy += GRAVITY * (isBrownActive() ? BROWN_GRAVITY_MULTIPLIER : 1) * speedMultiplier;
  if (!jumpKeyHeld && player.vy < 0) {
    player.vy += GRAVITY * 1.5 * speedMultiplier;
  }
  
  player.x += player.vx;
  player.y += player.vy;
}

function updatePlatforms() {
  let speedMultiplier = pinkMultiplier();
  platforms.forEach(platform => {
    if (platform.moving) {
      let platformSpeedFactor = speedMultiplier;
      platform.x += platform.moveSpeed * platform.direction * platformSpeedFactor;
      if (platform.x <= platform.minX || platform.x >= platform.maxX) {
        platform.direction *= -1;
      }
    }
  });
  platforms = platforms.filter(platform => {
    if (platform.disappearing && platform.disappearStartTime !== null) {
      return (performance.now() - platform.disappearStartTime < 2000);
    }
    return true;
  });
}

// --- Rendering Functions ---
function withWhitePowerupEffect(drawFunc) {
  if (performance.now() < whitePowerupEndTime) {
    ctx.save();
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    ctx.filter = 'invert(1)';
    drawFunc();
    ctx.restore();
  } else {
    drawFunc();
  }
}

function drawPlatformsAndPowerups() {
  let now = performance.now();
  platforms.forEach(platform => {
    let drawY = platform.y - cameraOffset;
    // Draw platform
    if (platform.disappearing) {
      ctx.strokeStyle = "black";
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(platform.x, drawY, platform.width, platform.height);
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = "saddlebrown";
      ctx.fillRect(platform.x, drawY, platform.width, platform.height);
    }
    // Draw powerup if available
    if (platform.powerup && !platform.powerup.collected) {
      let powerupWidth = 15, powerupHeight = 15;
      let powerupX = platform.x + (PLATFORM_WIDTH - powerupWidth) / 2;
      let powerupY = platform.y - powerupHeight - 2 - cameraOffset;
      let col;
      switch(platform.powerup.type) {
        case "white": col = "white"; break;
        case "jump": col = "yellow"; break;
        // Removed "lava", "red", and "orange" cases.
        case "redorange": col = "orangered"; break;
        case "cyan": col = "cyan"; break;
        case "purple": col = "purple"; break;
        case "darkblue": col = "darkblue"; break;
        case "pink": col = "pink"; break;
        case "brown": col = "brown"; break;
        default: col = "white";
      }
      ctx.fillStyle = col;
      ctx.fillRect(powerupX, powerupY, powerupWidth, powerupHeight);
    }
  });
}

// Render the player
function renderPlayer() {
  let now = performance.now();
  let playerColor = "blue";
  if (now < jumpBoostEndTime) {
    playerColor = "orange";
  }
  if (now < pinkPowerupEndTime) {
    playerColor = "pink";
  }
  if (isBrownActive()) {
    playerColor = "brown";
  }
  let drawWidth = player.width;
  let drawHeight = player.height;
  if (isBrownActive()) {
    drawWidth *= 1.25;
    drawHeight *= 1.25;
  }
  ctx.fillStyle = playerColor;
  ctx.fillRect(player.x, player.y - cameraOffset, drawWidth, drawHeight);
}

// --- Collision & Powerup Handling ---
let isOnGround = false;
function handleCollisions() {
  let prevY = player.y - player.vy;
  let playerRect = getPlayerRect();
  
  platforms.forEach(platform => {
    let platformRect = {
      x: platform.x,
      y: platform.y - cameraOffset,
      width: platform.width,
      height: platform.height
    };
    if (isColliding(playerRect, platformRect)) {
      if (player.vy >= 0 && prevY + playerRect.height <= platform.y + 5) {
        player.y = platform.y - (isBrownActive() ? player.height * 1.25 : player.height);
        player.vy = 0;
        isOnGround = true;
        if (platform.disappearing && isBrownActive()) {
          platform.disappearStartTime = performance.now() - 2000;
        } else if (platform.disappearing && platform.disappearStartTime === null) {
          platform.disappearStartTime = performance.now();
        }
      }
    }
    // Handle powerup collection
    if (platform.powerup && !platform.powerup.collected) {
      let powerupWidth = 15, powerupHeight = 15;
      let powerupX = platform.x + (PLATFORM_WIDTH - powerupWidth) / 2;
      let powerupY = platform.y - powerupHeight - 2 - cameraOffset;
      let powerupRect = { x: powerupX, y: powerupY, width: powerupWidth, height: powerupHeight };
      if (isColliding(playerRect, powerupRect)) {
        platform.powerup.collected = true;
        switch(platform.powerup.type) {
          case "jump":
            jumpBoostEndTime = performance.now() + 3000;
            break;
          case "redorange":
            player.vy = HUGE_JUMP_STRENGTH;
            // Grant a brief period where collisions don’t kill the player
            break;
          case "cyan":
            // Grant temporary invincibility if needed
            break;
          case "purple":
            teleportPlayerUpwards(platform);
            break;
          case "darkblue":
            // Trigger a mild platform effect (could shake the screen, etc.)
            break;
          case "pink":
            pinkPowerupEndTime = performance.now() + PINK_DURATION;
            break;
          case "brown":
            brownPowerupEndTime = performance.now() + BROWN_DURATION;
            break;
          case "white":
            whitePowerupEndTime = performance.now() + WHITE_DURATION;
            break;
        }
      }
    }
  });
  
  // Only fatal condition: falling off the bottom (void)
  if (player.y > cameraOffset + canvas.height) {
    gameOver = true;
    messageDiv.innerText = "Aw, poor baby! Shh, don't cry now.";
    retryButton.style.display = "block";
  }
}

// --- Main Game Loop ---
let gameOver = false;
function gameLoop() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  updatePlayerMovement();
  updatePlatforms();
  // Removed lava and spike updates.
  handleCollisions();
  generatePlatformsIfNeeded();
  
  cameraOffset = Math.min(player.y - canvas.height / 2, cameraOffset);
  
  let currentHeight = baseY - player.y;
  if (currentHeight > maxScore) {
    maxScore = currentHeight;
  }
  globalHighScore = Math.max(globalHighScore, maxScore);
  
  withWhitePowerupEffect(() => {
    drawPlatformsAndPowerups();
    renderPlayer();
  
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + Math.floor(maxScore), 10, 30);
    ctx.fillText("High Score: " + Math.floor(globalHighScore), 10, 55);
  });
  
  requestAnimationFrame(gameLoop);
}

resetGame();
