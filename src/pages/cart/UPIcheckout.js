import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Image,
  useToast,
  Divider,
  HStack,
  Badge,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Card,
  CardBody
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const UPICheckout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [upiMethod, setUpiMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [groupedItems, setGroupedItems] = useState({});
  const [discountAmount, setDiscountAmount] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });

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
        navigate('/cart');
      }
    };
    loadCart();
  }, [navigate]);

  const initiateUPIPayment = async (shopData, method) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
      toast({
        title: 'Please login',
        description: 'You need to be logged in to complete checkout',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setPaymentProcessing(true);
    try {
      // Call backend to initialize payment with UPI method specified
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5058'}/initiate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopData: {
            ...shopData,
            total: shopData.total - discountAmount
          },
          userData: user,
          paymentMethod: method // Add UPI method to request
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }
  
      const paymentData = await response.json();
      
      // Create and submit payment form
      const form = document.createElement('form');
      form.method = 'post';
      form.action = paymentData.payuBaseUrl;
      
      // Add hidden field for UPI selection
      if (method) {
        const upiInput = document.createElement('input');
        upiInput.type = 'hidden';
        upiInput.name = 'preferred_payment_method';
        upiInput.value = method;
        form.appendChild(upiInput);
      }
      
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
      
      // Clear cart after form submission
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
      setPaymentProcessing(false);
    }
  };

  const handlePlaceOrder = (shopId, shopData) => {
    setSelectedShop({ id: shopId, ...shopData });
    onOpen();
  };

  if (Object.keys(groupedItems).length === 0) {
    return (
      <Container maxW="container.xl" py={containerPadding}>
        <Text>No items in cart. Redirecting...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={containerPadding}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">Checkout</Heading>
        
        {Object.entries(groupedItems).map(([shopId, shopData]) => (
          <Card key={shopId} variant="outline">
            <CardBody>
              <VStack spacing={5} align="stretch">
                <Heading size="md">{shopData.shopName}</Heading>
                
                {/* Order Summary */}
                <Box borderRadius="md" p={4} bg="gray.50">
                  <Heading size="sm" mb={3}>Order Summary</Heading>
                  <VStack align="stretch" spacing={3}>
                    {shopData.items.map((item) => (
                      <Flex key={item.id} justify="space-between">
                        <Text>
                          {item.name} 
                          <Badge ml={2} colorScheme="green">x{item.quantity}</Badge>
                        </Text>
                        <Text fontWeight="medium">₹{(item.price * item.quantity).toFixed(2)}</Text>
                      </Flex>
                    ))}
                    <Divider />
                    <Flex justify="space-between">
                      <Text>Subtotal:</Text>
                      <Text fontWeight="medium">₹{shopData.total.toFixed(2)}</Text>
                    </Flex>
                    {discountAmount > 0 && (
                      <Flex justify="space-between" color="green.600">
                        <Text>Discount:</Text>
                        <Text>-₹{discountAmount.toFixed(2)}</Text>
                      </Flex>
                    )}
                    <Flex justify="space-between" fontWeight="bold">
                      <Text>Total Amount:</Text>
                      <Text color="green.600">₹{(shopData.total - discountAmount).toFixed(2)}</Text>
                    </Flex>
                  </VStack>
                </Box>
                
                {/* Payment Options */}
                <Box>
                  <Heading size="sm" mb={4}>Choose Payment Method</Heading>
                  <Flex 
                    wrap="wrap" 
                    gap={4} 
                    justifyContent={{ base: "center", md: "flex-start" }}
                  >
                    <Button 
                      onClick={() => handlePlaceOrder(shopId, shopData)}
                      colorScheme="blue"
                      size="lg"
                      width={{ base: "full", md: "auto" }}
                      minW="200px"
                    >
                      Pay Now
                    </Button>
                  </Flex>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </VStack>

      {/* UPI Payment Options Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: "full", md: "md" }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Payment Method</ModalHeader>
          <ModalBody>
            <VStack spacing={5} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="bold">Order Total:</Text>
                <Text fontWeight="bold" color="green.600">
                  ₹{selectedShop ? (selectedShop.total - discountAmount).toFixed(2) : "0.00"}
                </Text>
              </HStack>
              
              <Divider />
              
              <VStack spacing={4} align="stretch">
                <Heading size="sm" mb={2}>UPI Options</Heading>
                
                <Flex 
                  direction={{ base: "column", md: "row" }}
                  gap={4}
                  wrap="wrap"
                  justify="center"
                >
                  {/* PhonePe */}
                  <Button
                    onClick={() => initiateUPIPayment(selectedShop, 'phonepe')}
                    isLoading={paymentProcessing && upiMethod === 'phonepe'}
                    isDisabled={paymentProcessing}
                    height="80px"
                    flexBasis={{ md: "45%" }}
                    variant="outline"
                    _hover={{ bg: "purple.50" }}
                    borderColor="purple.300"
                    leftIcon={
                      <Image 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/PhonePe_Logo.png/800px-PhonePe_Logo.png" 
                        alt="PhonePe"
                        boxSize="32px"
                        objectFit="contain"
                      />
                    }
                  >
                    Pay with PhonePe
                  </Button>
                  
                  {/* Google Pay */}
                  <Button
                    onClick={() => initiateUPIPayment(selectedShop, 'googlepay')}
                    isLoading={paymentProcessing && upiMethod === 'googlepay'}
                    isDisabled={paymentProcessing}
                    height="80px"
                    flexBasis={{ md: "45%" }}
                    variant="outline"
                    _hover={{ bg: "blue.50" }}
                    borderColor="blue.300"
                    leftIcon={
                      <Image 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo_%282020%29.svg/2560px-Google_Pay_Logo_%282020%29.svg.png" 
                        alt="Google Pay"
                        boxSize="32px"
                        objectFit="contain"
                      />
                    }
                  >
                    Pay with Google Pay
                  </Button>
                  
                  {/* PayTM */}
                  <Button
                    onClick={() => initiateUPIPayment(selectedShop, 'paytm')}
                    isLoading={paymentProcessing && upiMethod === 'paytm'}
                    isDisabled={paymentProcessing}
                    height="80px"
                    flexBasis={{ md: "45%" }}
                    variant="outline"
                    _hover={{ bg: "blue.50" }}
                    borderColor="blue.300"
                    leftIcon={
                      <Image 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/2560px-Paytm_Logo_%28standalone%29.svg.png" 
                        alt="Paytm"
                        boxSize="32px"
                        objectFit="contain"
                      />
                    }
                  >
                    Pay with Paytm
                  </Button>
                  
                  {/* Any UPI */}
                  <Button
                    onClick={() => initiateUPIPayment(selectedShop, 'upi')}
                    isLoading={paymentProcessing && upiMethod === 'upi'}
                    isDisabled={paymentProcessing}
                    height="80px"
                    flexBasis={{ md: "45%" }}
                    variant="outline"
                    _hover={{ bg: "green.50" }}
                    borderColor="green.300"
                    leftIcon={
                      <Image 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png" 
                        alt="UPI"
                        boxSize="32px"
                        objectFit="contain"
                      />
                    }
                  >
                    Any UPI
                  </Button>
                </Flex>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose} isDisabled={paymentProcessing}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default UPICheckout;