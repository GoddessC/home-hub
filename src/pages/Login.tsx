import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Login = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to HomeHub</h1>
            <p className="text-muted-foreground">Sign in to your household account.</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          view="sign_in"
          showLinks={false}
        />
        <div className="text-center text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create a household
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;