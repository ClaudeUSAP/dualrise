import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, Plus, AlertCircle, ExternalLink } from 'lucide-react';
import type { ParsedAthleteData } from '@/lib/csvParser';

export interface AthleteMatch {
  parsed: ParsedAthleteData;
  matchStatus: 'new' | 'duplicate' | 'possible';
  existingId?: string;
  matchReason?: string;
}

interface AthleteImportPreviewProps {
  matches: AthleteMatch[];
  duplicateStrategy: 'skip' | 'update' | 'updateAll';
  onStrategyChange: (strategy: 'skip' | 'update' | 'updateAll') => void;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const AthleteImportPreview = ({
  matches,
  duplicateStrategy,
  onStrategyChange,
  onConfirm,
  onCancel,
  isProcessing = false
}: AthleteImportPreviewProps) => {
  const newCount = matches.filter(m => m.matchStatus === 'new').length;
  const duplicateCount = matches.filter(m => m.matchStatus === 'duplicate').length;
  const possibleCount = matches.filter(m => m.matchStatus === 'possible').length;

  const getStatusBadge = (status: AthleteMatch['matchStatus']) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-success/10 text-success border-success/20"><Plus className="w-3 h-3 mr-1" />New</Badge>;
      case 'duplicate':
        return <Badge className="bg-muted text-muted-foreground border-muted"><CheckCircle className="w-3 h-3 mr-1" />Duplicate</Badge>;
      case 'possible':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="w-3 h-3 mr-1" />Possible Match</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New Athletes</CardDescription>
            <CardTitle className="text-3xl text-success">{newCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Duplicates</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">{duplicateCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Possible Matches</CardDescription>
            <CardTitle className="text-3xl text-warning">{possibleCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Duplicate Handling Strategy */}
      {(duplicateCount > 0 || possibleCount > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium">How should duplicates be handled?</p>
              <RadioGroup value={duplicateStrategy} onValueChange={(val) => onStrategyChange(val as 'skip' | 'update' | 'updateAll')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">Skip duplicates (recommended) - Only import new athletes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="cursor-pointer">Update duplicates - Overwrite existing data with CSV data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="updateAll" id="updateAll" />
                  <Label htmlFor="updateAll" className="cursor-pointer">Update all matches - Include name-only matches ({possibleCount} possible matches)</Label>
                </div>
              </RadioGroup>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>Review athletes before importing</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Birth Date</TableHead>
                  <TableHead>Grad Year</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Rankings</TableHead>
                  <TableHead>Athlete Status</TableHead>
                  <TableHead>Match Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match, index) => (
                  <TableRow key={index}>
                    <TableCell>{getStatusBadge(match.matchStatus)}</TableCell>
                    <TableCell className="font-medium">{match.parsed.firstName} {match.parsed.lastName}</TableCell>
                    <TableCell>{match.parsed.sex || '-'}</TableCell>
                    <TableCell>{match.parsed.dateOfBirth || '-'}</TableCell>
                    <TableCell>{match.parsed.graduationYear || '-'}</TableCell>
                    <TableCell>{match.parsed.country || '-'}</TableCell>
                    <TableCell>
                      {match.parsed.instagramHandle ? (
                        <a 
                          href={match.parsed.instagramHandle} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        {match.parsed.frenchAdultRanking && (
                          <div className="text-muted-foreground">
                            Adult: <span className="font-mono">{match.parsed.frenchAdultRanking}</span>
                          </div>
                        )}
                        {match.parsed.frenchRankingInTheirClass && (
                          <div className="text-muted-foreground">
                            Class: <span className="font-mono">{match.parsed.frenchRankingInTheirClass}</span>
                          </div>
                        )}
                        {!match.parsed.frenchAdultRanking && !match.parsed.frenchRankingInTheirClass && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        match.parsed.status === 'committed' ? 'default' :
                        match.parsed.status === 'transfer' ? 'secondary' :
                        'outline'
                      }>
                        {match.parsed.status || 'available'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{match.matchReason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isProcessing}>
          {isProcessing ? 'Importing...' : 
            duplicateStrategy === 'updateAll' 
              ? `Import & Update All (${newCount + duplicateCount + possibleCount} Athletes)`
              : duplicateStrategy === 'update'
              ? `Import & Update (${newCount + duplicateCount} Athletes)`
              : `Import New Only (${newCount} Athletes)`
          }
        </Button>
      </div>
    </div>
  );
};
