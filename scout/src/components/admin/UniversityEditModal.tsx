import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface University {
  id: string;
  name: string;
  division: string | null;
  state: string | null;
  verified: boolean;
}

interface UniversityEditModalProps {
  university: University;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name?: string;
    division?: string;
    state?: string;
    verified?: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}

const DIVISIONS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA 1", "NJCAA 2"];

export default function UniversityEditModal({
  university,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: UniversityEditModalProps) {
  const [name, setName] = useState(university.name);
  const [division, setDivision] = useState(university.division || "");
  const [state, setState] = useState(university.state || "");
  const [verified, setVerified] = useState(university.verified);

  useEffect(() => {
    setName(university.name);
    setDivision(university.division || "");
    setState(university.state || "");
    setVerified(university.verified);
  }, [university]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name !== university.name ? name : undefined,
      division: division !== (university.division || "") ? division || undefined : undefined,
      state: state !== (university.state || "") ? state || undefined : undefined,
      verified: verified !== university.verified ? verified : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit University</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Select value={division || "not_specified"} onValueChange={(val) => setDivision(val === "not_specified" ? "" : val)}>
              <SelectTrigger id="division">
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_specified">Not specified</SelectItem>
                {DIVISIONS.map((div) => (
                  <SelectItem key={div} value={div}>
                    {div}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g., California"
            />
          </div>

          {!university.verified && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={verified}
                onCheckedChange={(checked) => setVerified(checked === true)}
              />
              <Label htmlFor="verified" className="cursor-pointer">
                Mark as verified
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
