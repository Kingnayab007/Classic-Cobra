# 🐍 Classic Cobra

### Serpent | Teleport Edition

**Classic Cobra** is a modern take on the classic Snake game, built with plain HTML, CSS and JavaScript on an HTML5 `<canvas>`. Instead of wrapping around every edge, the board has **solid walls** and **four teleport portals** in the centre of each side. Master the portals, or crash into the wall.

---

## ✨ Features

- **Portal-only teleporting**: the snake can only cross the board edge through the four centre openings (top, bottom, left, right). Hitting a solid wall ends the game.
- **Three difficulty levels**: Easy, Medium and Hard, each with a different speed.
- **Random food on every free cell**: food spawns on any cell not occupied by the snake, until no free cell is left.
- **Win condition**: fill the entire board and you win.
- **Pause menu**: Resume, Restart, Main Menu or Quit at any time.
- **Mouse and keyboard support**: click the on-screen buttons or use keyboard shortcuts.
- **Responsive canvas**: scales to fit the browser window.
- **Zero dependencies**: a single HTML file, no installs or build step.

---

## 🎮 How to Play

1. Open the game and pick a difficulty (**Easy**, **Medium** or **Hard**).
2. Click **START GAME**.
3. Guide the snake to the red food to grow and score.
4. Use the glowing portal gaps in the middle of each wall to teleport to the opposite side.
5. Avoid the solid walls and your own tail.

### Controls

| Key | Action |
| --- | --- |
| `↑` `↓` `←` `→` or `W` `A` `S` `D` | Move the snake |
| `Esc` | Pause / resume (and return to menu from the game-over screen) |
| `R` or `Enter` | Restart from the game-over / win screen |
| `R` | Restart while paused |

### Difficulty

| Mode | Speed (moves per second) |
| --- | --- |
| Easy | 10 |
| Medium | 20 |
| Hard | 35 |

---

## 🚀 Getting Started

No setup is needed.

1. Download or clone the **Classic Cobra** repository.
2. Open `classic-cobra.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Play.

---

## 🧠 How It Works

- **Board**: a 1080 × 720 canvas divided into a grid of 10 px cells.
- **Game loop**: `requestAnimationFrame` with a time accumulator, so the snake moves at a steady rate whatever the screen refresh rate.
- **Food spawning**: `createFood()` collects every cell not covered by the snake and picks one at random. If none are free, it returns `null` and the player wins.
- **Portals**: `teleport()` checks whether the head is leaving the board through one of the 90 px centre gaps. If so, it wraps to the opposite side. Otherwise the game ends.
- **States**: `menu`, `playing`, `paused`, `gameover` and `won`, each with its own rendering and input handling.

---

## 📁 Project Structure

```
Classic-Cobra/
├── classic-cobra.html  
├── style.css  
├── script.js  
└── README.md
```

---

## 👥 Team

| Name |
| --- |
| Nayab Nasim |
| Ashish Kumar |
| Arhan Abdullah |
| Soumalya Roy |
| Shreyansh Soumya |

---

## 🔮 Future Ideas

- High-score tracking
- Sound effects and background music
- Touch / swipe controls for mobile
- Obstacles and power-ups
- Additional themes

---
