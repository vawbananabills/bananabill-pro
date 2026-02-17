import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Loader2, Fingerprint } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBiometrics } from '@/hooks/useBiometrics';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();
  const isSignup = searchParams.get('signup') === 'true';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    name: '',
  });

  const { loginWithBiometric, isSupported } = useBiometrics();
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricEmail, setBiometricEmail] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('bb_biometric_email');
    const id = localStorage.getItem('bb_biometric_id');
    if (email && id && isSupported) {
      setHasBiometric(true);
      setBiometricEmail(email);
    }
  }, [isSupported]);

  const handleBiometricLogin = async () => {
    setLoading(true);
    const result = await loginWithBiometric();
    if (result && typeof result === 'object' && result.email) {
      // In a real app, loginWithBiometric would retrieve a session
      // For now, we pre-fill and focus password or show a prompt
      setFormData(prev => ({ ...prev, email: result.email }));
      toast.info('Biometric verified. Please enter your password to confirm (first time session).');
      // Note: Real WebAuthn would use a challenge-response to avoid password
    }
    setLoading(false);
  };

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignup) {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.companyName
        );

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Account created successfully!');
        navigate('/dashboard');
      } else {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-glow">
                  <span className="text-xl font-bold text-primary-foreground">B</span>
                </div>
                <span className="font-semibold text-xl">BananaBills</span>
              </div>
              <CardTitle className="text-2xl">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </CardTitle>
              <CardDescription>
                {isSignup
                  ? 'Start your 14-day free trial. No credit card required.'
                  : 'Enter your credentials to access your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        placeholder="Your Trading Company"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className={errors.companyName ? 'border-destructive' : ''}
                      />
                      {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignup && (
                      <button type="button" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Please wait...
                    </>
                  ) : isSignup ? 'Create Account' : 'Sign In'}
                </Button>

                {!isSignup && hasBiometric && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-primary/20 hover:bg-primary/5"
                    onClick={handleBiometricLogin}
                    disabled={loading}
                  >
                    <Fingerprint className="w-4 h-4 text-primary" />
                    Login with Fingerprint
                  </Button>
                )}
              </form>

              <div className="mt-6">
                <Separator className="my-4" />
                <p className="text-center text-sm text-muted-foreground">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <Link
                    to={isSignup ? '/auth' : '/auth?signup=true'}
                    className="text-primary hover:underline font-medium"
                  >
                    {isSignup ? 'Sign in' : 'Sign up'}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-[image:var(--gradient-dark)] items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">🍌</span>
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Simplify Your Banana Trading Business
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            Weight-based billing, automatic purchase tracking, and complete accounting - all in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-primary-foreground/80">
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm">Traders</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">₹50Cr+</div>
              <div className="text-sm">Processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
