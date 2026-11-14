"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { weatherQueryOptions } from "@/lib/query-cache";

const STORAGE_KEY = "ptp-weather-location";

const WeatherContext = createContext(null);

function readStoredCoordinates() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const latitude = Number(parsed?.latitude);
    const longitude = Number(parsed?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function writeStoredCoordinates(coords) {
  if (typeof window === "undefined" || !coords) {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function WeatherProvider({ children }) {
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  const resolveFromGeolocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      const stored = readStoredCoordinates();
      if (stored) {
        setCoords(stored);
        setLocationStatus("cached");
        return;
      }
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        writeStoredCoordinates(next);
        setCoords(next);
        setLocationStatus("ready");
      },
      (error) => {
        const stored = readStoredCoordinates();
        if (stored) {
          setCoords(stored);
          setLocationStatus(error.code === 1 ? "cached-denied" : "cached");
          return;
        }
        setLocationStatus(error.code === 1 ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30 * 60 * 1000,
        timeout: 12_000,
      },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resolveFromGeolocation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resolveFromGeolocation]);

  const forecastQuery = useQuery({
    queryKey: coords
      ? queryKeys.weather(coords.latitude, coords.longitude)
      : ["weather", "pending"],
    queryFn: () => weatherApi.forecast(coords.latitude, coords.longitude),
    enabled: Boolean(coords),
    ...weatherQueryOptions(),
  });

  const value = useMemo(
    () => ({
      coords,
      locationStatus,
      refreshLocation: resolveFromGeolocation,
      forecast: forecastQuery.data,
      forecastQuery,
    }),
    [coords, locationStatus, resolveFromGeolocation, forecastQuery],
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error("useWeather must be used within WeatherProvider");
  }
  return ctx;
}
