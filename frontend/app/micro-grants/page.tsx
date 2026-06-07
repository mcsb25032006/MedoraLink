"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Heart, Clock, FileText, Plus, Users } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { GrantRequestForm } from "@/components/grant-request-form"
import { useCurrentUser } from "@/hooks/use-current-user"

type Grant = {
  id: number
  requesterName: string
  title: string
  description: string
  amountNeeded: number
  amountRaised: number
  timePosted: string
  supporters: number
  verified: boolean
  urgent: boolean
  requestor_id?: number | null
  created_at?: string
}

const myGrants = [
  {
    id: 1,
    title: "Blood Pressure Medication",
    description: "Need help covering monthly medication costs",
    amountNeeded: 120,
    amountRaised: 120,
    status: "completed",
    supporters: 7,
    dateCreated: "2024-01-15",
  },
]

export default function MicroGrantsPage() {
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [donatedGrants, setDonatedGrants] = useState<number[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<string>("browse")

  useEffect(() => {
    const loadGrants = async () => {
      try {
        const res = await fetch("/api/micro-grants")
        const data = await res.json()
        setGrants(Array.isArray(data?.micro_grants) ? data.micro_grants : [])
      } catch (e) {
        setGrants([])
      } finally {
        setLoading(false)
      }
    }
    loadGrants()
  }, [])

  const myGrantsForUser = useMemo(() => {
    if (!user) return [] as Grant[]
    const mine = grants.filter((g) => Number(g.requestor_id) === Number(user.id))
    return [...mine].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at || (Number(b.id || 0) - Number(a.id || 0))
    })
  }, [grants, user])

  const sortedGrants = useMemo(() => {
    return [...grants].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at || (Number(b.id || 0) - Number(a.id || 0))
    })
  }, [grants])

  const activeGrants = useMemo(() => {
    return sortedGrants.filter((g) => Number(g.amountRaised || 0) < Number(g.amountNeeded || 0))
  }, [sortedGrants])

  const handleDonate = (grantId: number, amount: number) => {
    // In a real app, this would open a payment modal
    setDonatedGrants((prev) => [...prev, grantId])
    // Redirect to checkout page
    window.location.href = `/checkout/grant-${grantId}?amount=${encodeURIComponent(Math.max(1, Math.round(amount)))}`
  }

  // Progress bar removed per request

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ ['--tile-accent' as any]: '#118C4F' }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Micro Grants</h1>
            <p className="text-gray-600">Support community members with small medical grants under $200</p>
          </div>
          <Button onClick={() => setShowGrantForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Grant
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="text-base h-11 py-0 rounded-lg font-medium border-2 border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Browse Grants</TabsTrigger>
            <TabsTrigger value="my-grants" className="text-base h-11 py-0 rounded-lg font-medium border-2 border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">My Grants</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Grants</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeGrants.length}</div>
                  <p className="text-xs text-muted-foreground">Seeking support</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${sortedGrants.reduce((sum, grant) => sum + grant.amountRaised, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Community support</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">People Helped</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sortedGrants.reduce((sum, grant) => sum + grant.supporters, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Supporters</p>
                </CardContent>
              </Card>
            </div>

            {/* Grant Requests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Current Grant Requests</h2>
                <p className="text-gray-600">{activeGrants.length} active requests</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedGrants.map((grant) => {
                const remainingAmount = grant.amountNeeded - grant.amountRaised
                const hasDonated = donatedGrants.includes(grant.id)

                return (
                  <Card key={grant.id} className="overflow-hidden rounded-xl tile-accent transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="p-5 space-y-3">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{grant.title}</h3>
                        <p className="text-gray-600">Requested by {grant.requesterName}</p>
                        <p className="text-gray-700 text-sm line-clamp-3">{grant.description}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{grant.created_at ? new Date(grant.created_at).toLocaleString() : grant.timePosted}</span>
                          <span className="flex items-center gap-1"><Users className="h-4 w-4" />{grant.supporters} supporters</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Funding</span>
                          <span className="text-gray-600">${grant.amountRaised} of ${grant.amountNeeded}</span>
                        </div>
                        <p className="text-xs text-gray-500">${remainingAmount} remaining</p>
                      </div>
                      <div className="space-y-2">
                        <Button onClick={() => handleDonate(grant.id, Math.max(1, remainingAmount))} disabled={hasDonated || remainingAmount === 0} className="w-full" variant={remainingAmount === 0 ? "secondary" : "default"}>
                          {remainingAmount === 0 ? ("Fully Funded") : hasDonated ? ("Donation Sent") : (<><Heart className="h-4 w-4 mr-2" />Donate Now</>)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-grants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Grant Requests</CardTitle>
                <CardDescription>Track your submitted grant requests and their progress</CardDescription>
              </CardHeader>
              <CardContent>
                {myGrantsForUser.length > 0 ? (
                  <div className="space-y-4">
                    {myGrantsForUser.map((grant) => {
                      const status = grant.amountRaised >= grant.amountNeeded ? "completed" : "active"
                      return (
                        <div key={grant.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{grant.title}</h3>
                            <Badge
                              variant={status === "completed" ? "default" : "secondary"}
                              className={status === "completed" ? "bg-green-100 text-green-800" : ""}
                            >
                              {status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{grant.description}</p>
                          <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>
                              ${grant.amountRaised} of ${grant.amountNeeded} raised
                            </span>
                            <span>{grant.supporters} supporters</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No grant requests yet</h3>
                    <p className="text-gray-600 mb-4">
                      Need help with medical expenses? Request a micro-grant from the community
                    </p>
                    <Button onClick={() => setShowGrantForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Request Your First Grant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Grant Request Form Modal */}
        {showGrantForm && (
          <GrantRequestForm
            onClose={() => setShowGrantForm(false)}
            onSubmitted={(newGrant: any) => {
              setGrants((prev) => [newGrant, ...prev])
              setActiveTab("my-grants")
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
