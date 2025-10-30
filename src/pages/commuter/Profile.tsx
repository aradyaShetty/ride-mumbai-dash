import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { authenticatedFetch } from '@/lib/api'; // <-- IMPORT API HELPER
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  CreditCard,
  Link as LinkIcon,
  Edit3,
  Check,
  X,
  Wallet // <-- IMPORT WALLET ICON
} from 'lucide-react';

export const Profile = () => {
  // --- MODIFICATION: Get refreshUser from context ---
  const { user, refreshUser } = useAuth(); 
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- MODIFICATION: States for Wallet ---
  const [amount, setAmount] = useState<number>(0);
  const [isAddingMoney, setIsAddingMoney] = useState<boolean>(false);
  
  // --- MODIFICATION: Use user.username for name ---
  const [formData, setFormData] = useState({
    name: user?.username || '', // Use username field
    email: user?.email || '',
    phone: (user as any)?.phone || '', // Keep phone logic as is
  });

  // Notification settings (keep as mock)
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    promotions: false,
  });

  // Linked accounts (keep as mock)
  const [linkedAccounts] = useState([
    { provider: 'Google', connected: true, email: user?.email },
    { provider: 'Facebook', connected: false, email: null },
    { provider: 'Apple', connected: false, email: null },
  ]);
  
  // --- NEW: handleAddMoney function ---
  const handleAddMoney = async () => {
    if (amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive amount." });
      return;
    }

    setIsAddingMoney(true);
    try {
      const response = await authenticatedFetch(`/commuter/wallet/add?amount=${amount}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to add money to wallet.');
      }

      await refreshUser(); // <-- Refresh user data to get new balance
      
      toast({ title: "Success!", description: `₹${amount} added to your wallet.` });
      setAmount(0); // Reset input field

    } catch (error: any) {
      console.error("Wallet error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAddingMoney(false);
    }
  };


  // handleSave (keep as mock)
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: "Validation Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // updateProfile(formData); // This mock function might need adjustment based on new User type
    console.log("Mock profile save:", formData);
    setIsEditing(false);
    setIsSaving(false);
    toast({ title: "Profile Updated", description: "Your profile has been successfully updated" });
  };

  // handleCancel (keep as mock)
  const handleCancel = () => {
    setFormData({
      name: user?.username || '', // Use username
      email: user?.email || '',
      phone: (user as any)?.phone || '',
    });
    setIsEditing(false);
  };

  // handleLinkAccount (keep as mock)
  const handleLinkAccount = (provider: string) => {
    toast({
      title: "Account Linking",
      description: `${provider} account linking will be implemented soon.`,
    });
  };

  // stats (keep as mock)
  const stats = [
    { label: 'Total Trips', value: '47', icon: User },
    { label: 'Money Saved', value: '₹2,340', icon: CreditCard },
    { label: 'Member Since', value: 'Jan 2024', icon: Shield },
  ];

  // --- NEW: Helper to get wallet balance ---
  const getWalletBalance = () => {
     if (user && user.role === 'ROLE_COMMUTER') {
       // We must cast 'user' to access Commuter-specific fields
       return (user as any).walletBalance ?? 0;
     }
     return 0;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header (No Changes) */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info (Left Column) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card (MODIFIED) */}
            <Card className="shadow-custom-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name (Username)</Label>
                  <Input
                    id="name"
                    value={formData.name} // Now shows real username
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email} // Now shows real email
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone} // Shows real phone if available
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Account Type</h4>
                      <p className="text-sm text-muted-foreground">Your current account privileges</p>
                    </div>
                    {/* --- MODIFICATION: Check user.role --- */}
                    <Badge variant="secondary">
                      {user?.role === 'ROLE_ADMIN' ? 'Administrator' : 'Commuter'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings (No Changes) */}
            <Card className="shadow-custom-lg">
              {/* ... (your existing notification settings code) ... */}
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                  { key: 'sms', label: 'SMS Notifications', description: 'Receive updates via SMS' },
                  { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in app' },
                  { key: 'promotions', label: 'Promotional Updates', description: 'Receive offers and promotions' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{setting.label}</h4>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch
                      checked={notifications[setting.key as keyof typeof notifications]}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, [setting.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Linked Accounts (No Changes) */}
            <Card className="shadow-custom-lg">
              {/* ... (your existing linked accounts code) ... */}
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  Linked Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkedAccounts.map((account) => (
                  <div key={account.provider} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold">{account.provider[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{account.provider}</h4>
                        {account.connected ? (
                          <p className="text-sm text-success">Connected • {account.email}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not connected</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant={account.connected ? "destructive" : "outline"} 
                      size="sm"
                      onClick={() => handleLinkAccount(account.provider)}
                    >
                      {account.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar (Right Column) */}
          <div className="space-y-6">

            {/* --- NEW: Wallet Card --- */}
            {user?.role === 'ROLE_COMMUTER' && (
              <Card className="shadow-custom-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>My Wallet</span>
                    <Wallet className="w-5 h-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-4xl font-bold text-primary">₹{getWalletBalance().toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Add Money (via UPI/Card)</Label>
                    <div className="flex space-x-2">
                      <Input 
                        type="number" 
                        id="amount" 
                        placeholder="Enter amount"
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min="0"
                      />
                      <Button onClick={handleAddMoney} disabled={isAddingMoney}>
                        {isAddingMoney ? <LoadingSpinner size="sm" /> : <CreditCard className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Account Stats (No Changes) */}
            <Card className="shadow-custom-lg">
              {/* ... (your existing stats code) ... */}
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="font-semibold">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Actions (No Changes) */}
            <Card className="shadow-custom-lg">
              {/* ... (your existing quick actions code) ... */}
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment Methods
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>

            {/* Support (No Changes) */}
            <Card className="shadow-custom-lg border-warning/20 bg-warning/5">
              {/* ... (your existing support code) ... */}
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Our support team is here to assist you with any questions or issues.
                </p>
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};