"use client";
 
import { useEffect, useState } from "react";
import { registerLoading } from "@/lib/api";
import LoadingSpinner from "../loadspinner/LoadSpinner";
 
export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);
 
  useEffect(() => {
    registerLoading(setLoading);           // Axios can now show/hide the loader
    return () => registerLoading(undefined);
  }, []);
 
  if (!loading) return null;
 
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/30">
      <LoadingSpinner />
    </div>
  );
}