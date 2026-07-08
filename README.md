<div align="center">

# 🏒 Neon Air Hockey

**A fast, glowing, arcade-style air hockey game built with nothing but HTML5 Canvas and vanilla JavaScript.**

Play solo against a tunable CPU, or challenge a friend head-to-head on the same device.

[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e?logo=javascript&logoColor=black)](#)
[![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)](#)
[![Responsive](https://img.shields.io/badge/responsive-desktop%20%7C%20tablet%20%7C%20mobile-00d4ff)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](#license)

</div>

---

## ✨ Overview

Neon Air Hockey is a self-contained, dependency-free arcade game rendered entirely with the Canvas 2D API. It ships with realistic-feeling puck physics, a reactive CPU opponent with adjustable difficulty, a full local 2-player mode, and a layer of arcade polish — particle bursts, screen shake, slow-motion "game point" moments, and a confetti celebration on match win.

No build step, no frameworks, no installs. Open `index.html` and play.

## 🎮 Live Demo

> Add a link here once you deploy — e.g. via GitHub Pages:
> `https://armin-panahi.github.io/hockey-game/`

## 🖼️ Preview

> _Drop a GIF or screenshot of gameplay here for extra polish:_
> `![gameplay preview](docs/preview.gif)`

## 🚀 Features

### Gameplay
- 🕹️ **Two game modes** — play solo against the CPU, or go head-to-head in local 2-player mode on one device.
- 🤖 **3 CPU difficulty levels** — Easy, Normal, and Hard, each tuning the AI's reaction speed, tracking error, and mistake rate.
- ⚡ **Escalating puck speed** — the puck gets progressively faster as the match goes on, with on-screen callouts ("SPEEDING UP!", "NO MERCY!", …).
- 🎬 **Cinematic slow-motion** — the action automatically shifts into a letterboxed slow-mo "GAME POINT" sequence when either side is one goal from winning.
- 🎊 **Victory celebration** — confetti bursts and a triumphant fanfare when the match is won.
- ⏸️ **Pause anytime** — via the on-screen button or the <kbd>Esc</kbd> key.

### Controls & accessibility
- 🖱️ **Mouse control** for Player 1 (desktop).
- 👆 **Touch control** — Player 1 controls the left half of the table, Player 2 the right half; each finger is tracked independently, so two people can play on the same tablet screen at once.
- ⌨️ **Keyboard control** — Player 1 uses <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Player 2 uses the arrow keys.
- All three input methods can be mixed and matched — the game seamlessly hands control back to the mouse/touch position the moment you stop using the keyboard.

### Audio & feedback
- 🔊 Fully synthesized sound effects (hits, wall bounces, goals, victory fanfare, slow-mo cue) generated in real time with the Web Audio API — no audio files required.
- 🔇 One-tap mute toggle.
- 📊 Live match stats per player: current streak, best streak, top puck speed, and power hits.

### Responsive design
- 📱 Fully playable on desktop, tablet, and mobile.
- The layout automatically reflows — stat panels stack above the table on narrow screens — and the whole board is dynamically scaled with JavaScript to fit any viewport size or orientation without cropping or scrolling.
- A friendly "rotate your device" prompt appears on small portrait screens for the best experience.

## 🕹️ How to Play

1. Open the game and choose a mode from the main menu:
   - **VS COMPUTER** — then pick a difficulty (Easy / Normal / Hard).
   - **2 PLAYERS** — local multiplayer on one device.
2. Move your mallet to strike the puck into your opponent's goal.
3. First player to **7 goals** wins the match.
4. Watch for the slow-motion **GAME POINT** moment when the match is on the line!

### Controls Reference

| Player | Mouse / Touch | Keyboard |
|---|---|---|
| **Player 1** (blue, left) | Mouse (anywhere) / touch left half of the table | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Player 2** (red, right — 2P mode only) | Touch right half of the table | Arrow keys (<kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>) |

| Action | Control |
|---|---|
| Pause / Resume | On-screen button or <kbd>Esc</kbd> |
| Mute / Unmute | On-screen sound button |
| Restart after match | On-screen "PLAY AGAIN" button or <kbd>Space</kbd> |
| Return to main menu | On-screen "MAIN MENU" button |

## 🛠️ Tech Stack

- **HTML5** — semantic structure and screen markup
- **CSS3** — Grid & Flexbox layout, keyframe animations, responsive media queries
- **JavaScript (ES6+)** — game loop, physics, AI, and input handling
- **Canvas 2D API** — all in-game rendering (table, puck, mallets, particles, effects)
- **Web Audio API** — procedurally generated sound effects, no audio assets
- **[Font Awesome](https://fontawesome.com/)** and **[Google Fonts](https://fonts.google.com/)** (Orbitron, Rajdhani) — loaded via CDN for icons/typography

No build tools, no package manager, and no external game framework — everything runs directly in the browser.

## 📂 Project Structure

```
.
├── index.html          # Markup: layout, menus, screens, HUD
├── src/
│   ├── css/
│   │   └── style.css   # All styling, layout, responsive breakpoints
│   └── js/
│       └── script.js   # Game loop, physics, AI, input, rendering, audio
└── README.md
```

## 🧑‍💻 Running Locally

No build step is required — it's plain HTML/CSS/JS.

```bash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Open directly in a browser
open index.html      # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

Or, for a smoother local experience (recommended, so touch/audio APIs behave exactly as in production), serve it with any static file server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .
```

Then visit `http://localhost:8080` in your browser.

## 🌐 Deployment

This project is 100% static, so it deploys anywhere that serves static files:

- **GitHub Pages** — enable Pages in your repo settings, pointing at the root or `main` branch.
- **Netlify / Vercel** — drag-and-drop the folder or connect the repo; no build command needed.
- Any static host (S3, Cloudflare Pages, Firebase Hosting, etc.).

## 🗺️ Roadmap Ideas

Contributions and ideas are welcome! Some directions worth exploring:

- [ ] Online multiplayer (WebSockets/WebRTC)
- [ ] Adjustable win score / match length
- [ ] Gamepad/controller support
- [ ] Selectable table skins / mallet colors
- [ ] Persistent high scores (localStorage)
- [ ] PWA support for offline/installable play

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE) — feel free to use, modify, and distribute it.

## 🙏 Acknowledgements

- Fonts by [Google Fonts](https://fonts.google.com/) — Orbitron & Rajdhani
- Icons by [Font Awesome](https://fontawesome.com/)

---

<div align="center">

Made with ⚡ and Canvas 2D — no game engine required.

</div>
