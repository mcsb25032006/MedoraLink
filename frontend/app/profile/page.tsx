"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Camera, Shield, Edit } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, setUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    emergencyContact: "",
    medicalConditions: "",
    allergies: "",
    bio: "",
    avatarUrl: "",
  });
  const [counters, setCounters] = useState({
    medicine_purchases: 0,
    donations: 0,
    grant_given: 0,
  });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const uRes = await fetch(api(`/api/users/${user.id}`));
        if (uRes.ok) {
          const u = await uRes.json();
          setProfileData((prev) => ({ ...prev, email: u.email || "" }));
        }
        const pRes = await fetch(api(`/api/profiles?user_id=${user.id}`));
        if (pRes.ok) {
          const list = await pRes.json();
          const p = Array.isArray(list) ? list[0] : null;
          if (p) {
            setProfileId(p.id);
            const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
            setProfileData({
              name,
              email: p.email || user.email || "",
              phone: p.phone || "",
              address: p.address || "",
              dateOfBirth: p.date_of_birth || "",
              emergencyContact: p.emergency_contact || "",
              medicalConditions: Array.isArray(p.medical_conditions)
                ? p.medical_conditions.join(", ")
                : p.medical_conditions || "",
              allergies: Array.isArray(p.allergies)
                ? p.allergies.join(", ")
                : p.allergies || "",
              bio: p.bio || "",
              avatarUrl: p.avatar_url || "",
            });
          }
        }
        const cRes = await fetch(api(`/api/counters?user_id=${user.id}`));
        if (cRes.ok) {
          const list = await cRes.json();
          const c = Array.isArray(list) ? list[0] : null;
          if (c)
            setCounters({
              medicine_purchases: Number(c.medicine_purchases || 0),
              donations: Number(c.donations || 0),
              grant_given: Number(c.grant_given || 0),
            });
        }
        // Dynamically compute total donations made by this user (lifetime)
        const dRes = await fetch(api(`/api/donations?donor_id=${user.id}`));
        if (dRes.ok) {
          const list = await dRes.json();
          const totalDonations = Array.isArray(list) ? list.length : 0;
          setCounters((prev) => ({
            ...prev,
            donations: totalDonations,
          }));
        }
      } catch (_) {}
    };
    void load();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    const [first_name, ...rest] = (profileData.name || "").split(" ");
    const last_name = rest.join(" ");
    const payload: any = {
      user_id: user.id,
      first_name: first_name || "",
      last_name: last_name || "",
      phone: profileData.phone,
      address: profileData.address,
      emergency_contact: profileData.emergencyContact,
      date_of_birth: profileData.dateOfBirth,
      bio: profileData.bio,
      avatar_url: profileData.avatarUrl || undefined,
      medical_conditions: profileData.medicalConditions
        ? profileData.medicalConditions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      allergies: profileData.allergies
        ? profileData.allergies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
    try {
      if (profileId) {
        await fetch(api(`/api/profiles/${profileId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(api(`/api/profiles`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setProfileId(created.id);
        }
      }
      setIsEditing(false);
      alert("Profile updated successfully!");
      try { window.dispatchEvent(new CustomEvent("medoralink:profile-updated")) } catch {}
    } catch (_) {
      alert("Failed to save profile");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const stats = useMemo(
    () => [
      {
        label: "Medicines Purchased",
        value: String(counters.medicine_purchases),
        icon: "💊",
      },
      {
        label: "Donations Made",
        value: String(counters.donations),
        icon: "🎁",
      },
      {
        label: "Grants Supported",
        value: String(counters.grant_given),
        icon: "💝",
      },
      {
        label: "Community Impact",
        value: String(
          counters.medicine_purchases +
            counters.donations +
            counters.grant_given
        ),
        icon: "❤️",
      },
    ],
    [counters]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
            <p className="text-gray-600">
              Manage your account settings and personal information
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/documents">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </Button>
            </Link>
            <Button
              onClick={() => {
                if (isEditing) {
                  void handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              variant={isEditing ? "default" : "outline"}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatarUrl || "/user-avatar.jpg"} />
                    <AvatarFallback className="text-2xl">
                      {(profileData.name || " ")
                        .trim()
                        .slice(0, 2)
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                {isEditing && (
                  <>
                    <input
                      id="avatar-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !user?.id) return
                        try {
                          const fd = new FormData()
                          fd.append("file", file)
                          fd.append("userId", String(user.id))
                          const res = await fetch(`/api/upload-avatar`, { method: 'POST', body: fd })
                          if (!res.ok) throw new Error('Upload failed')
                          const data = await res.json()
                          const url = data?.url as string
                          if (url) {
                            setProfileData((prev) => ({ ...prev, avatarUrl: url }))
                            // Persist avatar url to profile immediately
                            try {
                              if (profileId) {
                                await fetch(api(`/api/profiles/${profileId}`), {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ avatar_url: url }),
                                })
                              }
                            } catch {}
                            try { window.dispatchEvent(new CustomEvent("medoralink:profile-updated")) } catch {}
                          }
                        } catch (err: any) {
                          alert(err?.message || 'Failed to upload')
                        } finally {
                          try { (e.target as HTMLInputElement).value = '' } catch {}
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                      onClick={() => document.getElementById('avatar-input')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </>
                )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {profileData.name || "Your Name"}
                </h2>
                <p className="text-gray-600 mb-2">
                  {profileData.email || user?.email || ""}
                </p>

                <div className="flex justify-center space-x-2 mb-4">
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role === "doctor"
                      ? "Verified Doctor"
                      : "Verified Patient"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  {profileData.bio}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="destructive"
                  className="mt-6 w-full"
                  onClick={() => {
                    setUser(null);
                    window.location.href = "/";
                  }}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="medical">Medical Info</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={profileData.dateOfBirth}
                          onChange={(e) =>
                            handleInputChange("dateOfBirth", e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency">Emergency Contact</Label>
                      <Input
                        id="emergency"
                        placeholder="Name - Phone Number"
                        value={profileData.emergencyContact}
                        onChange={(e) =>
                          handleInputChange("emergencyContact", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell the community about yourself..."
                        value={profileData.bio}
                        onChange={(e) =>
                          handleInputChange("bio", e.target.value)
                        }
                        disabled={!isEditing}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medical" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Information</CardTitle>
                    <CardDescription>
                      This information helps healthcare providers verify your
                      medication requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="conditions">Medical Conditions</Label>
                      <Textarea
                        id="conditions"
                        placeholder="List your current medical conditions..."
                        value={profileData.medicalConditions}
                        onChange={(e) =>
                          handleInputChange("medicalConditions", e.target.value)
                        }
                        disabled={!isEditing}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies</Label>
                      <Textarea
                        id="allergies"
                        placeholder="List any known allergies..."
                        value={profileData.allergies}
                        onChange={(e) =>
                          handleInputChange("allergies", e.target.value)
                        }
                        disabled={!isEditing}
                        rows={2}
                      />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">
                            Privacy Notice
                          </p>
                          <p className="text-yellow-700 mt-1">
                            Your medical information is encrypted and only
                            shared with verified healthcare providers for
                            medication verification purposes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and privacy preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            Two-Factor Authentication
                          </h4>
                          <p className="text-sm text-gray-600">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Change Password</h4>
                          <p className="text-sm text-gray-600">
                            Update your account password
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-gray-600">
                            Manage your notification preferences
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Privacy Settings</h4>
                          <p className="text-sm text-gray-600">
                            Control who can see your profile information
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {isEditing && (
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
