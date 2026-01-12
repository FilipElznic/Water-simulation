import { Link } from "react-router-dom";
import { Droplets, Wind, Layers, Github } from "lucide-react";
import SimulationInfo from "../components/SimulationInfo";

export default function LandingPage() {
  const simulations = [
    {
      id: "fluid",
      title: "Water Experiment",
      description:
        "Analysis of fluid dynamics using FLIP/PIC hybrid solver. Note: Gravity constant is adjustable.",
      icon: <Droplets className="w-10 h-10 text-ocean" />,
      link: "/fluid",
      status: "active",
      rotation: "rotate-1",
    },
    {
      id: "sand",
      title: "Granular Matter",
      description:
        "Cellular automata simulation of falling sand particles. distinctive accumulation patterns.",
      icon: <Layers className="w-10 h-10 text-amber-700" />,
      link: "/sand",
      status: "active",
      rotation: "rotate-2",
    },
    {
      id: "wind",
      title: "Aerodynamics",
      description:
        "Wind tunnel visualization. Flow patterns over various 2D geometries.",
      icon: <Wind className="w-10 h-10 text-slate-600" />,
      link: "/wind",
      status: "active",
      rotation: "-rotate-2",
    },
  ];

  return (
    <div className="min-h-screen max-h-[300vh] overflow-y-auto py-12 px-4 sm:px-6 lg:px-8 font-mono">
      {/* Title Section */}
      <div className="max-w-4xl mx-auto text-center mb-16 relative">
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-ink opacity-10 blur-sm rounded-full"></div>
        <h1 className="text-6xl md:text-7xl font-hand text-ink mb-4 relative z-10 transform -rotate-2">
          Physics Playbook
        </h1>
        <p className="text-xl text-ink/80 font-hand max-w-2xl mx-auto transform rotate-1 border-b-2 border-ink/10 pb-2 inline-block">
          "The noblest pleasure is the joy of understanding." - da Vinci
        </p>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        {simulations.map((sim, idx) => (
          <Link
            key={sim.id}
            to={sim.link}
            className={`group block relative focus:outline-none transition-transform duration-300 hover:scale-[1.01] ${
              idx % 2 === 0 ? "rotate-1" : "-rotate-1"
            } hover:rotate-0`}
          >
            {/* Paper effect */}
            <div className="absolute inset-0 bg-white shadow-paper transform translate-y-2 translate-x-2 rounded-sm z-0"></div>

            {/* Pin effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-20 border border-white/30"></div>

            <div className="sketch-border bg-paper-overlay backdrop-blur-sm p-8 relative z-10 h-full flex flex-col items-start hover:border-ocean transition-colors">
              <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity transform group-hover:rotate-12">
                {sim.icon}
              </div>

              <h2 className="text-3xl font-hand font-bold text-ink mb-3 group-hover:text-ocean transition-colors">
                {sim.title}
              </h2>

              <div className="w-full h-px bg-ink/20 my-2"></div>

              <p className="text-ink/80 leading-relaxed mb-6 font-mono text-base">
                {sim.description}
              </p>

              <div className="mt-auto flex items-center text-ocean font-bold text-sm tracking-wider uppercase group-hover:underline decoration-wavy underline-offset-4">
                Open Experiment{" "}
                <span className="ml-2 text-xl font-hand">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <SimulationInfo />

      {/* Footer / GitHub Link */}
      <div className="mt-20 text-center">
        <a
          href="https://github.com/FilipElznic/Water-simulation"
          target="_blank"
          rel="noopener noreferrer"
          className="sketch-btn inline-flex items-center gap-2 text-ink"
        >
          <Github size={20} />
          <span className="font-hand text-xl font-bold">View Source Code</span>
        </a>
      </div>
    </div>
  );
}
