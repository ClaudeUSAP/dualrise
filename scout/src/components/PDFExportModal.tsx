// PDF Export Modal - Simplified to Template and Format tabs only
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  User,
  Trophy,
  BarChart3,
  Users,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ProfessionalPDFGenerator, ScoringByYear } from '@/lib/pdfGenerator';
import { TournamentPDFGenerator } from '@/lib/tournamentPdfGenerator';
import { getAthleteById } from '@/lib/api/athletes';
import { supabase } from '@/integrations/supabase/client';
import { Athlete } from '@/types/athlete';
import { TournamentResult } from '@/types/tournament';

// Per-year scoring averages, fetched LIVE from the DB via the RPC (never computed
// client-side). Returns [] on error so the PDF still generates.
const fetchScoringByYear = async (athleteId: string): Promise<ScoringByYear[]> => {
  const { data, error } = await supabase.rpc('athlete_scoring_by_year', { p_athlete_id: athleteId });
  if (error) {
    console.error('athlete_scoring_by_year RPC error:', error);
    return [];
  }
  return (data ?? []) as ScoringByYear[];
};

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete?: Athlete;
  athletes?: Athlete[];
  tournamentResults?: TournamentResult[];
  exportType?: 'single' | 'multiple' | 'tournament' | 'pipeline';
}

const exportTemplates = [
  {
    id: 'full-profile',
    name: 'Full Profile',
    description: 'Complete athlete profile with all available information',
    icon: User,
    sections: ['personal', 'academic', 'golf', 'tournaments', 'media', 'performance']
  },
  {
    id: 'tournament-summary',
    name: 'Tournament Summary',
    description: 'Focused report on tournament history and results',
    icon: Trophy,
    sections: ['personal', 'tournaments', 'performance']
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics Only',
    description: 'Key golf performance statistics and metrics',
    icon: BarChart3,
    sections: ['personal', 'golf', 'performance']
  },
  {
    id: 'athlete-comparison',
    name: 'Athlete Comparison',
    description: 'Side-by-side comparison of multiple athletes',
    icon: Users,
    sections: ['personal', 'academic', 'golf', 'tournaments']
  }
];

export default function PDFExportModal({ 
  isOpen, 
  onClose, 
  athlete, 
  athletes = [], 
  tournamentResults = [],
  exportType = 'single' 
}: PDFExportModalProps) {
  const [activeTab, setActiveTab] = useState('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('recruiting-packet');
  
  // Export configuration state
  const [exportConfig, setExportConfig] = useState({
    // Content sections
    includePersonal: true,
    includeAcademic: true,
    includeGolf: true,
    includeTournaments: true,
    includeMedia: true,
    
    // Format options
    quality: 'high',
    orientation: 'portrait'
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      if (athletes && athletes.length > 0) {
        for (const a of athletes) {
          if (selectedTemplate === 'tournament-summary') {
            const tGen = new TournamentPDFGenerator();
            await tGen.generateTournamentPDF(a, tournamentResults ?? []);
          } else {
            // Regenerate LIVE from the current DB (fresh athlete + per-year scoring).
            const fresh = (await getAthleteById(a.id)) ?? a;
            const scoringByYear = await fetchScoringByYear(a.id);
            const pdfGenerator = new ProfessionalPDFGenerator(
              exportConfig.orientation as 'portrait' | 'landscape'
            );
            await pdfGenerator.generateAthletePDF(
              fresh,
              tournamentResults ?? [],
              exportConfig,
              scoringByYear
            );
          }
        }
        toast({
          title: 'PDFs Generated Successfully',
          description: `Downloaded ${athletes.length} athlete profile${athletes.length > 1 ? 's' : ''}.`,
        });
      } else if (athlete) {
        if (selectedTemplate === 'tournament-summary') {
          const tGen = new TournamentPDFGenerator();
          await tGen.generateTournamentPDF(athlete, tournamentResults ?? []);
        } else {
          // Regenerate LIVE from the current DB on every click — never reuse the
          // possibly-stale athlete prop or a cached PDF. Ranking, averages, WAGR,
          // photo, per-year scoring, etc. all reflect the state at click time.
          const fresh = (await getAthleteById(athlete.id)) ?? athlete;
          const scoringByYear = await fetchScoringByYear(athlete.id);
          const pdfGenerator = new ProfessionalPDFGenerator(
            exportConfig.orientation as 'portrait' | 'landscape'
          );
          await pdfGenerator.generateAthletePDF(
            fresh,
            tournamentResults ?? [],
            exportConfig,
            scoringByYear
          );
        }
        toast({
          title: 'PDF Generated Successfully',
          description: 'Your professional PDF report has been downloaded.',
        });
      } else {
        throw new Error('No athlete data provided');
      }

      setIsGenerating(false);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = exportTemplates.find(t => t.id === templateId);
    if (template) {
      // Update sections based on template
      setExportConfig(prev => ({
        ...prev,
        includePersonal: template.sections.includes('personal'),
        includeAcademic: template.sections.includes('academic'),
        includeGolf: template.sections.includes('golf'),
        includeTournaments: template.sections.includes('tournaments'),
        includeMedia: template.sections.includes('media')
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Export PDF Report</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Configure and generate professional PDF reports for recruitment
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="format">Format</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-4">
            {/* Template Selection Tab */}
            <TabsContent value="template" className="space-y-4 pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Choose Export Template</CardTitle>
                  <CardDescription>Select a pre-configured template or customize your own</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exportTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate === template.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.sections.map((section) => (
                                <Badge key={section} variant="secondary" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {selectedTemplate === template.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>


            {/* Format Options Tab */}
            <TabsContent value="format" className="space-y-4 pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Document Format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Page Orientation</Label>
                    <RadioGroup value={exportConfig.orientation} onValueChange={(value) => 
                      setExportConfig({ ...exportConfig, orientation: value })
                    }>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="portrait" id="portrait" />
                        <Label htmlFor="portrait">Portrait</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="landscape" id="landscape" />
                        <Label htmlFor="landscape">Landscape</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Quality</Label>
                    <Select value={exportConfig.quality} onValueChange={(value) => 
                      setExportConfig({ ...exportConfig, quality: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Smaller file size)</SelectItem>
                        <SelectItem value="high">High Quality (Print-ready)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate PDF'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}