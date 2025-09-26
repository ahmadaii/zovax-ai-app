import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, FileText, Clock, Search, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Enhanced mock data with detailed results
const mockSearchResults = {
  1: {
    id: 1,
    chatTitle: "Product Installation Guide",
    searchQuery: "how to install whatsapp bot",
    date: "2024-01-15",
    status: "completed",
    aiResponse: "To install a WhatsApp bot, you'll need to follow these key steps: 1) Set up a WhatsApp Business API account, 2) Configure webhook endpoints, 3) Implement authentication tokens, 4) Create message handlers for incoming requests. The process typically involves using Meta's official WhatsApp Business Platform.",
    conversationHistory: [
      { role: "user", content: "I need help installing a WhatsApp bot for my business", timestamp: "2024-01-15 10:30" },
      { role: "assistant", content: "I'll help you set up a WhatsApp bot. First, do you have a WhatsApp Business account?", timestamp: "2024-01-15 10:31" },
      { role: "user", content: "Yes, I have a business account but I'm new to APIs", timestamp: "2024-01-15 10:32" },
      { role: "assistant", content: "Perfect! Let me walk you through the installation process step by step...", timestamp: "2024-01-15 10:33" }
    ],
    relevantDocuments: [
      { title: "WhatsApp Business API Setup Guide", snippet: "Complete guide to setting up WhatsApp Business API with webhook configuration...", url: "/docs/whatsapp-setup" },
      { title: "Bot Authentication Tutorial", snippet: "Learn how to implement secure authentication for your WhatsApp bot...", url: "/docs/auth-tutorial" },
      { title: "Message Handling Best Practices", snippet: "Best practices for handling incoming and outgoing messages...", url: "/docs/message-handling" }
    ],
    relatedSearches: ["whatsapp webhook setup", "bot authentication", "message templates"]
  },
  2: {
    id: 2,
    chatTitle: "Customer Support Templates",
    searchQuery: "customer service responses",
    date: "2024-01-14",
    status: "completed",
    aiResponse: "Here are some effective customer service response templates: 1) Acknowledgment responses for issue reports, 2) Escalation templates for complex problems, 3) Follow-up templates for checking satisfaction, 4) Apology templates for service disruptions. Each template should be personalized while maintaining professional tone.",
    conversationHistory: [
      { role: "user", content: "I need templates for customer service responses", timestamp: "2024-01-14 14:20" },
      { role: "assistant", content: "I can help you create professional customer service templates. What type of interactions do you handle most?", timestamp: "2024-01-14 14:21" },
      { role: "user", content: "Mostly support tickets and complaint handling", timestamp: "2024-01-14 14:22" }
    ],
    relevantDocuments: [
      { title: "Customer Service Templates Library", snippet: "Professional templates for various customer service scenarios...", url: "/docs/templates" },
      { title: "Communication Guidelines", snippet: "Best practices for professional customer communication...", url: "/docs/communication" }
    ],
    relatedSearches: ["support ticket templates", "complaint handling", "customer communication"]
  }
};

export default function SearchResults() {
  const { searchId } = useParams<{ searchId: string }>();
  const navigate = useNavigate();
  const [searchResult, setSearchResult] = useState<any>(null);

  useEffect(() => {
    if (searchId) {
      const result = mockSearchResults[parseInt(searchId) as keyof typeof mockSearchResults];
      setSearchResult(result);
    }
  }, [searchId]);

  const handleBackToSearch = () => {
    navigate("/dashboard/search");
  };

  const handleCopyResponse = () => {
    if (searchResult?.aiResponse) {
      navigator.clipboard.writeText(searchResult.aiResponse);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!searchResult) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={handleBackToSearch} className="cursor-pointer">
                Search
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Results</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Search not found
          </h3>
          <p className="text-muted-foreground mb-4">
            The search you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={handleBackToSearch} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={handleBackToSearch} className="cursor-pointer">
              Search
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{searchResult.chatTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{searchResult.chatTitle}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formatDate(searchResult.date)}</span>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {searchResult.status}
            </Badge>
          </div>
        </div>
        <Button onClick={handleBackToSearch} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>

      {/* Search Query */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Original Search Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium bg-muted/50 p-4 rounded-lg border">
            "{searchResult.searchQuery}"
          </p>
        </CardContent>
      </Card>

      {/* AI Response */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Generated Response
            </CardTitle>
            <Button onClick={handleCopyResponse} variant="ghost" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed">{searchResult.aiResponse}</p>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
          </CardTitle>
          <CardDescription>
            Full conversation thread from this search session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {searchResult.conversationHistory.map((message: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">{message.timestamp}</p>
                  </div>
                </div>
                {index < searchResult.conversationHistory.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relevant Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relevant Documents
          </CardTitle>
          <CardDescription>
            Related documents and resources found during this search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {searchResult.relevantDocuments.map((doc: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-2">{doc.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{doc.snippet}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-4">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Searches</CardTitle>
          <CardDescription>
            You might also be interested in these searches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {searchResult.relatedSearches.map((search: string, index: number) => (
              <Badge key={index} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                {search}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <Button onClick={handleBackToSearch} className="bg-gradient-primary hover:opacity-90">
          <Search className="h-4 w-4 mr-2" />
          New Search
        </Button>
        <Button variant="outline" onClick={handleBackToSearch}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search History
        </Button>
      </div>
    </div>
  );
}