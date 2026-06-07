"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Upload, FileText, DollarSign, CheckCircle } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"

interface GrantRequestFormProps {
  onClose: () => void
  onSubmitted?: (grant: any) => void
}

export function GrantRequestForm({ onClose, onSubmitted }: GrantRequestFormProps) {
  const { user } = useCurrentUser()
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    description: "",
    reason: "",
  })
  const [documentName, setDocumentName] = useState<string | null>(null)
  const [documentData, setDocumentData] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setDocumentName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        setDocumentData(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveDocument = () => {
    setDocumentName(null)
    setDocumentData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/micro-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          amount: Number(formData.amount),
          description: formData.description,
          userId: user?.id,
          email: user?.email,
          reason: formData.reason,
          documentName,
          documentData,
        })
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        throw new Error(msg?.error || 'Failed to submit')
      }
      const payload = await res.json().catch(() => ({}))
      if (payload?.micro_grant && typeof onSubmitted === 'function') {
        onSubmitted(payload.micro_grant)
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Request Micro Grant</CardTitle>
            <CardDescription>Request financial support from the community (up to $200)</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grant Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Grant Information</h3>

              <div className="space-y-2">
                <Label htmlFor="title">Grant Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Emergency Insulin Supply, Heart Medication Support"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount Needed (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="150"
                    className="pl-10"
                    value={formData.amount}
                    onChange={(e) => handleInputChange("amount", e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Maximum grant amount is $200</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tell Your Story</h3>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Explain your situation and why you need this grant. Be specific about your medical condition and financial circumstances."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500">
                  Be honest and detailed. This helps community members understand your situation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Why do you need this grant? *</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Lost job and can't afford medication, Insurance doesn't cover full cost, Unexpected medical expenses"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>

            {/* Supporting Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Supporting Documents</h3>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />

              {documentName ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{documentName}</p>
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 animate-bounce" /> Document attached
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveDocument}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">Upload supporting documents (optional but recommended)</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Medical bills, prescription receipts, insurance statements, etc.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUploadClick}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Grant Guidelines</p>
                  <ul className="text-blue-700 mt-1 space-y-1 list-disc list-inside">
                    <li>Grants are for medical expenses only</li>
                    <li>Maximum amount is $200 per request</li>
                    <li>All requests are reviewed for authenticity</li>
                    <li>Funds go directly to medical providers when possible</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Submitting..." : "Submit Grant Request"}
              </Button>
            </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
