import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Eye, Search as SearchIcon, Trash2 } from "lucide-react";

export type RecentSearch = {
  id: number;
  chatTitle: string;
  date: string;
  searchQuery: string;
  status: string;
};

export function RecentSearches({
  items,
  onDelete,
  onView,
}: {
  items: RecentSearch[];
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}) {
  const [historyFilter, setHistoryFilter] = React.useState("");

  const filtered = items.filter(
    (s) =>
      s.chatTitle.toLowerCase().includes(historyFilter.toLowerCase()) ||
      s.searchQuery.toLowerCase().includes(historyFilter.toLowerCase())
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
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

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {historyFilter ? "No matches found" : "No searches yet"}
              </h3>
              <p className="text-muted-foreground">
                {historyFilter
                  ? "Try adjusting your filter"
                  : "Start searching to see your history here"}
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
                {filtered.map((search) => (
                  <TableRow key={search.id}>
                    <TableCell className="font-medium">
                      {search.chatTitle}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {search.searchQuery}
                    </TableCell>
                    <TableCell>{formatDate(search.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        {search.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(search.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(search.id)}
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
  );
}

export default RecentSearches;
