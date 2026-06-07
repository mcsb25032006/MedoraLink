"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Heart,
  Menu,
  ShoppingCart,
  Gift,
  DollarSign,
  User,
  FileText,
  Bell,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { api } from "@/lib/api"

const navigation = [
  { name: "Buy Meds", href: "/buy-meds", icon: ShoppingCart },
  { name: "Donate Meds", href: "/donate-meds", icon: Gift },
  { name: "Micro Grants", href: "/micro-grants", icon: DollarSign },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Documents", href: "/documents", icon: FileText },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useCurrentUser()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [displayName, setDisplayName] = useState<string>("")
  const [roleLabel, setRoleLabel] = useState<string>("")
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [avatarUrl, setAvatarUrl] = useState<string>("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const initials = useMemo(() => {
    const source = displayName || user?.email || ""
    return source.trim().slice(0, 2).toUpperCase() || "U"
  }, [displayName, user?.email])

  const loadProfileAndUnread = async () => {
    if (!user?.id) {
      setDisplayName("")
      setRoleLabel("")
      setUnreadCount(0)
      return
    }
    try {
      // Role label
      setRoleLabel(user.role === "doctor" ? "Doctor" : "Patient")
      // Name from profile, fallback to email prefix
      const pRes = await fetch(api(`/api/profiles?user_id=${user.id}`))
      if (pRes.ok) {
        const list = await pRes.json()
        const p = Array.isArray(list) ? list[0] : null
        if (p) {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
          setDisplayName(name || (user.email ? String(user.email).split("@")[0] : ""))
          setAvatarUrl(p.avatar_url || "")
        } else {
          setDisplayName(user.email ? String(user.email).split("@")[0] : "")
          setAvatarUrl("")
        }
      } else {
        setDisplayName(user.email ? String(user.email).split("@")[0] : "")
        setAvatarUrl("")
      }
      // Unread notifications count
      const nRes = await fetch(api(`/api/notifications?user_id=${user.id}`))
      if (nRes.ok) {
        const list = await nRes.json()
        const arr = Array.isArray(list) ? list : []
        const unread = arr.filter((n: any) => !n.read).length
        setUnreadCount(unread)
      } else {
        setUnreadCount(0)
      }
    } catch {
      setUnreadCount(0)
    }
  }

  useEffect(() => {
    void loadProfileAndUnread()
  }, [user?.id])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ delta?: number }>
      if (ce?.detail && typeof ce.detail.delta === "number") {
        setUnreadCount((prev) => Math.max(0, prev + (ce.detail.delta as number)))
      } else {
        void loadProfileAndUnread()
      }
    }
    window.addEventListener("medoralink:notifications-updated", handler as EventListener)
    window.addEventListener("medoralink:profile-updated", handler as EventListener)
    return () => window.removeEventListener("medoralink:notifications-updated", handler as EventListener)
  }, [])

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "w-full" : "w-64")}>
      {/* Logo */}
      <div className="flex items-center space-x-2 p-6 border-b">
        <Heart className="h-8 w-8 text-primary animate-pulse-subtle" />
        <span className="text-xl font-bold gradient-text">MedoraLink</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover-lift",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl hover:bg-muted transition-colors">
          <Avatar className="ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || "/user-avatar.jpg"} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName || "Your Profile"}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start hover-lift">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b sticky top-0 z-50">
        <div className="px-4 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Heart className="h-9 w-9 text-primary animate-pulse-subtle" />
              <span className="text-2xl font-bold gradient-text">MedoraLink</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-5 py-3 rounded-xl text-base font-medium transition-all duration-200 hover-lift",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right side - User info, notifications, and theme toggle */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="hover-lift"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}

              {/* User Profile */}
              <Link
                href="/profile"
                className="hidden md:flex items-center space-x-4 hover:bg-muted rounded-xl p-3 transition-all duration-200 hover-lift"
              >
                <Avatar className="ring-2 ring-primary/20 h-10 w-10">
                  <AvatarImage src={avatarUrl || "/user-avatar.jpg"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground truncate">{displayName || "Your Profile"}</p>
                  <p className="text-sm text-muted-foreground truncate">{roleLabel}</p>
                </div>
              </Link>

              {/* Notifications */}
              <Link href="/notifications">
                <Button variant="ghost" size="lg" className="relative hover-lift">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse-subtle">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Mobile Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="lg" className="lg:hidden hover-lift">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-64">
                  <Sidebar mobile />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 animate-fade-in-up">{children}</main>
    </div>
  )
}
