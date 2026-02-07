import { Link } from 'react-router-dom';
import { Crown, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { format, parseISO } from 'date-fns';

interface SubscriptionBoxProps {
  collapsed?: boolean;
}

export function SubscriptionBox({ collapsed = false }: SubscriptionBoxProps) {
  const { subscription, daysLeft, isActive, isTrial, isExpired } = useSubscription();

  if (collapsed) {
    return (
      <Link to="/subscription" className="block px-3 py-2">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isActive ? "bg-success/20" : isExpired ? "bg-destructive/20" : "bg-warning/20"
          )}
        >
          {isActive ? (
            <Crown className="w-5 h-5 text-success" />
          ) : isExpired ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : (
            <Clock className="w-5 h-5 text-warning" />
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to="/subscription" className="block px-3 py-2">
      <div
        className={cn(
          "p-3 rounded-lg border transition-colors hover:bg-sidebar-accent/50",
          isActive && !isTrial
            ? "bg-success/10 border-success/30"
            : isActive && isTrial
              ? "bg-blue-500/10 border-blue-500/30"
              : isExpired 
                ? "bg-destructive/10 border-destructive/30" 
                : "bg-warning/10 border-warning/30"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {isActive && !isTrial ? (
            <Crown className="w-4 h-4 text-success" />
          ) : isActive && isTrial ? (
            <Clock className="w-4 h-4 text-blue-500" />
          ) : isExpired ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <Clock className="w-4 h-4 text-warning" />
          )}
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            isActive && !isTrial ? "text-success" : isActive && isTrial ? "text-blue-500" : isExpired ? "text-destructive" : "text-warning"
          )}>
            {isActive && !isTrial ? 'Pro Active' : isTrial && isActive ? 'Trial' : isExpired ? 'Expired' : 'Pending'}
          </span>
        </div>

        {subscription?.subscription_expires_at && (
          <>
            <div className="text-lg font-bold text-sidebar-foreground">
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </div>
            <div className="text-xs text-sidebar-foreground/60">
              {isExpired ? 'Expired on' : 'Renews'}: {format(parseISO(subscription.subscription_expires_at), 'dd MMM yyyy')}
            </div>
          </>
        )}

        {!subscription?.subscription_expires_at && (
          <div className="text-sm text-sidebar-foreground/80">
            Click to subscribe
          </div>
        )}
      </div>
    </Link>
  );
}
