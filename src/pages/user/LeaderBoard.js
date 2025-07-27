import React, { useEffect, useState } from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Flex, 
  Badge, 
  Skeleton,
  useColorModeValue,
  Container
} from '@chakra-ui/react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '../../Components/firebase/Firebase'; // Make sure to import your Firebase config

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chakra UI color modes
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const rankBgColors = ['orange.400', 'orange.300', 'orange.200'];

  // Get username from email
  const getUsername = (email) => {
    return email?.split('@')[0] || 'Anonymous';
  };

  // Fetch users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, 'users');
        const q = query(
          usersRef,
          where('points', '>', 0),
          orderBy('points', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const userData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(userData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <Container maxW="2xl" py={8}>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        Health Points Leaderboard
      </Text>

      <VStack spacing={4} align="stretch">
        {loading ? (
          // Loading skeletons
          [...Array(5)].map((_, i) => (
            <Skeleton key={i} height="80px" borderRadius="lg" />
          ))
        ) : (
          users.map((user, index) => (
            <Flex
              key={user.id}
              bg={index < 3 ? rankBgColors[index] : bgColor}
              color={index < 3 ? 'white' : 'inherit'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={index < 3 ? 'transparent' : borderColor}
              align="center"
              boxShadow="sm"
              transition="transform 0.2s"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'md'
              }}
            >
              {/* Rank */}
              <Flex
                w="40px"
                h="40px"
                bg={index < 3 ? 'whiteAlpha.300' : 'gray.100'}
                color={index < 3 ? 'white' : 'gray.700'}
                borderRadius="full"
                align="center"
                justify="center"
                fontWeight="bold"
                fontSize="lg"
              >
                {index + 1}
              </Flex>

              {/* User Info */}
              <Box flex="1" ml={4}>
                <Text fontWeight="semibold">
                  {getUsername(user.email)}
                </Text>
                {index < 3 && (
                  <Badge
                    colorScheme={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}
                    variant="solid"
                    mt={1}
                  >
                    {index === 0 ? 'Gold' : index === 1 ? 'Silver' : 'Bronze'}
                  </Badge>
                )}
              </Box>

              {/* Points */}
              <Flex align="baseline" gap={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {user.points}
                </Text>
                <Text fontSize="sm" color={index < 3 ? 'whiteAlpha.900' : 'gray.500'}>
                  pts
                </Text>
              </Flex>
            </Flex>
          ))
        )}
      </VStack>
    </Container>
  );
};

export default Leaderboard;