import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-[450px] sm:min-h-[500px] md:min-h-[600px] overflow-hidden">
      {/* Background — Dual Rise navy gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, #0B1D58 0%, #132F88 60%, #0B1D58 100%)' }} />
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
        }} />
      </div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-12 sm:py-16 md:py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Main Heading */}
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight px-2">
            Discover the future faces
            <span className="block text-usap-orange mt-1 sm:mt-2">of your program</span>
          </h1>
          
          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
            Exclusive access to Dual Rise's athletes with complete performance data, 
            academic profiles, and tournament results.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="bg-gradient-secondary hover:opacity-90 text-white border-0 shadow-xl text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto w-full"
              >
                Register for Access
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline"
                className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto w-full"
              >
                Coach Login
              </Button>
            </Link>
          </div>
          
          {/* Info Section */}
          <div className="max-w-3xl mx-auto px-4">
            <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed">
              SCOUT was designed to be a hands-on tool for US coaches to facilitate the recruitment of international talents. 
              It makes it easier to find & track prospects and allows to find all the information you need in one place.
            </p>
          </div>
        </div>
      </div>
      
    </section>
  );
};

export default Hero;