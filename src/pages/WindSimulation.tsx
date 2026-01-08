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
    const gridSize = 100; // 100x100 cells
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      {/* Header */}
      <div className="w-full max-w-5xl px-4 flex items-center justify-between mb-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </Link>

        <div className="flex gap-2">
          <button
            onClick={() => setIsDrawingWall(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDrawingWall
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            <Square size={18} />
            Draw Wall
          </button>
          <button
            onClick={() => setIsDrawingWall(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              !isDrawingWall
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            <Wind size={18} />
            Clear Wall
          </button>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <RefreshCw size={18} />
          <span>Reset Flow</span>
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-100 rounded-lg cursor-crosshair active:cursor-grabbing bg-gray-900"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="mt-6 max-w-2xl text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Eulerian Wind Tunnel
        </h2>
        <p className="text-gray-600">
          Draw walls to obstruct the airflow. The smoke visualizes the velocity
          field.
        </p>
      </div>
    </div>
  );
}
