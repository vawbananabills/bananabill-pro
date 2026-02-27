import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Check, Clock, AlertTriangle, Phone, Mail, QrCode, Smartphone, Copy } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Subscription() {
  const { settings, subscription, daysLeft, isActive, isTrial, isExpired } = useSubscription();
  const { company } = useAuth();
  const [qrOpen, setQrOpen] = useState(false);

  const upiId = settings?.upi_id || 'kevinjeevus@okaxis';
  const currentPrice = !subscription?.subscription_started_at
    ? settings?.first_time_price
    : settings?.renewal_price;
  const amountParam = currentPrice ? `&am=${currentPrice}` : '';
  const upiLink = `upi://pay?pa=${upiId}&pn=BananaBills${amountParam}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

  const isFirstTime = !subscription?.subscription_started_at;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    toast.success('UPI ID copied!');
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col">
        <Header title="Subscription" subtitle="Manage your subscription plan" />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isActive ? (
                    <Crown className="w-5 h-5 text-success" />
                  ) : isExpired ? (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  ) : (
                    <Clock className="w-5 h-5 text-warning" />
                  )}
                  Subscription Status
                </CardTitle>
                <CardDescription>
                  {company?.name}'s current subscription status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm px-3 py-1",
                        isActive
                          ? "bg-success/10 text-success border-success/30"
                          : isExpired
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-warning/10 text-warning border-warning/30"
                      )}
                    >
                      {isActive ? 'Active' : isExpired ? 'Expired' : isTrial ? 'Trial' : 'Pending'}
                    </Badge>

                    {subscription?.subscription_expires_at && (
                      <div className="mt-3">
                        <p className="text-2xl font-bold">
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
                        </p>
                        <p className="text-muted-foreground">
                          {isExpired ? 'Expired on' : 'Expires on'}: {format(parseISO(subscription.subscription_expires_at), 'dd MMMM yyyy')}
                        </p>
                      </div>
                    )}

                    {!subscription?.subscription_expires_at && (
                      <p className="mt-3 text-muted-foreground">
                        No active subscription. Purchase a plan to continue using all features.
                      </p>
                    )}
                  </div>

                  {subscription?.subscription_started_at && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Member since</p>
                      <p className="font-medium">
                        {format(parseISO(subscription.subscription_started_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Pro Plan</CardTitle>
                <CardDescription>Full access to all features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{formatCurrency(currentPrice || 0)}</span>
                    <span className="text-muted-foreground">/ {settings?.duration_days || 365} days</span>
                  </div>
                  {isFirstTime && settings?.renewal_price !== settings?.first_time_price && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Renewal: {formatCurrency(settings?.renewal_price || 0)} / year
                    </p>
                  )}
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground">Next Year Renewal Cost</p>
                    <p className="text-2xl font-bold text-primary">₹5,000 <span className="text-sm font-normal text-muted-foreground">/ year</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    'Unlimited invoices',
                    'Unlimited customers & vendors',
                    'Advanced reports & analytics',
                    'Weekly invoice generation',
                    'Party statements & ledgers',
                    'Multi-user access',
                    'Priority support',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* UPI Payment Section */}
                <div className="pt-4 border-t space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                    <p className="text-center text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1">Pay via UPI</p>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <p className="text-center font-mono font-bold text-base tracking-wide">{upiId}</p>
                      <button onClick={handleCopyUpi} className="text-muted-foreground hover:text-primary transition-colors" title="Copy UPI ID">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                        asChild
                      >
                        <a href={upiLink}>
                          <Smartphone className="w-4 h-4" />
                          Pay via UPI App
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                        onClick={() => setQrOpen(true)}
                      >
                        <QrCode className="w-4 h-4" />
                        Show QR Code
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      After payment, contact admin to activate your subscription.
                    </p>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Or contact admin directly
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" className="gap-2" asChild>
                      <a href="tel:+919876543210">
                        <Phone className="w-4 h-4" />
                        Call Admin
                      </a>
                    </Button>
                    <Button variant="outline" className="gap-2" asChild>
                      <a href="mailto:admin@example.com">
                        <Mail className="w-4 h-4" />
                        Email Admin
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">How do I renew my subscription?</h4>
                  <p className="text-sm text-muted-foreground">
                    Pay via UPI using the button above or contact the admin via phone or email. Once payment is confirmed, your subscription will be activated.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">What happens when my subscription expires?</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll still be able to view your data, but some features may be limited until you renew.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Can I get a refund?</h4>
                  <p className="text-sm text-muted-foreground">
                    Please contact the admin for refund queries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Scan to Pay
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="p-3 rounded-xl bg-white shadow-md border">
              <img
                src={qrUrl}
                alt="UPI QR Code"
                width={220}
                height={220}
                className="rounded"
              />
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-sm">{upiId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scan with any UPI app to pay
              </p>
              {currentPrice && (
                <p className="text-lg font-black text-primary mt-1">{formatCurrency(currentPrice)}</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={handleCopyUpi}>
              <Copy className="w-4 h-4" />
              Copy UPI ID
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
