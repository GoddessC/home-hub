import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';
import { Edit } from 'lucide-react';

interface AvatarUploadProps {
  onUpload: (filePath: string) => void;
}

export const AvatarUpload = ({ onUpload }: AvatarUploadProps) => {
  const { user, profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const toastId = showLoading('Uploading avatar...');
    setIsUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (!data.publicUrl) {
        throw new Error("Could not get public URL for avatar.");
      }

      onUpload(data.publicUrl);
      showSuccess('Avatar uploaded successfully!');
    } catch (error: any) {
      showError(`Upload failed: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
          <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || ''} />
          <AvatarFallback className="text-4xl">{getInitials(profile?.full_name)}</AvatarFallback>
        </Avatar>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="absolute bottom-0 right-0 rounded-full"
          disabled={isUploading}
        >
          <label htmlFor="avatar-upload">
            <Edit className="h-4 w-4" />
            <input
              id="avatar-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/png, image/jpeg"
              disabled={isUploading}
            />
          </label>
        </Button>
      </div>
    </div>
  );
};