import { useEffect, useRef } from "react";
import "./App.css";
import { FluidSim } from "./FluidSim";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FluidSim | null>(null);

  // Mouse State
  const mouseRef = useRef({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    isDown: false,
    prevX: 0,
    prevY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Grid cell size (h)
    const spacing = 10.0;

    // Initialize Simulation
    const sim = new FluidSim(width, height, spacing);
    simRef.current = sim;

    const dt = 1.0 / 10.0;

    const render = () => {
      // 1. Time Step & Sub-stepping (Accelerated)
      // dt = 1/20 gives 3x "fast forward" speed (vs 1/60)
      // subSteps = 10 ensures stability (subDt small enough)
      const subSteps = 10;
      const subDt = dt / subSteps;

      for (let i = 0; i < subSteps; i++) {
        sim.integrate(subDt);
      }

      // Handle Mouse Interaction (Splash)
      if (mouseRef.current.isDown) {
        const { x, y, prevX, prevY } = mouseRef.current;
        // Calculate mouse velocity (delta)
        const vx = (x - prevX) * 5.0; // Boost strength
        const vy = (y - prevY) * 5.0;

        sim.addExternalForce(x, y, vx, vy, 50.0); // 50px radius

        // Update prev to current to avoid infinite acceleration if mouse stops
        mouseRef.current.prevX = x;
        mouseRef.current.prevY = y;
      }

      // Clear Screen
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f3f4f6"; // Gray-100
      ctx.fillRect(0, 0, width, height);

      // Draw Walls (Solid Cells)
      ctx.fillStyle = "#9ca3af"; // Gray-400
      for (let i = 0; i < sim.fNumX; i++) {
        for (let j = 0; j < sim.fNumY; j++) {
          const idx = sim.getCellIndex(i, j);
          if (sim.cellType[idx] === 2) {
            // SOLID
            ctx.fillRect(i * spacing, j * spacing, spacing, spacing);
          }
        }
      }

      // 3. Visual Polish (Color by Velocity)
      // 1. The "Gap" (Visual vs. Physical Radius)
      const visualRadius = Math.max(spacing / 2.0 - 1.5, 2.0);

      for (let i = 0; i < sim.particles.length; i++) {
        const p = sim.particles[i];

        // Calculate speed (magnitude of velocity)
        const speed = Math.sqrt(p.u * p.u + p.v * p.v);
        // Map speed to color (0 to ~800 px/s)
        const t = Math.min(speed / 800.0, 1.0);

        // Interpolate between Dark Blue (#1E90FF) and Light/White (#E0FFFF)
        const r = Math.floor(30 + (224 - 30) * t);
        const g = Math.floor(144 + (255 - 144) * t);
        const b = Math.floor(255 + (255 - 255) * t);

        const color = `rgb(${r}, ${g}, ${b})`;
        ctx.fillStyle = color;

        // Safety Check (Debugging)
        if (isNaN(p.x) || isNaN(p.y)) {
          console.warn("NaN detected! Resetting simulation...");
          sim.reset();
          return; // Exit render loop for this frame
        }

        /*
        if (i === 0) {
          console.log(p.x, p.y, ctx.fillStyle);
        }
        */

        ctx.beginPath();
        // Visual Radius
        ctx.arc(p.x, p.y, visualRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse Event Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!mouseRef.current.isDown) {
      // Just update prev so we don't jump on first click
      mouseRef.current.prevX = x;
      mouseRef.current.prevY = y;
    }

    mouseRef.current.x = x;
    mouseRef.current.y = y;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    handleMouseMove(e); // Update position immediately
    // Reset prev to current to avoid huge jumps
    mouseRef.current.prevX = mouseRef.current.x;
    mouseRef.current.prevY = mouseRef.current.y;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        FLIP Water Simulation
      </h1>
      <div className="bg-white p-2 rounded-lg shadow-xl border border-gray-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-300 cursor-crosshair active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      <p className="mt-4 text-gray-600 text-sm">
        Drag to Splash! • Staggered Grid • FLIP/PIC Mix • 20 Solver Iterations
      </p>
    </div>
  );
}

export default App;
