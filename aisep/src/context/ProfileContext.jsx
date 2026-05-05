import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import startupProfileService from '../services/startupProfileService';
import advisorService from '../services/advisorService';
import investorService from '../services/investorService';

/**
 * ProfileContext — Global, single-source-of-truth for profile status.
 *
 * Features:
 *  • Fetch runs immediately when `user` is set (login / page reload).
 *  • Background polling every POLL_INTERVAL ms so approval changes are
 *    reflected without the user refreshing the page.
 *  • `profileLoading` is true only on the FIRST fetch; subsequent polls
 *    are silent (no loading flash).
 *  • Any component can call `refreshProfile()` to force an immediate
 *    re-fetch (e.g. after submitting a profile update).
 */

const ProfileContext = createContext(null);

/** Polling interval — 30 seconds is a good balance between responsiveness
 *  and API load.  Increase to 60_000 if needed. */
const POLL_INTERVAL = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise approval status to a canonical string. */
function resolveStatus(profile) {
  if (!profile) return 'Missing';
  const raw = profile.approvalStatus ?? profile.status;
  const normalized = typeof raw === 'string' ? raw.toLowerCase() : raw;
  
  if (normalized === 1 || normalized === '1' || normalized === 'approved') return 'Approved';
  if (normalized === 2 || normalized === '2' || normalized === 'rejected') return 'Rejected';
  if (normalized === 0 || normalized === '0' || normalized === 'pending') return 'Pending';
  
  // Default to Pending when the profile exists but status is unknown
  return 'Pending';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ProfileProvider({ children }) {
  // ---- Startup ----
  const [startupProfile, setStartupProfile] = useState(null);
  const [startupProfileStatus, setStartupProfileStatus] = useState(null); // null = not yet fetched

  // ---- Investor ----
  const [investorProfile, setInvestorProfile] = useState(null);
  const [investorProfileStatus, setInvestorProfileStatus] = useState(null);

  // ---- Advisor ----
  const [advisorProfile, setAdvisorProfile] = useState(null);
  const [advisorProfileStatus, setAdvisorProfileStatus] = useState(null);

  // ---- Meta ----
  const [profileLoading, setProfileLoading] = useState(true); // starts true — waits for first fetch
  const [user, setUser] = useState(null);

  const pollingTimer = useRef(null);
  const isFetching = useRef(false);

  // ---------------------------------------------------------------------------
  // Core fetch — called on login, page reload, and by the polling timer.
  // ---------------------------------------------------------------------------
  const fetchProfile = useCallback(async (currentUser, isFirstLoad = false) => {
    if (!currentUser) return;
    if (isFetching.current) return; // prevent overlapping requests

    const token = localStorage.getItem('aisep_token');
    if (!token) return;

    isFetching.current = true;
    if (isFirstLoad) setProfileLoading(true);

    try {
      const roleStr = currentUser.role?.toString().toLowerCase() ?? '';
      const roleNum = Number(currentUser.role);

      // --- Startup ---
      if (roleStr === 'startup' || roleNum === 0) {
        const profile = await startupProfileService.getStartupMe();
        setStartupProfile(profile);
        setStartupProfileStatus(resolveStatus(profile));
      }

      // --- Investor ---
      if (roleStr === 'investor' || roleNum === 1) {
        try {
          const profile = await investorService.getMyProfile();
          setInvestorProfile(profile);
          setInvestorProfileStatus(resolveStatus(profile));
        } catch (err) {
          if (err?.statusCode === 404 || err?.response?.status === 404) {
            setInvestorProfile(null);
            setInvestorProfileStatus('Missing');
          } else {
            console.error('[ProfileContext] investor fetch error:', err);
          }
        }
      }

      // --- Advisor ---
      if (roleStr === 'advisor' || roleNum === 2) {
        try {
          const profile = await advisorService.getMyProfile();
          setAdvisorProfile(profile);
          setAdvisorProfileStatus(resolveStatus(profile));
        } catch (err) {
          if (err?.statusCode === 404 || err?.response?.status === 404) {
            setAdvisorProfile(null);
            setAdvisorProfileStatus('Missing');
          } else {
            console.error('[ProfileContext] advisor fetch error:', err);
          }
        }
      }
    } catch (err) {
      console.error('[ProfileContext] fetchProfile error:', err);
    } finally {
      isFetching.current = false;
      if (isFirstLoad) setProfileLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Start / stop polling
  // ---------------------------------------------------------------------------
  const startPolling = useCallback((currentUser) => {
    if (pollingTimer.current) clearInterval(pollingTimer.current);
    pollingTimer.current = setInterval(() => {
      fetchProfile(currentUser, false);
    }, POLL_INTERVAL);
  }, [fetchProfile]);

  const stopPolling = useCallback(() => {
    if (pollingTimer.current) {
      clearInterval(pollingTimer.current);
      pollingTimer.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Public: called by App.jsx when user logs in or is restored from storage.
  // ---------------------------------------------------------------------------
  const initProfile = useCallback((newUser) => {
    if (!newUser) {
      // Logout — clear everything
      setUser(null);
      setStartupProfile(null);
      setStartupProfileStatus(null);
      setInvestorProfile(null);
      setInvestorProfileStatus(null);
      setAdvisorProfile(null);
      setAdvisorProfileStatus(null);
      setProfileLoading(false); // not loading — just not logged in
      stopPolling();
      return;
    }

    setUser(newUser);

    // Immediate first fetch (shows loading indicator)
    fetchProfile(newUser, true);

    // Start seamless background polling
    startPolling(newUser);
  }, [fetchProfile, startPolling, stopPolling]);

  // Public: force an immediate refresh (e.g. after profile edit)
  const refreshProfile = useCallback(() => {
    if (user) fetchProfile(user, false);
  }, [user, fetchProfile]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // Derived booleans — computed here once for all consumers
  // ---------------------------------------------------------------------------
  const isStartupApproved = startupProfileStatus === 'Approved';
  const isInvestorApproved = investorProfileStatus === 'Approved';
  const isAdvisorApproved = advisorProfileStatus === 'Approved';

  const value = {
    // Startup
    startupProfile,
    startupProfileStatus,
    isStartupApproved,

    // Investor
    investorProfile,
    investorProfileStatus,
    isInvestorApproved,

    // Advisor
    advisorProfile,
    advisorProfileStatus,
    isAdvisorApproved,

    // Meta
    profileLoading,

    // Actions
    initProfile,
    refreshProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}

export default ProfileContext;
