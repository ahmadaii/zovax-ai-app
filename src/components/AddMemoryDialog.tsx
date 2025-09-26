import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, FileText, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMemory: (memory: any) => void;
  editingItem?: any;
}

export function AddMemoryDialog({ open, onOpenChange, onAddMemory, editingItem }: AddMemoryDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("website");

  // Website form state
  const [websiteData, setWebsiteData] = useState({
    title: "",
    url: "",
    category: "Development"
  });

  // Note form state
  const [noteData, setNoteData] = useState({
    title: "",
    content: "",
    category: "Support",
    tags: ""
  });

  // Document form state
  const [documentData, setDocumentData] = useState({
    title: "",
    category: "Setup",
    file: null as File | null
  });

  const categories = ["Setup", "Development", "Support", "Updates"];

  // Clear form when dialog is closed and not editing
  useEffect(() => {
    if (!open && !editingItem) {
      setWebsiteData({ title: "", url: "", category: "Development" });
      setNoteData({ title: "", content: "", category: "Support", tags: "" });
      setDocumentData({ title: "", category: "Setup", file: null });
      setActiveTab("website");
    }
  }, [open, editingItem]);

  // Populate form when editing
  useEffect(() => {
    if (editingItem) {
      switch (editingItem.type) {
        case "website":
          setWebsiteData({
            title: editingItem.title,
            url: editingItem.source || "",
            category: editingItem.category
          });
          setActiveTab("website");
          break;
        case "note":
          setNoteData({
            title: editingItem.title,
            content: editingItem.content || "",
            category: editingItem.category,
            tags: editingItem.tags || ""
          });
          setActiveTab("note");
          break;
        case "document":
        case "template":
        case "faq":
          setDocumentData({
            title: editingItem.title,
            category: editingItem.category,
            file: null
          });
          setActiveTab("document");
          break;
      }
    }
  }, [editingItem]);

  const handleWebsiteSubmit = async () => {
    if (!websiteData.title || !websiteData.url) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newMemory = {
        id: Date.now(),
        title: websiteData.title,
        type: "website",
        category: websiteData.category,
        lastModified: new Date().toISOString().split('T')[0],
        size: "1.2 MB",
        author: "You",
        source: websiteData.url
      };

      onAddMemory(newMemory);
      setWebsiteData({ title: "", url: "", category: "Development" });
      
      toast({
        title: "Website Added",
        description: "Website content has been scraped and added to your knowledge base.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add website to knowledge base.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteSubmit = async () => {
    if (!noteData.title || !noteData.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMemory = {
        id: Date.now(),
        title: noteData.title,
        type: "note",
        category: noteData.category,
        lastModified: new Date().toISOString().split('T')[0],
        size: `${Math.round(noteData.content.length / 1024)} KB`,
        author: "You",
        tags: noteData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      onAddMemory(newMemory);
      setNoteData({ title: "", content: "", category: "Support", tags: "" });
      
      toast({
        title: "Note Added",
        description: "Your note has been added to the knowledge base.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note to knowledge base.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSubmit = async () => {
    if (!documentData.title || !documentData.file) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newMemory = {
        id: Date.now(),
        title: documentData.title,
        type: "document",
        category: documentData.category,
        lastModified: new Date().toISOString().split('T')[0],
        size: `${(documentData.file.size / (1024 * 1024)).toFixed(1)} MB`,
        author: "You",
        fileName: documentData.file.name
      };

      onAddMemory(newMemory);
      setDocumentData({ title: "", category: "Setup", file: null });
      
      toast({
        title: "Document Uploaded",
        description: "Your document has been processed and added to the knowledge base.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document to knowledge base.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentData(prev => ({ ...prev, file }));
      if (!documentData.title) {
        setDocumentData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Upload className="h-5 w-5 text-primary-foreground" />
            </div>
            {editingItem ? "Edit Memory" : "Add Memory"}
          </DialogTitle>
          <DialogDescription>
            {editingItem 
              ? "Update your knowledge base item with new information."
              : "Add websites, notes, or documents to your knowledge base to enhance AI responses."
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </TabsTrigger>
            <TabsTrigger value="note" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-title">Title *</Label>
                <Input
                  id="website-title"
                  placeholder="e.g., ZOVAX API Documentation"
                  value={websiteData.title}
                  onChange={(e) => setWebsiteData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL *</Label>
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://example.com"
                  value={websiteData.url}
                  onChange={(e) => setWebsiteData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website-category">Category</Label>
                <Select value={websiteData.category} onValueChange={(value) => setWebsiteData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  The website content will be scraped and processed to enhance your AI assistant's knowledge.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleWebsiteSubmit} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update Website" : "Add Website"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title *</Label>
                <Input
                  id="note-title"
                  placeholder="e.g., Customer Support Guidelines"
                  value={noteData.title}
                  onChange={(e) => setNoteData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note-content">Content *</Label>
                <Textarea
                  id="note-content"
                  placeholder="Write your note content here..."
                  className="min-h-[200px]"
                  value={noteData.content}
                  onChange={(e) => setNoteData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note-category">Category</Label>
                <Select value={noteData.category} onValueChange={(value) => setNoteData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleNoteSubmit} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update Note" : "Add Note"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-title">Title *</Label>
                <Input
                  id="document-title"
                  placeholder="e.g., User Manual v2.1"
                  value={documentData.title}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-category">Category</Label>
                <Select value={documentData.category} onValueChange={(value) => setDocumentData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-file">File *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="document-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="document-file" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      {documentData.file ? documentData.file.name : "Click to upload file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOC, DOCX, TXT, MD, JSON files
                    </p>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your document will be processed and indexed to enhance your AI assistant's knowledge.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleDocumentSubmit} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update Document" : "Upload Document"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}