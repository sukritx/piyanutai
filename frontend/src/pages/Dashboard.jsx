import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../utils/api';

const StatCard = ({ title, value, description }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const [selectedDays, setSelectedDays] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/v1/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMessageHistory = async () => {
      try {
        const response = await api.get(`/api/v1/dashboard/message-history?days=${selectedDays}`);
        setMessageHistory(response.data);
      } catch (error) {
        console.error('Error fetching message history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessageHistory();
  }, [selectedDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Statistics</h1>
          <p className="text-muted-foreground">
            Real-time overview of AIPiyanut platform usage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            description="Total registered users on the platform"
          />
          <StatCard
            title="Chat Requests Today"
            value={stats?.chatRequestsToday || 0}
            description="Number of new chats started today"
          />
          <StatCard
            title="Active Users Today"
            value={stats?.activeUsersToday || 0}
            description="Users who created chats today"
          />
          <StatCard
            title="Messages Today"
            value={stats?.messagesToday || 0}
            description="Total messages sent today"
          />
          <StatCard
            title="Total Chats"
            value={stats?.totalChats || 0}
            description="All-time total chat sessions"
          />
          <StatCard
            title="Avg Messages/Chat"
            value={stats?.averageMessagesPerChat || 0}
            description="Average messages per chat session"
          />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Message History</CardTitle>
              <Select value={selectedDays} onValueChange={setSelectedDays}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={messageHistory}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-muted-foreground text-right">
          Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;