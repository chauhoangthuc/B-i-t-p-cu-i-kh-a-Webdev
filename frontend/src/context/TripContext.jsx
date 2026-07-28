import React, { createContext, useContext, useState, useEffect } from 'react';
import { postgrest } from '../lib/postgrest.js';
import { useAuth } from './AuthContext.jsx';

const TripContext = createContext();

export function TripProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentTripId, setCurrentTripId] = useState(() => localStorage.getItem('currentTripId'));
  const [currentTripRole, setCurrentTripRole] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);

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
