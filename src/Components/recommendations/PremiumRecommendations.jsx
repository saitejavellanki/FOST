import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  VStack,
  Image,
  Button,
  useToast,
  Heading,
  Badge,
  Icon,
  Flex,
  HStack,
  Skeleton,
  useBreakpointValue,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../Components/firebase/Firebase';
import { FaCartPlus, FaCrown } from 'react-icons/fa';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const PremiumItemCard = ({ item, onAddToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useBreakpointValue({ base: true, sm: false });

  const mobileCard = (
    <MotionBox
      position="relative"
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="lg"
      cursor="pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      height="120px"
    >
      <Flex h="full">
        <Box position="relative" w="120px" h="full">
          <Image
            src={item.imageUrl || '/placeholder-food.jpg'}
            alt={item.name}
            h="full"
            w="full"
            objectFit="cover"
          />
          <Badge
            position="absolute"
            top={2}
            left={2}
            colorScheme="purple"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full"
          >
            <HStack spacing={1}>
              <Icon as={FaCrown} boxSize={3} />
              <Text fontSize="xs">Premium</Text>
            </HStack>
          </Badge>
        </Box>

        <Flex 
          flex={1} 
          direction="column" 
          justify="space-between"
          p={3}
        >
          <VStack align="start" spacing={1}>
            <Heading size="sm" noOfLines={1}>
              {item.name}
            </Heading>
            <HStack spacing={1} color="gray.600">
              <Icon as={FaCrown} color="purple.400" boxSize={3} />
              <Text fontSize="xs">
                from {item.shopName}
              </Text>
            </HStack>
          </VStack>

          <Flex justify="space-between" align="center" w="full">
            <Text 
              color="purple.600" 
              fontWeight="bold"
              fontSize="sm"
            >
              ₹{item.price}
            </Text>
            <Button
              size="sm"
              colorScheme="purple"
              leftIcon={<FaCartPlus size={12} />}
              variant="ghost"
              onClick={() => onAddToCart(item)}
              _hover={{
                bg: 'purple.100',
              }}
            >
              Add
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </MotionBox>
  );

  const desktopCard = (
    <MotionBox
      position="relative"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="lg"
      cursor="pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onAddToCart(item)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgGradient: 'linear(to-br, purple.50, pink.50)',
        opacity: 0,
        transition: '0.3s',
        zIndex: 0,
      }}
      _hover={{
        _before: {
          opacity: 1,
        },
        transform: 'translateY(-8px)',
        boxShadow: '2xl',
      }}
    >
      <Box position="relative" overflow="hidden">
        <Image
          src={item.imageUrl || '/placeholder-food.jpg'}
          alt={item.name}
          h="180px"
          w="full"
          objectFit="cover"
          transition="0.3s"
          transform={isHovered ? 'scale(1.1)' : 'scale(1)'}
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.400"
          opacity={isHovered ? 1 : 0}
          transition="0.3s"
        />
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme="purple"
          fontSize="xs"
          px={2}
          py={1}
          borderRadius="full"
        >
          <HStack spacing={1}>
            <Icon as={FaCrown} />
            <Text>Premium</Text>
          </HStack>
        </Badge>
      </Box>

      <VStack 
        p={4} 
        align="start" 
        spacing={3}
        position="relative"
        bg={isHovered ? 'white' : 'transparent'}
        transition="0.3s"
      >
        <Heading size="md" noOfLines={1}>
          {item.name}
        </Heading>
        <HStack spacing={2} color="gray.600">
          <Icon as={FaCrown} color="purple.400" />
          <Text fontSize="sm">
            from {item.shopName}
          </Text>
        </HStack>
        <Flex justify="space-between" align="center" w="full">
          <Text 
            color="purple.600" 
            fontWeight="bold"
            fontSize="lg"
          >
            ₹{item.price}
          </Text>
          <MotionFlex
            animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              size="sm"
              colorScheme="purple"
              leftIcon={<FaCartPlus />}
              variant="ghost"
              _hover={{
                bg: 'purple.100',
              }}
            >
              Add to Cart
            </Button>
          </MotionFlex>
        </Flex>
      </VStack>
    </MotionBox>
  );

  return isMobile ? mobileCard : desktopCard;
};

const PremiumRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const firestore = getFirestore(app);

  useEffect(() => {
    const fetchPremiumItems = async () => {
      try {
        const itemsRef = collection(firestore, 'items');
        const q = query(itemsRef, where('isActive', '==', true));
        const itemsSnapshot = await getDocs(q);
        
        const items = [];
        let totalPrice = 0;
        
        const shopsPromises = [];
        
        itemsSnapshot.forEach(doc => {
          const item = { id: doc.id, ...doc.data() };
          
          if (item.price && item.shopId) {
            items.push(item);
            totalPrice += item.price;
            
            const shopRef = collection(firestore, 'shops');
            const shopQuery = query(shopRef, where('uid', '==', item.shopId));
            shopsPromises.push(getDocs(shopQuery));
          }
        });
        
        const shopsSnapshots = await Promise.all(shopsPromises);
        
        items.forEach((item, index) => {
          const shopDocs = shopsSnapshots[index].docs;
          if (shopDocs.length > 0) {
            item.shopName = shopDocs[0].data().name;
          }
        });

        const averagePrice = totalPrice / items.length;
        const premiumItems = items.filter(item => item.price > averagePrice);
        const shuffledItems = premiumItems
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);

        setRecommendations(shuffledItems);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching premium items:', error);
        setLoading(false);
      }
    };

    fetchPremiumItems();
  }, [firestore]);

  const addToCart = (item) => {
    try {
      let cart;
      try {
        const savedCart = localStorage.getItem('cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        
        if (!Array.isArray(cart)) {
          cart = [];
        }
      } catch (error) {
        console.error('Error parsing cart:', error);
        cart = [];
      }
      
      const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += 1;
      } else {
        cart.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          imageUrl: item.imageUrl,
          shopId: item.shopId,
          shopName: item.shopName
        });
      }
  
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdate'));
  
      toast({
        title: 'Added to cart',
        description: `${item.name} has been added to your cart`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box my={8}>
        <Heading 
          size="lg" 
          mb={6} 
          textAlign="center"
          color="purple.800"
        >
          Premium Selections
        </Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="300px" borderRadius="xl" />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <Box 
      my={8}
      px={4}
      py={8}
      borderRadius="2xl"
      bgGradient="linear(to-br, purple.50, pink.50, white)"
    >
      <VStack spacing={8}>
        <VStack spacing={2}>
          <HStack spacing={2}>
            <Icon as={FaCrown} color="purple.400" boxSize={6} />
            <Heading 
              size="lg"
              color="purple.800"
              textAlign="center"
            >
              Premium Selections
            </Heading>
          </HStack>
          <Text 
            color="gray.600"
            textAlign="center"
            fontSize="lg"
          >
            Discover our finest premium offerings
          </Text>
        </VStack>

        <AnimatePresence>
          <SimpleGrid 
            columns={{ base: 1, sm: 2, md: 4 }} 
            spacing={6}
            w="full"
          >
            {recommendations.map((item, index) => (
              <PremiumItemCard
                key={`${item.id}-${index}`}
                item={item}
                onAddToCart={addToCart}
              />
            ))}
          </SimpleGrid>
        </AnimatePresence>
      </VStack>
    </Box>
  );
};

export default PremiumRecommendations;