import { useState } from "react";
import { BookOpen, Upload, FileText, Folder, Search, Plus, Filter, Download, Edit, Trash2, Globe, StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddMemoryDialog } from "@/components/AddMemoryDialog";
import { useToast } from "@/hooks/use-toast";

// Mock data for knowledge base items
const mockKnowledgeItems = [{
  id: 1,
  title: "WhatsApp Bot Setup Guide",
  type: "document",
  category: "Setup",
  lastModified: "2024-01-15",
  size: "2.4 MB",
  author: "Admin"
}, {
  id: 2,
  title: "API Integration Documentation",
  type: "document",
  category: "Development",
  lastModified: "2024-01-14",
  size: "1.8 MB",
  author: "Tech Team"
}, {
  id: 3,
  title: "Customer Support Templates",
  type: "template",
  category: "Support",
  lastModified: "2024-01-13",
  size: "856 KB",
  author: "Support Team"
}, {
  id: 4,
  title: "Feature Release Notes",
  type: "document",
  category: "Updates",
  lastModified: "2024-01-12",
  size: "1.2 MB",
  author: "Product Team"
}, {
  id: 5,
  title: "Troubleshooting FAQ",
  type: "faq",
  category: "Support",
  lastModified: "2024-01-11",
  size: "3.1 MB",
  author: "Support Team"
}];
const categories = ["All", "Setup", "Development", "Support", "Updates"];
export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [knowledgeItems, setKnowledgeItems] = useState(mockKnowledgeItems);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const filteredItems = knowledgeItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "template":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "faq":
        return <BookOpen className="h-4 w-4 text-green-500" />;
      case "website":
        return <Globe className="h-4 w-4 text-primary" />;
      case "note":
        return <StickyNote className="h-4 w-4 text-accent" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "document":
        return "bg-muted text-muted-foreground";
      case "template":
        return "bg-primary/10 text-primary";
      case "faq":
        return "bg-accent/10 text-accent";
      case "website":
        return "bg-primary/10 text-primary";
      case "note":
        return "bg-accent/10 text-accent";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const handleAddMemory = (newMemory: any) => {
    if (editingItem) {
      // Update existing item
      setKnowledgeItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...newMemory, id: editingItem.id } : item
      ));
      setEditingItem(null);
      toast({
        title: "Memory Updated",
        description: "The knowledge base item has been successfully updated.",
      });
    } else {
      // Add new item
      setKnowledgeItems(prev => [newMemory, ...prev]);
      toast({
        title: "Memory Added",
        description: "New knowledge base item has been successfully added.",
      });
    }
  };

  const handleEdit = (id: number) => {
    const item = knowledgeItems.find(item => item.id === id);
    if (item) {
      setEditingItem(item);
      setIsAddMemoryOpen(true);
    }
  };

  const handleDelete = (id: number) => {
    const item = knowledgeItems.find(item => item.id === id);
    if (item) {
      setKnowledgeItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Memory Deleted",
        description: `"${item.title}" has been successfully deleted.`,
        variant: "destructive",
      });
    }
  };

  const handleDownload = (id: number) => {
    const item = knowledgeItems.find(item => item.id === id);
    if (item) {
      // Create mock file content based on type
      let content = "";
      let mimeType = "";
      let extension = "";

      switch (item.type) {
        case "document":
          content = `# ${item.title}\n\nThis is a sample document from the knowledge base.\n\nCategory: ${item.category}\nAuthor: ${item.author}\nLast Modified: ${item.lastModified}`;
          mimeType = "text/plain";
          extension = ".txt";
          break;
        case "template":
          content = `Template: ${item.title}\n\nThis is a sample template that can be used for ${item.category.toLowerCase()} purposes.\n\nCreated by: ${item.author}`;
          mimeType = "text/plain";
          extension = ".txt";
          break;
        case "faq":
          content = `FAQ: ${item.title}\n\nQ: What is this FAQ about?\nA: This FAQ covers information about ${item.category.toLowerCase()}.\n\nMaintained by: ${item.author}`;
          mimeType = "text/plain";
          extension = ".txt";
          break;
        default:
          content = `${item.title}\n\nContent from the knowledge base.`;
          mimeType = "text/plain";
          extension = ".txt";
      }

      try {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, "_")}${extension}`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download Started",
          description: `"${item.title}" is being downloaded.`,
        });
      } catch (error) {
        toast({
          title: "Download Failed",
          description: "There was an error downloading the file.",
          variant: "destructive",
        });
      }
    }
  };
  return <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your documents, templates, and knowledge resources
          </p>
        </div>
        <Button onClick={() => setIsAddMemoryOpen(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{knowledgeItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length - 1}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.3 MB</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input type="text" placeholder="Search documents, templates, and FAQs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map(category => <DropdownMenuItem key={category} onClick={() => setSelectedCategory(category)}>
                    {category}
                  </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & Resources</CardTitle>
          <CardDescription>
            {filteredItems.length} of {knowledgeItems.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(item.type)}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.author}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{formatDate(item.lastModified)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(item.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddMemoryDialog 
        open={isAddMemoryOpen}
        onOpenChange={(open) => {
          setIsAddMemoryOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
        onAddMemory={handleAddMemory}
        editingItem={editingItem}
      />
    </div>;
}