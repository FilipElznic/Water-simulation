import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Wind, Square } from "lucide-react";
import { WindSim } from "../WindSim";

export default function WindSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<WindSim | null>(null);
  const [isDrawingWall, setIsDrawingWall] = useState(true);

  // Mouse State
  const mouseRef = useRef({
    x: 0,
    y: 0,
    isDown: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 800;
    const height = 600;

    // Grid Setup
    // Use a coarser grid for performance
    // Optimization: Reduced grid resolution from 100 to 80
    const gridSize = 80; // 80x80 cells
    const sim = new WindSim(gridSize, 0.0001, 0.0, 0.1);
    simRef.current = sim;

    // Render Variables
    // Scale grid to canvas
    const scaleX = width / gridSize;
    const scaleY = height / gridSize;

    let animId: number;

    const loop = () => {
      // 1. Sim Step
      sim.step();

      // 2. Interaction
      if (mouseRef.current.isDown) {
        // Map mouse to grid
        // Canvas coords to Grid coords
        const gx = Math.floor(mouseRef.current.x / scaleX);
        const gy = Math.floor(mouseRef.current.y / scaleY);

        // Draw wall brush
        const brushRadius = 2;
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
          for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            sim.setObstacle(gx + dx, gy + dy, isDrawingWall);
          }
        }
      }

      // 3. Render
      ctx.fillStyle = "#111827"; // Dark background
      ctx.fillRect(0, 0, width, height);

      // Visualization: Smoke Density
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // We need to scale up the 100x100 density grid to 800x600 pixels
      // Nearest neighbor for retro look or we can draw rects.
      // Drawing rects might be slow 100x100 = 10,000 rects.
      // Let's iterate pixels and look up grid.

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const gx = Math.floor(x / scaleX);
          const gy = Math.floor(y / scaleY);
          const idx = sim.IX(gx, gy);

          const pixelIdx = (x + y * width) * 4;

          if (sim.obstacles[idx]) {
            // Wall Color
            data[pixelIdx] = 100; // R
            data[pixelIdx + 1] = 114; // G
            data[pixelIdx + 2] = 124; // B
            data[pixelIdx + 3] = 255;
          } else {
            // Smoke Color
            const d = sim.density[idx];

            // Manual background color #111827 (17, 24, 39)
            const bgR = 17;
            const bgG = 24;
            const bgB = 39;

            // Additive blending for smoke
            data[pixelIdx] = Math.min(255, bgR + d);
            data[pixelIdx + 1] = Math.min(255, bgG + d);
            data[pixelIdx + 2] = Math.min(255, bgB + d);
            data[pixelIdx + 3] = 255;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDrawingWall]);

  // Need to update ref if state changes, but state used in loop?
  // No, loop uses simRef, but `isDrawingWall` is captured in closure?
  // Actually yes, the effect will re-run when `isDrawingWall` changes, creating new loop.
  // This is fine.

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseRef.current.x = (e.clientX - rect.left) * scaleX;
    mouseRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    handleMouseMove(e);
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const handleReset = () => {
    simRef.current?.reset();
  };

  return (
    <div className="min-h-screen py-8 px-4 font-mono overflow-y-auto max-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 pb-20">
        {/* Header */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            to="/"
            className="sketch-btn flex items-center gap-2 text-ink group"
          >
            <ArrowLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="font-hand text-xl font-bold">Back to Index</span>
          </Link>

          <div className="text-center relative">
            <h1 className="text-5xl font-hand font-bold text-ink transform -rotate-1">
              Aerodynamics
            </h1>
            <div className="w-24 h-1 bg-ink/10 mx-auto rounded-full mt-2"></div>
          </div>

          <button
            onClick={handleReset}
            className="sketch-btn flex items-center gap-2 text-ink bg-white/50"
          >
            <RefreshCw size={18} />
            <span className="font-hand font-bold text-lg">Reset Flow</span>
          </button>
        </div>

        {/* Controls */}
        <div className="glass-panel p-4 flex gap-4 transform rotate-1 relative z-20">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-hand text-ink/40 bg-[#f2e8d5] px-2">
            Tools
          </div>
          <button
            onClick={() => setIsDrawingWall(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm font-hand font-bold text-lg transition-all border-2 ${
              isDrawingWall
                ? "bg-white border-ink shadow-sm transform -translate-y-1 text-ink"
                : "bg-transparent border-transparent hover:bg-white/30 text-ink/60 hover:text-ink"
            }`}
          >
            <Square size={18} />
            Draw Wall
          </button>
          <button
            onClick={() => setIsDrawingWall(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm font-hand font-bold text-lg transition-all border-2 ${
              !isDrawingWall
                ? "bg-white border-ink shadow-sm transform -translate-y-1 text-ink"
                : "bg-transparent border-transparent hover:bg-white/30 text-ink/60 hover:text-ink"
            }`}
          >
            <Wind size={18} />
            Clear Wall
          </button>
        </div>

        {/* Canvas Area */}
        <div className="relative group">
          <div className="sketch-border bg-white p-2 md:p-4 shadow-paper transform -rotate-1 relative z-10">
            {/* Pin effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-20 border border-white/30"></div>

            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border-2 border-ink/10 rounded-sm cursor-crosshair active:cursor-grabbing bg-[#1a1a1a] shadow-inner w-full max-w-[800px]"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          {/* Decorative tape */}
          <div className="absolute -top-4 -left-4 w-24 h-8 bg-blue-100/30 backdrop-blur-sm border border-white/20 transform -rotate-45 shadow-sm z-20"></div>
        </div>

        {/* Footer info */}
        <div className="glass-panel p-6 max-w-2xl text-center transform rotate-1">
          <h2 className="text-2xl font-hand font-bold text-ink mb-2">
            Eulerian Wind Tunnel
          </h2>
          <p className="text-ink/80 text-sm">
            Draw walls to obstruct the airflow. The smoke visualizes the
            velocity field using a grid-based solver (Stable Fluids).
          </p>
        </div>
      </div>
    </div>
  );
}
