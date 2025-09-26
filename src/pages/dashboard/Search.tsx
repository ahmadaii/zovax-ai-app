import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Calendar, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data for recent searches
const mockRecentSearches = [
  {
    id: 1,
    chatTitle: "Product Installation Guide",
    date: "2024-01-15",
    searchQuery: "how to install whatsapp bot",
    status: "completed"
  },
  {
    id: 2,
    chatTitle: "Customer Support Templates",
    date: "2024-01-14", 
    searchQuery: "customer service responses",
    status: "completed"
  },
  {
    id: 3,
    chatTitle: "API Integration Help",
    date: "2024-01-13",
    searchQuery: "API webhook setup",
    status: "completed"
  },
  {
    id: 4,
    chatTitle: "Billing and Pricing",
    date: "2024-01-12",
    searchQuery: "subscription plans pricing",
    status: "completed"
  },
  {
    id: 5,
    chatTitle: "Feature Updates",
    date: "2024-01-11",
    searchQuery: "new features changelog",
    status: "completed"
  }
];

export default function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(mockRecentSearches);
  const [historyFilter, setHistoryFilter] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // TODO: Implement actual search functionality with backend
    console.log("Searching for:", searchQuery);
    
    // Add to recent searches (mock implementation)
    const newSearch = {
      id: Date.now(),
      chatTitle: `Search: ${searchQuery}`,
      date: new Date().toISOString().split('T')[0],
      searchQuery: searchQuery,
      status: "completed"
    };
    
    setRecentSearches([newSearch, ...recentSearches.slice(0, 4)]);
    setSearchQuery("");
  };

  const handleDeleteSearch = (id: number) => {
    setRecentSearches(recentSearches.filter(search => search.id !== id));
  };

  const handleViewSearch = (id: number) => {
    navigate(`/dashboard/search/results/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter recent searches based on historyFilter
  const filteredSearches = recentSearches.filter(search =>
    search.chatTitle.toLowerCase().includes(historyFilter.toLowerCase()) ||
    search.searchQuery.toLowerCase().includes(historyFilter.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Your Memory Hub Awaits
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search through your knowledge base, chat history, and documents to find exactly what you need.
        </p>
      </div>

      {/* Search Section */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg border-2 border-border focus:border-primary transition-colors duration-200"
              />
            </div>
            <div className="flex justify-center">
              <Button 
                type="submit" 
                size="lg"
                className="px-8 py-3 text-lg bg-gradient-primary hover:opacity-90 transition-opacity duration-200"
              >
                Search Memory Hub
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Searches Section */}
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Searches
            </CardTitle>
            <CardDescription>
              Your recent search history and conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Input */}
            <div className="mb-6">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Filter search history..."
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredSearches.length === 0 ? (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  {historyFilter ? "No matches found" : "No searches yet"}
                </h3>
                <p className="text-muted-foreground">
                  {historyFilter ? "Try adjusting your filter" : "Start searching to see your history here"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chat Title</TableHead>
                    <TableHead>Search Query</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSearches.map((search) => (
                    <TableRow key={search.id}>
                      <TableCell className="font-medium">
                        {search.chatTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {search.searchQuery}
                      </TableCell>
                      <TableCell>
                        {formatDate(search.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {search.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSearch(search.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSearch(search.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}