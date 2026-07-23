import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAthletes } from '@/data/mockAthletes';
import AthleteCard from '@/components/AthleteCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

/**
 * Demo Route - For Screenshots & Presentations Only
 * 
 * This page displays mock athlete data for the purpose of:
 * - Taking screenshots for landing page
 * - Presentations and demos
 * - Testing UI without affecting production data
 * 
 * IMPORTANT: This is completely separate from production database
 */

const Demo = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);

  const handleToggleFavorite = (athleteId: string) => {
    setFavorites(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleCardClick = (athleteId: string) => {
    navigate(`/demo/${athleteId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      <Alert className="rounded-none border-x-0 border-t-0 border-primary bg-primary/10">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm font-medium">
          DEMO MODE - Sample Data Only (For Screenshots & Presentations)
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Browse Athletes
          </h1>
          <p className="text-muted-foreground">
            Discover exceptional international tennis talent for your college program
          </p>
        </div>

        {/* Athlete Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockAthletes.slice(0, 6).map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              onSelect={() => handleCardClick(athlete.id)}
              isFavorite={favorites.includes(athlete.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Demo;
