'use client';

import { Button } from "@/components/ui/button";
import { seedData } from "@/lib/seed";
import { useState } from "react";

export default function SeedPage() {
  const [status, setStatus] = useState("Idle");

  const handleSeed = async () => {
    setStatus("Seeding...");
    try {
      await seedData();
      setStatus("Complete!");
    } catch (error) {
      console.error(error);
      setStatus("Error (Check Console)");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Seeder</h1>
      <p className="mb-4 text-slate-600">
        This will create a sample Fireside and 3 Snippets.
      </p>
      <div className="flex items-center gap-4">
        <Button onClick={handleSeed} disabled={status === "Seeding..."}>
          Run Seed Script
        </Button>
        <span className="font-mono">{status}</span>
      </div>
    </div>
  );
}
