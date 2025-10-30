import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext'; // 'UserType' import removed
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Train, Mail, Lock } from 'lucide-react';
import React from 'react';

export const Login = () => {
  const [email, setEmail] = useState(''); // We use email as the username
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth(); // Get 'login' and 'user'
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call login with ONE object argument.
      // We pass the 'email' state as the 'username' field,
      // as our backend login DTO expects 'username'.
      await login({ username: email, password: password });

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to RideMumbai",
      });

      // Redirect based on the *role* from the auth context user object
      // We must re-fetch the user object from context *after* login completes.
      // Note: The 'user' object might be slightly delayed.
      // A better approach is handled in AuthContext by navigating *after* user is set.
      // For now, let's navigate based on the anticipated role from the API.
      // We will refine this if navigation fails.
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation *after* user state is updated
  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'ROLE_ADMIN' ? '/admin/dashboard' : '/commuter-dashboard');
    }
  }, [user, navigate]);


  const handleOAuthLogin = (provider: string) => {
    toast({
      title: "OAuth Login",
      description: `${provider} login will be implemented soon.`,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Train className="w-12 h-12 text-primary" />
            <h1 className="text-3xl font-bold text-primary">RideMumbai</h1>
          </div>
          <p className="text-muted-foreground">
            Welcome back to your smart metro companion
          </p>
        </div>

        <Card className="shadow-custom-lg bg-gradient-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to login
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Type Selection Tabs REMOVED */}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* OAuth Options */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuthLogin('Google')}
                disabled={isLoading}
              >
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthLogin('Facebook')}
                disabled={isLoading}
              >
                Facebook
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};