import React, { useState, useEffect } from 'react';
import { 
  Container,
  VStack,
  Heading,
  Text,
  Box,
  Progress,
  Button,
  Alert,
  AlertIcon,
  Flex,
  Icon,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Image
} from '@chakra-ui/react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  getDoc 
} from 'firebase/firestore';
import { 
  CheckCircle, 
  Clock, 
  ShoppingBag,
  XCircle 
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import BannerCarousel from '../../Components/banner/Banner';
import Recommendations from '../../Components/recommendations/Recommendations';
import OrderItemFeedback from './OrderItemFeedback';
import sai from "../../Assets/Fos_t-removebg-preview.png"

const OrderWaitingPage = () => {
  const [orderStatus, setOrderStatus] = useState('pending');
  const [isReadyForPickup, setIsReadyForPickup] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  
  const navigate = useNavigate();
  const { orderid } = useParams();
  const firestore = getFirestore();
  const auth = getAuth();

  // Responsive sizing
  const headingSize = useBreakpointValue({ base: 'lg', md: 'xl' });
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const iconSize = useBreakpointValue({ base: 8, md: 10 });

  // Generate unique QR code value
  const qrCodeValue = `${orderid}`;

  useEffect(() => {
    const checkOrderAuthorization = async () => {
      if (!orderid || !auth.currentUser) {
        navigate('/');
        return;
      }

      try {
        const orderRef = doc(firestore, 'orders', orderid);
        const orderSnapshot = await getDoc(orderRef);

        if (orderSnapshot.exists()) {
          const orderData = orderSnapshot.data();
          
          // Strict user authorization check
          if (orderData.userId !== auth.currentUser.uid) {
            setIsAuthorized(false);
            return;
          }

          // Set authorized and store order details
          setIsAuthorized(true);
          setOrderDetails(orderData);

          // Real-time listener for order updates
          const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const updatedOrderData = docSnapshot.data();
              
              // Only update if the current user is the order owner
              if (updatedOrderData.userId === auth.currentUser.uid) {
                const newStatus = updatedOrderData.status || 'pending';
                
                // Check if status is changing to completed
                if (newStatus === 'completed' && orderStatus !== 'completed') {
                  // Vibrate for 10 seconds if vibration is supported
                  if ('vibrate' in navigator) {
                    // Vibrate for 10 seconds (10000 milliseconds)
                    navigator.vibrate(10000);
                  }
                }
                
                setOrderStatus(newStatus);
                setIsReadyForPickup(newStatus === 'completed');
                setIsCancelled(newStatus === 'cancelled');
                setOrderDetails(updatedOrderData);
              }
            }
          });

          return () => unsubscribe();
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking order authorization:', error);
        navigate('/');
      }
    };

    checkOrderAuthorization();
  }, [orderid, firestore, navigate, auth, orderStatus]);

  const handlePickup = () => {
    navigate('/order-confirmation', { state: { orderId: orderid } });
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleOpenQRModal = () => {
    setIsQRModalOpen(true);
  };

  const handleCloseQRModal = () => {
    setIsQRModalOpen(false);
  };

  const getStatusDetails = () => {
    if (isCancelled) {
      return {
        description: 'Order Cancelled',
        progressValue: 0,
        message: 'Unfortunately, this order has been cancelled by the vendor.',
        icon: XCircle,
        color: 'red'
      };
    }

    switch(orderStatus) {
      case 'pending':
        return {
          description: 'Order Accepted by Store',
          progressValue: 30,
          message: 'Your order has been received and is being reviewed by the store',
          icon: Clock,
          color: 'blue'
        };
      case 'processing':
        return {
          description: 'Order Being Prepared',
          progressValue: 70,
          message: 'Your order is currently being prepared by our staff',
          icon: ShoppingBag,
          color: 'orange'
        };
      case 'completed':
        return {
          description: 'Order Ready for Pickup',
          progressValue: 100,
          message: 'Your order is complete and ready to collect',
          icon: CheckCircle,
          color: 'green'
        };
      default:
        navigate('/order-confirmation', { state: { orderId: orderid } });
      return {
        description: 'Processing Order',
        progressValue: 50,
        message: 'Your order is being processed',
        icon: Clock,
        color: 'gray'
      };
    }
  };

  const renderBillDetails = () => {
    if (!orderDetails || !orderDetails.items) return null;
  
    const subtotal = orderDetails.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = orderDetails.tax || 0;
    const transactionFee = 0;
    const total = subtotal + tax + transactionFee;
  
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="black"
        boxShadow="5px 5px 0px 0px rgba(0,0,0,1)"
        mt={4}
        transition="all 0.3s ease"
        _hover={{ boxShadow: "7px 7px 0px 0px rgba(0,0,0,1)" }}
      >
        <Flex direction="column" align="center" mb={6}>
          <Image
            src={sai}
            alt="Fost Logo"
            h="40px"
            mb={2}
          />
          <Heading size="md" mb={2}>Order Details</Heading>
          <Text color="gray.600" fontSize="sm">FostByte Pvt. Ltd.</Text>
          <Text color="gray.500" fontSize="xs">GST: 29XXXXXX1234X1XX</Text>
        </Flex>
  
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Item</Th>
                <Th isNumeric>Quantity</Th>
                <Th isNumeric>Price</Th>
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {orderDetails.items.map((item, index) => (
                <Tr key={index}>
                  <Td>
                    <Text fontWeight="medium">{item.name}</Text>
                    {item.description && (
                      <Text fontSize="sm" color="gray.600">{item.description}</Text>
                    )}
                  </Td>
                  <Td isNumeric>{item.quantity}</Td>
                  <Td isNumeric>₹{item.price.toFixed(2)}</Td>
                  <Td isNumeric>₹{(item.price * item.quantity).toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
  
        <Box mt={4} borderTop="1px solid" borderColor="gray.200" pt={4}>
          <Flex justify="space-between" mb={2}>
            <Text>Subtotal</Text>
            <Text>₹{subtotal.toFixed(2)}</Text>
          </Flex>
          <Flex justify="space-between" mb={2}>
            <Text>Tax (18% GST)</Text>
            <Text>₹{tax.toFixed(2)}</Text>
          </Flex>
          <Flex justify="space-between" mb={2}>
            <Text>Transaction Fee</Text>
            <Text>₹{transactionFee.toFixed(2)}</Text>
          </Flex>
          <Flex justify="space-between" fontWeight="bold" mt={3} pt={3} borderTop="1px solid" borderColor="gray.200">
            <Text>Total</Text>
            <Text>₹{total.toFixed(2)}</Text>
          </Flex>
        </Box>
  
        <Box mt={6} pt={4} borderTop="1px solid" borderColor="gray.200">
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Thank you for choosing Fost!
          </Text>
          <Text fontSize="xs" color="gray.500" textAlign="center" mt={1}>
            FostByte Pvt. Ltd.
            <br />
            Gachibowli, Hyderabad
            <br />
            Telangana - 500050
          </Text>
        </Box>
      </Box>
    );
  };

  // If not authorized, show unauthorized message
  if (!isAuthorized) {
    return (
      <Container 
        maxW="container.sm"
        py={containerPadding} 
        bg="gray.50" 
        minHeight="100vh"
        px={containerPadding}
      >
        <Alert 
          status="error" 
          variant="subtle"
          borderWidth="1px"
          borderColor="black"
          boxShadow="3px 3px 0px 0px rgba(0,0,0,1)"
        >
          <AlertIcon />
          <Text>You are not authorized to view this order.</Text>
        </Alert>
      </Container>
    );
  }

  const statusDetails = getStatusDetails();

  return (
    <Container 
      maxW="container.sm"
      py={containerPadding} 
      bg="gray.50" 
      minHeight="100vh"
      px={containerPadding}
    >
      <VStack spacing={6} align="stretch">
        <Heading textAlign="center" size={headingSize}>
          Order Status
        </Heading>

        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg"
          borderWidth="1px"
          borderColor="black"
          boxShadow="5px 5px 0px 0px rgba(0,0,0,1)"
          transition="all 0.3s ease"
          _hover={{ boxShadow: "7px 7px 0px 0px rgba(0,0,0,1)" }}
        >
          <Flex alignItems="center" mb={4}>
            <Icon 
              as={statusDetails.icon} 
              color={`${statusDetails.color}.500`} 
              w={iconSize} 
              h={iconSize} 
              mr={4} 
            />
            <Text fontWeight="bold" fontSize="lg">
              {statusDetails.description}
            </Text>
          </Flex>
          
          <Progress 
            value={statusDetails.progressValue} 
            colorScheme={statusDetails.color} 
            size="lg" 
            borderRadius="md" 
            mb={4} 
          />
          
          <Text textAlign="center" color="gray.600">
            {statusDetails.message}
          </Text>
        </Box>

        <Button 
          variant="outline" 
          colorScheme="blue" 
          onClick={handleOpenQRModal}
          width="full"
          isDisabled={!isReadyForPickup}
          borderWidth="1px"
          borderColor="black"
          boxShadow="3px 3px 0px 0px rgba(0,0,0,1)"
          _hover={{ 
            boxShadow: "5px 5px 0px 0px rgba(0,0,0,1)",
            transform: "translateY(-2px)"
          }}
          _active={{
            boxShadow: "1px 1px 0px 0px rgba(0,0,0,1)",
            transform: "translateY(1px)"
          }}
          transition="all 0.2s ease"
        >
          Show Order QR Code
        </Button>

        {orderStatus === 'pending' && (
          <OrderItemFeedback orderDetails={orderDetails} />
        )}

        {renderBillDetails()}

        {isCancelled && (
          <Button 
            colorScheme="red" 
            size="lg" 
            onClick={handleBackToHome}
            width="full"
            borderWidth="1px"
            borderColor="black"
            boxShadow="3px 3px 0px 0px rgba(0,0,0,1)"
            _hover={{ 
              boxShadow: "5px 5px 0px 0px rgba(0,0,0,1)",
              transform: "translateY(-2px)"
            }}
            _active={{
              boxShadow: "1px 1px 0px 0px rgba(0,0,0,1)",
              transform: "translateY(1px)"
            }}
            transition="all 0.2s ease"
          >
            Back to Home
          </Button>
        )}

        <Modal 
          isOpen={isQRModalOpen} 
          onClose={handleCloseQRModal}
        >
          <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
          <ModalContent
            borderRadius="xl"
            borderWidth="2px"
            borderColor="black"
          >
            <ModalHeader>Order QR Code</ModalHeader>
            <ModalCloseButton />
            <ModalBody display="flex" justifyContent="center" py={6}>
              <QRCodeSVG value={qrCodeValue} size={256} />
            </ModalBody>
          </ModalContent>
        </Modal>
        
        <BannerCarousel/>
        <Recommendations/>
      </VStack>
    </Container>
  );
};

export default OrderWaitingPage;