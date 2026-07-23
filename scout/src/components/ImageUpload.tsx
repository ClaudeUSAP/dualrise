import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  athleteId?: string;
  type: 'profile' | 'cover';
  label: string;
  description?: string;
}

export const ImageUpload = ({
  value,
  onChange,
  athleteId,
  type,
  label,
  description
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WEBP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const folder = athleteId || 'temp';
      const fileName = `${folder}/${type}-${timestamp}.jpg`;

      // Upload cropped image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('athlete-images')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('athlete-images')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      
      setPreviewUrl(publicUrl);
      onChange(publicUrl);

      toast({
        title: 'Upload successful',
        description: 'Image has been uploaded.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange('');
    toast({
      title: 'Image removed',
      description: 'The image URL has been cleared.',
    });
  };

  return (
    <>
      <ImageCropModal
        open={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedImageSrc(null);
        }}
        imageSrc={selectedImageSrc || ''}
        onCropComplete={handleCropComplete}
        type={type}
      />

      <div className="space-y-2">
        <Label>{label}</Label>
      
      {previewUrl && (
        <div className="relative w-full h-40 border rounded-lg overflow-hidden bg-muted">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="relative"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </Button>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
        <p className="text-xs text-muted-foreground">
          Supports JPEG, PNG, WEBP. Max 5MB.
        </p>
      </div>
    </>
  );
};
