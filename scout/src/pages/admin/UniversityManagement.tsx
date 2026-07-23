import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  MoreHorizontal,
  Pencil,
  CheckCircle,
  Merge,
  Trash2,
  Building2,
  ChevronDown,
} from "lucide-react";
import UniversityEditModal from "@/components/admin/UniversityEditModal";
import UniversityMergeDialog from "@/components/admin/UniversityMergeDialog";

interface University {
  id: string;
  name: string;
  division: string | null;
  state: string | null;
  verified: boolean;
  created_at: string;
  coach_count: number;
}

type FilterType = "all" | "verified" | "pending";

const DIVISIONS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA 1", "NJCAA 2"];

export default function UniversityManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [mergingUniversity, setMergingUniversity] = useState<University | null>(null);
  const [deletingUniversity, setDeletingUniversity] = useState<University | null>(null);

  // Fetch universities
  const { data: universities = [], isLoading, error } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_universities");
      if (error) throw error;
      return data as University[];
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (params: {
      university_id: string;
      name?: string;
      division?: string;
      state?: string;
      verified?: boolean;
    }) => {
      const { error } = await supabase.rpc("admin_update_university", {
        p_university_id: params.university_id,
        p_name: params.name ?? null,
        p_division: params.division ?? null,
        p_state: params.state ?? null,
        p_verified: params.verified ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-universities"] });
      toast.success("University updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (universityId: string) => {
      const { error } = await supabase.rpc("admin_delete_university", {
        p_university_id: universityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-universities"] });
      toast.success("University deleted successfully");
      setDeletingUniversity(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
      setDeletingUniversity(null);
    },
  });

  // Merge mutation
  const mergeMutation = useMutation({
    mutationFn: async (params: { keepId: string; mergeId: string }) => {
      const { error } = await supabase.rpc("admin_merge_universities", {
        p_keep_id: params.keepId,
        p_merge_id: params.mergeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-universities"] });
      toast.success("Universities merged successfully");
      setMergingUniversity(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to merge: ${error.message}`);
    },
  });

  // Filtered universities
  const filteredUniversities = useMemo(() => {
    return universities.filter((u) => {
      // Search filter
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filter === "verified" && !u.verified) return false;
      if (filter === "pending" && u.verified) return false;
      return true;
    });
  }, [universities, search, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = universities.length;
    const verified = universities.filter((u) => u.verified).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [universities]);

  // Select all visible
  const allVisibleSelected =
    filteredUniversities.length > 0 &&
    filteredUniversities.every((u) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUniversities.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkVerify = async () => {
    const toVerify = filteredUniversities.filter(
      (u) => selectedIds.has(u.id) && !u.verified
    );
    if (toVerify.length === 0) {
      toast.info("No unverified universities selected");
      return;
    }
    
    for (const u of toVerify) {
      await updateMutation.mutateAsync({
        university_id: u.id,
        verified: true,
      });
    }
    setSelectedIds(new Set());
    toast.success(`Verified ${toVerify.length} universities`);
  };

  const handleBulkSetDivision = async (division: string) => {
    if (selectedIds.size === 0) {
      toast.info("No universities selected");
      return;
    }
    
    for (const id of selectedIds) {
      await updateMutation.mutateAsync({
        university_id: id,
        division,
      });
    }
    setSelectedIds(new Set());
    toast.success(`Set division for ${selectedIds.size} universities`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Failed to load universities: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            University Management
          </h1>
          <p className="text-muted-foreground">
            {stats.total} universities • {stats.verified} verified •{" "}
            {stats.pending > 0 && (
              <span className="text-amber-600 font-medium">
                {stats.pending} pending verification
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search universities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Universities</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending Verification</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkVerify}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Selected
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Set Division
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {DIVISIONS.map((div) => (
                  <DropdownMenuItem
                    key={div}
                    onClick={() => handleBulkSetDivision(div)}
                  >
                    {div}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Coaches</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUniversities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No universities found
                </TableCell>
              </TableRow>
            ) : (
              filteredUniversities.map((university) => (
                <TableRow key={university.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(university.id)}
                      onCheckedChange={() => toggleSelect(university.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{university.name}</TableCell>
                  <TableCell>
                    {university.division ? (
                      <Badge variant="secondary">{university.division}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {university.state || (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {university.verified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {university.coach_count > 0 ? (
                      <Badge variant="outline">{university.coach_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingUniversity(university)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!university.verified && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateMutation.mutate({
                                university_id: university.id,
                                verified: true,
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setMergingUniversity(university)}>
                          <Merge className="h-4 w-4 mr-2" />
                          Merge Into...
                        </DropdownMenuItem>
                        {university.coach_count === 0 && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingUniversity(university)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      {editingUniversity && (
        <UniversityEditModal
          university={editingUniversity}
          open={!!editingUniversity}
          onOpenChange={(open) => !open && setEditingUniversity(null)}
          onSave={async (data) => {
            await updateMutation.mutateAsync({
              university_id: editingUniversity.id,
              ...data,
            });
            setEditingUniversity(null);
          }}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Merge Dialog */}
      {mergingUniversity && (
        <UniversityMergeDialog
          sourceUniversity={mergingUniversity}
          universities={universities.filter((u) => u.id !== mergingUniversity.id)}
          open={!!mergingUniversity}
          onOpenChange={(open) => !open && setMergingUniversity(null)}
          onMerge={async (targetId) => {
            await mergeMutation.mutateAsync({
              keepId: targetId,
              mergeId: mergingUniversity.id,
            });
          }}
          isLoading={mergeMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingUniversity}
        onOpenChange={(open) => !open && setDeletingUniversity(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete University</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingUniversity?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deletingUniversity && deleteMutation.mutate(deletingUniversity.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
