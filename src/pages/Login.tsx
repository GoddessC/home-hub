import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

const Login = () => {
  const { session, signInAsKiosk, isAnonymous } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes to catch errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Clear any previous errors when successfully signed in
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for URL parameters that might contain error messages (only after sign in attempt)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up the URL to remove the error parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  if (session && !isAnonymous) {
    return <Navigate to="/" replace />;
  }
  
  if (session && isAnonymous) {
    return <Navigate to="/kiosk/pair" replace />;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to HomeHub</h1>
            <p className="text-muted-foreground">Sign in to your household account.</p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          theme="light"
          view="sign_in"
          showLinks={false}
        />
        <div className="text-center text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
        <Separator />
        <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Or, set up a shared display:</p>
            <Button variant="outline" className="w-full" onClick={signInAsKiosk}>
                Enter Kiosk Mode
            </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;