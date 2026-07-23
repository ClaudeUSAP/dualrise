import { useState } from 'react';
import { WEATHER_ZONE_LABELS } from '@/lib/divisionNormalizer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Filter,
  ChevronLeft,
  ChevronRight,
  Save,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CollapsibleFilterSidebarProps {
  selectedDivisions: string[];
  setSelectedDivisions: (divisions: string[]) => void;
  selectedYears: string[];
  setSelectedYears: (years: string[]) => void;
  gpaRange: [number, number];
  setGpaRange: (range: [number, number]) => void;
  budgetRange: [number, number];
  setBudgetRange: (range: [number, number]) => void;
  starRating: number;
  setStarRating: (rating: number) => void;
  handicapMax: number;
  setHandicapMax: (max: number) => void;
  weatherZones: string[];
  setWeatherZones: (zones: string[]) => void;
  showNewOnly: boolean;
  setShowNewOnly: (show: boolean) => void;
  tournamentFilters: {
    minTournaments: number;
    bestFinish: number;
    tournamentTypes: string[];
    recentActivity: string;
  };
  setTournamentFilters: (filters: any) => void;
  clearFilters: () => void;
  saveSearch: () => void;
  renderStarRating: (rating: number) => JSX.Element;
  gender?: string;
  setGender?: (gender: string) => void;
  averageScore?: [number, number];
  setAverageScore?: (range: [number, number]) => void;
  scoreVsRating?: [number, number];
  setScoreVsRating?: (range: [number, number]) => void;
  drivingDistance?: [number, number];
  setDrivingDistance?: (range: [number, number]) => void;
  // Dual Rise — tennis filters
  utrRange?: [number, number];
  setUtrRange?: (range: [number, number]) => void;
  wtnRange?: [number, number];
  setWtnRange?: (range: [number, number]) => void;
  surfaces?: string[];
  setSurfaces?: (surfaces: string[]) => void;
}

export const CollapsibleFilterSidebar = ({
  selectedDivisions,
  setSelectedDivisions,
  selectedYears,
  setSelectedYears,
  gpaRange,
  setGpaRange,
  budgetRange,
  setBudgetRange,
  starRating,
  setStarRating,
  handicapMax,
  setHandicapMax,
  weatherZones,
  setWeatherZones,
  showNewOnly,
  setShowNewOnly,
  tournamentFilters,
  setTournamentFilters,
  clearFilters,
  saveSearch,
  renderStarRating,
  gender = 'all',
  setGender = () => {},
  averageScore = [65, 85],
  setAverageScore = () => {},
  scoreVsRating = [-4, 15],
  setScoreVsRating = () => {},
  drivingDistance = [180, 330],
  setDrivingDistance = () => {},
  utrRange = [1, 16.5],
  setUtrRange = () => {},
  wtnRange = [1, 40],
  setWtnRange = () => {},
  surfaces = [],
  setSurfaces = () => {},
}: CollapsibleFilterSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "hidden lg:block transition-all duration-300 border-r bg-card relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {isCollapsed ? (
        /* Collapsed View - Icon Only */
        <div className="p-4 flex flex-col items-center space-y-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="space-y-2">
            {selectedDivisions.length > 0 && (
              <Badge variant="secondary" className="w-8 h-8 p-0 flex items-center justify-center rounded-full">
                {selectedDivisions.length}
              </Badge>
            )}
            {starRating > 0 && (
              <Badge variant="secondary" className="w-8 h-8 p-0 flex items-center justify-center rounded-full">
                {starRating}★
              </Badge>
            )}
          </div>
        </div>
      ) : (
        /* Expanded View - Full Filters */
        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h3>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-6 pr-2">
              
              {/* Gender Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Gender
                </Label>
                <RadioGroup value={gender} onValueChange={(value) => setGender(value)}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="gender-all" />
                      <Label htmlFor="gender-all" className="text-sm font-normal cursor-pointer">
                        All
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male" className="text-sm font-normal cursor-pointer">
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female" className="text-sm font-normal cursor-pointer">
                        Female
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
                
              {/* New Athletes Filter */}
              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-athletes"
                    checked={showNewOnly}
                    onCheckedChange={(checked) => setShowNewOnly(!!checked)}
                  />
                  <Label htmlFor="new-athletes" className="text-sm font-normal cursor-pointer">
                    Show only new athletes (added within 2 weeks)
                  </Label>
                </div>
              </div>

              {/* Year Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Year
                </Label>
                <div className="space-y-2">
                  {['2025', '2026', '2027', '2028', '2029', 'Transfer'].map(year => (
                    <div key={year} className="flex items-center space-x-2">
                      <Checkbox
                        id={`class-${year}`}
                        checked={selectedYears.includes(year)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedYears([...selectedYears, year]);
                          } else {
                            setSelectedYears(selectedYears.filter(y => y !== year));
                          }
                        }}
                      />
                      <Label htmlFor={`class-${year}`} className="text-sm font-normal cursor-pointer">
                        {year}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <Label className="text-sm font-medium">
                  Budget: ${(budgetRange[0] / 1000).toFixed(0)}k - ${(budgetRange[1] / 1000).toFixed(0)}k
                </Label>
                <div className="mt-3 px-2">
                  <Slider
                    value={budgetRange}
                    onValueChange={(value) => setBudgetRange(value as [number, number])}
                    min={0}
                    max={80000}
                    step={5000}
                    className="w-full"
                  />
                </div>
              </div>

              {/* UTR range */}
              <div>
                <Label className="text-sm font-medium">
                  UTR: {utrRange[0].toFixed(1)} - {utrRange[1].toFixed(1)}
                </Label>
                <div className="mt-3 px-2">
                  <Slider
                    value={utrRange}
                    onValueChange={(value) => setUtrRange(value as [number, number])}
                    min={1}
                    max={16.5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* WTN range (lower is better) */}
              <div>
                <Label className="text-sm font-medium">
                  WTN: {wtnRange[0].toFixed(1)} - {wtnRange[1].toFixed(1)}
                </Label>
                <div className="mt-3 px-2">
                  <Slider
                    value={wtnRange}
                    onValueChange={(value) => setWtnRange(value as [number, number])}
                    min={1}
                    max={40}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Preferred surface */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Preferred surface</Label>
                <div className="space-y-2">
                  {['Hard', 'Clay', 'Grass'].map((surface) => (
                    <div key={surface} className="flex items-center space-x-2">
                      <Checkbox
                        id={`surface-${surface}`}
                        checked={surfaces.includes(surface)}
                        onCheckedChange={(checked) =>
                          setSurfaces(
                            checked
                              ? [...surfaces, surface]
                              : surfaces.filter((s) => s !== surface)
                          )
                        }
                      />
                      <label htmlFor={`surface-${surface}`} className="text-sm cursor-pointer">{surface}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPA Range */}
              <div>
                <Label className="text-sm font-medium">
                  GPA Range: {gpaRange[0].toFixed(1)} - {gpaRange[1].toFixed(1)}
                </Label>
                <div className="mt-3 px-2">
                  <Slider
                    value={gpaRange}
                    onValueChange={(value) => setGpaRange(value as [number, number])}
                    min={2.0}
                    max={4.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Star Rating Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm font-medium">
                    Minimum Star Rating: {starRating > 0 ? starRating : 'Any'}
                  </Label>
                  <Link 
                    to="/resources?tab=rating"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 px-2">
                  <Slider
                    value={[starRating]}
                    onValueChange={(value) => setStarRating(value[0])}
                    min={0}
                    max={7}
                    step={1}
                    className="w-full"
                  />
                </div>
                {starRating > 0 && (
                  <div className="mt-2">
                    {renderStarRating(starRating)}
                  </div>
                )}
              </div>

              {/* Division Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Preferred Division
                </Label>
                <div className="space-y-2">
                  {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map(division => (
                    <div key={division} className="flex items-center space-x-2">
                      <Checkbox
                        id={division}
                        checked={selectedDivisions.includes(division)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDivisions([...selectedDivisions, division]);
                          } else {
                            setSelectedDivisions(selectedDivisions.filter(d => d !== division));
                          }
                        }}
                      />
                      <Label htmlFor={division} className="text-sm font-normal cursor-pointer">
                        {division}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weather Zone Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Weather Zone
                </Label>
                <div className="space-y-2">
                  {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map(zone => (
                    <div key={zone} className="flex items-center space-x-2">
                      <Checkbox
                        id={`zone-${zone}`}
                        checked={weatherZones.includes(zone)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setWeatherZones([...weatherZones, zone]);
                          } else {
                            setWeatherZones(weatherZones.filter(z => z !== zone));
                          }
                        }}
                      />
                      <Label htmlFor={`zone-${zone}`} className="text-sm font-normal cursor-pointer">
                        {zone} — {WEATHER_ZONE_LABELS[zone]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>

          <div className="mt-4 space-y-2">
            <Button onClick={saveSearch} className="w-full" size="sm">
              <Save className="mr-2 h-3 w-3" />
              Save Search
            </Button>
            <Button variant="outline" onClick={clearFilters} className="w-full" size="sm">
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};