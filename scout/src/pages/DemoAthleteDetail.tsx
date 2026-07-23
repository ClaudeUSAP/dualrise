import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockAthletes } from '@/data/mockAthletes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Info,
  Trophy, 
  GraduationCap,
  Target,
  Star,
  MapPin,
  DollarSign
} from 'lucide-react';
import { normalizeIntendedMajors } from '@/lib/divisionNormalizer';

/**
 * Demo Athlete Detail - For Screenshots & Presentations Only
 * 
 * Shows detailed view of mock athlete data
 * Completely separate from production database
 */

const DemoAthleteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const athlete = mockAthletes.find(a => a.id === id);

  if (!athlete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Athlete Not Found</h2>
          <Button onClick={() => navigate('/demo')}>Back to Demo</Button>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/demo')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Athletes
        </Button>

        {/* Cover Image */}
        <div className="relative h-64 rounded-lg overflow-hidden mb-8 bg-muted">
          {athlete.coverImage && !coverError ? (
            <img
              src={athlete.coverImage}
              alt={`${athlete.firstName} ${athlete.lastName} cover`}
              className="w-full h-full object-cover"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Trophy className="h-16 w-16 text-primary/40" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1">
            {/* Profile Image & Basic Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {athlete.profileImage && !avatarError ? (
                      <img
                        src={athlete.profileImage}
                        alt={`${athlete.firstName} ${athlete.lastName}`}
                        className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-lg">
                        <span className="text-4xl font-bold text-primary">
                          {athlete.firstName[0]}{athlete.lastName[0]}
                        </span>
                      </div>
                    )}
                    {athlete.featured && (
                      <Badge className="absolute -top-2 -right-2 bg-primary">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold text-center mb-2">
                    {athlete.firstName} {athlete.lastName}
                  </h1>
                  
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{athlete.hometown}</span>
                  </div>

                  {athlete.starRating && (
                    <div className="mb-4">
                      {renderStars(athlete.starRating)}
                    </div>
                  )}

                  <div className="w-full space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grad Year:</span>
                      <span className="font-semibold">{athlete.graduationYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GPA:</span>
                      <span className="font-semibold">{athlete.gpa.toFixed(2)}</span>
                    </div>
                    {athlete.handicap && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Handicap:</span>
                        <span className="font-semibold">{athlete.handicap}</span>
                      </div>
                    )}
                    {athlete.budget && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-semibold">
                          ${athlete.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {athlete.preferredDivisions && athlete.preferredDivisions.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {athlete.preferredDivisions.map((division, idx) => (
                        <Badge key={idx} variant="outline">
                          {division}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="academics">Academics</TabsTrigger>
                <TabsTrigger value="athletic">Athletic</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Recruitment Pitch */}
                {athlete.recruitmentPitch && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Why I'm a Great Recruit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {athlete.recruitmentPitch}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Strengths */}
                {athlete.strengths && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Strengths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{athlete.strengths}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Areas of Improvement */}
                {athlete.areasOfImprovement && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Areas of Improvement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{athlete.areasOfImprovement}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="academics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Academic Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">GPA</p>
                        <p className="text-2xl font-bold">{athlete.gpa.toFixed(2)}</p>
                      </div>
                      {athlete.satScore && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">SAT Score</p>
                          <p className="text-2xl font-bold">{athlete.satScore}</p>
                        </div>
                      )}
                      {athlete.duolingoScore && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Duolingo</p>
                          <p className="text-2xl font-bold">{athlete.duolingoScore}</p>
                        </div>
                      )}
                    </div>
                    {athlete.intendedMajors && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Intended Majors</p>
                        <p className="text-foreground">{normalizeIntendedMajors(athlete.intendedMajors).join(', ') || 'Not specified'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="athletic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Athletic Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {athlete.currentSchool && (
                        <div className="col-span-2 mb-2">
                          <p className="text-sm text-muted-foreground mb-1">Golf Team</p>
                          <p className="text-xl font-semibold">{athlete.currentSchool}</p>
                        </div>
                      )}
                      {athlete.handicap && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Handicap</p>
                          <p className="text-2xl font-bold">{athlete.handicap}</p>
                        </div>
                      )}
                      {athlete.scoringAverage && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Scoring Average</p>
                          <p className="text-2xl font-bold">{athlete.scoringAverage.toFixed(1)}</p>
                        </div>
                      )}
                      {athlete.drivingAverageCarryDistance && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Carry Driving Distance</p>
                          <p className="text-2xl font-bold">{athlete.drivingAverageCarryDistance} yds</p>
                        </div>
                      )}
                      {athlete.nationalRankingInClass && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">National Ranking</p>
                          <p className="text-2xl font-bold">#{athlete.nationalRankingInClass}</p>
                        </div>
                      )}
                    </div>

                    {athlete.achievements && athlete.achievements.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground mb-3">Recent Achievements</p>
                        <ul className="space-y-2">
                          {athlete.achievements.map((achievement, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Trophy className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                              <span className="text-foreground">{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoAthleteDetail;
