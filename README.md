# Physics Playbook

A collection of interactive physics simulations and games, presented in a delightful "hand-drawn lab notebook" aesthetic. This project allows users to explore various physical phenomena directly in the browser through interactive canvases.

## 🧪 Experiments & Simulations

The project currently features the following active experiments:

- **Water Experiment (Fluid Dynamics)**

  - Analysis of fluid dynamics using a FLIP (Fluid Implicit Particle) / PIC (Particle In Cell) hybrid solver.
  - Features adjustable gravity interactively.
  - Real-time fluid interactions with mouse control.

- **Granular Matter (Sand Simulation)**

  - Cellular automata simulation demonstrating the behavior of falling sand particles.
  - Observe distinctive accumulation patterns and pile formation.
  - Interactive drawing of sand and rigid walls.

- **Aerodynamics (Wind Tunnel)**

  - Wind tunnel visualization using Lattice Boltzmann methods (or similar fluid flow approximation) for smoke/air.
  - Visualize flow patterns over various 2D geometries like airfoils or custom obstacles.

- **Hydro-Logic Puzzle (Water Maze)**
  - A logic puzzle game based on fluid mechanics.
  - **Objective:** Guide water through a maze by toggling doors to fill a bucket.
  - Features multiple levels and a clear win state.

## 🎨 Visual Style

The application features a unique visual design:

- **Hand-Drawn Aesthetic:** Elements look like sketches on paper.
- **Lab Notebook Feel:** Backgrounds use parchment textures, and fonts mimic handwriting and typewriter text (`Courier Prime`, `Patrick Hand`).
- **Tactile UI:** Buttons look like taped sketches, and panels resemble sticky notes or pinned papers.

## 🛠️ Tech Stack

- **Framework:** [React v19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Formatting/Linting:** ESLint, Prettier
- **Math:** KaTeX (for formula rendering)
- **Icons:** Lucide React

## 🚀 Getting Started

Follow these steps to run the simulation lab locally:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/FilipElznic/Water-simulation.git
    cd Water-simulation
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**

    ```bash
    npm run dev
    ```

4.  **Open in Browser:**
    Navigate to `http://localhost:5173` (or the URL shown in your terminal).

## 📁 Project Structure

```
src/
├── assets/          # Static assets (images, etc.)
├── components/      # Reusable React components
├── pages/           # Application views
│   ├── LandingPage.tsx   # Main menu
│   ├── FluidSimulation.tsx
│   ├── FoodSimulation.tsx
│   ├── SandSimulation.tsx
│   └── WaterFlowGame.tsx
├── BoatSim.ts       # Physics engine classes
├── FluidSim.ts
├── SandSim.ts
├── WaterMazeSim.ts
├── WindSim.ts
├── App.tsx          # Main router
└── main.tsx         # Entry point
```

## 📜 License

This project is open source. Feel free to explore, learn, and experiment!

---

_"The noblest pleasure is the joy of understanding."_ - Leonardo da Vinci
