import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Stack,
  VStack,
  HStack,
  Heading, 
  Input, 
  Button, 
  Text, 
  Link, 
  useToast, 
  Select,
  FormControl,
  FormErrorMessage,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { MdEmail, MdLock, MdPerson, MdStore } from 'react-icons/md';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs,
  getDoc,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { auth, firestore } from '../../Components/firebase/Firebase';
import { createLogger } from '../utils/ErrorLoggers';

const Register = () => {
  const logger = createLogger('RegisterComponent');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [shopId, setShopId] = useState('');
  const [availableShops, setAvailableShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState({
    isVerifying: false,
    message: ''
  });
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const [tempUser, setTempUser] = useState(null);
  const [verificationCheckInterval, setVerificationCheckInterval] = useState(null);

  // Restrictions state
  const [restrictions, setRestrictions] = useState({
    adminExists: false,
    takenShops: new Set()
  });

  const toast = useToast();
  const navigate = useNavigate();

  // Load registration data
  useEffect(() => {
    const loadRegistrationData = async () => {
      try {
        const adminSnapshot = await getDocs(
          query(collection(firestore, 'users'), where('role', '==', 'admin'))
        );
        
        const vendorSnapshot = await getDocs(
          query(collection(firestore, 'users'), where('role', '==', 'vendor'))
        );
        
        const takenShops = new Set();
        vendorSnapshot.forEach(doc => {
          const { shopId } = doc.data();
          if (shopId) takenShops.add(shopId);
        });

        setRestrictions({
          adminExists: !adminSnapshot.empty,
          takenShops
        });

        const shopsSnapshot = await getDocs(collection(firestore, 'shops'));
        const shops = shopsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(shop => !takenShops.has(shop.id));
        
        setAvailableShops(shops);
      } catch (error) {
        logger.error(error, {
          action: 'loadRegistrationData',
          component: 'Register',
          userData: { role }
        });
        
        toast({
          title: 'Error Loading Data',
          description: 'Failed to load registration data. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    loadRegistrationData();
  }, [toast, role]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        // Immediately sign out unverified users
        await signOut(auth);
        return;
      }
    });

    return () => unsubscribe();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setTempUser(null);
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
      }
      setVerificationTimer(0);
      setVerificationStatus({
        isVerifying: false,
        message: ''
      });
    };
  }, []);

  // Reset verification state when modal closes
  useEffect(() => {
    if (!isVerificationModalOpen) {
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
      }
      setVerificationTimer(0);
      setVerificationStatus({
        isVerifying: false,
        message: ''
      });
    }
  }, [isVerificationModalOpen]);

  const startVerificationCheck = (user) => {
    try {
      setVerificationTimer(300); // 5 minutes
      setVerificationStatus({
        isVerifying: true,
        message: 'Email verification in progress...'
      });
      
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
      }
      
      const interval = setInterval(async () => {
        setVerificationTimer(prevTimer => {
          if (prevTimer <= 0) {
            clearInterval(interval);
            handleVerificationTimeout(user);
            return 0;
          }
          
          if (prevTimer % 2 === 0) {
            checkVerificationStatus(user, interval);
          }
          return prevTimer - 1;
        });
      }, 1000);
      
      setVerificationCheckInterval(interval);
      
    } catch (error) {
      logger.error(error, {
        action: 'startVerificationCheck',
        userId: user?.uid
      });
    }
  };

  const handleVerificationTimeout = async (user) => {
    try {
      if (user) {
        try {
          await deleteDoc(doc(firestore, 'users', user.uid));
        } catch (docError) {
          logger.error(docError, {
            action: 'handleVerificationTimeout',
            operation: 'deleteDoc',
            userId: user.uid
          });
        }
  
        try {
          await user.delete();
        } catch (userError) {
          logger.error(userError, {
            action: 'handleVerificationTimeout',
            operation: 'deleteUser',
            userId: user.uid
          });
          await signOut(auth);
        }
      }
  
      setIsVerificationModalOpen(false);
      setVerificationStatus({
        isVerifying: false,
        message: 'Verification timeout. Please try registering again.'
      });
      
      toast({
        title: 'Verification Timeout',
        description: 'Please try registering again',
        status: 'error',
        duration: 5000,
      });
    } catch (error) {
      logger.error(error, {
        action: 'handleVerificationTimeout',
        userId: user?.uid
      });
    }
  };

  const checkVerificationStatus = async (user, interval) => {
    try {
      await user.reload();
      if (user.emailVerified) {
        clearInterval(interval);
        setVerificationStatus({
          isVerifying: false,
          message: 'Email verified successfully!'
        });

        // Sign in after verification
        try {
          await signInWithEmailAndPassword(auth, user.email, tempUser.password);
          
          toast({
            title: 'Email Verified',
            description: 'Verification successful! Logging you in...',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });

          await completeRegistration(user);
          setTempUser(null);
          
        } catch (loginError) {
          logger.error(loginError, {
            action: 'post-verification-login',
            userId: user.uid,
            email: user.email
          });
          
          toast({
            title: 'Login Failed',
            description: 'Please try logging in manually',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          
          navigate('/login');
        }
      }
    } catch (error) {
      logger.error(error, {
        action: 'checkVerificationStatus',
        userId: user?.uid,
        email: user?.email
      });
  
      toast({
        title: 'Verification Error',
        description: 'Failed to verify email. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setIsLoading(true);

    try {
      // Validation checks
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }

      if (role === 'admin' && restrictions.adminExists) {
        throw new Error('Admin already exists');
      }

      if (role === 'vendor') {
        if (!shopId) {
          throw new Error('Shop selection required');
        }
        if (restrictions.takenShops.has(shopId)) {
          throw new Error('Shop already has a vendor');
        }
      }

      // Check for Google email
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.includes(GoogleAuthProvider.PROVIDER_ID)) {
        toast({
          title: 'Google Account Detected',
          description: 'Please use the Google Sign In button instead',
          status: 'info',
          duration: 5000,
        });
        return;
      }

      // Register user
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Immediately sign out
      await signOut(auth);
      
      // Store credentials temporarily
      setTempUser({
        ...user,
        password // Store password for post-verification login
      });
      
      await sendEmailVerification(user);
      setIsVerificationModalOpen(true);
      startVerificationCheck(user);

    } catch (error) {
      logger.error(error, {
        action: 'register',
        email,
        role
      });

      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Please enter a valid email address',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/network-request-failed': 'Network error. Please check your connection',
      };

      toast({
        title: 'Registration Failed',
        description: errorMessages[error.code] || error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = async (user) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        handleRedirect(role);
        return;
      }
  
      await setDoc(doc(firestore, 'users', user.uid), {
        email: user.email,
        role,
        shopId: role === 'vendor' ? shopId : null,
        createdAt: new Date()
      });
  
      setIsVerificationModalOpen(false);
  
      toast({
        title: 'Registration Successful!',
        description: 'Welcome to our platform!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
  
      handleRedirect(role);
  
    } catch (error) {
      logger.error(error, {
        action: 'completeRegistration',
        userId: user.uid,
        role
      });
  
      toast({
        title: 'Registration Error',
        description: 'Failed to complete registration. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRedirect = (userRole) => {
    switch (userRole) {
      case 'admin':
        navigate('/admin/shops');
        break;
      case 'vendor':
        navigate('/vendor/items');
        break;
      default:
        navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.emailVerified) {
        logger.warn(new Error('Google email not verified'), {
          action: 'googleSignIn',
          email: user.email
        });
        
        toast({
          title: 'Email Not Verified',
          description: 'Please verify your Google email before continuing',
          status: 'warning',
          duration: 5000,
        });
        await signOut(auth);
        return;
      }

      await completeRegistration(user);
    } catch (error) {
      logger.error(error, {
        action: 'googleSignIn',
        component: 'Register'
      });
      
      const errorMessage = error.code === 'auth/popup-closed-by-user'
        ? 'Sign-in window was closed. Please try again.'
        : error.message;
      
      toast({
        title: 'Google Sign In Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!tempUser) return;
    
    try {
      await sendEmailVerification(tempUser);
      toast({
        title: 'Verification Email Sent',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      logger.error(error, {
        action: 'resendVerification',
        email: tempUser.email
      });
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCloseVerificationModal = () => {
    try {
      // Log modal closure
      logger.info(new Error('Verification modal closed by user'), {
        action: 'handleCloseVerificationModal',
        userId: tempUser?.uid,
        email: tempUser?.email,
        timeRemaining: verificationTimer
      });
  
      // Clear the check interval but don't reset verification timer
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
        setVerificationCheckInterval(null);
      }
  
      // Close modal but maintain verification status
      setIsVerificationModalOpen(false);
  
      // Show info toast
      toast({
        title: 'Verification Pending',
        description: 'You can still complete verification through the email link',
        status: 'info',
        duration: 5000,
      });
    } catch (error) {
      logger.error(error, {
        action: 'handleCloseVerificationModal',
        userId: tempUser?.uid
      });
    }
  };

  return (
    <>
      <Flex minH="100vh" direction={{ base: "column", md: "row" }}>
        {/* Left Side - Hero Section */}
        <Box
          display={{ base: "none", md: "flex" }}
          flex="1"
          bg="orange.500"
        >
          <VStack
            w="full"
            h="full"
            justify="center"
            p={10}
            spacing={6}
            color="white"
          >
            <Heading size="2xl" fontWeight="bold" textAlign="center">
              Start Your Journey
            </Heading>
            <Text fontSize="xl" textAlign="center" maxW="500px">
              Join our marketplace and discover endless opportunities for growth and success
            </Text>
            
            <Stack spacing={6} mt={4}>
              <HStack spacing={4} justify="center">
                <Box p={4} bg="whiteAlpha.200" borderRadius="lg">
                  <Text fontWeight="bold">Fast</Text>
                  <Text fontSize="sm">Registration</Text>
                </Box>
                <Box p={4} bg="whiteAlpha.200" borderRadius="lg">
                  <Text fontWeight="bold">Secure</Text>
                  <Text fontSize="sm">Platform</Text>
                </Box>
                <Box p={4} bg="whiteAlpha.200" borderRadius="lg">
                  <Text fontWeight="bold">24/7</Text>
                  <Text fontSize="sm">Support</Text>
                </Box>
              </HStack>
            </Stack>
          </VStack>
        </Box>

        {/* Right Side - Registration Form */}
        <Flex
          flex="1"
          bg="white"
          justify="center"
          align="center"
          p={{ base: 4, md: 6, lg: 8 }}
        >
           {verificationStatus.isVerifying && (
          <Alert
            status="info"
            position="fixed"
            bottom={4}
            right={4}
            width="auto"
            zIndex={1000}
          >
            <AlertIcon />
            <Text>{verificationStatus.message}</Text>
            <Text ml={2}>
              Time remaining: {Math.floor(verificationTimer / 60)}:
              {String(verificationTimer % 60).padStart(2, '0')}
            </Text>
          </Alert>
        )}
          <VStack
            w="full"
            maxW="440px"
            spacing={4}
            as="form"
            onSubmit={handleRegister}
          >
            <VStack spacing={1} align="flex-start" w="full">
              <Heading fontSize="3xl" color="gray.800">
                Create Account
              </Heading>
              <Text color="gray.600">
                Already have an account?{" "}
                <Link
                  color="orange.500"
                  fontWeight="semibold"
                  _hover={{ color: "orange.600" }}
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Link>
              </Text>
            </VStack>

            {/* Google Sign In Button */}
            <Button
              w="full"
              size="lg"
              variant="outline"
              // leftIcon={<Icon as={MdGoogle} />}
              onClick={handleGoogleSignIn}
              isLoading={isLoading}
            >
              Continue with Google
            </Button>

            <HStack w="full">
           
              <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                or continue with email
              </Text>
              
            </HStack>

            <VStack spacing={3} w="full">
              <FormControl>
                <Input
                  size="lg"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  borderColor="gray.200"
                  _hover={{ borderColor: "orange.400" }}
                  _focus={{
                    borderColor: "orange.500",
                    boxShadow: "0 0 0 1px orange.500",
                  }}
                  leftElement={
                    <Icon as={MdEmail} color="gray.400" ml={3} />
                  }
                />
              </FormControl>

              <FormControl isInvalid={!!passwordError}>
                <Input
                  size="lg"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  borderColor="gray.200"
                  _hover={{ borderColor: "orange.400" }}
                  _focus={{
                    borderColor: "orange.500",
                    boxShadow: "0 0 0 1px orange.500",
                  }}
                  leftElement={
                    <Icon as={MdLock} color="gray.400" ml={3} />
                  }
                />
              </FormControl>

              <FormControl isInvalid={!!passwordError}>
                <Input
                  size="lg"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  borderColor="gray.200"
                  _hover={{ borderColor: "orange.400" }}
                  _focus={{
                    borderColor: "orange.500",
                    boxShadow: "0 0 0 1px orange.500",
                  }}
                  leftElement={
                    <Icon as={MdLock} color="gray.400" ml={3} />
                  }
                />
                {passwordError && (
                  <FormErrorMessage>{passwordError}</FormErrorMessage>
                )}
              </FormControl>

              <FormControl>
                <Select
                  size="lg"
                  placeholder="Select Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  borderColor="gray.200"
                  _hover={{ borderColor: "orange.400" }}
                  _focus={{
                    borderColor: "orange.500",
                    boxShadow: "0 0 0 1px orange.500",
                  }}
                  icon={<MdPerson />}
                >
                  <option value="customer">Customer</option>
                  {!restrictions.adminExists && <option value="admin">Admin</option>}
                  {availableShops.length > 0 && <option value="vendor">Vendor</option>}
                </Select>
              </FormControl>

            
              {role === 'vendor' && (
                <FormControl>
                  <Select
                    size="lg"
                    placeholder="Select Shop"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    required={role === 'vendor'}
                    borderColor="gray.200"
                    _hover={{ borderColor: "orange.400" }}
                    _focus={{
                      borderColor: "orange.500",
                      boxShadow: "0 0 0 1px orange.500",
                    }}
                    icon={<MdStore />}
                  >
                    {availableShops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Button
                type="submit"
                size="lg"
                w="full"
                colorScheme="orange"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </VStack>
          </VStack>
        </Flex>
      </Flex>

      {/* Email Verification Modal */}
      <Modal
        isOpen={isVerificationModalOpen}
        onClose={handleCloseVerificationModal}
        closeOnOverlayClick={true}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex justify="space-between" align="center">
              <Text>Verify Your Email</Text>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCloseVerificationModal}
              >
                Close
              </Button>
            </Flex>
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <Text>
                  A verification email has been sent to {email}. Please check your
                  inbox and click the verification link.
                </Text>
              </Alert>
              
              <Text>
                Time remaining: {Math.floor(verificationTimer / 60)}:
                {String(verificationTimer % 60).padStart(2, '0')}
              </Text>

              <Button
                w="full"
                onClick={resendVerificationEmail}
                isDisabled={verificationTimer > 270} // Allow resend after 30 seconds
              >
                Resend Verification Email
              </Button>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Text fontSize="sm" color="gray.500">
              You can close this window and continue verifying your email
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Register;