"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";

type Notification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read?: boolean;
  created_at?: string;
  action_url?: string;
};

export default function NotificationsPage() {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api(`/api/notifications?user_id=${user.id}`));
      if (!res.ok) throw new Error("Failed to load notifications");
      const list = await res.json();
      const normalized = Array.isArray(list) ? list : [];
      const sorted = [...normalized].sort((a: Notification, b: Notification) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime || b.id - a.id;
      });
      setItems(sorted);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await fetch(
      api(`/api/notifications/clear?action=read&user_id=${user.id}`),
      { method: "POST" }
    );
    await load();
  };

  const clearAll = async () => {
    if (!user?.id) return;
    await fetch(
      api(`/api/notifications/clear?action=delete&user_id=${user.id}`),
      { method: "POST" }
    );
    await load();
  };

  const markOneRead = async (notif: Notification) => {
    if (notif.read) return;
    // Optimistic update
    setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    try {
      await fetch(api(`/api/notifications/${notif.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("medoralink:notifications-updated", { detail: { delta: -1 } })
        );
      }
    } catch {
      // Rollback on failure
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: false } : n)));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
            <p className="text-gray-600">
              Stay updated on your medication requests and community activity
            </p>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={markAllRead}
              disabled={loading || items.length === 0}
            >
              Mark all read
            </Button>
            <Button
              variant="destructive"
              onClick={clearAll}
              disabled={loading || items.length === 0}
            >
              Clear all
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {items.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "transition-colors",
                !n.read && "bg-blue-50 border-blue-200"
              )}
              onClick={() => void markOneRead(n)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div
                    className={cn(
                      "p-2 rounded-full bg-gray-100",
                      n.read ? "text-gray-400" : "text-blue-500"
                    )}
                  >
                    <Bell className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {n.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {!n.read && <Badge variant="secondary">New</Badge>}
                        {n.created_at && (
                          <span className="text-sm text-gray-500">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4">{n.message}</p>

                    <div className="flex items-center space-x-2">
                      {n.action_url && (
                        <Link href={`${n.action_url}?notif_id=${n.id}`}>
                          <Button size="sm">Take Action</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No notifications
              </h3>
              <p className="text-gray-600">
                You're all caught up! Check back later for updates.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter((c): c is string => Boolean(c)).join(" ")
}
