"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Heart, User, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [userType, setUserType] = useState<"patient" | "provider">("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { setUser } = useCurrentUser();

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const role = userType === "provider" ? "doctor" : "patient";
      const res = await fetch(api("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) throw new Error("failed");
      // Optional: create a basic profile
      const user = await res.json();
      setUser({ id: user.id, email: user.email, role });
      const [first_name, ...rest] = name.split(" ");
      const last_name = rest.join(" ");
      if (first_name) {
        await fetch(api("/api/profiles"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, first_name, last_name }),
        });
      }
      router.push(role === "doctor" ? "/doctor" : "/buy-meds");
    } catch (_) {
      alert("Signup failed. Please check your details and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">MedoraLink</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Join MedoraLink</h1>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Sign up to join the MedoraLink community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* User Type Selection */}
            <div className="space-y-3">
              <Label>I am a:</Label>
              <RadioGroup
                value={userType}
                onValueChange={(value: "patient" | "provider") =>
                  setUserType(value)
                }
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="patient" id="patient" />
                  <User className="h-4 w-4" />
                  <Label htmlFor="patient" className="flex-1 cursor-pointer">
                    Patient - Looking for affordable medications
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="provider" id="provider" />
                  <Stethoscope className="h-4 w-4" />
                  <Label htmlFor="provider" className="flex-1 cursor-pointer">
                    Healthcare Provider - Helping patients access care
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {userType === "provider" && (
              <div className="space-y-2">
                <Label htmlFor="work-email">
                  Work Email (for verification)
                </Label>
                <Input
                  id="work-email"
                  type="email"
                  placeholder="Enter your work email"
                />
                <p className="text-sm text-gray-500">
                  I will verify your healthcare provider status using your work
                  email
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in here
            </Link>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            By creating an account, you agree to the Terms of Service and
            Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
