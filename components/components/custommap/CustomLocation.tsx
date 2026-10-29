"use client";

import { useEffect, useRef } from "react";

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type CustomLocationProps = {
  onLocation?: (location: LocationCoordinates) => void;
};

export default function CustomLocation({
  onLocation,
}: CustomLocationProps) {
  const hasRequested = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests during the component's lifetime.
    if (hasRequested.current) return;

    hasRequested.current = true;

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Store latitude and longitude in cookies for 1 day.
        const expires = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        const secure = window.location.protocol === "https:" ? "; Secure" : "";

        document.cookie = `latitude=${location.latitude}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;

        document.cookie = `longitude=${location.longitude}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;

        // Send the coordinates to the parent component if needed.
        onLocation?.(location);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error("Location permission denied by the user.");
            break;

          case error.POSITION_UNAVAILABLE:
            console.error("Location information is unavailable.");
            break;

          case error.TIMEOUT:
            console.error("Location request timed out.");
            break;

          default:
            console.error("Unable to retrieve location:", error.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );
  }, [onLocation]);

  return null;
}