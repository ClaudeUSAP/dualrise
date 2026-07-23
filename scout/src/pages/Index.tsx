import { useState, useEffect } from "react";
import { normalizeStatus } from "@/lib/athleteStatus";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Trophy, Users, Search, HandshakeIcon, UserCheck, FileText, CheckCircle, Filter, Video, Bell, BarChart3, Shield, GraduationCap, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AthleteCard from "@/components/AthleteCard";
import Hero from "@/components/Hero";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredAthletes, setFeaturedAthletes] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      // Scoped public RPC (returns only safe columns for up to 3 active
      // athletes). anon no longer has bulk read on athletes_safe.
      const { data } = await supabase
        .rpc('list_featured_athletes' as any) as { data: any[] | null, error: any };
      
      if (data) {
        setFeaturedAthletes(data.map(a => ({
          id: a.id,
          firstName: a.first_name || '',
          lastName: a.last_name || '',
          profileImage: a.profile_photo,
          gpa: a.academic_gpa != null ? Number(a.academic_gpa) : undefined,
          scoringAverage: a.scoring_average ? Number(a.scoring_average) : undefined,
          bestRecentScoringAvg: a.best_recent_scoring_avg_raw ? Number(a.best_recent_scoring_avg_raw) : undefined,
          starRating: a.star_rating || 3,
          hometown: a.country || '',
          currentSchool: a.golf_club_team || '',
          graduationYear: a.graduation_year || 2025,
          featured: true,
          status: normalizeStatus(a.status),
        })));
      }
    };
    
    fetchFeaturedAthletes();
  }, []);
  
  const valuePropositions = [
    {
      icon: Filter,
      title: "Advanced Filtering",
      description: "Search with academic, tennis, and tournament criteria to find your perfect recruit"
    },
    {
      icon: FileText,
      title: "Detailed Athlete Profiles",
      description: "Access the players' information, videos, & tournament results all in one place"
    },
    {
      icon: Shield,
      title: "Track your prospects",
      description: "Receive updates when a new player matching your criteria gets added to the platform and track your prospects' progress"
    }
  ];
  
  const howItWorks = [
    {
      step: "1",
      title: "Register and Get Approved",
      description: "Create your coach profile and verify your credentials",
      icon: UserCheck
    },
    {
      step: "2", 
      title: "Search and Favorite Athletes",
      description: "Used advanced filters to find matching talents and add them to your favorites to track their progress",
      icon: Search
    },
    {
      step: "3",
      title: "Get in touch with our team",
      description: "Let us know if you need any additional information on specific players and request to be connected to prospects",
      icon: HandshakeIcon
    }
  ];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero onGetStarted={() => navigate(user ? "/dashboard" : "/login")} />
      
      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 md:py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Why Coaches Use SCOUT
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              The only platform designed specifically for NCAA coaches recruiting French & international tennis talent
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {valuePropositions.map((prop, index) => (
              <Card key={index} className="p-6 hover:shadow-xl transition-all duration-300 border-border">
                <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                  <prop.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {prop.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {prop.description}
                </p>
              </Card>
            ))}
          </div>

          {/* Additional Value Props */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12">
            <div className="text-center p-4">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-foreground">Real-time Notifications</p>
            </div>
            <div className="text-center p-4">
              <Video className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-foreground">Video & Trackman Reports</p>
            </div>
            <div className="text-center p-4">
              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-foreground">Academic Profiles</p>
            </div>
            <div className="text-center p-4">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-foreground">Tournament Data</p>
            </div>
          </div>
        </div>
      </section>
      
      
      {/* Platform Preview */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Platform Preview
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              See what information is available for each athlete
            </p>
          </div>
          
          {/* Preview Screenshots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <Card className="p-6 bg-card border-border">
              <img
                src="/demo-athletes-browse.jpg"
                alt="Athletes search and browse interface with comprehensive filters and grid view"
                className="w-full h-64 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow mb-4"
              />
              <h3 className="font-semibold text-foreground mb-2">Powerful Search Filters</h3>
              <p className="text-sm text-muted-foreground">Filter by scoring average, GPA, budget & preferences</p>
            </Card>
            
            <Card className="p-6 bg-card border-border">
              <img
                src="/demo-athlete-profile.jpg"
                alt="Detailed athlete profile page with performance metrics and tournament results"
                className="w-full h-64 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow mb-4"
              />
              <h3 className="font-semibold text-foreground mb-2">Comprehensive Data</h3>
              <p className="text-sm text-muted-foreground">Videos, stats, academics, and tournament history</p>
            </Card>
          </div>
          
          {/* Preview Athletes */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-foreground text-center mb-8">
              Sample Athlete Profiles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredAthletes.map(athlete => (
                <div key={athlete.id} className="relative">
                  <AthleteCard 
                    athlete={athlete}
                    onSelect={() => navigate("/login")}
                  />
                  <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                    <Card className="px-4 py-2 bg-card border-primary">
                      <p className="text-sm font-medium text-foreground">Preview Only</p>
                      <p className="text-xs text-muted-foreground">Full access requires registration</p>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-gradient-secondary text-white hover:opacity-90"
            >
              Register to Access Full Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Get started in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
                )}
                <div className="text-center relative z-10">
                  <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 sm:py-16 bg-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Scout by Dual Rise</h3>
              <p className="text-white/80">
                Exclusive platform for college coaches recruiting international talents
              </p>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center mb-8">
              <a href="#" className="text-white/60 hover:text-white transition-colors py-2">Contact</a>
              <Link to="/terms-of-service" className="text-white/60 hover:text-white transition-colors py-2">Terms</Link>
              <Link to="/privacy-policy" className="text-white/60 hover:text-white transition-colors py-2">Privacy Policy</Link>
              <Link to="/politique-confidentialite" className="text-white/60 hover:text-white transition-colors py-2">Politique de confidentialité</Link>
              <Link to="/mentions-legales" className="text-white/60 hover:text-white transition-colors py-2">Mentions légales</Link>
              <a href="#" className="text-white/60 hover:text-white transition-colors py-2">Social Media</a>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8">
              <Button 
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 w-full sm:w-auto"
                onClick={() => navigate("/login")}
              >
                Coach Login
              </Button>
              <Button 
                className="bg-gradient-secondary text-white hover:opacity-90 w-full sm:w-auto"
                onClick={() => navigate("/login")}
              >
                Register Now
              </Button>
            </div>
            
            <p className="text-center text-white/40 text-sm">
              © 2024 Dual Rise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;