"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Check, X, User, Gift, Heart, ClipboardList } from "lucide-react"
import { api } from "@/lib/api"
import { useCurrentUser } from "@/hooks/use-current-user"

type UserModel = { id: number; email: string }

type Wishlist = {
  id: number
  user_id: number
  medicine_id: number
  approved?: boolean
  created_at?: string
  rejected_at?: string
}

type Donation = {
  id: number
  donor_id?: number
  medicine_id?: number | null
  medicine_name?: string
  quantity: number | string
  created_at?: string
  medicine_expires_at?: string | null
  claimed_by?: number | null
  claim_status?: "pending" | "approved" | "rejected" | null
}

type Medicine = { id: number; name: string; generic_name: string }

export default function DoctorDashboardPage() {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserModel[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [donations, setDonations] = useState<Donation[]>([])

  const userById = useMemo(() => {
    const m = new Map<number, UserModel>()
    for (const u of users) m.set(u.id, u)
    return m
  }, [users])

  const medicineById = useMemo(() => {
    const m = new Map<number, Medicine>()
    for (const med of medicines) m.set(med.id, med)
    return m
  }, [medicines])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [uRes, mRes, wRes, dRes] = await Promise.all([
        fetch(api(`/api/users`)),
        fetch(api(`/api/medicines`)),
        fetch(api(`/api/wishlists`)),
        fetch(api(`/api/donations`)),
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (mRes.ok) setMedicines(await mRes.json())
      if (wRes.ok) setWishlists(await wRes.json())
      if (dRes.ok) setDonations(await dRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const approveWishlist = async (id: number) => {
    await fetch(api(`/api/wishlists/${id}/approve`), { method: "POST" })
    await loadAll()
    try { window.dispatchEvent(new CustomEvent("medoralink:notifications-updated", { detail: { delta: 1 } })) } catch {}
  }

  const rejectWishlist = async (id: number) => {
    await fetch(api(`/api/wishlists/${id}/reject`), { method: "POST" })
    await loadAll()
    try { window.dispatchEvent(new CustomEvent("medoralink:notifications-updated", { detail: { delta: 1 } })) } catch {}
  }

  const approveDonationClaim = async (id: number) => {
    await fetch(api(`/api/donations/${id}/approve-claim`), { method: "POST" })
    await loadAll()
    try { window.dispatchEvent(new CustomEvent("medoralink:notifications-updated", { detail: { delta: 1 } })) } catch {}
  }

  const rejectDonationClaim = async (id: number) => {
    await fetch(api(`/api/donations/${id}/reject-claim`), { method: "POST" })
    await loadAll()
    try { window.dispatchEvent(new CustomEvent("medoralink:notifications-updated", { detail: { delta: 1 } })) } catch {}
  }

  const pendingWishlists = wishlists.filter(w => w.approved !== true && !w.rejected_at)
  const pendingDonationClaims = donations.filter(d => d.claimed_by && d.claim_status === "pending")

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Doctor Console</h1>
            <p className="text-gray-600">Review and decide on patient requests</p>
          </div>
          <div className="flex items-center">
            <a href="/" className="text-sm text-red-600 hover:underline">Sign Out</a>
          </div>
        </div>

        <Tabs defaultValue="wishlists" className="w-full">
          <TabsList>
            <TabsTrigger value="wishlists">Wishlist Approvals</TabsTrigger>
            <TabsTrigger value="donations">Donation Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="wishlists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Medicine Requests</CardTitle>
                <CardDescription>Patients requesting to buy via bulk order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingWishlists.length === 0 && (
                  <p className="text-sm text-gray-500">No pending requests.</p>
                )}
                {pendingWishlists.map((w) => {
                  const patient = userById.get(w.user_id)
                  const med = medicineById.get(w.medicine_id)
                  return (
                    <div key={w.id} className="p-4 border rounded-lg flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Heart className="h-4 w-4 text-pink-600" />
                          <span className="font-medium">{med?.name || `Medicine #${w.medicine_id}`}</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Patient: {patient?.email || `User #${w.user_id}`}</span>
                        </div>
                        {w.created_at && (
                          <p className="text-xs text-gray-500">Requested at {new Date(w.created_at).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => approveWishlist(w.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button onClick={() => rejectWishlist(w.id)} size="sm" variant="destructive">
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Donation Claims</CardTitle>
                <CardDescription>Patients requesting donated medicines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingDonationClaims.length === 0 && (
                  <p className="text-sm text-gray-500">No pending donation claims.</p>
                )}
                {pendingDonationClaims.map((d) => {
                  const patient = d.claimed_by ? userById.get(Number(d.claimed_by)) : undefined
                  const medName = d.medicine_name || medicineById.get(Number(d.medicine_id || 0))?.name || `Donation #${d.id}`
                  return (
                    <div key={d.id} className="p-4 border rounded-lg flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Gift className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{medName}</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Patient: {patient?.email || (d.claimed_by ? `User #${d.claimed_by}` : "Unknown")}</span>
                        </div>
                        {d.created_at && (
                          <p className="text-xs text-gray-500">Donated at {new Date(d.created_at).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => approveDonationClaim(d.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button onClick={() => rejectDonationClaim(d.id)} size="sm" variant="destructive">
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
