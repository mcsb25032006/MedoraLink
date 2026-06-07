"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Heart, CheckCircle, AlertTriangle, Key } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [validationError, setValidationError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidationError("Reset token is missing from the link.");
      setIsValidating(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(api(`/api/auth/verify-reset-token?token=${token}`));
        const data = await res.json();
        if (res.ok && data.valid) {
          setIsValidToken(true);
          setUserEmail(data.email || "");
        } else {
          setValidationError(data.error || "The reset link is invalid or has expired.");
        }
      } catch (_) {
        setValidationError("Could not connect to authentication server.");
      } finally {
        setIsValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const res = await fetch(api("/api/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  if (isValidating) {
    return (
      <Card className="shadow-xl rounded-2xl border border-gray-100 p-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Verifying reset token...</p>
        </div>
      </Card>
    );
  }

  if (!isValidToken) {
    return (
      <Card className="shadow-xl rounded-2xl border border-gray-100">
        <CardHeader className="text-center">
          <div className="mx-auto bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription className="text-red-600 font-medium">
            {validationError}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            For security reasons, password reset links are only valid for 1 hour and can only be used once. Please request a new link.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/95 transition-colors"
          >
            Request New Link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="shadow-xl rounded-2xl border border-gray-100">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Password Reset Success</CardTitle>
          <CardDescription>
            Your account security has been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
            <p className="text-xs text-green-700 font-medium">
              Your new password is active! You can now log in to your account.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/95 transition-colors"
          >
            Go to Sign In
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl rounded-2xl border border-gray-100">
      <CardHeader>
        <CardTitle>Create New Password</CardTitle>
        <CardDescription>
          Setting a new password for <span className="font-semibold text-gray-900">{userEmail}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full text-base font-semibold py-2.5 rounded-xl"
            disabled={isResetting}
          >
            {isResetting ? "Resetting password..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
          <p className="text-gray-600 font-medium">Complete your security update</p>
        </div>

        <Suspense fallback={
          <Card className="shadow-xl rounded-2xl border border-gray-100 p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">Loading...</p>
            </div>
          </Card>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
