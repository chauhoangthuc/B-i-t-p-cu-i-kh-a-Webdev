import React, { createContext, useContext, useState, useEffect } from 'react';
import { postgrest } from '../lib/postgrest.js';
import { useAuth } from './AuthContext.jsx';

const TripContext = createContext();

export function TripProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentTripId, setCurrentTripId] = useState(() => localStorage.getItem('currentTripId'));
  const [currentTripRole, setCurrentTripRole] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);

  // Auto-select trip on login/switch account
  useEffect(() => {
    if (!currentUser) {
      setCurrentTripId(null);
      return;
    }

    const verifyAndAutoSelect = async () => {
      try {
        if (currentTripId) {
          const res = await postgrest.get(`/trip_members?trip_id=eq.${currentTripId}&user_id=eq.${currentUser.id}`);
          if (res.data && res.data.length > 0) {
            // currentTripId is valid for the new user, do nothing
            return;
          }
        }
        
        // Fetch first trip for this user and auto select it
        const tripsRes = await postgrest.get('/trips?limit=1');
        if (tripsRes.data && tripsRes.data.length > 0) {
          setCurrentTripId(tripsRes.data[0].id);
        } else {
          setCurrentTripId(null);
        }
      } catch (err) {
        console.error('Error verifying active trip:', err);
      }
    };

    verifyAndAutoSelect();
  }, [currentUser]);

  useEffect(() => {
    if (currentTripId) {
      localStorage.setItem('currentTripId', currentTripId);
      if (currentUser) {
        // Fetch membership role for the current trip
        postgrest.get(`/trip_members?trip_id=eq.${currentTripId}&user_id=eq.${currentUser.id}`)
          .then(res => {
            if (res.data && res.data.length > 0) {
              setCurrentTripRole(res.data[0].role);
            } else {
              setCurrentTripRole(null);
            }
          })
          .catch(() => setCurrentTripRole(null));

        // Fetch trip details
        postgrest.get(`/trips?id=eq.${currentTripId}`)
          .then(res => {
            if (res.data && res.data.length > 0) {
              setCurrentTrip(res.data[0]);
            } else {
              setCurrentTrip(null);
            }
          })
          .catch(() => setCurrentTrip(null));
      }
    } else {
      localStorage.removeItem('currentTripId');
      setCurrentTripRole(null);
      setCurrentTrip(null);
    }
  }, [currentTripId, currentUser]);

  const value = {
    currentTripId,
    setCurrentTripId,
    currentTripRole,
    currentTrip,
    setCurrentTrip
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  return useContext(TripContext);
}
