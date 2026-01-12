import React, { useEffect, useRef, useState } from "react";
import { WaterMazeSim, CellType } from "../WaterMazeSim";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, RefreshCw, Trophy, Info } from "lucide-react";

const CELL_COLORS: Record<number, number[]> = {
  [CellType.EMPTY]: [0, 0, 0, 0], // Transparent
  [CellType.WALL]: [50, 50, 50, 255], // Dark Gray
  [CellType.WATER]: [64, 164, 255, 220], // Blue
  [CellType.DOOR_CLOSED]: [180, 50, 50, 255], // Red Door
  [CellType.DOOR_OPEN]: [50, 180, 50, 100], // Green/Transparent-ish
};

const WaterFlowGame: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<WaterMazeSim | null>(null);
  const requestRef = useRef<number | null>(null);

  const [level, setLevel] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bucketFill, setBucketFill] = useState(0);

  // Helper ref to avoid effect dependency on gameOver state
  const isGameOverTriggered = useRef(false);

  const draw = (sim: WaterMazeSim, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw grid
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;

    const cellSize = sim.cellSize;

    for (let y = 0; y < sim.rows; y++) {
      for (let x = 0; x < sim.cols; x++) {
        const type = sim.grid[y * sim.cols + x];
        if (type === CellType.EMPTY) continue;

        const color = CELL_COLORS[type] || [0, 0, 0, 0];

        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const px = x * cellSize + dx;
            const py = y * cellSize + dy;
            if (px < canvas.width && py < canvas.height) {
              const idx = (py * canvas.width + px) * 4;
              data[idx] = color[0];
              data[idx + 1] = color[1];
              data[idx + 2] = color[2];
              data[idx + 3] = color[3];
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    // Reset game over trigger when level changes
    isGameOverTriggered.current = false;

    // Initialize Sim
    const width = 600;
    const height = 400;
    simRef.current = new WaterMazeSim(width, height);
    simRef.current.loadLevel(level);

    // Canvas Setup
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }

    const animate = () => {
      if (simRef.current && canvasRef.current) {
        simRef.current.update();

        // Update stats
        if (simRef.current.isGameOver && !isGameOverTriggered.current) {
          isGameOverTriggered.current = true;
          setGameOver(true);
        }
        setBucketFill(simRef.current.bucketFillCount);

        draw(simRef.current, canvasRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [level]); // Re-init when level changes

  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !simRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Correctly map click to simulation coordinates
    simRef.current.toggleDoor(x, y);
  };

  const handleNextLevel = () => {
    if (level < 3) {
      setLevel((l) => l + 1);
      setGameOver(false);
      simRef.current?.loadLevel(level + 1);
    } else {
      alert("You beat all levels!");
      navigate("/");
    }
  };

  const handleReset = () => {
    simRef.current?.loadLevel(level);
    setGameOver(false);
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
          Hydro-Logic Puzzle
        </h1>

        <button
          onClick={handleReset}
          className="sketch-btn flex items-center gap-2 text-ink"
        >
          <RefreshCw size={18} />
          <span>Reset Level</span>
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

            <div className="relative">
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                className="w-full max-w-[600px] border-2 border-ink/5 rounded-sm bg-stone-50 cursor-pointer hover:shadow-inner transition-shadow"
                style={{ imageRendering: "pixelated" }} // Make grid look crisp
              />

              {/* Game Over Overlay */}
              {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center p-4 z-30">
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-sm"></div>

                  <div className="relative bg-white border-2 border-ink p-8 shadow-xl transform -rotate-2 text-center max-w-sm">
                    {/* Stamp effect */}
                    <div className="absolute top-2 right-2 text-green-600 border-2 border-green-600 border-double px-2 py-1 transform rotate-12 font-bold text-xs opacity-80 rounded-sm">
                      APPROVED
                    </div>

                    <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500 drop-shadow-sm" />

                    <h2 className="text-3xl font-hand font-bold mb-2 text-ink">
                      Success!
                    </h2>
                    <p className="font-hand text-lg text-ink/70 mb-6 leading-tight">
                      Excellent work! The bucket is full.
                    </p>

                    <button
                      onClick={handleNextLevel}
                      className="w-full bg-ocean hover:bg-ocean-dark text-black font-bold py-3 px-6 rounded shadow-md transform transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play size={20} className="fill-current" />
                      Next Level
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Note Controls */}
        <div className="paper-note bg-[#fff7d1] p-6 w-full max-w-md xl:w-80 transform -rotate-1 relative mt-8 xl:mt-0">
          {/* Pushpin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-20 border border-white/30 hidden md:block"></div>

          <div className="flex items-center justify-between mb-4 border-b border-ink/10 pb-2">
            <div className="flex items-center gap-2">
              <Info size={20} className="text-ink/60" />
              <h3 className="font-hand font-bold text-xl text-ink">Details</h3>
            </div>
            <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-ink/10 text-ink/70 shadow-sm">
              Level {level + 1}/4
            </span>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="text-sm font-hand text-ink/80 leading-relaxed">
              <p className="mb-2">
                <strong className="text-ink">Objective:</strong> Fill the bucket
                with water.
              </p>
              <p>
                Click on the{" "}
                <span className="text-red-600 font-bold bg-white px-1 rounded shadow-sm">
                  RED DOORS
                </span>{" "}
                to open or close them and guide the flow.
              </p>
            </div>

            {/* Bucket Progress */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-ink/70">
                  Bucket Level
                </label>
                <span className="text-xs font-mono bg-white px-1 rounded text-ink/60">
                  {Math.min(100, Math.round((bucketFill / 200) * 100))}%
                </span>
              </div>
              <div className="w-full h-4 bg-white/50 rounded-full border border-ink/10 overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-blue-400 absolute left-0 top-0 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (bucketFill / 200) * 100)}%`,
                  }}
                ></div>
                {/* Tick marks */}
                <div className="absolute inset-0 flex justify-between px-2">
                  <div className="w-px h-full bg-ink/5"></div>
                  <div className="w-px h-full bg-ink/5"></div>
                  <div className="w-px h-full bg-ink/5"></div>
                </div>
              </div>
            </div>

            <div className="bg-white/50 p-3 rounded text-xs text-ink/60 italic font-hand leading-relaxed border border-ink/5">
              "Water always follows the path of least resistance."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterFlowGame;
