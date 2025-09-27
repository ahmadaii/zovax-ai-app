import { BarChart3, TrendingUp, Users, MessageSquare, Clock, CalendarIcon, Calendar as CalendarLucide, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

// Mock analytics data
const mockMetrics = [
  {
    title: "Total Messages",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: BarChart3
  },
  {
    title: "Conversations",
    value: "5,123",
    change: "+15.3%",
    trend: "up", 
    icon: MessageSquare
  },
  {
    title: "Avg Response Time",
    value: "1.2s",
    change: "-5.1%",
    trend: "down",
    icon: Clock
  }
];

const mockSourcesData = [
  { type: "Documents", count: 234, fill: "#f59e0b" },
  { type: "Websites", count: 187, fill: "#fbbf24" },
  { type: "Notes", count: 156, fill: "#fcd34d" }
];

const mockStatusData = [
  { status: "Active", count: 87, color: "#436fae" },
  { status: "Processing", count: 12, color: "#2d4a74" },
  { status: "Error", count: 3, color: "#dc2626" },
  { status: "Pending", count: 8, color: "#16253a" }
];

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const periodOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "3m", label: "Last 3 months" },
    { value: "6m", label: "Last 6 months" },
    { value: "1y", label: "Last year" },
    { value: "custom", label: "Custom range" }
  ];

  const getPeriodLabel = () => {
    if (selectedPeriod === "custom" && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return periodOptions.find(p => p.value === selectedPeriod)?.label || "Last 30 days";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your search patterns, user engagement, and performance metrics
        </p>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <CalendarLucide className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Period:</span>
              </div>
              
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPeriod === "custom" && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[130px] justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "MMM dd") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[130px] justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "MMM dd") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              Showing data for: <span className="font-medium text-foreground">{getPeriodLabel()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Badge
                  variant={metric.trend === "up" ? "default" : "secondary"}
                  className={`${
                    metric.trend === "up" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {metric.change}
                </Badge>
                <span>vs previous period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
               Message Trends
            </CardTitle>
            <CardDescription>
              Search volume for {getPeriodLabel().toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Chart visualization will be implemented
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  TODO: Integrate with Recharts component
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sources By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sources By Type
            </CardTitle>
            <CardDescription>
              Distribution of content by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockSourcesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="type" 
                    axisLine={false}
                    tickLine={false}
                    className="text-sm"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-sm"
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              Number of Sources: <span className="font-medium text-foreground">{payload[0].value}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    className="fill-primary"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources By Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sources By Status
          </CardTitle>
          <CardDescription>
            Processing status distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {mockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} sources`,
                    props.payload.status
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{mockStatusData.reduce((sum, item) => sum + item.count, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Sources</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {mockStatusData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm font-medium">{item.status}</span>
                <span className="text-sm text-muted-foreground ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}