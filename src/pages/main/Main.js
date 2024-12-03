import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Image,
  VStack,
  Heading,
  Spinner,
  useToast,
  Grid,
  GridItem,
  Container
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../Components/firebase/Firebase';
import Footer from "../../Components/footer/Footer";

const ShopCard = ({ shop }) => {
  if (!shop.isOpen) {
    return (
      <Box
        borderWidth={1}
        borderRadius="lg"
        overflow="hidden"
        boxShadow="md"
        height="100%"
        display="flex"
        flexDirection="column"
        position="relative"
        opacity={0.6}
        cursor="not-allowed"
      >
        <Image
          src={shop.imageUrl}
          alt={shop.name}
          h="250px"
          w="100%"
          objectFit="cover"
          filter="grayscale(100%)"
        />
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text
            color="white"
            fontSize="xl"
            fontWeight="bold"
            textAlign="center"
            p={4}
            bg="blackAlpha.700"
            borderRadius="md"
          >
            Coming Soon ..
          </Text>
        </Box>
        <Box 
          p={4} 
          flex="1" 
          display="flex" 
          flexDirection="column" 
          justifyContent="center"
        >
          <Heading 
            size="md" 
            textAlign="center" 
            color="gray.700"
          >
            {shop.name}
          </Heading>
          {shop.description && (
            <Text 
              mt={2} 
              textAlign="center" 
              color="gray.500" 
              fontSize="sm"
            >
              {shop.description}
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Link to={`/shop/${shop.id}`}>
      <Box
        borderWidth={1}
        borderRadius="lg"
        overflow="hidden"
        boxShadow="md"
        transition="all 0.3s ease"
        _hover={{
          transform: 'scale(1.05)',
          boxShadow: 'xl',
          borderColor: 'blue.500'
        }}
        height="100%"
        display="flex"
        flexDirection="column"
      >
        <Image
          src={shop.imageUrl}
          alt={shop.name}
          h="250px"
          w="100%"
          objectFit="cover"
        />
        <Box 
          p={4} 
          flex="1" 
          display="flex" 
          flexDirection="column" 
          justifyContent="center"
        >
          <Heading 
            size="md" 
            textAlign="center" 
            color="gray.700"
          >
            {shop.name}
          </Heading>
          {shop.description && (
            <Text 
              mt={2} 
              textAlign="center" 
              color="gray.500" 
              fontSize="sm"
            >
              {shop.description}
            </Text>
          )}
        </Box>
      </Box>
    </Link>
  );
};

const Main = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const firestore = getFirestore(app);
  const toast = useToast();

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const shopsRef = collection(firestore, 'shops');
        const snapshot = await getDocs(shopsRef);
        const shopsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShops(shopsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shops:', error);
        setError('Error fetching shops. Please try again later.');
        setLoading(false);
        toast({
          title: 'Error',
          description: 'Could not fetch shops',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    fetchShops();
  }, [firestore, toast]);

  if (loading) {
    return (
      <Flex 
        justifyContent="center" 
        alignItems="center" 
        height="100vh" 
        bg="gray.50"
      >
        <Spinner 
          size="xl" 
          color="blue.500" 
          thickness="4px" 
        />
      </Flex>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" centerContent>
        <Box 
          p={6} 
          textAlign="center" 
          bg="red.50" 
          borderRadius="md"
          mt={10}
        >
          <Text color="red.500" fontWeight="bold">
            {error}
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Box 
      p={6} 
      bg="gray.50" 
      minHeight="100vh"
    >
      <Container maxW="container.xl">
        <Heading 
          mb={8} 
          textAlign="center" 
          color="gray.700"
          size="2xl"
          letterSpacing="tight"
        >
          Discover Our Shops
        </Heading>
        {shops.length === 0 ? (
          <Flex 
            justifyContent="center" 
            alignItems="center" 
            height="50vh"
          >
            <Text 
              textAlign="center" 
              color="gray.500" 
              fontSize="xl"
            >
              No shops available at the moment.
            </Text>
          </Flex>
        ) : (
          <Grid
            templateColumns={{
              base: "repeat(1, 1fr)",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)"
            }}
            gap={6}
          >
            {shops.map((shop) => (
              <GridItem key={shop.id}>
                <ShopCard shop={shop} />
              </GridItem>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
  <Footer/>
};

export default Main;