import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Truck,
  Package,
  Settings,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Scale,
  Shield,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Invoice', href: '/invoice/new', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: BookOpen },
  { name: 'Payments', href: '/payments', icon: Wallet },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Truck },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Units', href: '/units', icon: Scale },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, profile, company, signOut } = useAuth();

  // Check if user is super admin
  const { data: isSuperAdmin = false } = useQuery({
    queryKey: ['is-super-admin-sidebar', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      return !!data;
    },
    enabled: !!user?.id,
  });

  // Check user's role for display
  const { data: userRole } = useQuery({
    queryKey: ['user-role-sidebar', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'user';
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return data?.role || 'user';
    },
    enabled: !!user?.id,
  });

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex-col z-50 transition-all duration-300 hidden md:flex",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-glow">
            <span className="text-lg font-bold text-primary-foreground">B</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">BananaBills</span>
              <span className="text-xs text-sidebar-foreground/50">Sales & Billing</span>
            </div>
          )}
        </Link>
      </div>

      {/* Company Badge */}
      {!collapsed && company && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent">
            <Building2 className="w-4 h-4 text-sidebar-primary" />
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {company.name}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "nav-link",
                isActive && "nav-link-active bg-sidebar-primary/10 text-sidebar-primary"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Super Admin Link */}
        {isSuperAdmin && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <Link
              to="/super-admin"
              className={cn(
                "nav-link text-amber-600 dark:text-amber-400",
                location.pathname === '/super-admin' && "nav-link-active bg-amber-500/10"
              )}
            >
              <Shield className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Super Admin</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "justify-center" : "px-2"
        )}>
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/50">{formatRole(userRole || 'user')}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
