import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useToast,
  Text,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useInterval
} from '@chakra-ui/react';
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../../Components/firebase/Firebase';
import { useNavigate } from 'react-router-dom';

const VendorApplication = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phoneNumber: '',
    address: '',
    description: '',
    experience: '',
    email: ''
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const toast = useToast();
  const navigate = useNavigate();

  // Check if user has an existing application
  useEffect(() => {
    const checkExistingApplication = async (email) => {
      if (!email) return;
      
      const applicationsRef = collection(firestore, 'vendorApplications');
      const q = query(applicationsRef, where('email', '==', email));
      
      // Set up real-time listener for application status
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const application = snapshot.docs[0];
          setApplicationId(application.id);
          setApplicationStatus(application.data().status);
          setFormData(prev => ({
            ...prev,
            ...application.data()
          }));
        }
      });

      return unsubscribe;
    };

    if (formData.email) {
      checkExistingApplication(formData.email);
    }
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const applicationRef = doc(collection(firestore, 'vendorApplications'));
      await setDoc(applicationRef, {
        ...formData,
        status: 'pending',
        submittedAt: new Date(),
        securityCode: null
      });

      setApplicationId(applicationRef.id);
      setApplicationStatus('pending');

      toast({
        title: 'Application Submitted',
        description: 'Your vendor application has been submitted for review.',
        status: 'success',
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit application. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    setPasswordError('');

    try {
      // Verify security code
      const applicationsRef = collection(firestore, 'vendorApplications');
      const q = query(
        applicationsRef,
        where('email', '==', formData.email),
        where('status', '==', 'approved'),
        where('securityCode', '==', securityCode)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Invalid security code');
      }

      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }

      // Create user account
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, password);
      
      // Create user document
      await setDoc(doc(firestore, 'users', user.uid), {
        email: user.email,
        role: 'vendor',
        fullName: formData.fullName,
        businessName: formData.businessName,
        createdAt: new Date()
      });

      // Update application status
      await setDoc(doc(firestore, 'vendorApplications', applicationId), {
        ...formData,
        status: 'registered'
      });

      toast({
        title: 'Registration Successful',
        description: 'Your vendor account has been created successfully.',
        status: 'success',
        duration: 5000,
      });

      navigate('/vendor/dashboard');
    } catch (error) {
      toast({
        title: 'Registration Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const renderStatusAlert = () => {
    switch (applicationStatus) {
      case 'pending':
        return (
          <Alert
            status="info"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            borderRadius="lg"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Application Under Review
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              Your application is currently being reviewed. We'll notify you once it's approved.
            </AlertDescription>
          </Alert>
        );
      case 'approved':
        return (
          <VStack spacing={4} w="full" as="form" onSubmit={handleRegister}>
            <Alert
              status="success"
              variant="subtle"
              borderRadius="lg"
              mb={4}
            >
              <AlertIcon />
              <Box>
                <AlertTitle>Application Approved!</AlertTitle>
                <AlertDescription>
                  Please complete your registration below.
                </AlertDescription>
              </Box>
            </Alert>

            <FormControl isRequired>
              <FormLabel>Security Code</FormLabel>
              <Input
                type="text"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                placeholder="Enter the security code provided"
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!passwordError}>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!passwordError}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="green"
              size="lg"
              width="full"
              isLoading={isRegistering}
              loadingText="Creating Account"
            >
              Complete Registration
            </Button>
          </VStack>
        );
      case 'registered':
        return (
          <Alert
            status="success"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            borderRadius="lg"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Registration Complete
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              Your vendor account has been successfully created.
              <Button
                mt={4}
                colorScheme="green"
                onClick={() => navigate('/vendor/dashboard')}
              >
                Go to Dashboard
              </Button>
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" color="orange.500" mb={2}>
            Vendor Application
          </Heading>
          <Text color="gray.600">
            {!applicationStatus ? 'Please fill out the form below to apply for a vendor account' :
             'Application Status'}
          </Text>
        </Box>

        {!applicationStatus ? (
          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Business Name</FormLabel>
                <Input
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Enter your business name"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Business Address</FormLabel>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your business address"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Business Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your business"
                  size="lg"
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Experience</FormLabel>
                <Textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Tell us about your relevant experience"
                  size="lg"
                  rows={4}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="orange"
                size="lg"
                width="full"
                isLoading={isSubmitting}
                loadingText="Submitting"
              >
                Submit Application
              </Button>
            </VStack>
          </Box>
        ) : (
          renderStatusAlert()
        )}
      </VStack>
    </Container>
  );
};

export default VendorApplication;