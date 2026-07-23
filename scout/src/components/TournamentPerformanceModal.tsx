import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, Target, Activity, Trophy } from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TournamentResult } from '@/types/tournament';
import { Athlete } from '@/types/athlete';

interface TournamentPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TournamentResult & { athlete?: Athlete };
  tournament: {
    par: number;
    name: string;
  };
}

const TournamentPerformanceModal: React.FC<TournamentPerformanceModalProps> = ({
  isOpen,
  onClose,
  result,
  tournament,
}) => {
  if (!result || !result.athlete) return null;

  // Ensure rounds is always an array to prevent crashes
  const rounds = result.rounds || [];

  // Calculate round progression
  const roundProgression = rounds.map((round, index) => ({
    round: `R${index + 1}`,
    score: round.score,
    cumulative: rounds
      .slice(0, index + 1)
      .reduce((sum, r) => sum + (r.score - tournament.par), 0),
  }));

  // Calculate consistency
  const avg = rounds.length > 0 ? rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length : 0;
  const variance = rounds.length > 0 ? rounds.reduce((sum, r) => sum + Math.pow(r.score - avg, 2), 0) / rounds.length : 0;
  const consistency = Math.sqrt(variance).toFixed(1);

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
    cumulative: {
      label: "Cumulative",
      color: "hsl(var(--secondary))",
    },
  } satisfies ChartConfig;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Performance Analysis - {tournament.name}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {result.athlete.firstName} {result.athlete.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Position</p>
                </div>
                <p className="text-2xl font-bold">
                  {result.finalPosition}
                  {result.finalPosition === 1 && '🥇'}
                  {result.finalPosition === 2 && '🥈'}
                  {result.finalPosition === 3 && '🥉'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Total Score</p>
                </div>
                <p className={`text-2xl font-bold ${
                  result.totalScore < 0 ? 'text-green-600' :
                  result.totalScore > 0 ? 'text-red-600' :
                  ''
                }`}>
                  {result.totalScore > 0 ? '+' : ''}{result.totalScore}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Best Round</p>
                </div>
                <p className="text-2xl font-bold">
                  {rounds.length > 0 ? Math.min(...rounds.map(r => r.score)) : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Consistency</p>
                </div>
                <p className="text-2xl font-bold">{consistency}σ</p>
              </CardContent>
            </Card>
          </div>

          {/* Round by Round Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Round Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {rounds.map((round, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Round {idx + 1}</p>
                    <Badge 
                      variant={
                        round.score < tournament.par ? 'default' :
                        round.score > tournament.par ? 'destructive' :
                        'secondary'
                      }
                      className="text-lg px-3 py-1"
                    >
                      {round.score}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {round.score - tournament.par > 0 ? '+' : ''}{round.score - tournament.par}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Round Progression Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Round Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roundProgression}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="var(--color-score)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-score)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="var(--color-cumulative)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'var(--color-cumulative)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Performance Highlights */}
          {result.highlights && result.highlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">{highlight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentPerformanceModal;