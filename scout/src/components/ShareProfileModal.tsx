import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareProfileModalProps {
  athleteName: string;
  athleteId: string;
  isAdminContext?: boolean;
  trigger?: React.ReactNode;
}

const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ 
  athleteName, 
  athleteId,
  isAdminContext = false,
  trigger 
}) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Always share a public, production URL — never a localhost/dev origin
  const getProductionOrigin = () => {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://dualrise.vercel.app';
    }
    // Already on production or a custom domain — use the current origin
    return origin;
  };

  const shareUrl = `${getProductionOrigin()}/athletes/${athleteId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: isAdminContext 
          ? "Profile link copied to clipboard." 
          : "Share this link with other coaches.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Athlete Profile</DialogTitle>
          <DialogDescription>
            {isAdminContext 
              ? `Share ${athleteName}'s profile. Recipients will receive a secure access link via email if they're not already registered.`
              : `Share ${athleteName}'s profile with other coaches. Recipients will receive a secure access link via email if they're not already registered.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 mt-4">
          <Input
            value={shareUrl}
            readOnly
            className="flex-1"
            onClick={(e) => e.currentTarget.select()}
          />
          <Button onClick={handleCopy} size="icon" variant="outline">
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        {copied && (
          <p className="text-sm text-green-600 mt-2">
            Link copied to clipboard!
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Anyone with this link can request access to view the profile.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProfileModal;
