"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Search,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Calendar,
  FileImage,
  File,
  Plus,
  Share2,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface Document {
  id: number;
  name: string;
  type:
    | "prescription"
    | "insurance"
    | "medical-record"
    | "lab-result"
    | "other";
  fileType: "pdf" | "jpg" | "png" | "doc";
  size: string;
  uploadDate: string;
  verified: boolean;
  fileUrl?: string;
  sharedWith?: string[];
}

interface CareProvider {
  id: number;
  name: string;
  email: string;
  specialty: string;
}

const documents: Document[] = [];

const careProviders: CareProvider[] = [];

// localStorage utility functions
const STORAGE_KEY = "mediSplit_documents";

const saveDocumentsToStorage = (documents: Document[]) => {
  try {
    // Convert file URLs to base64 for persistence (for demo purposes)
    const documentsToSave = documents.map((doc) => ({
      ...doc,
      // For demo, the fileUrl is kept as is, but in a real app the actual file would be saved
      fileUrl: doc.fileUrl || `/sample-${doc.type}.${doc.fileType}`,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documentsToSave));
  } catch (error) {
    console.error("Failed to save documents to localStorage:", error);
  }
};

const loadDocumentsFromStorage = (): Document[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure valid documents exist
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load documents from localStorage:", error);
  }
  return documents; // Return default documents if no saved data
};

// Function to clear all documents (useful for testing)
const clearAllDocuments = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear documents from localStorage:", error);
    return false;
  }
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [documentList, setDocumentList] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);
  const [shareMessage, setShareMessage] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load documents from localStorage on component mount
  useEffect(() => {
    const savedDocuments = loadDocumentsFromStorage();
    setDocumentList(savedDocuments);
    setIsLoaded(true);
  }, []);

  // Save documents to localStorage whenever documentList changes
  useEffect(() => {
    if (isLoaded) {
      saveDocumentsToStorage(documentList);
    }
  }, [documentList, isLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };

    if (openDropdownId !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdownId]);

  const handleDelete = (docId: number) => {
    setDocumentList((prev) => prev.filter((doc) => doc.id !== docId));
    toast({
      title: "Document deleted",
      description:
        "The document has been permanently removed and will not appear after page refresh.",
    });
  };

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, JPG, PNG, or DOC files only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    // Convert file to base64 for persistence
    const reader = new FileReader();
    reader.onload = () => {
      const newDocument: Document = {
        id: Date.now(),
        name: file.name,
        type: "other", // Default type, user can change later
        fileType: file.type.split("/")[1] as any,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        uploadDate: new Date().toISOString().split("T")[0],
        verified: false,
        fileUrl: reader.result as string, // This will be the base64 data URL
      };

      setDocumentList((prev) => [newDocument, ...prev]);
      setUploading(false);
      setIsUploadDialogOpen(false);

      toast({
        title: "Document uploaded",
        description:
          "Your document has been uploaded successfully and is pending verification.",
      });
    };

    reader.onerror = () => {
      setUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  };

  const handleShareDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setSelectedProviders([]);
    setShareMessage("");
    setIsShareDialogOpen(true);
  };

  const handleShareSubmit = () => {
    if (selectedProviders.length === 0) {
      toast({
        title: "No providers selected",
        description: "Please select at least one care provider to share with.",
        variant: "destructive",
      });
      return;
    }

    const sharedWithNames = careProviders
      .filter((provider) => selectedProviders.includes(provider.id))
      .map((provider) => provider.name);

    setDocumentList((prev) =>
      prev.map((doc) =>
        doc.id === selectedDocument?.id
          ? { ...doc, sharedWith: sharedWithNames }
          : doc
      )
    );

    setIsShareDialogOpen(false);
    toast({
      title: "Document shared",
      description: `Document shared with ${sharedWithNames.join(", ")}.`,
    });
  };

  const toggleDropdown = (docId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdownId(openDropdownId === docId ? null : docId);
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "jpg":
      case "png":
        return <FileImage className="h-8 w-8 text-blue-500" />;
      case "doc":
        return <File className="h-8 w-8 text-blue-600" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "prescription":
        return "bg-green-100 text-green-800";
      case "insurance":
        return "bg-blue-100 text-blue-800";
      case "medical-record":
        return "bg-purple-100 text-purple-800";
      case "lab-result":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fuzzy search function for filename matching
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (textLower.includes(queryLower)) return true;

    // Fuzzy match - check if all characters in query appear in order in text
    let queryIndex = 0;
    for (
      let i = 0;
      i < textLower.length && queryIndex < queryLower.length;
      i++
    ) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === queryLower.length;
  };

  // Calculate similarity score for sorting
  const getSimilarityScore = (text: string, query: string): number => {
    if (!query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower.includes(queryLower)) {
      return 100 - (textLower.indexOf(queryLower) / textLower.length) * 10;
    }

    // Fuzzy match score based on character positions
    let score = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;

    for (
      let i = 0;
      i < textLower.length && queryIndex < queryLower.length;
      i++
    ) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
        consecutiveMatches++;
        score += consecutiveMatches * 2; // Reward consecutive matches
      } else {
        consecutiveMatches = 0;
      }
    }

    // Normalize score
    return queryIndex === queryLower.length
      ? (score / textLower.length) * 50
      : 0;
  };

  const filteredDocuments = documentList
    .filter((doc) => {
      const matchesType = selectedType === "all" || doc.type === selectedType;

      if (!searchQuery) return matchesType;

      const searchLower = searchQuery.toLowerCase();

      // Check verification status
      const matchesVerification =
        (searchLower.includes("verified") && doc.verified) ||
        (searchLower.includes("pending") && !doc.verified) ||
        (searchLower.includes("under verification") && !doc.verified) ||
        (searchLower.includes("review") && !doc.verified);

      // Check filename with fuzzy matching
      const matchesFilename = fuzzyMatch(doc.name, searchQuery);

      // Check document type
      const matchesDocType = fuzzyMatch(
        doc.type.replace("-", " "),
        searchQuery
      );

      return (
        matchesType &&
        (matchesVerification || matchesFilename || matchesDocType)
      );
    })
    .sort((a, b) => {
      if (!searchQuery) return 0;

      // Sort by relevance score
      const scoreA = getSimilarityScore(a.name, searchQuery);
      const scoreB = getSimilarityScore(b.name, searchQuery);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }

      // If scores are equal, sort by verification status (verified first)
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1;
      }

      // Finally sort by upload date (newest first)
      return (
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
    });

  const documentStats = {
    total: documentList.length,
    verified: documentList.filter((doc) => doc.verified).length,
    pending: documentList.filter((doc) => !doc.verified).length,
  };

  // Show loading state while documents are being loaded
  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your documents...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Documents</h1>
            <p className="text-gray-600">
              Manage your medical documents and prescriptions
            </p>
            <p className="text-xs text-green-600 mt-1">
              ✓ Documents are automatically saved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <a href="/chatbot">Try AI Assistant (Beta)</a>
            </Button>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documentStats.total}</div>
              <p className="text-xs text-muted-foreground">Uploaded files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {documentStats.verified}
              </div>
              <p className="text-xs text-muted-foreground">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {documentStats.pending}
              </div>
              <p className="text-xs text-muted-foreground">Under review</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters (outer box removed) */}
        <div className="p-0">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by filename, status (verified/pending), or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base rounded-lg"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Search tips:</span> Try
                  "verified", "pending", "prescription", or partial filenames
                  like "met" for "Metformin"
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
              >
                All
              </Button>
              <Button
                variant={
                  selectedType === "prescription" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedType("prescription")}
              >
                Prescriptions
              </Button>
              <Button
                variant={selectedType === "insurance" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("insurance")}
              >
                Insurance
              </Button>
              <Button
                variant={
                  selectedType === "medical-record" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedType("medical-record")}
              >
                Records
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredDocuments.length} document
              {filteredDocuments.length !== 1 ? "s" : ""} found for "
              {searchQuery}"
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs"
            >
              Clear search
            </Button>
          </div>
        )}

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDocument(doc)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(doc.fileType)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.name}
                      </h3>
                      <p className="text-sm text-gray-500">{doc.size}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => toggleDropdown(doc.id, e)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {openDropdownId === doc.id && (
                      <div className="absolute right-0 top-8 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md">
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            handleViewDocument(doc);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </button>
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            if (doc.fileUrl) {
                              // Create a temporary link element to trigger download
                              const link = document.createElement("a");
                              link.href = doc.fileUrl;
                              link.download = doc.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);

                              toast({
                                title: "Download started",
                                description: `Downloading ${doc.name}`,
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            handleShareDocument(doc);
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </button>
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            if (
                              confirm(
                                `Are you sure you want to delete "${doc.name}"? This action cannot be undone.`
                              )
                            ) {
                              handleDelete(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      className={getTypeColor(doc.type)}
                      variant="secondary"
                    >
                      {doc.type.replace("-", " ")}
                    </Badge>
                    {doc.verified ? (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                  {doc.sharedWith && doc.sharedWith.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Share2 className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-blue-600">
                        Shared with {doc.sharedWith.length} provider
                        {doc.sharedWith.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No documents found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedType !== "all"
                  ? "Try adjusting your search or filters"
                  : "Upload your first document to get started"}
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Upload</CardTitle>
            <CardDescription>
              Drag and drop files here or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onClick={() => setIsUploadDialogOpen(true)}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG, DOC files up to 10MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Document Viewer Modal */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="!max-w-[95vw] !w-[95vw] md:!max-w-[90vw] md:!w-[90vw] h-[95vh] p-0 overflow-hidden border border-gray-200 rounded-2xl flex flex-col">
            {/* Header */}
            <div className="flex flex-col items-start px-6 sm:px-8 lg:px-10 py-4 gap-3 border-b bg-white">
              <div className="flex items-center space-x-3 w-full">
                {selectedDocument && getFileIcon(selectedDocument.fileType)}
                <div>
                  <DialogTitle className="text-lg font-semibold break-words">
                    {selectedDocument?.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    {selectedDocument?.type.replace("-", " ")} •{" "}
                    {selectedDocument?.size} • Uploaded{" "}
                    {selectedDocument &&
                      new Date(
                        selectedDocument.uploadDate
                      ).toLocaleDateString()}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedDocument?.fileUrl) {
                      // Create a temporary link element to trigger download
                      const link = document.createElement("a");
                      link.href = selectedDocument.fileUrl;
                      link.download = selectedDocument.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      toast({
                        title: "Download started",
                        description: `Downloading ${selectedDocument.name}`,
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedDocument?.fileUrl) {
                      const newTab = window.open();
                      if (newTab) {
                        newTab.document.write(
                          `<iframe src="${selectedDocument.fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                        );
                        newTab.document.title = selectedDocument.name;
                      }
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Fullscreen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShareDocument(selectedDocument!)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to delete "${selectedDocument?.name}"? This action cannot be undone.`
                      )
                    ) {
                      handleDelete(selectedDocument!.id);
                      setIsViewerOpen(false);
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto bg-gray-50 px-3 sm:px-4 py-4">
              <div className="max-w-full w-full mx-auto">
                {selectedDocument?.fileType === "pdf" ? (
                  <div className="bg-white rounded-lg shadow-sm border p-1 sm:p-2">
                    <div className="rounded-md overflow-hidden">
                      <iframe
                        src={`${selectedDocument.fileUrl}${
                          selectedDocument.fileUrl?.includes("#") ? "&" : "#"
                        }toolbar=0&navpanes=0&scrollbar=1&view=Fit`}
                        className="w-full h-[calc(95vh-200px)] min-h-[620px]"
                        title={selectedDocument.name}
                      />
                    </div>
                  </div>
                ) : selectedDocument?.fileType === "jpg" ||
                  selectedDocument?.fileType === "png" ? (
                  <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-center">
                    <img
                      src={selectedDocument.fileUrl}
                      alt={selectedDocument.name}
                      className="max-w-full max-h-[calc(95vh-240px)] min-h-[360px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-center h-[calc(95vh-240px)] min-h-[360px]">
                    <div className="text-center p-8">
                      <File className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Preview not available
                      </h3>
                      <p className="text-gray-600 mb-6">
                        This file type cannot be previewed in the browser.
                      </p>
                      <Button
                        onClick={() => {
                          if (selectedDocument?.fileUrl) {
                            // Create a temporary link element to trigger download
                            const link = document.createElement("a");
                            link.href = selectedDocument.fileUrl;
                            link.download = selectedDocument.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            toast({
                              title: "Download started",
                              description: `Downloading ${selectedDocument.name}`,
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download to view
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Document Modal */}
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Document</DialogTitle>
              <DialogDescription>
                Share "{selectedDocument?.name}" with your care providers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="providers">Select Care Providers</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {careProviders.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border rounded-lg border-dashed">
                      No care providers connected
                    </div>
                  ) : (
                    careProviders.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`provider-${provider.id}`}
                          checked={selectedProviders.includes(provider.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProviders([
                                ...selectedProviders,
                                provider.id,
                              ]);
                            } else {
                              setSelectedProviders(
                                selectedProviders.filter(
                                  (id) => id !== provider.id
                                )
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <label
                          htmlFor={`provider-${provider.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-gray-500">
                            {provider.specialty}
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a message for your care providers..."
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsShareDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleShareSubmit}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Document Modal */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a new medical document to your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onClick={handleUpload}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, PNG, DOC files up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}