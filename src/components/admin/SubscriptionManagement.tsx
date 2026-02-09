import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Crown, Settings, CalendarIcon, Loader2, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';

interface Company {
  id: string;
  name: string;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
}

export function SubscriptionManagement() {
  const { settings, updateSettings, updateCompanySubscription } = useSubscription();
  const [settingsForm, setSettingsForm] = useState({
    first_time_price: settings?.first_time_price?.toString() || '999',
    renewal_price: settings?.renewal_price?.toString() || '499',
    duration_days: settings?.duration_days?.toString() || '30',
    trial_duration_days: settings?.trial_duration_days?.toString() || '14',
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [renewDate, setRenewDate] = useState<Date>(addDays(new Date(), 30));
  const [renewAmount, setRenewAmount] = useState<string>('');
  const [trialDays, setTrialDays] = useState<string>('14');

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['all-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, subscription_status, subscription_expires_at, subscription_started_at')
        .order('name');

      if (error) throw error;
      return data as Company[];
    },
  });

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({
      first_time_price: parseFloat(settingsForm.first_time_price) || 0,
      renewal_price: parseFloat(settingsForm.renewal_price) || 0,
      duration_days: parseInt(settingsForm.duration_days) || 30,
      trial_duration_days: parseInt(settingsForm.trial_duration_days) || 14,
    });
    setSettingsDialogOpen(false);
  };

  const handleIssueTrial = async () => {
    if (!selectedCompany) return;
    const days = parseInt(trialDays) || (settings?.trial_duration_days || 14);
    const expiresAt = addDays(new Date(), days);

    await updateCompanySubscription.mutateAsync({
      companyId: selectedCompany.id,
      expiresAt: expiresAt.toISOString(),
      status: 'trial',
    });
    setTrialDialogOpen(false);
    setSelectedCompany(null);
  };

  const handleRenewSubscription = async () => {
    if (!selectedCompany) return;

    await updateCompanySubscription.mutateAsync({
      companyId: selectedCompany.id,
      expiresAt: renewDate.toISOString(),
      status: 'active',
      amount: renewAmount ? parseFloat(renewAmount) : undefined,
    });
    setRenewDialogOpen(false);
    setSelectedCompany(null);
    setRenewAmount('');
  };

  const openRenewDialog = (company: Company) => {
    setSelectedCompany(company);
    const baseDate = company.subscription_expires_at 
      ? parseISO(company.subscription_expires_at) 
      : new Date();
    setRenewDate(addDays(baseDate, settings?.duration_days || 365));
    setRenewAmount(settings?.renewal_price?.toString() || '5000');
    setRenewDialogOpen(true);
  };

  const openTrialDialog = (company: Company) => {
    setSelectedCompany(company);
    setTrialDays(settings?.trial_duration_days?.toString() || '14');
    setTrialDialogOpen(true);
  };

  const getStatusBadge = (company: Company) => {
    if (!company.subscription_expires_at) {
      return <Badge variant="outline" className="bg-muted">No Subscription</Badge>;
    }

    const isExpired = new Date() > parseISO(company.subscription_expires_at);
    const daysLeft = differenceInDays(parseISO(company.subscription_expires_at), new Date());
    const isTrial = company.subscription_status === 'trial';

    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isTrial) {
      return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">Trial ({daysLeft}d left)</Badge>;
    }
    if (daysLeft <= 7) {
      return <Badge className="bg-warning text-warning-foreground">Expiring Soon ({daysLeft}d)</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Active ({daysLeft}d left)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Subscription Settings
            </CardTitle>
            <CardDescription>Configure subscription pricing and duration</CardDescription>
          </div>
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Edit Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subscription Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>First Time Purchase Price (₹)</Label>
                  <Input
                    type="number"
                    value={settingsForm.first_time_price}
                    onChange={(e) => setSettingsForm({ ...settingsForm, first_time_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renewal Price (₹)</Label>
                  <Input
                    type="number"
                    value={settingsForm.renewal_price}
                    onChange={(e) => setSettingsForm({ ...settingsForm, renewal_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={settingsForm.duration_days}
                    onChange={(e) => setSettingsForm({ ...settingsForm, duration_days: e.target.value })}
                  />
                </div>
                 <div className="space-y-2">
                  <Label>Trial Duration (Days) — for new signups</Label>
                  <Input
                    type="number"
                    value={settingsForm.trial_duration_days}
                    onChange={(e) => setSettingsForm({ ...settingsForm, trial_duration_days: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">First Time Price</p>
              <p className="text-2xl font-bold">₹{settings?.first_time_price?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Renewal Price</p>
              <p className="text-2xl font-bold">₹{settings?.renewal_price?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">{settings?.duration_days || 30} days</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Trial Duration</p>
              <p className="text-2xl font-bold">{settings?.trial_duration_days || 14} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Company Subscriptions</CardTitle>
          <CardDescription>Manage subscription status for each company</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires On</TableHead>
                  <TableHead>Started On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{getStatusBadge(company)}</TableCell>
                    <TableCell>
                      {company.subscription_expires_at
                        ? format(parseISO(company.subscription_expires_at), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {company.subscription_started_at
                        ? format(parseISO(company.subscription_started_at), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openTrialDialog(company)}
                        >
                          <Gift className="w-3 h-3" />
                          Trial
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openRenewDialog(company)}
                        >
                          {company.subscription_expires_at ? 'Extend' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCompany?.subscription_expires_at ? 'Extend' : 'Activate'} Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{selectedCompany?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount Charged (₹)</Label>
              <Input
                type="number"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                placeholder="e.g. 5000"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Subscription Expires On</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(renewDate, 'dd MMMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={renewDate}
                    onSelect={(date) => date && setRenewDate(date)}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Duration from today</p>
              <p className="font-medium">{differenceInDays(renewDate, new Date())} days</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenewSubscription} disabled={updateCompanySubscription.isPending}>
                {updateCompanySubscription.isPending ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trial Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-500" />
              Issue Trial Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{selectedCompany?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Trial Duration (Days)</Label>
              <Input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                min="1"
                placeholder={settings?.trial_duration_days?.toString() || '14'}
              />
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Trial will expire on</p>
              <p className="font-medium">{format(addDays(new Date(), parseInt(trialDays) || 14), 'dd MMMM yyyy')}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setTrialDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleIssueTrial} disabled={updateCompanySubscription.isPending}>
                {updateCompanySubscription.isPending ? 'Saving...' : 'Issue Trial'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
