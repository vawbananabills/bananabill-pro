import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Upload, Loader2, X, Image, Calendar, Plus } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DATE_FORMAT_OPTIONS } from '@/lib/dateFormat';
import { useBiometrics } from '@/hooks/useBiometrics';
import { Fingerprint, Smartphone, Trash2 as Trash } from 'lucide-react';

export default function Settings() {
  const { company, updateCompany } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { register, getBiometrics, removeBiometric, isSupported, loading: biometricLoading } = useBiometrics();
  const [biometrics, setBiometrics] = useState<any[]>([]);

  const [settings, setSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
    invoice_prefix: '',
    next_invoice_number: 1,
    bank_details: '',
    footer_notes: '',
    upi_id: '',
    logo_url: '',
    show_logo_on_invoice: false,
    date_format: 'dd/MM/yyyy',
  });

  // Load company data into form
  useEffect(() => {
    if (company) {
      setSettings({
        name: company.name || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        gst_number: company.gst_number || '',
        invoice_prefix: company.invoice_prefix || 'INV-',
        next_invoice_number: company.next_invoice_number || 1,
        bank_details: company.bank_details || '',
        footer_notes: company.footer_notes || '',
        upi_id: company.upi_id || '',
        logo_url: company.logo_url || '',
        show_logo_on_invoice: company.show_logo_on_invoice || false,
        date_format: company.date_format || 'dd/MM/yyyy',
      });
    }
    loadBiometrics();
  }, [company]);

  const loadBiometrics = async () => {
    const data = await getBiometrics();
    setBiometrics(data);
  };

  const handleRegisterBiometric = async () => {
    const success = await register(`Device ${biometrics.length + 1}`);
    if (success) loadBiometrics();
  };

  const handleRemoveBiometric = async (id: string, credentialId: string) => {
    const success = await removeBiometric(id, credentialId);
    if (success) loadBiometrics();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update local state
      setSettings(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSave = () => {
    updateCompany.mutate({
      name: settings.name,
      address: settings.address || null,
      phone: settings.phone || null,
      email: settings.email || null,
      gst_number: settings.gst_number || null,
      invoice_prefix: settings.invoice_prefix || 'INV-',
      next_invoice_number: settings.next_invoice_number,
      bank_details: settings.bank_details || null,
      footer_notes: settings.footer_notes || null,
      upi_id: settings.upi_id || null,
      logo_url: settings.logo_url || null,
      show_logo_on_invoice: settings.show_logo_on_invoice,
      date_format: settings.date_format || 'dd/MM/yyyy',
    });
  };

  if (!company) {
    return (
      <DashboardLayout title="Settings" subtitle="Configure your company settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="Configure your company settings">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Company Info */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Company Information</CardTitle>
                <CardDescription>
                  This information will appear on your invoices
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number (optional)</Label>
                <Input
                  id="gst"
                  value={settings.gst_number}
                  onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden relative">
                  {settings.logo_url ? (
                    <>
                      <img src={settings.logo_url} alt="Company logo" className="w-full h-full object-contain" />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">Max 2MB, PNG or JPG</p>
                </div>
              </div>
            </div>

            {/* Show Logo on Invoice Toggle */}
            {settings.logo_url && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <Label htmlFor="show-logo">Show Logo on Invoices</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Display your company logo on invoice headers
                  </p>
                </div>
                <Switch
                  id="show-logo"
                  checked={settings.show_logo_on_invoice}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_logo_on_invoice: checked })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Settings</CardTitle>
            <CardDescription>
              Configure invoice numbering and defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Invoice Prefix</Label>
                <Input
                  id="prefix"
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  placeholder="INV-2024-"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextNumber">Next Invoice Number</Label>
                <Input
                  id="nextNumber"
                  type="number"
                  value={settings.next_invoice_number}
                  onChange={(e) => setSettings({ ...settings, next_invoice_number: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Date Format Setting */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Label htmlFor="date-format">Date Format</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose how dates are displayed across invoices and reports
                </p>
              </div>
              <Select
                value={settings.date_format}
                onValueChange={(value) => setSettings({ ...settings, date_format: value })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Bank Details</Label>
              <Textarea
                id="bank"
                value={settings.bank_details}
                onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })}
                rows={3}
                placeholder="Bank: Your Bank Name&#10;Account: 1234567890&#10;IFSC: XXXX0001234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upi">UPI ID (for QR Code)</Label>
              <Input
                id="upi"
                value={settings.upi_id}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                placeholder="yourname@upi"
              />
              <p className="text-xs text-muted-foreground">
                This UPI ID will be used to generate a payment QR code on invoices
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer">Invoice Footer Notes</Label>
              <Textarea
                id="footer"
                value={settings.footer_notes}
                onChange={(e) => setSettings({ ...settings, footer_notes: e.target.value })}
                rows={2}
                placeholder="Thank you for your business!"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security / Biometrics */}
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Security & Login</CardTitle>
                <CardDescription>
                  Manage biometric login for your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Biometric login is not supported on this browser or device. Use a modern phone with fingerprint/face sensor.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      Fingerprint Login
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable biometric authentication to login quickly without typing your password.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegisterBiometric}
                    disabled={biometricLoading}
                    className="gap-2"
                  >
                    {biometricLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Register Fingerprint
                  </Button>
                </div>

                {biometrics.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Registered Devices</Label>
                    <div className="divide-y border rounded-lg overflow-hidden bg-white">
                      {biometrics.map((bio) => (
                        <div key={bio.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <Fingerprint className="w-4 h-4 text-green-700" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{bio.device_name || 'Biometric Key'}</div>
                              <div className="text-[10px] text-muted-foreground">Added on {new Date(bio.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveBiometric(bio.id, bio.credential_id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="gap-2"
            disabled={updateCompany.isPending || !settings.name}
          >
            {updateCompany.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
