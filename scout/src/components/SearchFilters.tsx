import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchFilters as SearchFiltersType } from "@/types/athlete";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onSearch: () => void;
}

const SearchFilters = ({ filters, onFiltersChange, onSearch }: SearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const ncaaDivisions = ['I', 'II', 'III', 'NAIA', 'NJCAA 1', 'NJCAA 2'];
  const graduationYears = [2025, 2026, 2027, 2028, 2029];
  const genderOptions = ['Male', 'Female', 'Both'];
  
  const activeFiltersCount = Object.values(filters).filter(v =>
    v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  
  const handleReset = () => {
    onFiltersChange({});
  };
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, location, or school..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="pl-10 bg-white border-border/50 focus:border-primary"
          />
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-secondary text-white border-0">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg sm:text-xl flex items-center justify-between">
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleReset}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Gender Filter */}
              <div className="space-y-3">
                <Label>Gender</Label>
                <div className="space-y-2">
                  {genderOptions.map((gender) => (
                    <div key={gender} className="flex items-center space-x-2">
                      <Checkbox
                        id={`gender-${gender}`}
                        checked={filters.gender === gender}
                        onCheckedChange={(checked) => {
                          onFiltersChange({ ...filters, gender: checked ? gender : undefined });
                        }}
                      />
                      <label
                        htmlFor={`gender-${gender}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {gender}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Graduation Year */}
              <div className="space-y-3">
                <Label>Graduation Year</Label>
                <div className="space-y-2">
                  {graduationYears.map((year) => (
                    <div key={year} className="flex items-center space-x-2">
                      <Checkbox
                        id={`year-${year}`}
                        checked={(filters.graduationYear || []).includes(year)}
                        onCheckedChange={(checked) => {
                          const current = filters.graduationYear || [];
                          const updated = checked
                            ? [...current, year]
                            : current.filter((y) => y !== year);
                          onFiltersChange({ ...filters, graduationYear: updated });
                        }}
                      />
                      <label
                        htmlFor={`year-${year}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Class of {year}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Budget Range */}
              <div className="space-y-3">
                <Label>Annual Budget ($USD)</Label>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>${(filters.budgetMin || 0).toLocaleString()}</span>
                    <span>${(filters.budgetMax || 80000).toLocaleString()}</span>
                  </div>
                  <Slider
                    min={0}
                    max={80000}
                    step={5000}
                    value={[filters.budgetMin || 0, filters.budgetMax || 80000]}
                    onValueChange={([min, max]) => 
                      onFiltersChange({ ...filters, budgetMin: min, budgetMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Average Score */}
              <div className="space-y-3">
                <Label>Average Score Range</Label>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{filters.scoringAvgMin || 65}</span>
                    <span>{filters.scoringAvgMax || 85}</span>
                  </div>
                  <Slider
                    min={65}
                    max={85}
                    step={0.5}
                    value={[filters.scoringAvgMin || 65, filters.scoringAvgMax || 85]}
                    onValueChange={([min, max]) => 
                      onFiltersChange({ ...filters, scoringAvgMin: min, scoringAvgMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Score vs Course Rating */}
              <div className="space-y-3">
                <Label>Score vs Course Rating</Label>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{filters.scoreVsCRMin || -10}</span>
                    <span>{filters.scoreVsCRMax || 10}</span>
                  </div>
                  <Slider
                    min={-10}
                    max={10}
                    step={0.5}
                    value={[filters.scoreVsCRMin || -10, filters.scoreVsCRMax || 10]}
                    onValueChange={([min, max]) => 
                      onFiltersChange({ ...filters, scoreVsCRMin: min, scoreVsCRMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* GPA Range */}
              <div className="space-y-3">
                <Label>GPA Range</Label>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{filters.gpaMin || 0}</span>
                    <span>{filters.gpaMax || 4.0}</span>
                  </div>
                  <Slider
                    min={0}
                    max={4}
                    step={0.1}
                    value={[filters.gpaMin || 0, filters.gpaMax || 4]}
                    onValueChange={([min, max]) => 
                      onFiltersChange({ ...filters, gpaMin: min, gpaMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* NCAA Division */}
              <div className="space-y-3">
                <Label>Preferred Division</Label>
                <div className="space-y-2">
                  {ncaaDivisions.map((division) => (
                    <div key={division} className="flex items-center space-x-2">
                      <Checkbox
                        id={`division-${division}`}
                        checked={(filters.ncaaDivision || []).includes(division)}
                        onCheckedChange={(checked) => {
                          const current = filters.ncaaDivision || [];
                          const updated = checked
                            ? [...current, division]
                            : current.filter((d) => d !== division);
                          onFiltersChange({ ...filters, ncaaDivision: updated });
                        }}
                      />
                      <label
                        htmlFor={`division-${division}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {division === 'NAIA' || division === 'NJCAA' ? division : `Division ${division}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Apply Filters Button */}
              <Button 
                onClick={() => {
                  onSearch();
                  setIsOpen(false);
                }}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        
        <Button 
          onClick={onSearch}
          className="bg-gradient-primary text-white hover:opacity-90"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Search: {filters.searchQuery}
            </Badge>
          )}
          {filters.gender && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Gender: {filters.gender}
            </Badge>
          )}
          {filters.graduationYear && filters.graduationYear.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Class: {filters.graduationYear.join(', ')}
            </Badge>
          )}
          {filters.budgetMin !== undefined && filters.budgetMax !== undefined && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Budget: ${filters.budgetMin.toLocaleString()} - ${filters.budgetMax.toLocaleString()}
            </Badge>
          )}
          {filters.scoringAvgMin !== undefined && filters.scoringAvgMax !== undefined && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Avg Score: {filters.scoringAvgMin} - {filters.scoringAvgMax}
            </Badge>
          )}
          {filters.scoreVsCRMin !== undefined && filters.scoreVsCRMax !== undefined && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Score vs CR: {filters.scoreVsCRMin} - {filters.scoreVsCRMax}
            </Badge>
          )}
          {filters.gpaMin !== undefined && filters.gpaMax !== undefined && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              GPA: {filters.gpaMin} - {filters.gpaMax}
            </Badge>
          )}
          {filters.ncaaDivision && filters.ncaaDivision.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Division: {filters.ncaaDivision.join(', ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;