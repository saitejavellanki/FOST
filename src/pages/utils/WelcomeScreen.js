import React, { useState } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Image,
  Progress,
  Flex,
  IconButton
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WelcomeScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  
  // Move all color mode values to the top level
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  const welcomeSteps = [
    {
      title: "Welcome to Our Platform",
      description: "We're excited to have you join us! Let's take a quick tour of what you can do here.",
      image: "/api/placeholder/400/300"
    },
    {
      title: "Manage Your Inventory",
      description: "Easily add, update, and track your products. Keep your stock levels accurate and up to date.",
      image: "/api/placeholder/400/300"
    },
    {
      title: "Track Orders",
      description: "Monitor all your orders in real-time. From new orders to delivery, stay on top of every transaction.",
      image: "/api/placeholder/400/300"
    },
    {
      title: "Analytics Dashboard",
      description: "Make data-driven decisions with our comprehensive analytics tools and reports.",
      image: "/api/placeholder/400/300"
    }
  ];

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    navigate('/vendor/dashboard');
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <Box 
      minH="100vh" 
      bg={bgColor} 
      color={textColor}
      py={8}
    >
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          {/* Progress indicator */}
          <Progress 
            value={(currentStep + 1) * (100 / welcomeSteps.length)} 
            size="sm" 
            colorScheme="blue" 
            borderRadius="full"
          />

          {/* Main content */}
          <Box 
            p={8} 
            borderRadius="lg" 
            bg={cardBg} 
            boxShadow="lg"
          >
            <Center mb={8}>
              <Image
                src={welcomeSteps[currentStep].image}
                alt={welcomeSteps[currentStep].title}
                borderRadius="md"
                maxH="300px"
                objectFit="cover"
              />
            </Center>

            <VStack spacing={4} textAlign="center">
              <Heading size="lg">{welcomeSteps[currentStep].title}</Heading>
              <Text fontSize="lg">{welcomeSteps[currentStep].description}</Text>
            </VStack>
          </Box>

          {/* Navigation buttons */}
          <Flex justify="space-between" align="center" mt={4}>
            <IconButton
              icon={<ChevronLeftIcon />}
              onClick={handlePrevious}
              isDisabled={currentStep === 0}
              aria-label="Previous"
              variant="ghost"
              size="lg"
            />

            <Flex gap={4}>
              <Button
                variant="ghost"
                onClick={handleSkip}
              >
                Skip Tour
              </Button>
              
              <Button
                colorScheme="blue"
                onClick={handleNext}
                rightIcon={currentStep < welcomeSteps.length - 1 ? <ChevronRightIcon /> : undefined}
              >
                {currentStep < welcomeSteps.length - 1 ? 'Next' : 'Get Started'}
              </Button>
            </Flex>
          </Flex>

          {/* Step indicators */}
          <Center>
            <Flex gap={2}>
              {welcomeSteps.map((_, index) => (
                <Box
                  key={index}
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={currentStep === index ? accentColor : 'gray.300'}
                />
              ))}
            </Flex>
          </Center>
        </VStack>
      </Container>
    </Box>
  );
};

export default WelcomeScreen;