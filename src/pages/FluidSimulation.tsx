import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { FluidSim } from "../FluidSim";

export default function FluidSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FluidSim | null>(null);

  // Mouse State
  const mouseRef = useRef({
    x: 0,
    y: 0,
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

    const dt = 1.0 / 10.0; // Standard 60 FPS update

    const render = () => {
      // 1. Time Step & Sub-stepping (Accelerated)
      // dt = 1/20 gives 3x "fast forward" speed (vs 1/60)
      // subSteps = 10 ensures stability (subDt small enough)
      const subSteps = 10;
      const subDt = dt / subSteps; // Real-time speed (1/60th second processed per frame)
      // To speed up: increase dt or loop subSteps more times relative to 1/60

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

        // Update prev to current
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
      // Physical spacing is 10. Visual radius should be smaller to see gaps.
      const visualRadius = Math.max(spacing / 2.0 - 1.5, 2.0);

      for (let i = 0; i < sim.particles.length; i++) {
        const p = sim.particles[i];

        // Safety Check (Debugging)
        if (isNaN(p.x) || isNaN(p.y)) {
          console.warn("NaN detected! Resetting simulation...");
          sim.reset();
          return; // Exit render loop for this frame
        }

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
      mouseRef.current.prevX = x;
      mouseRef.current.prevY = y;
    }

    mouseRef.current.x = x;
    mouseRef.current.y = y;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    handleMouseMove(e); // Update position immediately
    mouseRef.current.prevX = mouseRef.current.x;
    mouseRef.current.prevY = mouseRef.current.y;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const handleReset = () => {
    if (simRef.current) {
      simRef.current.reset();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      {/* Header */}
      <div className="w-full max-w-4xl px-4 flex items-center justify-between mb-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </Link>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <RefreshCw size={18} />
          <span>Reset Simulation</span>
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-100 rounded-lg cursor-crosshair active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="mt-6 max-w-2xl text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          FLIP/PIC Hybrid Water Solver
        </h2>
        <p className="text-gray-600">
          Interactive fluid simulation running entirely in your browser. Drag
          your mouse through the water to create splashes!
        </p>
      </div>
    </div>
  );
}
