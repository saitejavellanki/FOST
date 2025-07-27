import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Flex,
  Icon,
  Select,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import {
  getFirestore,
  collection,
  query,
  getDocs,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FiTrendingUp, FiShoppingBag, FiUsers, FiDollarSign } from 'react-icons/fi';


const calculateOrderTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity || 0);
    }, 0);
  };
// Utility function to get date constraints
const getDateConstraints = (timeFilter) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeFilter) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  return {
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(now)
  };
};

// Utility function to format currency in INR
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Statistics Card Component
const StatCard = ({ title, value, icon, change }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  
  return (
    <Box p={6} bg={bgColor} rounded="xl" boxShadow="sm">
      <Flex justify="space-between" align="center">
        <Stat>
          <StatLabel color="gray.500">{title}</StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {title.includes('Revenue') ? formatCurrency(value) : value.toLocaleString()}
          </StatNumber>
          {change !== undefined && (
            <StatHelpText>
              <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
              {Math.abs(change).toFixed(1)}% from previous period
            </StatHelpText>
          )}
        </Stat>
        <Icon as={icon} boxSize={10} color="blue.500" />
      </Flex>
    </Box>
  );
};

// Top Shops Table Component
const TopShopsTable = ({ shops }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  
  return (
    <Box p={6} bg={bgColor} rounded="xl" boxShadow="sm">
      <Heading size="sm" mb={4}>Top Performing Shops</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Shop</Th>
            <Th isNumeric>Orders</Th>
            <Th isNumeric>Revenue</Th>
            <Th isNumeric>Growth</Th>
          </Tr>
        </Thead>
        <Tbody>
          {shops.map((shop) => (
            <Tr key={shop.id}>
              <Td fontWeight="medium">{shop.name}</Td>
              <Td isNumeric>{shop.orders.toLocaleString()}</Td>
              <Td isNumeric>{formatCurrency(shop.revenue)}</Td>
              <Td isNumeric>
                <Badge
                  colorScheme={shop.growth >= 0 ? 'green' : 'red'}
                  variant="subtle"
                  px={2}
                  rounded="full"
                >
                  {shop.growth >= 0 ? '+' : ''}{shop.growth.toFixed(1)}%
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

// Revenue Chart Component
const RevenueChart = ({ data }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  
  return (
    <Box p={6} bg={bgColor} rounded="xl" boxShadow="sm" height="400px">
      <Heading size="sm" mb={4}>Revenue Trends</Heading>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
          <Line type="monotone" dataKey="revenue" stroke="#4299E1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Main Dashboard Component
const AdminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summaryStats: {
      totalRevenue: 0,
      totalOrders: 0,
      totalShops: 0,
      totalCustomers: 0,
      revenueChange: 0,
      ordersChange: 0,
      shopsChange: 0,
      customersChange: 0
    },
    topShops: [],
    revenueData: []
  });

  const toast = useToast();
  const db = getFirestore();

  const processRevenueData = (orders, timeFilter) => {
    const data = [];
    const dateFormat = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      ...(timeFilter === 'year' && { year: 'numeric' })
    });

    if (timeFilter === 'today') {
      const hourlyData = new Array(24).fill(0);
      orders.forEach(order => {
        const hour = order.createdAt.toDate().getHours();
        hourlyData[hour] += order.totalAmount || 0;
      });
      
      hourlyData.forEach((revenue, hour) => {
        data.push({
          date: `${hour}:00`,
          revenue
        });
      });
    } else {
      const groupedData = orders.reduce((acc, order) => {
        const date = dateFormat.format(order.createdAt.toDate());
        acc[date] = (acc[date] || 0) + (order.totalAmount || 0);
        return acc;
      }, {});

      Object.entries(groupedData).forEach(([date, revenue]) => {
        data.push({ date, revenue });
      });
    }

    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateConstraints(timeFilter);
      
      // Calculate previous period
      const prevStartDate = new Date(startDate.toDate());
      const daysDifference = (endDate.toDate() - startDate.toDate()) / (1000 * 60 * 60 * 24);
      prevStartDate.setDate(prevStartDate.getDate() - daysDifference);
      const prevStart = Timestamp.fromDate(prevStartDate);
  
      // Fetch current period orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        where('status', 'in', ['picked_up', 'completed', 'delivered']) // Only count completed orders
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        calculatedTotal: calculateOrderTotal(doc.data().items)
      }));
  
      // Fetch previous period orders
      const prevOrdersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', prevStart),
        where('createdAt', '<', startDate),
        where('status', 'in', ['picked_up', 'completed', 'delivered'])
      );
      const prevOrdersSnapshot = await getDocs(prevOrdersQuery);
      const prevOrders = prevOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        calculatedTotal: calculateOrderTotal(doc.data().items)
      }));
  
      // Fetch shops
      const shopsQuery = query(collection(db, 'shops'));
      const shopsSnapshot = await getDocs(shopsQuery);
      const shops = shopsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      // Calculate current period metrics
      const currentRevenue = orders.reduce((sum, order) => sum + order.calculatedTotal, 0);
      const prevRevenue = prevOrders.reduce((sum, order) => sum + order.calculatedTotal, 0);
      const revenueChange = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  
      // Process shop performance
      const shopStats = new Map();
      orders.forEach(order => {
        const shopId = order.shopId;
        const stats = shopStats.get(shopId) || {
          id: shopId,
          name: shops.find(s => s.id === shopId)?.name || 'Unknown Shop',
          orders: 0,
          revenue: 0,
          prevOrders: 0,
          prevRevenue: 0
        };
  
        stats.orders++;
        stats.revenue += order.calculatedTotal;
        shopStats.set(shopId, stats);
      });
  
      // Add previous period shop stats
      prevOrders.forEach(order => {
        const stats = shopStats.get(order.shopId);
        if (stats) {
          stats.prevOrders++;
          stats.prevRevenue += order.calculatedTotal;
        }
      });
  
      // Calculate top shops with growth
      const topShops = Array.from(shopStats.values())
        .map(stats => ({
          ...stats,
          growth: stats.prevRevenue ? ((stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
  
      // Process revenue data for chart
      const processRevenueData = (orders, timeFilter) => {
        const data = [];
        const dateFormat = new Intl.DateTimeFormat('en-IN', {
          month: 'short',
          day: 'numeric',
          ...(timeFilter === 'year' && { year: 'numeric' })
        });
  
        if (timeFilter === 'today') {
          const hourlyData = new Array(24).fill(0);
          orders.forEach(order => {
            const hour = order.createdAt.toDate().getHours();
            hourlyData[hour] += order.calculatedTotal;
          });
          
          hourlyData.forEach((revenue, hour) => {
            data.push({
              date: `${hour}:00`,
              revenue
            });
          });
        } else {
          const groupedData = orders.reduce((acc, order) => {
            const date = dateFormat.format(order.createdAt.toDate());
            acc[date] = (acc[date] || 0) + order.calculatedTotal;
            return acc;
          }, {});
  
          Object.entries(groupedData).forEach(([date, revenue]) => {
            data.push({ date, revenue });
          });
        }
  
        return data.sort((a, b) => new Date(a.date) - new Date(b.date));
      };
  
      // Update dashboard data
      setDashboardData({
        summaryStats: {
          totalRevenue: currentRevenue,
          totalOrders: orders.length,
          totalShops: shops.length,
          totalCustomers: new Set(orders.map(order => order.customerId)).size,
          revenueChange,
          ordersChange: prevOrders.length ? ((orders.length - prevOrders.length) / prevOrders.length) * 100 : 0,
          shopsChange: 0,
          customersChange: 0
        },
        topShops,
        revenueData: processRevenueData(orders, timeFilter)
      });
  
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error fetching dashboard data',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [timeFilter]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex justify="center" align="center" height="400px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading>Admin Dashboard</Heading>
        <Select
          width="200px"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </Select>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <StatCard
          title="Total Revenue"
          value={dashboardData.summaryStats.totalRevenue}
          icon={FiDollarSign}
          change={dashboardData.summaryStats.revenueChange}
        />
        <StatCard
          title="Total Orders"
          value={dashboardData.summaryStats.totalOrders}
          icon={FiShoppingBag}
          change={dashboardData.summaryStats.ordersChange}
        />
        <StatCard
          title="Active Shops"
          value={dashboardData.summaryStats.totalShops}
          icon={FiTrendingUp}
          change={dashboardData.summaryStats.shopsChange}
        />
        <StatCard
          title="Total Customers"
          value={dashboardData.summaryStats.totalCustomers}
          icon={FiUsers}
          change={dashboardData.summaryStats.customersChange}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
        <RevenueChart data={dashboardData.revenueData} />
        <TopShopsTable shops={dashboardData.topShops} />
      </SimpleGrid>
    </Container>
  );
};

export default AdminDashboard;