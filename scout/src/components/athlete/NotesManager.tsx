import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  Trophy,
  BookOpen,
  Phone,
  Star,
  Tag,
  Paperclip,
  Edit3,
  Trash2,
  Save,
  Download,
  ChevronDown,
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Target,
  Brain,
  Award,
  Flag,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  athleteId: string;
  content: string;
  categories: NoteCategory[];
  tags: string[];
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  tournamentId?: string;
  isPrivate: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

type NoteCategory = 
  | 'initial_impression'
  | 'tournament_performance'
  | 'academic_review'
  | 'contact_history'
  | 'mental_assessment'
  | 'technical_notes'
  | 'recruitment_strategy'
  | 'general';

interface AthleteStatus {
  id: string;
  athleteId: string;
  status: RecruitmentStatus;
  customLabel?: string;
  color: string;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

type RecruitmentStatus = 
  | 'initial_interest'
  | 'evaluating'
  | 'strong_interest'
  | 'contact_requested'
  | 'in_communication'
  | 'offered'
  | 'committed'
  | 'not_pursuing'
  | 'custom';

interface NotesManagerProps {
  athleteId: string;
  athleteName: string;
}

const NotesManager: React.FC<NotesManagerProps> = ({ athleteId, athleteName }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusHistory, setStatusHistory] = useState<AthleteStatus[]>([]);
  const [currentStatus, setCurrentStatus] = useState<AthleteStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategories, setSelectedFilterCategories] = useState<NoteCategory[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Form states
  const [newNote, setNewNote] = useState({
    content: '',
    categories: [] as NoteCategory[],
    tags: '',
    isPrivate: true,
  });

  const [newStatus, setNewStatus] = useState({
    status: 'initial_interest' as RecruitmentStatus,
    customLabel: '',
    notes: '',
  });

  const categoryConfig = {
    initial_impression: { label: 'Initial Impression', icon: User, color: 'text-blue-500' },
    tournament_performance: { label: 'Tournament Performance', icon: Trophy, color: 'text-yellow-500' },
    academic_review: { label: 'Academic Review', icon: BookOpen, color: 'text-green-500' },
    contact_history: { label: 'Contact History', icon: Phone, color: 'text-purple-500' },
    mental_assessment: { label: 'Mental Assessment', icon: Brain, color: 'text-pink-500' },
    technical_notes: { label: 'Technical Notes', icon: Target, color: 'text-orange-500' },
    recruitment_strategy: { label: 'Recruitment Strategy', icon: Flag, color: 'text-indigo-500' },
    general: { label: 'General', icon: FileText, color: 'text-gray-500' },
  };

  const statusConfig = {
    initial_interest: { label: 'Initial Interest', color: 'bg-gray-500' },
    evaluating: { label: 'Evaluating', color: 'bg-blue-500' },
    strong_interest: { label: 'Strong Interest', color: 'bg-purple-500' },
    contact_requested: { label: 'Contact Requested', color: 'bg-yellow-500' },
    in_communication: { label: 'In Communication', color: 'bg-orange-500' },
    offered: { label: 'Offered', color: 'bg-green-500' },
    committed: { label: 'Committed', color: 'bg-emerald-600' },
    not_pursuing: { label: 'Not Pursuing', color: 'bg-red-500' },
    custom: { label: 'Custom', color: 'bg-indigo-500' },
  };

  const handleAddNote = () => {
    if (newNote.categories.length === 0) return;

    const note: Note = {
      id: `note-${Date.now()}`,
      athleteId,
      content: newNote.content,
      categories: newNote.categories,
      tags: newNote.tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: new Date(),
      updatedAt: new Date(),
      isPrivate: newNote.isPrivate,
    };

    setNotes([note, ...notes]);
    setNewNote({
      content: '',
      categories: [],
      tags: '',
      isPrivate: true,
    });
    setIsAddingNote(false);

    toast({
      title: 'Note Added',
      description: 'Your note has been saved successfully.',
    });
  };

  const handleUpdateNote = () => {
    if (!editingNote) return;

    setNotes(notes.map(n => 
      n.id === editingNote.id 
        ? { ...editingNote, updatedAt: new Date() }
        : n
    ));
    setEditingNote(null);

    toast({
      title: 'Note Updated',
      description: 'Your note has been updated successfully.',
    });
  };

  const handleDeleteNote = () => {
    if (!deleteNoteId) return;

    setNotes(notes.filter(n => n.id !== deleteNoteId));
    setDeleteNoteId(null);

    toast({
      title: 'Note Deleted',
      description: 'The note has been removed.',
    });
  };

  const handleStatusChange = () => {
    const status: AthleteStatus = {
      id: `status-${Date.now()}`,
      athleteId,
      status: newStatus.status,
      customLabel: newStatus.status === 'custom' ? newStatus.customLabel : undefined,
      color: statusConfig[newStatus.status].color,
      changedAt: new Date(),
      changedBy: 'Current Coach',
      notes: newStatus.notes,
    };

    setCurrentStatus(status);
    setStatusHistory([status, ...statusHistory]);

    toast({
      title: 'Status Updated',
      description: `Status changed to ${statusConfig[newStatus.status].label}`,
    });
  };

  const toggleFilterCategory = (cat: NoteCategory) => {
    setSelectedFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleNewNoteCategory = (cat: NoteCategory) => {
    setNewNote(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedFilterCategories.length === 0 || 
                           note.categories.some(cat => selectedFilterCategories.includes(cat));
    return matchesSearch && matchesCategory;
  });

  // Tournament performance template
  const tournamentTemplate = `Tournament: [Name]
Date: [Date]
Position: [Final Position]

Performance Observations:
- Driving: 
- Iron Play: 
- Short Game: 
- Putting: 

Mental Game:
- Composure: 
- Decision Making: 
- Competitive Spirit: 

Areas of Improvement:
- 
- 

Notable Moments:
- `;

  const CategoryCheckboxList = ({ 
    selected, 
    onToggle 
  }: { 
    selected: NoteCategory[]; 
    onToggle: (cat: NoteCategory) => void;
  }) => (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(categoryConfig).map(([key, config]) => {
        const Icon = config.icon;
        const cat = key as NoteCategory;
        return (
          <label key={key} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-muted">
            <Checkbox
              checked={selected.includes(cat)}
              onCheckedChange={() => onToggle(cat)}
            />
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-sm">{config.label}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Status Tracking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Recruitment Status
          </CardTitle>
          <CardDescription>
            Track and manage the recruitment pipeline status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          {currentStatus && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${currentStatus.color}`} />
                <div>
                  <p className="font-semibold">
                    {currentStatus.customLabel || statusConfig[currentStatus.status].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Updated {format(currentStatus.changedAt, 'MMM d, yyyy')} by {currentStatus.changedBy}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{statusHistory.length} changes</Badge>
            </div>
          )}

          {/* Status Change Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select
                value={newStatus.status}
                onValueChange={(value) => setNewStatus({ ...newStatus, status: value as RecruitmentStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newStatus.status === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Label</Label>
                <Input
                  placeholder="Enter custom status"
                  value={newStatus.customLabel}
                  onChange={(e) => setNewStatus({ ...newStatus, customLabel: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status Notes (Optional)</Label>
            <Textarea
              placeholder="Add notes about this status change..."
              value={newStatus.notes}
              onChange={(e) => setNewStatus({ ...newStatus, notes: e.target.value })}
              rows={2}
            />
          </div>

          <Button onClick={handleStatusChange} className="w-full">
            Update Status
          </Button>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="space-y-2">
              <Label>Status History</Label>
              <ScrollArea className="h-32 rounded-md border p-3">
                <div className="space-y-2">
                  {statusHistory.map((status) => (
                    <div key={status.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span className="font-medium">
                        {status.customLabel || statusConfig[status.status].label}
                      </span>
                      <span className="text-muted-foreground">
                        • {format(status.changedAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Private Notes
              </CardTitle>
              <CardDescription>
                Add and manage your private notes about {athleteName}
              </CardDescription>
            </div>
            <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Note</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Create a private note about this athlete's performance and recruitment
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categories *</Label>
                    <CategoryCheckboxList
                      selected={newNote.categories}
                      onToggle={toggleNewNoteCategory}
                    />
                    {newNote.categories.length === 0 && (
                      <p className="text-xs text-destructive">Select at least one category</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Note Content</Label>
                      {newNote.categories.includes('tournament_performance') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewNote({ ...newNote, content: tournamentTemplate })}
                        >
                          Use Template
                        </Button>
                      )}
                    </div>
                    <Textarea
                      placeholder="Enter your note..."
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      placeholder="e.g., strong-driver, consistent, needs-work-putting"
                      value={newNote.tags}
                      onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.content.trim() || newNote.categories.length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const Icon = config.icon;
                const cat = key as NoteCategory;
                const isSelected = selectedFilterCategories.includes(cat);
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilterCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </button>
                );
              })}
              {selectedFilterCategories.length > 0 && (
                <button
                  onClick={() => setSelectedFilterCategories([])}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes List */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {notes.length === 0 ? 'No notes yet. Add your first note above.' : 'No notes match your filters.'}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  return (
                    <Card key={note.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {note.categories.map(cat => {
                              const info = categoryConfig[cat];
                              const CatIcon = info.icon;
                              return (
                                <Badge key={cat} variant="secondary" className="text-xs">
                                  <CatIcon className={`h-3 w-3 mr-1 ${info.color}`} />
                                  {info.label}
                                </Badge>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingNote(note)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteNoteId(note.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>

                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="mr-1 h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(note.createdAt, 'MMM d, yyyy • h:mm a')}
                          {note.updatedAt > note.createdAt && (
                            <span className="ml-2">(edited)</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Note</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categories *</Label>
                <CategoryCheckboxList
                  selected={editingNote.categories}
                  onToggle={(cat) => {
                    setEditingNote({
                      ...editingNote,
                      categories: editingNote.categories.includes(cat)
                        ? editingNote.categories.filter(c => c !== cat)
                        : [...editingNote.categories, cat]
                    });
                  }}
                />
                {editingNote.categories.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one category</p>
                )}
              </div>
              <Textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={8}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNote(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateNote}
                  disabled={editingNote.categories.length === 0}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Delete Note</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotesManager;
