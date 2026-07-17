import { useEffect, useState } from 'react';
import type { Profile, RemotePreference } from '@shared/types';
import { api } from '@/lib/api';
import { useToast } from '@/components/common';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui/primitives';

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Comma-separated text inputs for the array fields.
  const [rolesText, setRolesText] = useState('');
  const [locationsText, setLocationsText] = useState('');

  useEffect(() => {
    api
      .get<Profile>('/api/profile')
      .then((p) => {
        setProfile(p);
        setRolesText(p.targetRoles.join(', '));
        setLocationsText(p.locations.join(', '));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  if (loadError) {
    return <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">Failed to load profile: {loadError}</div>;
  }
  if (!profile) {
    return <div className="flex justify-center p-10"><Spinner /></div>;
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile({ ...profile, [key]: value });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put<Profile>('/api/profile', {
        name: profile.name,
        resumeMarkdown: profile.resumeMarkdown,
        targetRoles: rolesText.split(',').map((s) => s.trim()).filter(Boolean),
        locations: locationsText.split(',').map((s) => s.trim()).filter(Boolean),
        remotePreference: profile.remotePreference,
        salaryFloor: profile.salaryFloor,
        scoreThreshold: profile.scoreThreshold,
        extraScoringInstructions: profile.extraScoringInstructions,
      });
      setProfile(updated);
      toast('success', 'Profile saved');
    } catch (e) {
      toast('error', `Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile &amp; Settings</h2>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Spinner className="border-white/40 border-t-white" /> : null}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={profile.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roles">Target roles (comma-separated)</Label>
            <Input
              id="roles"
              placeholder="e.g. Product Manager, Growth Lead"
              value={rolesText}
              onChange={(e) => setRolesText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locations">Locations (comma-separated)</Label>
            <Input
              id="locations"
              placeholder="e.g. Remote, Chicago IL"
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="remote">Remote preference</Label>
              <Select
                id="remote"
                value={profile.remotePreference}
                onChange={(e) => set('remotePreference', e.target.value as RemotePreference)}
              >
                <option value="remote_only">Remote only</option>
                <option value="remote_preferred">Remote preferred</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
                <option value="any">Any</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary">Salary floor (annual)</Label>
              <Input
                id="salary"
                type="number"
                placeholder="e.g. 90000"
                value={profile.salaryFloor ?? ''}
                onChange={(e) => set('salaryFloor', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Score threshold</Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                max={100}
                value={profile.scoreThreshold}
                onChange={(e) => set('scoreThreshold', Number(e.target.value))}
              />
              <p className="text-xs text-slate-400">Jobs at or above this score count as high scorers.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume (markdown)</CardTitle>
          <p className="text-sm text-slate-500">Sent in full to Claude for every score and tailoring request.</p>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={20}
            className="font-mono text-xs"
            value={profile.resumeMarkdown}
            onChange={(e) => set('resumeMarkdown', e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra scoring instructions</CardTitle>
          <p className="text-sm text-slate-500">
            Free-form guidance added to every scoring prompt — e.g. “I care about attribution/measurement experience.”
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={profile.extraScoringInstructions}
            onChange={(e) => set('extraScoringInstructions', e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
