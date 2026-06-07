"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Search, Heart, Users, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";



type Medicine = {
  id: number;
  name: string;
  generic_name: string;
  description?: string;
  expire_at?: string | null;
  current_demand: number;
  required_demand: number;
};

type WishlistItem = {
  id: number;
  user_id: number;
  medicine_id: number;
  approved?: boolean;
  created_at?: string;
};

export default function BuyMedsPage() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Medicine[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const wishlistMedIds = new Set(wishlist.map((w) => w.medicine_id));

  const fetchWishlist = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(api(`/api/wishlists?user_id=${user.id}`));
      if (res.ok) {
        const list = await res.json();
        setWishlist(Array.isArray(list) ? list : []);
      }
    } catch {}
  };

  useEffect(() => {
    void fetchWishlist();
  }, [user?.id]);

  const handleSearch = async (override?: string) => {
    const q = (override ?? searchQuery).trim();
    setLoading(true);
    setError(null);
    setSearchActive(true);
    try {
      const url = q
        ? api(`/api/medicines?query=${encodeURIComponent(q)}`)
        : api(`/api/medicines`);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const list = (await res.json()) as Medicine[];
      setResults(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Failed to search");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (medId: number) => {
    if (!user?.id) {
      alert("Please log in to add to wishlist.");
      return;
    }
    const existing = wishlist.find((w) => w.medicine_id === medId);
    try {
      if (!existing) {
        const res = await fetch(api(`/api/wishlists`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            medicine_id: medId,
            quantity: 1,
          }),
        });
        if (!res.ok) throw new Error("Failed to add to wishlist");
        const created = (await res.json()) as WishlistItem;
        setWishlist((prev) => [...prev, created]);
        // Optimistically reflect demand increase for this medicine in the search results
        setResults((prev) =>
          prev.map((m) =>
            m.id === medId
              ? {
                  ...m,
                  current_demand: Math.max(0, Number(m.current_demand) + 1),
                }
              : m
          )
        );
        alert("Request sent for verification");
        // New notification created for the user → increment badge
        try {
          window.dispatchEvent(
            new CustomEvent("medoralink:notifications-updated", {
              detail: { delta: 1 },
            })
          );
        } catch {}
      } else {
        const res = await fetch(api(`/api/wishlists/${existing.id}`), {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove from wishlist");
        setWishlist((prev) => prev.filter((w) => w.id !== existing.id));
        // Optimistically reflect demand decrease for this medicine in the search results
        setResults((prev) =>
          prev.map((m) =>
            m.id === medId
              ? {
                  ...m,
                  current_demand: Math.max(0, Number(m.current_demand) - 1),
                }
              : m
          )
        );
      }
    } catch (e: any) {
      alert(e?.message || "Wishlist action failed");
    }
  };

  const getDemandProgress = (current: number, required: number) => {
    if (!required) return 0;
    return Math.min(
      100,
      Math.max(0, (Number(current) / Number(required)) * 100)
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ ['--tile-accent' as any]: '#0f1e36' }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Buy Medicines</h1>
          <p className="text-gray-600">
            Search for medications and join community bulk orders
          </p>
        </div>

        <div className="p-2">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search for medicines (e.g., Metformin, Lisinopril)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="text-lg bg-white shadow-lg ring-1 ring-primary/20 focus:shadow-xl focus:ring-2 focus:ring-primary/40 rounded-xl"
              />
            </div>
            <Button onClick={() => handleSearch()} size="lg" disabled={loading}>
              <Search className="h-5 w-5 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
            {searchActive && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchActive(false);
                  setResults([]);
                  setError(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>



        {searchActive && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Search Results</h2>
              <p className="text-gray-600">{results.length} medicines found</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((med) => {
              const demandProgress = getDemandProgress(
                med.current_demand,
                med.required_demand
              );
              const isInWishlist = wishlistMedIds.has(med.id);
              return (
                <Card key={med.id} className="overflow-hidden tile-accent rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{med.name}</h3>
                      <p className="text-gray-600">{med.generic_name}</p>
                      {med.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{med.description}</p>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Community Demand</span>
                        </span>
                        <span className="font-medium">
                          {Number(med.current_demand)}/{Number(med.required_demand)} people
                        </span>
                      </div>
                      <AnimatedProgress value={demandProgress} height={16} rounded="rounded" />
                    </div>
                    <Button
                      onClick={() => toggleWishlist(med.id)}
                      variant={isInWishlist ? "destructive" : "default"}
                      className="w-full"
                    >
                      {isInWishlist ? (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Cancel Request
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Add to Wishlist
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        )}

        {searchActive && !loading && results.length === 0 && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No medicines found
              </h3>
              <p className="text-gray-600 mb-4">
                Try a different name or check the spelling.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                setSearchActive(false);
              }}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
