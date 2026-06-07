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
import { Heart, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMTP states
  const [isRealMailSent, setIsRealMailSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(api("/api/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process reset request.");
      }

      setIsRealMailSent(data.sent);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 hover:opacity-90 transition-opacity">
            <Heart className="h-8 w-8 text-primary animate-pulse" />
            <span className="text-2xl font-bold text-primary">MedoraLink</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset Your Password</h1>
          <p className="text-gray-600 font-medium">Regain access to your account</p>
        </div>

        <Card className="shadow-xl rounded-2xl border border-gray-100">
          <CardHeader>
            <CardTitle>
              {isSubmitted ? "Check Inbox" : "Forgot Password?"}
            </CardTitle>
            <CardDescription>
              {isSubmitted
                ? "Follow the instructions in the reset link."
                : "Enter the email associated with your account to receive a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-6 py-2">
                {isRealMailSent ? (
                  <div className="flex flex-col items-center justify-center bg-green-50 p-4 rounded-xl border border-green-200">
                    <CheckCircle className="h-10 w-10 text-green-600 mb-2 animate-pulse" />
                    <p className="text-sm font-semibold text-green-900 text-center">
                      Reset Link Sent!
                    </p>
                    <p className="text-xs text-green-700 text-center mt-1">
                      Password reset instructions have been emailed to <span className="font-semibold break-all">{email}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <CheckCircle className="h-10 w-10 text-blue-600 mb-2" />
                    <p className="text-sm font-semibold text-blue-900 text-center">
                      Reset Link Simulated!
                    </p>
                    <p className="text-xs text-blue-700 text-center mt-1">
                      Since you are running locally without SMTP configuration, the reset link has been logged to the **backend server console**.
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 leading-relaxed text-center font-medium">
                    ⚠️ You must copy the reset link from your email or backend terminal log and paste it into your browser to complete the password reset securely.
                  </p>
                </div>

                <div className="text-center space-y-3">
                  <Button
                    variant="outline"
                    className="w-full py-2.5 rounded-xl text-sm"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail("");
                    }}
                  >
                    Try Another Email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 animate-in fade-in duration-200">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full text-base font-semibold py-2.5 rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending link..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t pt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-primary hover:underline font-medium gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
