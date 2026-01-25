import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, BarChart3, Users, FileText, Shield, Zap, Scale, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
const features = [{
  icon: Scale,
  title: 'Weight-Based Billing',
  description: 'Automatic Net Weight calculation with Box & Benches deductions for accurate banana trading.'
}, {
  icon: FileText,
  title: 'Sales-First Workflow',
  description: 'Create sales invoices directly. Purchase entries auto-generate from vendor-linked items.'
}, {
  icon: Users,
  title: 'Multi-Tenant SaaS',
  description: 'Each company gets isolated data, users, customers, vendors, and complete accounting.'
}, {
  icon: BarChart3,
  title: 'Full Accounting',
  description: 'Sales ledger, purchase tracking, profit & loss, balance sheet, and GST support.'
}, {
  icon: Zap,
  title: 'Fast & Mobile Ready',
  description: 'Table-based fast data entry optimized for daily trading. Works on any device.'
}, {
  icon: Shield,
  title: 'Role-Based Access',
  description: 'Owner, Admin, Manager, Staff roles with customizable permissions per company.'
}];
const pricing = [{
  name: 'Starter',
  price: '₹999',
  period: '/month',
  description: 'Perfect for small traders',
  features: ['1 User', '500 Invoices/month', 'Basic Reports', 'Email Support']
}, {
  name: 'Professional',
  price: '₹2,499',
  period: '/month',
  description: 'For growing businesses',
  features: ['5 Users', 'Unlimited Invoices', 'Advanced Reports', 'Priority Support', 'Custom Invoice Templates'],
  popular: true
}, {
  name: 'Enterprise',
  price: '₹4,999',
  period: '/month',
  description: 'For large operations',
  features: ['Unlimited Users', 'Multi-Branch', 'API Access', 'Dedicated Support', 'Custom Integrations']
}];
export default function Landing() {
  const { user, loading } = useAuth();

  return <div className="min-h-screen bg-background">
    {/* Navigation */}
    <nav className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-glow">
            <span className="text-base md:text-lg font-bold text-primary-foreground">B</span>
          </div>
          <span className="font-semibold text-lg md:text-xl">BananaBills</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/install" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Install App
            </Button>
          </Link>
          {!loading && (
            user ? (
              <Link to="/dashboard">
                <Button size="sm" className="gap-1 md:gap-2">
                  <span className="hidden sm:inline">Go to</span> Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth?signup=true">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </nav>

    {/* Hero */}
    <section className="py-12 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Built for Banana Traders
          </div>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 text-balance">
            Billing & Accounting{' '}
            <span className="text-primary">Made Simple</span> for Banana Trading
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto text-balance">
            The only software with weight-based billing, automatic Net Weight calculations,
            and Sales-First workflow designed specifically for banana supply businesses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link to="/auth?signup=true" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start Free Trial <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Demo
              </Button>
            </Link>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial
          </p>
        </div>
      </div>
    </section>

    {/* Formula Highlight */}
    <section className="py-8 md:py-12 border-y border-border bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-6 md:gap-8 text-center">
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-2">Built for India's Unique Market</h3>
            <p className="text-sm md:text-base text-muted-foreground">Designed for fruit mandis & wholesale traders across India</p>
          </div>
          <div className="relative overflow-hidden bg-card px-4 md:px-8 py-4 md:py-6 rounded-2xl border border-border shadow-card w-full max-w-[320px] md:max-w-[400px] h-20 md:h-24">
            <div className="flex gap-4 md:gap-6 animate-marquee whitespace-nowrap items-center h-full">
              <span className="text-4xl md:text-5xl">🍌</span>
              <span className="text-4xl md:text-5xl">🍎</span>
              <span className="text-4xl md:text-5xl">🍊</span>
              <span className="text-4xl md:text-5xl">🍇</span>
              <span className="text-4xl md:text-5xl">🥭</span>
              <span className="text-4xl md:text-5xl">🍍</span>
              <span className="text-4xl md:text-5xl">🍌</span>
              <span className="text-4xl md:text-5xl">🍓</span>
              <span className="text-4xl md:text-5xl">🍑</span>
              <span className="text-4xl md:text-5xl">🍌</span>
              <span className="text-4xl md:text-5xl">🍎</span>
              <span className="text-4xl md:text-5xl">🍊</span>
              <span className="text-4xl md:text-5xl">🍇</span>
              <span className="text-4xl md:text-5xl">🥭</span>
              <span className="text-4xl md:text-5xl">🍍</span>
              <span className="text-4xl md:text-5xl">🍌</span>
              <span className="text-4xl md:text-5xl">🍓</span>
              <span className="text-4xl md:text-5xl">🍑</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Everything You Need to Run Your Business</h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
            From invoice creation to full accounting, BananaBills handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map(feature => <div key={feature.title} className="stat-card group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary group-hover:text-primary-foreground" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-1.5 md:mb-2">{feature.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* Pricing */}


    {/* CTA */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center bg-primary text-primary-foreground rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-xl">
          <h2 className="text-xl md:text-4xl font-bold mb-3 md:mb-4 text-primary-foreground">
            Ready to Streamline Your Banana Business?
          </h2>
          <p className="text-sm md:text-lg text-primary-foreground/90 mb-6 md:mb-8 max-w-2xl mx-auto">
            Join hundreds of traders who have simplified their billing and accounting with BananaBills.
          </p>
          <Link to="/auth?signup=true">
            <Button size="lg" variant="secondary" className="gap-2 font-semibold">
              Start Your Free Trial <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="font-semibold">BananaBills</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-sm text-muted-foreground">
              © 2024 BananaBills. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Designed & Developed by <a href="https://vartsworld.netlify.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">VAW TECHNOLOGIES</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  </div>;
}