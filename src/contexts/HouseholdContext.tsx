import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { saveCurrentHousehold, getCurrentHousehold } from '../lib/storage';
import { Household, HouseholdMember, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface HouseholdContextValue {
  households: Household[];
  currentHousehold: Household | null;
  members: HouseholdMember[];
  userRole: UserRole | null;
  isLoading: boolean;
  setCurrentHousehold: (h: Household) => void;
  createHousehold: (name: string) => Promise<Household>;
  updateHousehold: (id: string, updates: Partial<Household>) => Promise<void>;
  inviteMember: (email: string, role: UserRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHouseholdState] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHouseholds = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const { data: memberRows, error } = await supabase
        .from('household_members')
        .select('household_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;

      const ids = memberRows?.map((r) => r.household_id) ?? [];
      if (ids.length === 0) { setHouseholds([]); setIsLoading(false); return; }

      const { data: hhs, error: hhErr } = await supabase
        .from('households')
        .select('*')
        .in('id', ids);
      if (hhErr) throw hhErr;

      const list = (hhs ?? []) as Household[];
      setHouseholds(list);

      const cached = await getCurrentHousehold();
      const initial = cached && list.find((h) => h.id === cached.id)
        ? cached
        : list[0] ?? null;

      if (initial) {
        setCurrentHouseholdState(initial);
        const row = memberRows?.find((r) => r.household_id === initial.id);
        setUserRole((row?.role as UserRole) ?? null);
        await fetchMembers(initial.id);
        await saveCurrentHousehold(initial);
      }
    } catch (err) {
      console.error('[Household] fetchHouseholds:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  async function fetchMembers(householdId: string) {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('*, profile:profiles(*)')
        .eq('household_id', householdId);
      if (error) throw error;
      setMembers((data ?? []) as HouseholdMember[]);
    } catch (err) {
      console.error('[Household] fetchMembers:', err);
    }
  }

  useEffect(() => { fetchHouseholds(); }, [fetchHouseholds]);

  async function setCurrentHousehold(h: Household) {
    setCurrentHouseholdState(h);
    await saveCurrentHousehold(h);
    await fetchMembers(h.id);
    const { data } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', h.id)
      .eq('user_id', user?.id ?? '')
      .single();
    setUserRole((data?.role as UserRole) ?? null);
  }

  async function createHousehold(name: string): Promise<Household> {
    if (!user) throw new Error('Not authenticated');
    const { data: hh, error: hhErr } = await supabase
      .from('households')
      .insert({ name, created_by: user.id })
      .select()
      .single();
    if (hhErr) throw hhErr;

    const { error: memberErr } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, user_id: user.id, role: 'head', status: 'active' });
    if (memberErr) throw memberErr;

    await fetchHouseholds();
    return hh as Household;
  }

  async function updateHousehold(id: string, updates: Partial<Household>) {
    const { error } = await supabase.from('households').update(updates).eq('id', id);
    if (error) throw error;
    await fetchHouseholds();
  }

  async function inviteMember(email: string, role: UserRole) {
    if (!currentHousehold) throw new Error('No household selected');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const { error } = await supabase.from('household_members').insert({
      household_id: currentHousehold.id,
      user_id: profile?.id ?? user?.id,
      role,
      status: profile ? 'active' : 'pending',
      invited_email: email,
      invited_by: user?.id,
    });
    if (error) throw error;
    await fetchMembers(currentHousehold.id);
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('household_members').delete().eq('id', memberId);
    if (error) throw error;
    if (currentHousehold) await fetchMembers(currentHousehold.id);
  }

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        members,
        userRole,
        isLoading,
        setCurrentHousehold,
        createHousehold,
        updateHousehold,
        inviteMember,
        removeMember,
        refreshHouseholds: fetchHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
