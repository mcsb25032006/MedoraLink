"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Download,
  Share,
  Calendar,
  MapPin,
  Heart,
  Pill,
  Home,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type ReceiptGrant = {
  type: 'grant'
  receiptId: string
  date: string
  time: string
  title: string
  recipient?: string
  amount: number
  description?: string
  icon: typeof Heart
  status: string
  transactionId: string
}

type ReceiptMedicine = {
  type: 'medicine'
  receiptId: string
  date: string
  time: string
  title: string
  genericName?: string
  quantity?: string
  bulkPrice: number
  originalPrice: number
  savings: number
  estimatedDelivery?: string
  trackingNumber: string
  icon: typeof Pill
  status: string
  transactionId: string
}

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [receiptData, setReceiptData] = useState<ReceiptGrant | ReceiptMedicine | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const build = async () => {
      const idParam = String(params.id || '')
      const receiptId = `RCP-${Date.now().toString().slice(-6)}`
      const currentDate = new Date().toLocaleDateString()
      const currentTime = new Date().toLocaleTimeString()
      if (idParam.startsWith('grant-')) {
        const pureId = idParam.replace('grant-', '')
        const queryAmount = Number(searchParams.get('amount') || 0)
        try {
          const res = await fetch('/api/micro-grants')
          const data = await res.json()
          const grants = Array.isArray(data?.micro_grants) ? data.micro_grants : []
          const g = grants.find((x: any) => String(x.id) === String(pureId))
          const remaining = g ? Math.max(0, Number(g.amountNeeded || 0) - Number(g.amountRaised || 0)) : 0
          const amount = queryAmount > 0 ? queryAmount : Math.max(1, remaining || 25)
          setReceiptData({
            type: 'grant',
            receiptId,
            date: currentDate,
            time: currentTime,
            title: g?.title || 'Grant Donation',
            recipient: g?.requesterName || undefined,
            amount,
            description: g?.description || undefined,
            icon: Heart,
            status: 'completed',
            transactionId: `TXN-${Date.now().toString().slice(-8)}`,
          })
        } catch {
          setReceiptData({
            type: 'grant',
            receiptId,
            date: currentDate,
            time: currentTime,
            title: 'Grant Donation',
            amount: queryAmount || 25,
            icon: Heart,
            status: 'completed',
            transactionId: `TXN-${Date.now().toString().slice(-8)}`,
          } as ReceiptGrant)
        }
      } else {
        const pureId = idParam.replace('metformin-', '')
        try {
          const res = await fetch(`/api/medicines/${pureId}`)
          if (res.ok) {
            const m = await res.json()
            const base = 45
            const discount = 17
            const originalPrice = base
            const savings = discount
            const bulkPrice = Math.max(1, originalPrice - savings)
            setReceiptData({
              type: 'medicine',
              receiptId,
              date: currentDate,
              time: currentTime,
              title: m?.name || `Medicine #${pureId}`,
              genericName: m?.generic_name || undefined,
              quantity: '30 tablets',
              bulkPrice,
              originalPrice,
              savings,
              estimatedDelivery: '3-5 business days',
              trackingNumber: `TRK${Date.now().toString().slice(-10)}`,
              icon: Pill,
              status: 'confirmed',
              transactionId: `TXN-${Date.now().toString().slice(-8)}`,
            })
          } else {
            setReceiptData({
              type: 'medicine',
              receiptId,
              date: currentDate,
              time: currentTime,
              title: `Medicine #${pureId}`,
              bulkPrice: 28,
              originalPrice: 45,
              savings: 17,
              estimatedDelivery: '3-5 business days',
              trackingNumber: `TRK${Date.now().toString().slice(-10)}`,
              icon: Pill,
              status: 'confirmed',
              transactionId: `TXN-${Date.now().toString().slice(-8)}`,
            } as ReceiptMedicine)
          }
        } catch {
          setReceiptData({
            type: 'medicine',
            receiptId,
            date: currentDate,
            time: currentTime,
            title: `Medicine #${pureId}`,
            bulkPrice: 28,
            originalPrice: 45,
            savings: 17,
            estimatedDelivery: '3-5 business days',
            trackingNumber: `TRK${Date.now().toString().slice(-10)}`,
            icon: Pill,
            status: 'confirmed',
            transactionId: `TXN-${Date.now().toString().slice(-8)}`,
          } as ReceiptMedicine)
        }
      }
      setLoading(false)
    }
    void build()
  }, [params.id, searchParams])

  const generateFallbackPdf = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const marginX = 15;
    let y = 20;
    pdf.setFontSize(18);
    pdf.text(
      receiptData.type === "grant" ? "Donation Receipt" : "Order Receipt",
      marginX,
      y
    );
    y += 8;
    pdf.setFontSize(11);
    pdf.text(`Receipt ID: ${receiptData.receiptId}`, marginX, y);
    y += 6;
    pdf.text(`Date: ${receiptData.date}  ${receiptData.time}`, marginX, y);
    y += 10;
    pdf.setFontSize(14);
    pdf.text("Details", marginX, y);
    y += 7;
    pdf.setFontSize(11);
    pdf.text(`Title: ${receiptData.title}`, marginX, y);
    y += 6;
    if (receiptData.type === "medicine") {
      pdf.text(`Generic: ${receiptData.genericName}`, marginX, y);
      y += 6;
      pdf.text(`Quantity: ${receiptData.quantity}`, marginX, y);
      y += 6;
      pdf.text(`Total Paid: $${receiptData.bulkPrice}`, marginX, y);
      y += 6;
      pdf.text(`Status: ${receiptData.status}`, marginX, y);
      y += 10;
      pdf.text(
        `Estimated Delivery: ${receiptData.estimatedDelivery}`,
        marginX,
        y
      );
      y += 6;
      pdf.text(`Tracking: ${receiptData.trackingNumber}`, marginX, y);
      y += 10;
    } else {
      pdf.text(`Recipient: ${receiptData.recipient}`, marginX, y);
      y += 6;
      pdf.text(`Amount: $${receiptData.amount}`, marginX, y);
      y += 6;
      pdf.text(`Status: ${receiptData.status}`, marginX, y);
      y += 10;
      pdf.text(`Description:`, marginX, y);
      y += 6;
      const descLines = pdf.splitTextToSize(`${receiptData.description}`, 180);
      pdf.text(descLines, marginX, y);
      y += descLines.length * 6 + 4;
    }
    pdf.setFontSize(11);
    pdf.text(`Transaction ID: ${receiptData.transactionId}`, marginX, y);
    y += 10;
    pdf.setDrawColor(230);
    pdf.line(marginX, y, 210 - marginX, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.text("Thank you for your support!", marginX, y);
    pdf.save("receipt.pdf");
  };

  const IconComponent = useMemo(() => receiptData?.icon || CheckCircle, [receiptData])

  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const element = receiptRef.current;
      if (!element) return;
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (doc) => {
            try {
              // Inject a CSS override to eliminate OKLCH and gradients
              const style = doc.createElement("style");
              style.setAttribute("id", "h2c-reset-colors");
              style.appendChild(
                doc.createTextNode(`
                  #receipt-to-print, #receipt-to-print * { 
                    background: #ffffff !important; 
                    background-color: #ffffff !important; 
                    background-image: none !important;
                    color: #111111 !important; 
                    border-color: #e5e7eb !important; 
                    box-shadow: none !important; 
                    text-shadow: none !important; 
                  }
                  #receipt-to-print .bg-blue-50 { background-color: #eff6ff !important; }
                  #receipt-to-print .text-blue-700 { color: #1d4ed8 !important; }
                  #receipt-to-print .text-blue-800 { color: #1e40af !important; }
                  #receipt-to-print .bg-green-100 { background-color: #dcfce7 !important; }
                  #receipt-to-print .text-green-600 { color: #16a34a !important; }
                  #receipt-to-print .text-gray-600 { color: #4b5563 !important; }
                  #receipt-to-print .text-gray-900 dark:text-gray-100 { color: #111827 !important; }
                  #receipt-to-print .border { border-color: #e5e7eb !important; }
                `)
              );
              doc.head.appendChild(style);

              const root = doc.getElementById("receipt-to-print");
              if (!root) return;
              (root as HTMLElement).style.backgroundColor = "#ffffff";
            } catch {}
          },
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(
          (pageWidth - 20) / canvas.width,
          (pageHeight - 20) / canvas.height
        );
        const imgWidth = canvas.width * ratio;
        const imgHeight = canvas.height * ratio;
        const x = (pageWidth - imgWidth) / 2;
        const y = 10;
        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
        pdf.save("receipt.pdf");
      } catch (err) {
        // Fallback to a simple programmatic PDF if html2canvas fails due to color parsing
        generateFallbackPdf();
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    // In a real app, this would open a share dialog
    alert("Share functionality would be implemented here");
  };

  if (loading || !receiptData) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Receipt</h1>
            <p className="text-gray-600">Loading receipt...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div
        id="receipt-to-print"
        className="max-w-2xl mx-auto space-y-6"
        ref={receiptRef}
      >
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {receiptData.type === "grant"
                ? "Donation Successful!"
                : "Order Confirmed!"}
            </h1>
            <p className="text-gray-600">
              {receiptData.type === "grant"
                ? "Thank you for supporting a community member"
                : "Your medication order has been confirmed"}
            </p>
          </div>
        </div>

        {/* Receipt Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <IconComponent className="h-5 w-5" />
              <span>Receipt</span>
            </CardTitle>
            <CardDescription>Receipt #{receiptData.receiptId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Transaction Details */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <IconComponent className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {receiptData.title}
                  </h3>
                  {receiptData.type === "medicine" ? (
                    <>
                      <p className="text-gray-600">{receiptData.genericName}</p>
                      <p className="text-sm text-gray-500">
                        {receiptData.quantity}
                      </p>
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 mt-2"
                      >
                        {receiptData.status === "confirmed"
                          ? "Order Confirmed"
                          : "Completed"}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600">
                        Donation to {receiptData.recipient}
                      </p>
                      <p className="text-sm text-gray-500">
                        {receiptData.description}
                      </p>
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 mt-2"
                      >
                        Donation Complete
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Order Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Order Summary</h4>
                {receiptData.type === "medicine" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Original Price:</span>
                      <span className="line-through text-gray-500">
                        ${receiptData.originalPrice}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bulk Price:</span>
                      <span>${receiptData.bulkPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>You Saved:</span>
                      <span>${receiptData.savings}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Paid:</span>
                      <span>${receiptData.bulkPrice}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Donation Amount:</span>
                      <span>${receiptData.amount}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Processing Fee:</span>
                      <span>$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Donated:</span>
                      <span>${receiptData.amount}</span>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Transaction Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Transaction Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{receiptData.date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <p className="font-medium">{receiptData.time}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Transaction ID:</span>
                    <p className="font-medium font-mono text-xs">
                      {receiptData.transactionId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Info (for medicines only) */}
              {receiptData.type === "medicine" && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Delivery Information
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-blue-800">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Estimated Delivery
                        </span>
                      </div>
                      <p className="text-blue-700 text-sm">
                        {receiptData.estimatedDelivery}
                      </p>
                      <div className="flex items-center space-x-2 text-blue-800 mt-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Tracking Number
                        </span>
                      </div>
                      <p className="text-blue-700 text-sm font-mono">
                        {receiptData.trackingNumber}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Next Steps */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">What's Next?</h4>
              {receiptData.type === "medicine" ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • You'll receive email updates about your order status
                  </li>
                  <li>• Track your package using the tracking number above</li>
                  <li>• Contact support if you have any questions</li>
                </ul>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • Your donation will help {receiptData.recipient} access
                    needed medication
                  </li>
                  <li>
                    • You'll receive updates on how your contribution made a
                    difference
                  </li>
                  <li>• Thank you for being part of this caring community</li>
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center space-x-4">
          <Link href="/profile">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          {receiptData.type === "medicine" ? (
            <Link href="/buy-meds">
              <Button>Continue Shopping</Button>
            </Link>
          ) : (
            <Link href="/micro-grants">
              <Button>View More Grants</Button>
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
