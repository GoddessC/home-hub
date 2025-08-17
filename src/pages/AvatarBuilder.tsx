import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AvatarCanvas } from '@/components/avatar/AvatarCanvas';
import { InventoryPanel } from '@/components/avatar/InventoryPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';

type AvatarItem = { id: string; asset_url: string };
type AvatarConfig = Record<string, AvatarItem | null>;

// Static URLs for the default base avatar parts
const BASE_BODY_URL = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/body.png';
const BASE_HEAD_URL = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/head.png';

const defaultAvatarConfig: AvatarConfig = {
    base_body: { id: 'default_body', asset_url: BASE_BODY_URL },
    base_head: { id: 'default_head', asset_url: BASE_HEAD_URL },
};

export const AvatarBuilderPage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { household } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [equippedItems, setEquippedItems] = useState<AvatarConfig>(defaultAvatarConfig);
  const [isPoofing, setIsPoofing] = useState(false);

  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase.from('members').select('*').eq('id', memberId).single();
      if (error || !data || data.household_id !== household?.id) {
        showError("You don't have permission to edit this member.");
        navigate('/');
        return null;
      }
      return data;
    },
    enabled: !!memberId && !!household,
  });

  const { data: savedConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['avatar_config', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase.from('member_avatar_config').select('config').eq('member_id', memberId).single();
      if (error && error.code !== 'PGRST116') throw error;
      // If a config exists, merge it with the default, otherwise use the default.
      return data?.config ? { ...defaultAvatarConfig, ...data.config } : defaultAvatarConfig;
    },
    enabled: !!memberId,
  });

  useEffect(() => {
    if (savedConfig) {
      setEquippedItems(savedConfig);
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: AvatarConfig) => {
      if (!memberId) throw new Error("No member selected");
      const { error } = await supabase.from('member_avatar_config').upsert({
        member_id: memberId,
        config: newConfig,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Avatar saved!");
      queryClient.invalidateQueries({ queryKey: ['avatar_config', memberId] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && over.id === 'avatar-drop-zone') {
      const category = active.data.current?.category;
      const asset_url = active.data.current?.asset_url;
      if (category) {
        setEquippedItems(prev => ({
          ...prev,
          [category]: { id: active.id as string, asset_url },
        }));
        setIsPoofing(true);
        setTimeout(() => setIsPoofing(false), 300);
      }
    }
  };

  if (isLoadingConfig || isLoadingMember) {
    return <div className="container mx-auto p-8"><Skeleton className="w-full h-screen" /></div>;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="p-4 bg-white shadow-sm">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Avatar Builder for {member?.full_name}</h1>
            <div className="flex items-center gap-4">
                <Button asChild>
                    <Link to={`/store/${memberId}`}>
                        <Store className="mr-2 h-4 w-4" />
                        Rewards Store
                    </Link>
                </Button>
                <Button onClick={() => saveMutation.mutate(equippedItems)} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Avatar'}
                </Button>
                <Button asChild variant="outline">
                    <Link to="/">Back to Dashboard</Link>
                </Button>
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <InventoryPanel memberId={memberId} />
            <div className="flex-grow flex items-center justify-center">
              <AvatarCanvas
                config={equippedItems}
                isPoofing={isPoofing}
              />
            </div>
          </div>
        </main>
      </div>
    </DndContext>
  );
};