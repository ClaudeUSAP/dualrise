import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GraduationCap, Star, ExternalLink, Info, BarChart3, Play, Trophy } from "lucide-react";
const ratingData = [{
  rating: 7,
  men: {
    ranking: "Top 20",
    avgScore: "<70.5"
  },
  women: {
    ranking: "Top 20",
    avgScore: "<72"
  },
  schools: ["NCAA 1: Top 20"]
}, {
  rating: 6,
  men: {
    ranking: "Top 20-50",
    avgScore: "<71.5"
  },
  women: {
    ranking: "Top 20-50",
    avgScore: "<74"
  },
  schools: ["NCAA 1: Top 20-80"]
}, {
  rating: 5,
  men: {
    ranking: "Top 50-100",
    avgScore: "<72.5"
  },
  women: {
    ranking: "Top 50-100",
    avgScore: "<75"
  },
  schools: ["NCAA 1: Top 80-180", "NCAA 2: Top 15", "NAIA: Top 3", "NJCAA 1: Top 7"]
}, {
  rating: 4,
  men: {
    ranking: "Top 100-180",
    avgScore: "<74"
  },
  women: {
    ranking: "Top 100-150",
    avgScore: "<76"
  },
  schools: ["NCAA 1: Top 180+", "NCAA 2: Top 15-60", "NAIA: Top 5-15", "NJCAA 1: Top 7-20", "NJCAA 2: Top 7"]
}, {
  rating: 3,
  men: {
    ranking: "Top 180-350",
    avgScore: "<75.5"
  },
  women: {
    ranking: "Top 150-225",
    avgScore: "<78"
  },
  schools: ["NCAA 2: Top 60+", "NAIA: Top 15-40", "NJCAA 1: Top 20-35", "NJCAA 2: Top 7-25"]
}, {
  rating: 2,
  men: {
    ranking: "Top 350-600",
    avgScore: "<77"
  },
  women: {
    ranking: "Top 225-350",
    avgScore: "<80"
  },
  schools: ["NAIA: Top 40-80", "NJCAA 1: Top 35+", "NJCAA 2: Top 25+"]
}, {
  rating: 1,
  men: {
    ranking: "600+",
    avgScore: ">77"
  },
  women: {
    ranking: "350+",
    avgScore: ">80"
  },
  schools: ["NAIA: Top 80+", "NJCAA 1: Top 35+", "NJCAA 2: Top 25+"]
}];
const getStarBadgeColor = (rating: number) => {
  const colors: Record<number, string> = {
    7: "bg-yellow-500 text-white hover:bg-yellow-600",
    6: "bg-gray-400 text-white hover:bg-gray-500",
    5: "bg-orange-500 text-white hover:bg-orange-600",
    4: "bg-blue-500 text-white hover:bg-blue-600",
    3: "bg-green-500 text-white hover:bg-green-600",
    2: "bg-purple-500 text-white hover:bg-purple-600",
    1: "bg-gray-600 text-white hover:bg-gray-700"
  };
  return colors[rating] || "bg-muted";
};
export default function Resources() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'getting-started';
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['getting-started', 'understanding', 'rating', 'placement'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-6 md:mb-8">
          <div className="mb-3 md:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Coach Resources</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Understanding European tennis context and our star rating system to help you recruit the right athletes.
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile/Tablet Dropdown - visible below lg breakpoint */}
          <div className="lg:hidden mb-6 md:mb-8">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="getting-started">Getting Started</SelectItem>
                <SelectItem value="understanding">Understanding European Tennis</SelectItem>
                <SelectItem value="rating">Rating System</SelectItem>
                <SelectItem value="placement">Understanding Our Players’ level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs - visible at lg breakpoint and above */}
          <div className="hidden lg:block mb-6 md:mb-8">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="getting-started" className="text-sm">
                Getting Started
              </TabsTrigger>
              <TabsTrigger value="understanding" className="text-sm">
                Understanding European Tennis
              </TabsTrigger>
              <TabsTrigger value="rating" className="text-sm">
                Rating System
              </TabsTrigger>
              <TabsTrigger value="placement" className="text-sm">
                Understanding Our Players’ level
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 0: Getting Started - Loom Video */}
          <TabsContent value="getting-started" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Getting Started with Scout
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Watch this quick introduction to learn how to use the platform effectively
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                  <iframe 
                    src="https://www.loom.com/embed/c6a588dc0e5f4761b384aed1b6cd175f"
                    frameBorder="0"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    title="Getting Started with Scout"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 1: Understanding European Tennis */}
          <TabsContent value="understanding" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  European Tennis Context
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Key differences between European and US college tennis that affect recruiting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="text-sm sm:text-base leading-relaxed">
                    As ex-college tennis players, we understand the position you're in and how it can be hard to read the "true" level of the international players you are trying to recruit.
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    Remember: in France and most of Europe there is <strong>no high school tennis</strong>. Juniors compete on their <strong>national federation</strong> and <strong>ITF junior</strong> circuits, often with a long indoor winter season and heavy clay-court development. They play fewer ranked matches per year than a typical US junior, and <strong>UTR / WTN</strong> coverage can be thinner for European players — so read the ratings alongside their national ranking and match results.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Development context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs sm:text-sm">
                      <p>• National federation + ITF junior circuits (no school tennis)</p>
                      <p>• Clay-heavy development across much of Europe</p>
                      <p>• Strong tactical / point-construction schooling</p>
                      <p>• UTR &amp; WTN are the best cross-border level markers</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Playing calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs sm:text-sm">
                      <p>• Long indoor winter season (Nov–Feb)</p>
                      <p>• Surface changes through the year (indoor / clay / hard)</p>
                      <p>• Fewer ranked matches annually than US juniors</p>
                      <p>• Uneven access to international (ITF) events</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-muted rounded-lg">
                  <p className="text-sm sm:text-base font-medium text-foreground">
                    <strong>Key Insight:</strong> A solid national junior ranking with a good <strong>UTR / WTN</strong> typically translates to <strong>NCAA D2 and NAIA</strong>. Top national results and <strong>ITF international</strong> events are the marker for <strong>NCAA D1</strong> recruits.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Rating System & Comparison */}
          <TabsContent value="rating" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Dual Rise Star Rating System
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  0-7 star ranking based on national ranking, UTR/WTN and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                

                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-3">
                  {ratingData.map(row => <Card key={row.rating} className="border-2">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Rating</span>
                          <Badge className={getStarBadgeColor(row.rating)}>
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {row.rating}★
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Men's Criteria</div>
                          <div className="text-sm font-medium">{row.men.ranking}</div>
                          <div className="text-xs text-muted-foreground">Avg Score: {row.men.avgScore}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Women's Criteria</div>
                          <div className="text-sm font-medium">{row.women.ranking}</div>
                          <div className="text-xs text-muted-foreground">Avg Score: {row.women.avgScore}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">School Divisions</div>
                          <div className="space-y-1">
                            {row.schools.map((school, idx) => <div key={idx} className="text-xs text-muted-foreground">{school}</div>)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold w-[100px] text-sm">Rating</TableHead>
                        <TableHead className="font-bold text-sm">Men's Criteria</TableHead>
                        <TableHead className="font-bold text-sm">Women's Criteria</TableHead>
                        <TableHead className="font-bold text-sm">School Divisions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratingData.map(row => <TableRow key={row.rating} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            <Badge className={getStarBadgeColor(row.rating)}>
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {row.rating}★
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              <div className="font-medium">{row.men.ranking}</div>
                              <div className="text-muted-foreground text-xs">Avg: {row.men.avgScore}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              <div className="font-medium">{row.women.ranking}</div>
                              <div className="text-muted-foreground text-xs">Avg: {row.women.avgScore}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              {row.schools.map((school, idx) => <div key={idx} className="text-muted-foreground text-xs">{school}</div>)}
                            </div>
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>

                <Alert className="mt-4 md:mt-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    <strong>Be mindful and ready to explore:</strong> Some of our 4★ recruits may be interested in a program usually recruiting 3★ players as they may want to be a leader among the team, need higher scholarship amounts, or your program is trending and ambitious! Some other players may be a bit underrated as they're newer to the game or could be interested in being walk-ons.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Understanding Our Players’ level */}
          <TabsContent value="placement" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Understanding Our Players’ level & Committed Athletes</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Access detailed information about Dual Rise athletes currently in the US and those who have committed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  Here are 2 documents where you can consult the players we have placed in the US and the ones who are committed and will be leaving soon:
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        Current Dual Rise Players
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Athletes currently competing in the US</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full text-xs sm:text-sm" disabled>
                        Coming soon
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        Committed Athletes
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Athletes who will be joining programs soon</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full text-xs sm:text-sm" disabled>
                        Coming soon
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        France to US Player Analysis
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">How French players are doing in the US and their national ranking at different stages</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Button variant="outline" className="w-full text-xs sm:text-sm" disabled>
                        Coming soon
                      </Button>
                      <Button variant="outline" className="w-full text-xs sm:text-sm" disabled>
                        Coming soon
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        French National Rankings
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Official French Tennis Federation (FFT) rankings</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Button variant="outline" className="w-full text-xs sm:text-sm" asChild>
                        <a href="https://pages.ffgolf.org/merite/amateurs/messieurs" target="_blank" rel="noopener noreferrer">
                          Men's Ranking
                          <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" className="w-full text-xs sm:text-sm" asChild>
                        <a href="https://pages.ffgolf.org/merite/amateurs/dames" target="_blank" rel="noopener noreferrer">
                          Women's Ranking
                          <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="mt-4 md:mt-6 bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs sm:text-sm text-foreground">
                    These resources help you see real-world examples of how our star ratings translate to actual college placements. Use them to better understand which level of recruit fits your program's needs.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}