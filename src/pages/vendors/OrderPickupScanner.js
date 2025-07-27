import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  VStack, 
  Text, 
  useToast,
  Input,
  Heading
} from '@chakra-ui/react';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig'; // Adjust the import path as needed

const OrderPickupScanner = () => {
  const [scannedCode, setScannedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  // Handler for external scanner input
  const handleKeyDown = (event) => {
    // Listen for Enter key, which most scanners use to "submit"
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      processOrderPickup();
    }
  };

  // Add and remove event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup listener on component unmount
    return () => {
      window.addEventListener('keydown', handleKeyDown);
    };
  }, []);

  const processOrderPickup = async () => {
    // Exit if no code is scanned
    if (!scannedCode.trim()) {
      toast({
        title: "Error",
        description: "Please scan an order QR code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Remove 'order-pickup:' prefix if present
      let orderId = scannedCode.replace(/^order-pickup:/, '');
      
      // If ID is longer than expected, truncate to match Firebase document ID
      if (orderId.length > 20) {
        orderId = orderId.substring(0, 20);
      }

      // Query to find the order
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef, 
        where('__name__', '==', orderId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Get the first matching document
        const orderDoc = querySnapshot.docs[0];
        
        // Update the order status
        await updateDoc(doc(db, 'orders', orderDoc.id), {
          status: 'picked_up',
          updatedAt: new Date()
        });

        toast({
          title: "Order Picked Up",
          description: `Order ${orderDoc.id} has been marked as picked up`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Reset the input
        setScannedCode('');
      } else {
        toast({
          title: "Order Not Found",
          description: `No order found with ID: ${orderId}`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to process order: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box 
      maxWidth="400px" 
      margin="auto" 
      padding={6} 
      boxShadow="md" 
      borderRadius="md"
    >
      <VStack spacing={4}>
        <Heading size="md">Order Pickup Scanner</Heading>
        
        <Input 
          placeholder="Scan QR Code or Enter Order ID"
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          onKeyDown={handleKeyDown} // Add manual input support
        />
        
        <Button 
          colorScheme="green" 
          onClick={processOrderPickup}
          isLoading={isProcessing}
          width="full"
        >
          Mark Order as Picked Up
        </Button>

        <Text fontSize="sm" color="gray.500">
          Tip: Most external scanners will automatically input the code
        </Text>
      </VStack>
    </Box>
  );
};

export default OrderPickupScanner;