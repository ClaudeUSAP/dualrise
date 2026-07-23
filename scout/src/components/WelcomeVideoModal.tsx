import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Play, BookOpen, X } from 'lucide-react';

interface WelcomeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

const WelcomeVideoModal: React.FC<WelcomeVideoModalProps> = ({
  isOpen,
  onClose,
  onDontShowAgain,
}) => {
  const navigate = useNavigate();
  const [dontShowChecked, setDontShowChecked] = useState(false);

  const handleClose = () => {
    if (dontShowChecked) {
      onDontShowAgain();
    } else {
      onClose();
    }
  };

  const handleGoToResources = () => {
    if (dontShowChecked) {
      onDontShowAgain();
    } else {
      onClose();
    }
    navigate('/resources?tab=getting-started');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl">
                👋 Welcome to Scout!
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Watch this quick intro to get started with the platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Video Embed */}
        <div className="px-4 sm:px-6">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
            <iframe
              src="https://www.loom.com/embed/c6a588dc0e5f4761b384aed1b6cd175f"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              title="Getting Started with Scout"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-4 space-y-4">
          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowChecked}
              onCheckedChange={(checked) => setDontShowChecked(checked === true)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-xs sm:text-sm text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </Label>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={handleGoToResources}
              className="flex-1 order-1 sm:order-1"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Go to Resources
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 order-2 sm:order-2"
            >
              {dontShowChecked ? "Close & Don't Show Again" : 'Remind Me Later'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeVideoModal;
