import React, { useState, useEffect } from 'react';
import { 
  Container, 
  VStack, 
  Heading, 
  Box, 
  Text, 
  Button, 
  Divider,
  HStack,
  Image,
  useToast,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Stack,
  Flex,
  IconButton,
  useBreakpointValue
} from '@chakra-ui/react';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import CouponComponent from '../../Components/coupon/CouponComponent';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedShop, setSelectedShop] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const toast = useToast();
  const firestore = getFirestore();
  const navigate = useNavigate();

  // PayU Configuration
  const PAYU_MERCHANT_KEY = 'gSR07M';
  const PAYU_BASE_URL = 'https://secure.payu.in/_payment';

  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const imageSize = useBreakpointValue({ base: "80px", md: "100px" });

  // Simplified styling - only keeping shadows and borders for interactive elements
  const buttonStyle = {
    borderWidth: "2px",
    borderColor: "black",
    boxShadow: "3px 3px 0px 0px rgba(0, 0, 0, 0.8)",
    borderRadius: "md",
    transition: "all 0.15s",
    _hover: {
      transform: "translateY(-1px)",
      boxShadow: "4px 4px 0px 0px rgba(0, 0, 0, 0.8)",
    },
    _active: {
      transform: "translateY(1px)",
      boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 0.8)",
    }
  };

  useEffect(() => {
    const loadCart = () => {
      const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
      setCartItems(savedCart);
      
      if (savedCart.length > 0) {
        const grouped = savedCart.reduce((acc, item) => {
          if (!acc[item.shopId]) {
            acc[item.shopId] = {
              items: [],
              shopName: item.shopName,
              shopId: item.shopId,
              vendorId: item.vendorId,
              total: 0
            };
          }
          acc[item.shopId].items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            category: item.category,
            dietType: item.dietType,
            point: item.point
          });
          acc[item.shopId].total += item.price * item.quantity;
          return acc;
        }, {});
        setGroupedItems(grouped);
      } else {
        setGroupedItems({});
      }
    };
    loadCart();
  }, []);

  const removeFromCart = (itemId) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCartItems(updatedCart);

    window.dispatchEvent(new Event('cartUpdate'));
    
    const grouped = updatedCart.reduce((acc, item) => {
      const shopId = item.shopId;
      if (!acc[shopId]) {
        acc[shopId] = {
          items: [],
          shopName: item.shopName,
          total: 0
        };
      }
      acc[shopId].items.push(item);
      acc[shopId].total += item.price * item.quantity;
      return acc;
    }, {});
    
    setGroupedItems(grouped);
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(itemId);
      return;
    }
    
    const updatedCart = cartItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          vendorId: item.vendorId,
          category: item.category,
          dietType: item.dietType,
          price: parseFloat(item.price)
        };
      }
      return item;
    });
    
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCartItems(updatedCart);
    window.dispatchEvent(new Event('cartUpdate'));
    
    const grouped = updatedCart.reduce((acc, item) => {
      const shopId = item.shopId;
      if (!acc[shopId]) {
        acc[shopId] = {
          items: [],
          shopName: item.shopName,
          shopId: item.shopId,
          vendorId: item.vendorId,
          total: 0
        };
      }
      acc[shopId].items.push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        category: item.category,
        dietType: item.dietType,
        point: item.point,
        vendorId: item.vendorId,
      });
      acc[shopId].total += parseFloat(item.price) * item.quantity;
      return acc;
    }, {});
    
    setGroupedItems(grouped);
  };

  const handlePlaceOrder = async (shopId, shopData) => {
    setSelectedShop({ id: shopId, ...shopData });
    onOpen();
  };

  const generatePayUHash = (params) => {
    const PAYU_SALT_KEY = 'RZdd32itbMYSKM7Kwo4teRkhUKCsWbnj';
    const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${PAYU_SALT_KEY}`;
    const hash = CryptoJS.SHA512(hashString).toString(CryptoJS.enc.Hex);
    return hash;
  };

  const initiatePayUPayment = async (shopData) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
      const response = await fetch(`http://localhost:5058/initiate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopData: {
            ...shopData,
            total: shopData.total
          },
          userData: user
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }
  
      const paymentData = await response.json();
      
      const form = document.createElement('form');
      form.method = 'post';
      form.action = paymentData.payuBaseUrl;
      
      Object.entries(paymentData).forEach(([key, value]) => {
        if (key !== 'payuBaseUrl') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
      });
      
      document.body.appendChild(form);
      form.submit();
      
      localStorage.removeItem('cart');
      setCartItems([]);
      setGroupedItems({});
      window.dispatchEvent(new Event('cartUpdate'));
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <Container maxW="container.xl" py={containerPadding}>
        <Alert 
          status="info"
          borderWidth="1px"
          borderColor="gray.200"
          p={4}
        >
          <AlertIcon />
          Your cart is empty. Start shopping to add items!
        </Alert>
      </Container>
    );
  }

  const CartItem = ({ item }) => (
    <Box width="100%">
      <Flex gap={4} width="100%">
        <Image
          src={item.imageUrl}
          alt={item.name}
          boxSize={imageSize}
          objectFit="cover"
          borderRadius="md"
          flexShrink={0}
          borderWidth="1px"
          borderColor="gray.200"
          p={1}
        />
        
        <Flex 
          flex="1"
          justify="space-between"
          width="100%"
          direction={{ base: "column", md: "row" }}
          gap={2}
        >
          {/* Product details */}
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>{item.name}</Text>
            <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
              RS {item.price.toFixed(2)} each
            </Text>
          </VStack>
  
          {/* Quantity controls and price on next line */}
          <VStack 
            align={{ base: "start", md: "end" }}
            spacing={3}
            width={{ base: "100%", md: "auto" }}
          >
            <HStack 
              spacing={2}
              p={1}
              borderWidth="1px"
              borderColor="black"
              borderRadius="md"
            >
              <IconButton
                size="sm"
                icon={<Minus size={16} />}
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Decrease quantity"
                {...buttonStyle}
                boxShadow="1px 1px 0px 0px rgba(0, 0, 0, 0.8)"
                _hover={{ boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 0.8)" }}
              />
              <Text width="40px" textAlign="center" fontWeight="medium">{item.quantity}</Text>
              <IconButton
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Increase quantity"
                {...buttonStyle}
                boxShadow="1px 1px 0px 0px rgba(0, 0, 0, 0.8)"
                _hover={{ boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 0.8)" }}
              />
            </HStack>
            
            <Text 
              fontWeight="bold" 
              fontSize={{ base: "md", md: "lg" }}
              p={1}
              px={3}
              borderWidth="1px"
              borderColor="gray.300"
              borderRadius="md"
              bg="gray.50"
            >
              Rs {(item.price * item.quantity).toFixed(2)}
            </Text>
          </VStack>
        </Flex>
      </Flex>
      <Divider mt={4} />
    </Box>
  );

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {Object.entries(groupedItems).map(([shopId, shopData]) => (
          <Box 
            key={shopId}
            p={{ base: 4, md: 6 }}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
          >
            <Heading size={{ base: "md", md: "lg" }} mb={4}>
              {shopData.shopName}
            </Heading>
            
            <VStack spacing={4} align="stretch">
              {shopData.items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
              
              <Divider />
              
              <Box
                p={4}
                borderWidth="1px"
                borderColor="gray.300"
                borderRadius="md"
                bg="gray.50"
              >
                <CouponComponent 
                  total={shopData.total} 
                  onCouponApply={(amount) => setDiscountAmount(amount)} 
                />
                
                <Flex 
                  direction={{ base: "column", md: "row" }}
                  justify="space-between"
                  align={{ base: "start", md: "end" }}
                  gap={6}
                  mt={4}
                >
                  <VStack align="start" spacing={2}>
                    <Text fontSize="md" fontWeight="medium">
                      Subtotal:
                    </Text>
                    <Text 
                      fontSize="md" 
                      fontWeight="bold"
                      ml={4}
                      p={1}
                      px={3}
                      borderWidth="1px"
                      borderColor="gray.300"
                      borderRadius="md"
                      bg="white"
                    >
                      Rs {shopData.total.toFixed(2)}
                    </Text>
                    
                    {discountAmount > 0 && (
                      <>
                        <Text color="green.600" fontSize="md">
                          Discount:
                        </Text>
                        <Text 
                          color="green.600" 
                          fontSize="md"
                          fontWeight="bold"
                          ml={4}
                          p={1}
                          px={3}
                          borderWidth="1px"
                          borderColor="green.500"
                          borderRadius="md"
                          bg="green.50"
                        >
                          Rs {discountAmount.toFixed(2)}
                        </Text>
                      </>
                    )}
                    
                    <Text fontSize="lg" fontWeight="bold" color="green.600" mt={2}>
                      Final Total:
                    </Text>
                    <Text 
                      fontSize="xl" 
                      fontWeight="bold" 
                      color="green.700"
                      ml={4}
                      p={2}
                      px={4}
                      borderWidth="1px"
                      borderColor="green.500"
                      borderRadius="md"
                      bg="green.50"
                    >
                      Rs {(shopData.total - discountAmount).toFixed(2)}
                    </Text>
                  </VStack>
                  
                  <Button
                    colorScheme="blue"
                    size="lg"
                    width={{ base: "full", md: "auto" }}
                    height="60px"
                    px={8}
                    {...buttonStyle}
                    fontSize="lg"
                    onClick={() => handlePlaceOrder(shopId, {...shopData, total: shopData.total - discountAmount})}
                  >
                    Place Order
                  </Button>
                </Flex>
              </Box>
            </VStack>
          </Box>
        ))}
      </VStack>
  
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "lg" }}>
        <ModalOverlay />
        <ModalContent 
          margin={{ base: 4, md: "auto" }}
          borderWidth="1px"
          borderColor="gray.200"
          p={2}
        >
          <ModalHeader borderBottom="1px solid gray.200" pb={4}>Confirm Order and Pay</ModalHeader>
          <ModalBody py={6}>
            <Stack spacing={6}>
              <VStack align="start" spacing={2}>
                <Text fontWeight="medium" fontSize="md">Shop:</Text>
                <Text 
                  ml={4} 
                  fontSize="lg" 
                  fontWeight="bold"
                  p={2}
                  px={4}
                  borderWidth="1px"
                  borderColor="gray.300"
                  borderRadius="md"
                  bg="gray.50"
                  width="full"
                >
                  {selectedShop?.shopName}
                </Text>
              </VStack>
              
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" fontSize="md">Total Amount:</Text>
                <Text 
                  ml={4} 
                  fontSize="xl" 
                  fontWeight="bold"
                  p={2}
                  px={4}
                  borderWidth="1px"
                  borderColor="green.500"
                  borderRadius="md"
                  bg="green.50"
                  color="green.700"
                  width="full"
                >
                  Rs {selectedShop?.total.toFixed(2)}
                </Text>
              </VStack>
              
              <Button 
                colorScheme="blue" 
                onClick={() => initiatePayUPayment(selectedShop)}
                width="full"
                height="60px"
                mt={4}
                {...buttonStyle}
                fontSize="lg"
              >
                Proceed to PayU Payment
              </Button>
            </Stack>
          </ModalBody>
          <ModalFooter borderTop="1px solid gray.200" pt={4}>
            <Button 
              variant="outline" 
              onClick={onClose}
              {...buttonStyle}
              _hover={{
                bg: "gray.100",
              }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default Cart;