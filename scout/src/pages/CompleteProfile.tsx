import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UniversityCombobox } from '@/components/UniversityCombobox';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const CompleteProfile = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(
    userProfile?.first_name && userProfile.first_name !== userProfile.full_name ? userProfile.first_name : ''
  );
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [isNewUniversity, setIsNewUniversity] = useState(false);
  const [newUniversityName, setNewUniversityName] = useState('');
  const [newUniversityDivision, setNewUniversityDivision] = useState('');
  const [newUniversityState, setNewUniversityState] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!isNewUniversity && !universityId) errs.university = 'Please select a university';
    if (isNewUniversity && !newUniversityName.trim()) errs.university = 'University name is required';
    if (isNewUniversity && !newUniversityDivision) errs.division = 'Division is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSaving(true);
    try {
      let finalUniversityId = universityId;
      let schoolName = '';

      if (isNewUniversity) {
        // Create the new university
        const { data: newUni, error: uniError } = await supabase
          .from('universities')
          .insert({
            name: newUniversityName.trim(),
            division: newUniversityDivision,
            state: newUniversityState.trim() || null,
            verified: false,
          })
          .select('id, name')
          .single();

        if (uniError) throw uniError;
        finalUniversityId = newUni.id;
        schoolName = newUni.name;
      } else {
        // Look up the selected university name
        const { data: uni } = await supabase
          .from('universities')
          .select('name')
          .eq('id', universityId!)
          .single();
        schoolName = uni?.name || '';
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          school_name: schoolName,
          university_id: finalUniversityId,
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: 'Profile completed!',
        description: 'Welcome to Scout by Dual Rise.',
      });

      // A precise profile deep-link (postLoginRedirect) takes priority over the
      // generic post-profile target; clear both so neither leaks to a later login.
      const redirect =
        sessionStorage.getItem('postLoginRedirect') ||
        sessionStorage.getItem('postProfileRedirect');
      sessionStorage.removeItem('postLoginRedirect');
      sessionStorage.removeItem('postProfileRedirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('Error completing profile:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill in your details to get started. This information helps us connect you with the right athletes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                University / School <span className="text-destructive">*</span>
              </Label>
              <UniversityCombobox
                value={universityId}
                onValueChange={setUniversityId}
                onNewUniversity={setIsNewUniversity}
                isNewUniversity={isNewUniversity}
                newUniversityName={newUniversityName}
                onNewUniversityNameChange={setNewUniversityName}
                newUniversityDivision={newUniversityDivision}
                onNewUniversityDivisionChange={setNewUniversityDivision}
                newUniversityState={newUniversityState}
                onNewUniversityStateChange={setNewUniversityState}
                error={!!errors.university}
              />
              {errors.university && (
                <p className="text-xs text-destructive">{errors.university}</p>
              )}
              {errors.division && (
                <p className="text-xs text-destructive">{errors.division}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone / WhatsApp (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
