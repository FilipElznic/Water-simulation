import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Settings2, Droplets } from "lucide-react";
import { FluidSim } from "../FluidSim";

export default function FluidSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FluidSim | null>(null);

  // Simulation Parameters State
  const [gravity, setGravity] = useState(2500);
  const [visualSize, setVisualSize] = useState(0.55); // Multiplier of spacing (0.1 to 1.0)
  const [resetCounter, setResetCounter] = useState(0); // Trigger re-init

  // Mouse State
  const mouseRef = useRef({
    x: 0,
    y: 0,
    isDown: false,
    prevX: 0,
    prevY: 0,
  });

  // Parameter Ref for animation loop
  const paramsRef = useRef({
    gravity: 2500,
    visualSize: 0.55,
  });

  // Sync state with refs
  useEffect(() => {
    paramsRef.current.gravity = gravity;
    paramsRef.current.visualSize = visualSize;
    if (simRef.current) {
      simRef.current.gravity = gravity;
    }
  }, [gravity, visualSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 800; // Fixed resolution for simulation consistency
    const height = 600;

    // Optimization: Increased spatial step to reduce particle count
    // 13.0 -> 18.0 (Significant performance boost)
    const spacing = 18.0;

    // Initialize Simulation
    const sim = new FluidSim(width, height, spacing);
    sim.gravity = paramsRef.current.gravity;
    simRef.current = sim;

    // Time Step
    // dt = 1/60 gives real-time speed. 1/30 gives slight fast-forward for fluid effect.
    const dt = 1.0 / 40.0;

    // 5 Colors for batch rendering (Dark Blue -> Light Cyan)
    const COLORS = [
      "rgb(30, 144, 255)", // Deep Blue
      "rgb(78, 171, 255)",
      "rgb(127, 199, 255)",
      "rgb(175, 227, 255)",
      "rgb(224, 255, 255)", // White/Cyan
    ];

    // Animation Loop
    let animId: number;

    // Reusable buckets to avoid GC
    const buckets: FluidSim["particles"][] = [[], [], [], [], []];

    const render = () => {
      // 1. Time Step
      // Lower substeps from 10 to 5 for performance
      const subSteps = 5;
      const subDt = dt / subSteps;

      // Update gravity
      sim.gravity = paramsRef.current.gravity;

      for (let i = 0; i < subSteps; i++) {
        sim.integrate(subDt);
      }

      // Handle Mouse Interaction
      if (mouseRef.current.isDown) {
        const { x, y, prevX, prevY } = mouseRef.current;
        const vx = (x - prevX) * 5.0;
        const vy = (y - prevY) * 5.0;
        sim.addExternalForce(x, y, vx, vy, 50.0);

        mouseRef.current.prevX = x;
        mouseRef.current.prevY = y;
      }

      // Clear Screen
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fafaf9"; // stone-50
      ctx.fillRect(0, 0, width, height);

      // Draw Walls
      ctx.fillStyle = "#d6d3d1"; // stone-300
      for (let i = 0; i < sim.fNumX; i++) {
        for (let j = 0; j < sim.fNumY; j++) {
          const idx = sim.getCellIndex(i, j);
          if (sim.cellType[idx] === 2) {
            ctx.fillRect(i * spacing, j * spacing, spacing, spacing);
          }
        }
      }

      // Draw Particles (Batched)
      const visualRadius = spacing * paramsRef.current.visualSize;

      // 1. Clear buckets
      for (let i = 0; i < 5; i++) buckets[i].length = 0;

      // 2. Sort particles into buckets
      for (let i = 0; i < sim.particles.length; i++) {
        const p = sim.particles[i];
        if (isNaN(p.x)) continue;

        const speed = Math.sqrt(p.u * p.u + p.v * p.v);
        // Map speed 0..800 to bucket 0..4
        let bIdx = Math.floor((speed / 800.0) * 5);
        if (bIdx > 4) bIdx = 4;

        buckets[bIdx].push(p);
      }

      // 3. Draw each bucket
      for (let i = 0; i < 5; i++) {
        if (buckets[i].length === 0) continue;

        ctx.beginPath();
        ctx.fillStyle = COLORS[i];

        const pi2 = Math.PI * 2;
        const bucket = buckets[i];

        for (let j = 0; j < bucket.length; j++) {
          const p = bucket[j];
          ctx.moveTo(p.x + visualRadius, p.y);
          ctx.arc(p.x, p.y, visualRadius, 0, pi2);
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [resetCounter]);

  // Mouse Handlers
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
    handleMouseMove(e);
    mouseRef.current.prevX = mouseRef.current.x;
    mouseRef.current.prevY = mouseRef.current.y;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div className="min-h-screen bg-parchment-dark/20 relative overflow-x-hidden font-mono text-ink selection:bg-ocean/20">
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-50 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 group text-ink/70 hover:text-ink transition-colors"
        >
          <div className="bg-white p-2 rounded-full shadow-sm group-hover:shadow-md transition-all border border-ink/5">
            <ArrowLeft size={20} />
          </div>
          <span className="font-hand font-bold text-lg">Back to Lab</span>
        </Link>

        <h1 className="hidden md:block text-2xl font-hand font-bold text-ink/80">
          Fluid Dynamics Experiment
        </h1>

        <button
          onClick={() => setResetCounter((c) => c + 1)}
          className="sketch-btn flex items-center gap-2 text-ink"
        >
          <RefreshCw size={18} />
          <span>Reset Tank</span>
        </button>
      </div>

      {/* Main Workspace */}
      <div className="relative z-10 flex flex-col xl:flex-row justify-center items-start gap-8 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Simulation Canvas */}
        <div className="relative">
          {/* Paper Container */}
          <div className="sketch-border bg-white p-4 shadow-paper transform rotate-1 relative z-10">
            {/* Tape */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-blue-100/30 backdrop-blur-sm border border-white/20 transform -rotate-1 shadow-sm z-20"></div>

            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full max-w-[800px] border-2 border-ink/5 rounded-sm bg-stone-50 cursor-crosshair active:cursor-grabbing"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        {/* Sticky Note Controls */}
        <div className="paper-note bg-[#fff7d1] p-6 w-full max-w-md xl:w-80 transform -rotate-1 relative mt-8 xl:mt-0">
          {/* Pushpin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-20 border border-white/30 hidden md:block"></div>

          <div className="flex items-center gap-2 mb-4 border-b border-ink/10 pb-2">
            <Settings2 size={20} className="text-ink/60" />
            <h3 className="font-hand font-bold text-xl text-ink">
              Lab Controls
            </h3>
          </div>

          <div className="space-y-6">
            {/* Gravity Control */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-ink/70 flex items-center gap-2">
                  Gravity
                </label>
                <span className="text-xs font-mono bg-white px-1 rounded text-ink/60">
                  {gravity}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="w-full accent-ocean cursor-pointer"
              />
            </div>

            {/* Particle Size Control */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-ink/70 flex items-center gap-2">
                  <Droplets size={14} />
                  Droplet Size
                </label>
                <span className="text-xs font-mono bg-white px-1 rounded text-ink/60">
                  {Math.round(visualSize * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.05"
                value={visualSize}
                onChange={(e) => setVisualSize(Number(e.target.value))}
                className="w-full accent-ocean cursor-pointer"
              />
            </div>

            <div className="bg-white/50 p-3 rounded text-xs text-ink/60 italic font-hand leading-relaxed">
              Adjust the slider to change droplet size. Higher gravity makes
              water heavier.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
