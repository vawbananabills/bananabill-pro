import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function SubscriptionExpiredDialog() {
  const { isExpired, subscriptionLoading } = useSubscription();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasShownInitial = useRef(false);

  useEffect(() => {
    if (subscriptionLoading) return;

    if (isExpired && !hasShownInitial.current) {
      // Show on first load (login)
      const timeout = setTimeout(() => {
        setOpen(true);
        hasShownInitial.current = true;
      }, 1500);
      return () => clearTimeout(timeout);
    }

    if (!isExpired) {
      hasShownInitial.current = false;
    }
  }, [isExpired, subscriptionLoading]);

  useEffect(() => {
    if (subscriptionLoading) return;

    if (isExpired) {
      intervalRef.current = setInterval(() => {
        setOpen(true);
      }, REMINDER_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isExpired, subscriptionLoading]);

  if (!isExpired) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">Subscription Expired</DialogTitle>
          <DialogDescription className="text-center">
            Your subscription has expired. Please renew to continue using all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Renew now to get</p>
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">Full Pro Access</span>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => {
              setOpen(false);
              navigate('/subscription');
            }}
          >
            <Crown className="w-4 h-4" />
            View Renewal Options
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" asChild>
              <a href="tel:+919876543210">
                <Phone className="w-4 h-4" />
                Call
              </a>
            </Button>
            <Button variant="outline" className="flex-1 gap-2" asChild>
              <a href="mailto:admin@example.com">
                <Mail className="w-4 h-4" />
                Email
              </a>
            </Button>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Remind me later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
