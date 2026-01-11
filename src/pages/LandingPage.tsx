import { Link } from "react-router-dom";
import {
  Droplets,
  Wind,
  Layers,
  ArrowRight,
  Github,
  Anchor,
} from "lucide-react";

export default function LandingPage() {
  const simulations = [
    {
      id: "fluid",
      title: "Water Simulation",
      description:
        "Interactive FLIP/PIC hybrid fluid solver with real-time splashes and gravity.",
      icon: <Droplets className="w-12 h-12 text-blue-500" />,
      color: "bg-blue-50",
      link: "/fluid",
      status: "active",
    },
    {
      id: "boat",
      title: "Boat & Waves",
      description:
        "Large scale wave simulation with buoyant rigid body boat physics.",
      icon: <Anchor className="w-12 h-12 text-blue-700" />,
      color: "bg-indigo-50",
      link: "/boat",
      status: "active",
    },
    {
      id: "sand",
      title: "Sand Automata",
      description:
        "Cellular automata based falling sand simulation using varying granular types.",
      icon: <Layers className="w-12 h-12 text-amber-600" />,
      color: "bg-amber-50",
      link: "/sand",
      status: "active",
    },
    {
      id: "wind",
      title: "Wind Tunnel",
      description:
        "Real-time aerodynamic flow visualization over 2D obstacles.",
      icon: <Wind className="w-12 h-12 text-slate-500" />,
      color: "bg-slate-50",
      link: "/wind",
      status: "active",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              Physics <span className="text-blue-600">Playground</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-10">
              Interactive physics simulations running directly in your browser.
              Experiment with fluids, particles, and forces in real-time.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/FilipElznic/Water-simulation"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Github className="mr-2 -ml-1 h-5 w-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 pl-2 border-l-4 border-blue-600">
          Available Simulations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {simulations.map((sim) => (
            <div
              key={sim.id}
              className={`group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${
                sim.status === "coming-soon" ? "opacity-75" : ""
              }`}
            >
              <div
                className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}
              >
                {sim.icon}
              </div>

              <div
                className={`w-16 h-16 rounded-xl ${sim.color} flex items-center justify-center mb-6`}
              >
                {sim.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {sim.title}
              </h3>

              <p className="text-gray-500 mb-6 h-12">{sim.description}</p>

              {sim.status === "active" ? (
                <Link
                  to={sim.link}
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Launch Simulation <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center text-gray-400 font-medium cursor-not-allowed">
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>
            © {new Date().getFullYear()} Physics Playground. Built with React &
            TypeScript.
          </p>
        </div>
      </footer>
    </div>
  );
}
