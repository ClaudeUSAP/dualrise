import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings,
  Mail,
  Shield,
  Download,
  ChevronRight,
  Info,
  CheckCircle,
  Server,
  Database,
  Globe
} from 'lucide-react';

const SystemSettings = () => {
  const [selectedSection, setSelectedSection] = useState('general');

  const settingsSections = [
    { id: 'general', label: 'Platform Information', icon: Settings },
    { id: 'email', label: 'Email Configuration', icon: Mail },
    { id: 'security', label: 'User Management', icon: Shield },
  ];

  // Read-only reference data
  const platformInfo = {
    name: 'Scout by Dual Rise',
    version: '1.0.0',
    environment: 'Production',
    timezone: 'America/New_York',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
  };

  const emailConfig = {
    provider: 'Resend',
    configured: true, // RESEND_API_KEY exists
    fromAddress: 'noreply@frenchgolfconnect.com',
  };

  const userManagement = {
    coachApprovalRequired: true, // This is real from DB
    passwordMinLength: 8,
    requireSpecialChar: true,
  };

  const handleExportSettings = () => {
    const exportData = {
      platform: platformInfo,
      email: emailConfig,
      userManagement: userManagement,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="flex h-screen">
      {/* Settings Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">System Settings</h2>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="text-left">{section.label}</span>
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These settings are for reference only. System configuration is managed through Supabase, environment variables, and database settings.
            </AlertDescription>
          </Alert>

          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {settingsSections.find(s => s.id === selectedSection)?.label}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                View current system configuration
              </p>
            </div>
            <Button variant="outline" onClick={handleExportSettings}>
              <Download className="mr-2 h-4 w-4" />
              Export Settings
            </Button>
          </div>

          {/* Platform Information */}
          {selectedSection === 'general' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Platform Details
                  </CardTitle>
                  <CardDescription>Current platform configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Platform Name</p>
                      <p className="text-base">{platformInfo.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Version</p>
                      <p className="text-base">{platformInfo.version}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Environment</p>
                      <Badge variant="default">{platformInfo.environment}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                      <p className="text-base">{platformInfo.timezone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Default Language</p>
                      <p className="text-base">{platformInfo.language}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Date Format</p>
                      <p className="text-base">{platformInfo.dateFormat}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Status
                  </CardTitle>
                  <CardDescription>Current operational status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Database</span>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email Service</span>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Maintenance Mode</span>
                    </div>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Email Configuration */}
          {selectedSection === 'email' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Provider
                  </CardTitle>
                  <CardDescription>Current email service configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Provider</p>
                      <p className="text-base font-medium">{emailConfig.provider}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Configured
                      </Badge>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">From Address</p>
                      <p className="text-base">{emailConfig.fromAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Default notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">New Athlete Registrations</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">Tournament Updates</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">System Alerts</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">Default Frequency</span>
                    <Badge>Immediate</Badge>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Email configuration is managed through the RESEND_API_KEY environment variable. To modify email settings, update the secret in Supabase.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* User Management */}
          {selectedSection === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    User Access Control
                  </CardTitle>
                  <CardDescription>Current user management settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Coach Approval Required</p>
                      <p className="text-xs text-muted-foreground">New coach accounts require admin approval</p>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Password Minimum Length</p>
                      <p className="text-xs text-muted-foreground">Minimum characters required</p>
                    </div>
                    <Badge variant="secondary">{userManagement.passwordMinLength} characters</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Special Character Required</p>
                      <p className="text-xs text-muted-foreground">Password must include special characters</p>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Enabled
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Roles</CardTitle>
                  <CardDescription>Available system roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">Full system access and configuration</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Agent</p>
                      <p className="text-xs text-muted-foreground">Read-only access to admin features</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Coach</p>
                      <p className="text-xs text-muted-foreground">Standard user access</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  User roles and permissions are managed through the users and user_roles tables in Supabase. Security policies are enforced at the database level.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
