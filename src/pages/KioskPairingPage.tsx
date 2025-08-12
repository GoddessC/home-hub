import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const KioskPairingPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startPairing = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pair-start');
        if (error) throw error;
        setCode(data.code);
        setExpiresAt(data.expires_at);
      } catch (err: any) {
        setError('Could not generate a pairing code. Please refresh the page.');
        showError(err.message);
      }
    };
    startPairing();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('pairing-requests')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pairing_requests',
          filter: `kiosk_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status === 'APPROVED') {
            // Invalidate queries to trigger AuthContext refetch
            queryClient.invalidateQueries();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Pair Your Kiosk</CardTitle>
          <CardDescription className="text-gray-400">
            On another device, log in to your HomeHub account, go to Admin settings, and enter this code.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error && <p className="text-red-400">{error}</p>}
          {code ? (
            <div className="p-6 bg-gray-900 rounded-lg">
              <p className="text-6xl font-mono font-bold tracking-widest">{code}</p>
            </div>
          ) : (
            <Skeleton className="h-24 w-full bg-gray-700" />
          )}
          {expiresAt && <p className="mt-4 text-sm text-gray-500">Code expires in {Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000)} minutes.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default KioskPairingPage;