import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Container,
  Grid,
  Image, 
  Text, 
  VStack, 
  Heading, 
  Spinner, 
  Alert, 
  AlertIcon,
  useToast,
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Stack,
  IconButton,
  Badge
} from '@chakra-ui/react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc 
} from 'firebase/firestore';
import { app } from '../../Components/firebase/Firebase';

const Shop = () => {
  const [items, setItems] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { shopId } = useParams();
  const firestore = getFirestore(app);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setLoading(true);
        
        // First, fetch shop details
        const shopRef = doc(firestore, 'shops', shopId);
        const shopSnap = await getDoc(shopRef);
        
        if (!shopSnap.exists()) {
          throw new Error('Shop not found');
        }
        
        const shopData = {
          id: shopSnap.id,
          ...shopSnap.data()
        };
        setShopDetails(shopData);
    
        // More flexible item fetching
        const itemsRef = collection(firestore, 'items');
        
        // More comprehensive query strategies
        const queryStrategies = [
          // Match on vendorId exactly
          query(itemsRef, where('vendorId', '==', shopData.vendorId)),
          
          // Match on shopId if available in shop data
          ...(shopData.vendorId ? [
            query(itemsRef, where('shopId', '==', shopData.id)),
            query(itemsRef, where('vendorId', 'in', [shopData.vendorId, shopId, shopData.id]))
          ] : [])
        ];
    
        // Fetch items using multiple strategies
        const itemPromises = queryStrategies.map(q => getDocs(q));
        const snapshots = await Promise.all(itemPromises);
    
        // Collect and deduplicate items with logging
        const itemsList = snapshots.flatMap(snapshot => 
          snapshot.docs.map(doc => {
            const item = { id: doc.id, ...doc.data() };
            console.log('Fetched Item:', item); // Log each item for debugging
            return item;
          })
        );
    
        // Remove duplicate items
        const uniqueItems = Array.from(
          new Map(itemsList.map(item => [item.id, item])).values()
        );
        
        console.log('Total Unique Items:', uniqueItems.length); // Log total items
        
        setItems(uniqueItems);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shop data:', error);
        setError(error.message);
        setLoading(false);
        toast({
          title: 'Error',
          description: error.message || 'Could not fetch shop details or items',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    if (shopId) {
      fetchShopData();
    }
  }, [shopId, firestore, toast]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    onOpen();
  };

  const addToCart = (item) => {
    try {
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      const itemIndex = existingCart.findIndex(cartItem => cartItem.id === item.id);
      
      if (itemIndex > -1) {
        existingCart[itemIndex].quantity = (existingCart[itemIndex].quantity || 1) + 1;
      } else {
        existingCart.push({
          ...item,
          quantity: 1,
          shopId: shopId,
          shopName: shopDetails?.name
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(existingCart));
      
      toast({
        title: 'Added to Cart',
        description: `${item.name} has been added to your cart`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Cart Error',
        description: 'Could not add item to cart',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };
  // Keep all your existing useEffect and functions here...

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {loading ? (
          <Flex justify="center" align="center" height="200px">
            <Spinner size="xl" />
          </Flex>
        ) : error ? (
          <Alert status="error" variant="left-accent">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        ) : (
          <>
            {/* Shop Header */}
            {shopDetails && (
              <Box 
                position="relative" 
                height="300px" 
                mb={6} 
                borderRadius="xl" 
                overflow="hidden"
              >
                <Image 
                  src={shopDetails.imageUrl} 
                  alt={shopDetails.name}
                  w="100%"
                  h="100%"
                  objectFit="cover"
                />
                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  bg="blackAlpha.700"
                  p={6}
                >
                  <Heading color="white" size="xl">
                    {shopDetails.name}
                  </Heading>
                  {shopDetails.description && (
                    <Text 
                      color="whiteAlpha.900" 
                      mt={2} 
                      fontSize="lg"
                    >
                      {shopDetails.description}
                    </Text>
                  )}
                </Box>
              </Box>
            )}

            {/* Items Section */}
            <Box>
              <Heading size="lg" mb={6}>Available Items</Heading>
              
              {items.length === 0 ? (
                <Alert status="info" variant="left-accent">
                  <AlertIcon />
                  <Text>No items available in this shop at the moment.</Text>
                </Alert>
              ) : (
                <VStack spacing={4} align="stretch">
                  {items.map((item) => (
                    <Box
                      key={item.id}
                      borderWidth="1px"
                      borderRadius="lg"
                      overflow="hidden"
                      boxShadow="sm"
                      transition="all 0.2s"
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: 'md',
                      }}
                      bg="white"
                    >
                      <Flex direction="row">
                        {/* Left side - Square Image */}
                        <Box 
                          width="120px"
                          height="120px"
                          flexShrink={0}
                          borderRadius="md"
                          overflow="hidden"
                        >
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width="100%"
                            height="100%"
                            objectFit="cover"
                            cursor="pointer"
                            onClick={() => handleItemClick(item)}
                          />
                        </Box>

                        {/* Right side - Content */}
                        <Flex 
                          flex="1" 
                          ml={4}
                          direction="column"
                          justify="space-between"
                        >
                          <Box>
                            <Heading size="sm" mb={1}>
                              {item.name}
                            </Heading>
                            <Text 
                              color="gray.600" 
                              noOfLines={2}
                              mb={2}
                              fontSize="sm"
                            >
                              {item.description}
                            </Text>
                          </Box>

                          <Flex 
                            justify="space-between" 
                            align="center"
                            mt="auto"
                          >
                            <Text
                              color="green.600"
                              fontSize="2xl"
                              fontWeight="bold"
                            >
                              ${item.price.toFixed(2)}
                            </Text>
                            <Button
                              colorScheme="blue"
                              onClick={() => addToCart(item)}
                              size="sm"
                              width="auto"
                            >
                              Add to Cart
                            </Button>
                          </Flex>
                        </Flex>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Keep your existing Modal code */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>{selectedItem?.name}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  {selectedItem && (
                    <VStack spacing={4} align="stretch">
                      <Image 
                        src={selectedItem.imageUrl}
                        alt={selectedItem.name}
                        maxH="400px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                      <Text>{selectedItem.description}</Text>
                      <Flex justify="space-between" align="center">
                        <Text 
                          color="green.600" 
                          fontSize="2xl" 
                          fontWeight="bold"
                        >
                          ${selectedItem.price.toFixed(2)}
                        </Text>
                        <Button 
                          colorScheme="blue" 
                          onClick={() => {
                            addToCart(selectedItem);
                            onClose();
                          }}
                        >
                          Add to Cart
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </ModalBody>
              </ModalContent>
            </Modal>
          </>
        )}
      </VStack>
    </Container>
  );
};

export default Shop;