import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, ArrowLeft, Share, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-glow">
              <span className="text-lg font-bold text-primary-foreground">B</span>
            </div>
            <span className="font-semibold text-xl">BananaBills</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mx-auto mb-6 shadow-glow">
              <span className="text-3xl font-bold text-primary-foreground">B</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Install BananaBills</h1>
            <p className="text-lg text-muted-foreground">
              Install our app on your device for quick access and offline functionality
            </p>
          </div>

          {isInstalled ? (
            <Card className="border-green-500/50 bg-green-500/10">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-green-500">App Installed!</CardTitle>
                <CardDescription>
                  BananaBills is already installed on your device. You can access it from your home screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link to="/dashboard">
                  <Button>Open Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Install Button for Android/Desktop */}
              {deferredPrompt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Quick Install
                    </CardTitle>
                    <CardDescription>
                      Click the button below to install BananaBills instantly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleInstallClick} size="lg" className="w-full gap-2">
                      <Download className="w-5 h-5" />
                      Install BananaBills
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      Install on iPhone/iPad
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to add BananaBills to your home screen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">1</span>
                        <div>
                          <p className="font-medium">Tap the Share button</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            Look for the <Share className="w-4 h-4" /> icon at the bottom of Safari
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">2</span>
                        <div>
                          <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
                          <p className="text-sm text-muted-foreground">It has a + icon next to it</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">3</span>
                        <div>
                          <p className="font-medium">Tap "Add" to confirm</p>
                          <p className="text-sm text-muted-foreground">The app icon will appear on your home screen</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              )}

              {/* Android Instructions (fallback) */}
              {!isIOS && !deferredPrompt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      Install on Android
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to add BananaBills to your home screen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">1</span>
                        <div>
                          <p className="font-medium">Tap the menu button</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            Look for <MoreVertical className="w-4 h-4" /> in Chrome or your browser
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">2</span>
                        <div>
                          <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
                          <p className="text-sm text-muted-foreground">The option may vary by browser</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">3</span>
                        <div>
                          <p className="font-medium">Confirm the installation</p>
                          <p className="text-sm text-muted-foreground">The app icon will appear on your home screen</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              )}

              {/* Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle>Why Install?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Quick access from your home screen</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Works offline for viewing invoices</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Faster loading times</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Full-screen experience without browser UI</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Designed & Developed by <a href="https://vartsworld.netlify.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">VAW TECHNOLOGIES</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
