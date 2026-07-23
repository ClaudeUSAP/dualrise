import { useState } from "react";
import { Star, Trophy, GraduationCap, MapPin, TrendingUp, Mail, Heart, User, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { statusLabel } from "@/lib/athleteStatus";
import { Button } from "@/components/ui/button";
import { Athlete } from "@/types/athlete";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ContactRequestModal from "./ContactRequestModal";
import { BestRecentScoreDisplay } from "./BestRecentScoreDisplay";
import { AthleteMetricsDisplay } from "./AthleteMetricsDisplay";
import { toast } from "@/hooks/use-toast";

interface AthleteCardProps {
  athlete: Athlete;
  onSelect?: (athlete: Athlete) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (athleteId: string) => void;
}

const AthleteCard = ({ athlete, onSelect, isFavorite, onToggleFavorite }: AthleteCardProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 7 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4 transition-colors",
          i < Math.floor(rating) 
            ? "fill-usap-orange text-usap-orange" 
            : "fill-transparent text-gray-300"
        )}
      />
    ));
  };

  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  const handleCardClick = () => {
    // Save scroll position before navigating
    sessionStorage.setItem('athleteListScrollPos', window.scrollY.toString());
    
    if (isAuthenticated) {
      // Use slug if available, otherwise fallback to ID
      const urlPath = athlete.slug || athlete.id;
      navigate(`/athletes/${urlPath}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <Card 
      className="group relative overflow-hidden bg-gradient-card backdrop-blur-sm border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Cover Image Section */}
      <div className="relative h-48 overflow-hidden bg-gradient-primary">
        {athlete.coverImage && !coverError ? (
          <img 
            src={athlete.coverImage} 
            alt={`${athlete.firstName} ${athlete.lastName} cover image`}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <Trophy className="h-16 w-16 text-white/20" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Profile Image */}
        <div className="absolute bottom-0 left-6 transform translate-y-1/2">
          <div className="relative">
            {athlete.profileImage && !avatarError ? (
              <img 
                src={athlete.profileImage} 
                alt={`${athlete.firstName} ${athlete.lastName} profile photo`}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
            )}
            {athlete.featured && (
              <Badge className="absolute -top-2 -right-2 bg-gradient-secondary border-0 text-white">
                Featured
              </Badge>
            )}
          </div>
        </div>
        
        {/* Division Badges */}
        <div className="absolute top-4 right-4 flex flex-wrap gap-1 justify-end max-w-[140px]">
          {athlete.preferredDivisions && athlete.preferredDivisions.length > 0 ? (
            athlete.preferredDivisions.slice(0, 2).map((division, index) => (
              <Badge key={index} className="bg-white/90 text-primary border-0 font-semibold text-xs">
                {division}
              </Badge>
            ))
          ) : (
            <Badge className="bg-white/90 text-primary border-0 font-semibold">
              NCAA {athlete.ncaaDivision}
            </Badge>
          )}
        </div>
        
        {/* Status badge — committed / in college (4-state canonical model) */}
        {(athlete.status === 'committed' || athlete.status === 'in_college') && (
          <div className="absolute top-4 left-4">
            <StatusBadge type={athlete.status} onImage>
              {statusLabel(athlete.status).toUpperCase()}
            </StatusBadge>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="pt-20 p-6">
        {/* Name and Graduation Year */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground">
            {athlete.firstName} {athlete.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">Class of {athlete.graduationYear}</p>
        </div>
        
        {/* Star Ratings */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Overall</span>
            <div className="flex gap-0.5">{renderStars(athlete.starRating)}</div>
          </div>
        </div>
        
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-usap-orange" />
              <span className="text-sm font-semibold text-foreground">Handicap</span>
            </div>
            <p className="text-2xl font-bold text-primary">{athlete.handicap}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-usap-orange" />
              <span className="text-sm font-semibold text-foreground">GPA</span>
            </div>
            <p className="text-2xl font-bold text-primary">{athlete.gpa?.toFixed(2) || 'N/A'}</p>
          </div>
          
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-usap-orange" />
              <span className="text-sm font-semibold text-foreground">Best Recent Avg</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              <BestRecentScoreDisplay 
                athleteId={athlete.id} 
                showTooltip={true}
                className="text-2xl"
              />
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-usap-orange" />
              <span className="text-sm font-semibold text-foreground">Budget</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {athlete.budget ? `$${athlete.budget.toLocaleString()}` : "N/A"}
            </p>
          </div>
        </div>
        
        {/* Achievements */}
        {athlete.achievements && athlete.achievements.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex flex-wrap gap-1.5">
              {athlete.achievements.slice(0, 2).map((achievement, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-muted text-muted-foreground border-0"
                >
                  {achievement}
                </Badge>
              ))}
              {athlete.achievements.length > 2 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-muted text-muted-foreground border-0"
                >
                  +{athlete.achievements.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Share Button */}
        <div className="pt-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const athleteSlug = athlete.slug || athlete.id;
              const url = `${window.location.origin}/athletes/${athleteSlug}`;
              navigator.clipboard.writeText(url);
              toast({
                title: "Link Copied!",
                description: "Profile link copied to clipboard",
              });
            }}
            className="w-full"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Profile
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AthleteCard;