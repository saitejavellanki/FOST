import React, { useState, useEffect } from "react";
import { gql, useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Button,
  useToast,
  Grid,
  Image,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Spinner,
  Alert,
  AlertIcon,
  useDisclosure,
  HStack,
  Flex,
  useBreakpointValue,
  Select,
  Badge,
  Switch,
  InputGroup,
  InputLeftElement,
  Radio,
  RadioGroup
} from "@chakra-ui/react";
// import { SearchIcon, EditIcon } from "@chakra-ui/icons";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../Components/firebase/Firebase";
import { SearchIcon, EditIcon } from "@chakra-ui/icons";

const FOOD_CATEGORIES = [
  "Beverages",
  "Appetizers",
  "Main Course",
  "Desserts",
  "Snacks",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Vegan",
  "Vegetarian",
  "Salads",
  "Soups",
  "Fast Food",
  "Street Food",
  "Healthy Options",
  "Milkshake Bites",
  "Slushy Splash",
  "Fruit-A-List",
  "Ice Colas",
  "Mojitos",
  "Ba..Ba..Banana",
  "We are Oreons",
  "Chocolate Factory",
  "Tipsy Thickshakes",
  "Brownie Bros",
  "Nutella Ninjas",
  "Protein Shakes"
];

const GET_VENDOR_ITEMS = gql`
  query GetItemsByVendor($vendorId: String!) {
    itemsByVendor(vendorId: $vendorId) {
      id
      name
      price
      description
      imageUrl
      category
      dietType
      isActive
      shopId
      vendorId
      createdAt
    }
  }
`;

const CREATE_ITEM = gql`
  mutation CreateItem(
    $category: String!
    $description: String!
    $dietType: String!
    $imageUrl: String!
    $isActive: Boolean!
    $name: String!
    $price: Float!
    $shopId: String!
    $vendorId: String!
  ) {
    createItem(
      category: $category
      description: $description
      dietType: $dietType
      imageUrl: $imageUrl
      isActive: $isActive
      name: $name
      price: $price
      shopId: $shopId
      vendorId: $vendorId
    ) {
      id
      name
      category
      price
      description
      imageUrl
      dietType
      isActive
    }
  }
`;
const UPDATE_ITEM = gql`
  mutation UpdateItem(
    $id: ID!
    $category: String!
    $description: String!
    $dietType: String!
    $imageUrl: String!
    $isActive: Boolean!
    $name: String!
    $price: Float!
  ) {
    updateItem(
      id: $id
      category: $category
      description: $description
      dietType: $dietType
      imageUrl: $imageUrl
      isActive: $isActive
      name: $name
      price: $price
    ) {
      id
      name
      category
      price
      description
      imageUrl
      dietType
      isActive
    }
  }
`;

const VendorItems = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemData, setItemData] = useState({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    category: "", // Added category field
    isActive: true, // Add isActive by default
    dietType: "veg",
    
  });
  const [itemImage, setItemImage] = useState(null);
  const [itemImagePreview, setItemImagePreview] = useState('');
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isEditModalOpen, 
    onOpen: onEditModalOpen, 
    onClose: onEditModalClose 
  } = useDisclosure();
  const { 
    isOpen: isAddModalOpen, 
    onOpen: onAddModalOpen, 
    onClose: onAddModalClose 
  } = useDisclosure();

  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const toast = useToast();

  // Responsive column configuration
  const gridColumns = useBreakpointValue({ 
    base: "repeat(1, 1fr)",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(auto-fill, minmax(250px, 1fr))"
  });

  const { data: queryData, loading: queryLoading, error: queryError } = useQuery(GET_VENDOR_ITEMS, {
    variables: { 
      vendorId: JSON.parse(localStorage.getItem("user"))?.uid 
    }
  });

  const [createItem, { loading: createLoading }] = useMutation(CREATE_ITEM, {
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Item added successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add item: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
    refetchQueries: [{ query: GET_VENDOR_ITEMS }]
  });


  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  
    const filtered = items.filter((item) => 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.dietType && item.dietType.toLowerCase().includes(term)) 
    );
  
    setFilteredItems(filtered);
  };

  const startEditItem = (item) => {
    setEditItem(item);
    setItemData({
      name: item.name,
      price: item.price.toString(),
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
      isActive: item.isActive,
      dietType: item.dietType
    });
    setItemImagePreview(item.imageUrl);
    onEditModalOpen();
  };
  // Responsive button stack direction
  const buttonStackDirection = useBreakpointValue({ 
    base: "column", 
    md: "row" 
  });

  useEffect(() => {
    if (queryData) {
      setItems(queryData.itemsByVendor);
      setLoading(false);
    }
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
    }
  }, [queryData, queryError]);

  const fetchItems = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("No user found");
      }

      const user = JSON.parse(userStr);

      const itemsRef = collection(firestore, "items");
      const q = query(itemsRef, where("vendorId", "==", user.uid));
      const snapshot = await getDocs(q);

      const itemsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setItems(itemsList);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setItemData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a JPEG, PNG, or GIF image',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: 'Image must be smaller than 5MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setItemImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadItemImage = async () => {
    if (!itemImage) return null;

    try {
      const userStr = localStorage.getItem("user");
      const user = JSON.parse(userStr);

      const storageRef = ref(storage, `items/${user.uid}/${Date.now()}_${itemImage.name}`);
      const snapshot = await uploadBytes(storageRef, itemImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      toast({
        title: 'Image Upload Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return null;
    }
  };

  const toggleItemActiveStatus = async (itemId, currentStatus) => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("No user found");
      }

      const user = JSON.parse(userStr);
      const itemRef = doc(firestore, "items", itemId);

      // Update the item's active status
      await updateDoc(itemRef, {
        isActive: !currentStatus
      });

      // Update local state to reflect the change
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, isActive: !currentStatus } 
            : item
        )
      );

      toast({
        title: "Item Status Updated",
        description: `Item ${!currentStatus ? 'activated' : 'deactivated'}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update item status: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userStr = localStorage.getItem("user");
      const user = JSON.parse(userStr);

      let imageUrl = itemData.imageUrl;
      if (itemImage) {
        // Keep your existing image upload logic for now
        imageUrl = await uploadItemImage();
        if (!imageUrl) {
          console.error("Image upload failed");
          setSubmitting(false);
          return;
        }
      }

      await createItem({
        variables: {
          name: itemData.name,
          price: parseFloat(itemData.price),
          description: itemData.description,
          imageUrl: imageUrl,
          category: itemData.category,
          dietType: itemData.dietType,
          isActive: true,
          vendorId: user.uid,
          shopId: user.shopId || user.uid,
        }
      });

      // Reset form
      setItemData({
        name: "",
        price: "",
        description: "",
        imageUrl: "",
        category: "",
        isActive: true,
        dietType: "veg",
      });
      setItemImage(null);
      setItemImagePreview('');

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || queryLoading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error || queryError) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          {error || queryError.message}
        </Alert>
      </Box>
    );
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userStr = localStorage.getItem("user");
      const user = JSON.parse(userStr);

      let imageUrl = itemData.imageUrl;
      if (itemImage) {
        imageUrl = await uploadItemImage();
        if (!imageUrl) {
          console.error("Image upload failed");
          setSubmitting(false);
          return;
        }
      }

      const itemRef = doc(firestore, "items", editItem.id);
      await updateDoc(itemRef, {
        name: itemData.name,
        price: parseFloat(itemData.price),
        description: itemData.description,
        imageUrl: imageUrl,
        category: itemData.category,
        dietType: itemData.dietType,
      });

      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === editItem.id 
            ? { ...item, ...itemData, imageUrl, price: parseFloat(itemData.price) } 
            : item
        )
      );

      // Reset form and close modal
      setItemData({
        name: "",
        price: "",
        description: "",
        imageUrl: "",
        category: "",
        isActive: true,
        dietType: "veg",
      });
      setItemImage(null);
      setItemImagePreview('');
      onEditModalClose();

      toast({
        title: "Success",
        description: "Item updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Full Error Details:", error);
      toast({
        title: "Error",
        description: `Failed to update item: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Box p={{ base: 3, md: 6 }}>
      <VStack spacing={6} align="stretch">
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          alignItems="center"
          mb={4}
        >
          <Heading 
            size={{ base: 'lg', md: 'xl' }} 
            mb={{ base: 4, md: 0 }}
          >
            Item Management
          </Heading>
          <Flex 
            direction={buttonStackDirection} 
            gap={3} 
            width={{ base: '100%', md: 'auto' }}
          >
            <Button 
              as={Link} 
              to="/vendor/orders" 
              colorScheme="green" 
              width={{ base: '100%', md: 'auto' }}
            >
              View Orders
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={onOpen}
              width={{ base: '100%', md: 'auto' }}
            >
              Add New Item
            </Button>
          </Flex>
        </Flex>

        {/* Search Input */}
        <InputGroup mb={4}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search items by name, category, or description"
            value={searchTerm}
            onChange={handleSearch}
            size="md"
          />
        </InputGroup>

        <Grid 
        templateColumns={gridColumns} 
        gap={{ base: 4, md: 6 }}
      >
        {(searchTerm ? filteredItems : items).length === 0 ? (
    <Text 
      textAlign="center" 
      gridColumn="1/-1" 
      color="gray.500"
    >
      {searchTerm 
        ? "No items match your search" 
        : "No items in your shop. Add some items to get started!"
      }
    </Text>
        ) : (
          (searchTerm ? filteredItems : items).map((item) => (
            <Box
              key={item.id}
              borderWidth={1}
              borderRadius="lg"
              overflow="hidden"
              boxShadow="md"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
              opacity={item.isActive ? 1 : 0.5} // Visually indicate inactive items
              position="relative"
            >
              <Image
                src={item.imageUrl}
                alt={item.name}
                height={{ base: '150px', md: '200px' }}
                width="100%"
                objectFit="cover"
                fallbackSrc="https://via.placeholder.com/200"
                filter={!item.isActive ? 'grayscale(100%)' : 'none'} // Grayscale inactive items
              />
              <Box p={{ base: 2, md: 4 }}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Heading size={{ base: 'sm', md: 'md' }}>
                    {item.name}
                  </Heading>
                  <Badge colorScheme="purple" fontSize="0.8em">
                    {item.category}
                  </Badge>
                  <Badge 
  colorScheme={item.dietType === 'veg' ? 'green' : 'red'} 
  fontSize="0.8em"
>
  {item.dietType ? item.dietType.toUpperCase() : 'UNSPECIFIED'}
</Badge>
                </Flex>
                <Text
                  color="green.500"
                  fontSize={{ base: 'lg', md: 'xl' }}
                  fontWeight="bold"
                  mb={2}
                >
                  Rs.{item.price.toFixed(2)}
                </Text>
                <Text 
                  noOfLines={2} 
                  color="gray.600"
                  fontSize={{ base: 'sm', md: 'md' }}
                  mb={2}
                >
                  {item.description}
                </Text>
                <Flex align="center" justify="space-between">
                  <Text 
                    color={item.isActive ? "green.500" : "red.500"}
                    fontWeight="bold"
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Text>
                  <Switch
                    isChecked={item.isActive}
                    onChange={() => toggleItemActiveStatus(item.id, item.isActive)}
                    colorScheme="green"
                  />
                </Flex>
                <Flex 
        position="absolute" 
        top={2} 
        right={2} 
        zIndex={10}
      >
        <Button 
          size="sm" 
          colorScheme="blue" 
          onClick={() => startEditItem(item)}
          mr={2}
        >
          <EditIcon />
        </Button>
      </Flex>
              </Box>
            </Box>
          ))
        )}
      </Grid>
      {/* Add New Item Modal */}
<Modal 
  isOpen={isOpen} 
  onClose={onClose}
  size={{ base: 'full', md: 'md' }}
>
  <ModalOverlay />
  <ModalContent 
    mx={{ base: 0, md: 'auto' }} 
    my={{ base: 0, md: '10vh' }}
  >
    <ModalHeader>Add New Item</ModalHeader>
    <ModalCloseButton />
    <ModalBody pb={6}>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Item Name</FormLabel>
            <Input
              name="name"
              value={itemData.name}
              onChange={handleInputChange}
              placeholder="Enter item name"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Diet Type</FormLabel>
            <RadioGroup 
              name="dietType"
              value={itemData.dietType}
              onChange={(value) => setItemData(prev => ({
                ...prev,
                dietType: value
              }))}
            >
              <HStack spacing={4}>
                <Radio value="veg" colorScheme="green">
                  Vegetarian
                </Radio>
                <Radio value="non-veg" colorScheme="red">
                  Non-Vegetarian
                </Radio>
              </HStack>
            </RadioGroup>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Category</FormLabel>
            <Select
              name="category"
              value={itemData.category}
              onChange={handleInputChange}
              placeholder="Select category"
              size={{ base: 'md', md: 'lg' }}
            >
              {FOOD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Price</FormLabel>
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={itemData.price}
              onChange={handleInputChange}
              placeholder="Enter price"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={itemData.description}
              onChange={handleInputChange}
              placeholder="Enter item description"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Item Image</FormLabel>
            <Input 
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleImageChange}
              size={{ base: 'md', md: 'lg' }}
              sx={{
                '::file-selector-button': {
                  height: '40px',
                  padding: '0 15px',
                  mr: 4,
                  bg: 'gray.200',
                  borderRadius: 'md',
                  cursor: 'pointer'
                }
              }}
            />
            {itemImagePreview && (
              <Image 
                src={itemImagePreview} 
                alt="Item Preview" 
                mt={4} 
                maxH={{ base: '150px', md: '200px' }} 
                objectFit="cover" 
                width="100%"
              />
            )}
            <Input
              mt={2}
              name="imageUrl"
              value={itemData.imageUrl}
              onChange={handleInputChange}
              placeholder="Or enter image URL"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={submitting}
            size={{ base: 'md', md: 'lg' }}
          >
            Add Item
          </Button>
        </VStack>
      </form>
    </ModalBody>
  </ModalContent>
</Modal>
{/* Edit Item Modal */}
<Modal 
  isOpen={isEditModalOpen} 
  onClose={onEditModalClose}
  size={{ base: 'full', md: 'md' }}
>
  <ModalOverlay />
  <ModalContent 
    mx={{ base: 0, md: 'auto' }} 
    my={{ base: 0, md: '10vh' }}
  >
    <ModalHeader>Edit Item</ModalHeader>
    <ModalCloseButton />
    <ModalBody pb={6}>
      <form onSubmit={handleUpdateItem}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Item Name</FormLabel>
            <Input
              name="name"
              value={itemData.name}
              onChange={handleInputChange}
              placeholder="Enter item name"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Diet Type</FormLabel>
            <RadioGroup 
              name="dietType"
              value={itemData.dietType}
              onChange={(value) => setItemData(prev => ({
                ...prev,
                dietType: value
              }))}
            >
              <HStack spacing={4}>
                <Radio value="veg" colorScheme="green">
                  Vegetarian
                </Radio>
                <Radio value="non-veg" colorScheme="red">
                  Non-Vegetarian
                </Radio>
              </HStack>
            </RadioGroup>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Category</FormLabel>
            <Select
              name="category"
              value={itemData.category}
              onChange={handleInputChange}
              placeholder="Select category"
              size={{ base: 'md', md: 'lg' }}
            >
              {FOOD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Price</FormLabel>
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={itemData.price}
              onChange={handleInputChange}
              placeholder="Enter price"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={itemData.description}
              onChange={handleInputChange}
              placeholder="Enter item description"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Item Image</FormLabel>
            <Input 
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleImageChange}
              size={{ base: 'md', md: 'lg' }}
              sx={{
                '::file-selector-button': {
                  height: '40px',
                  padding: '0 15px',
                  mr: 4,
                  bg: 'gray.200',
                  borderRadius: 'md',
                  cursor: 'pointer'
                }
              }}
            />
            {itemImagePreview && (
              <Image 
                src={itemImagePreview} 
                alt="Item Preview" 
                mt={4} 
                maxH={{ base: '150px', md: '200px' }} 
                objectFit="cover" 
                width="100%"
              />
            )}
            <Input
              mt={2}
              name="imageUrl"
              value={itemData.imageUrl}
              onChange={handleInputChange}
              placeholder="Or enter image URL"
              size={{ base: 'md', md: 'lg' }}
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={submitting}
            size={{ base: 'md', md: 'lg' }}
          >
            Update Item
          </Button>
        </VStack>
      </form>
    </ModalBody>
  </ModalContent>
</Modal>
      </VStack>
    </Box>
  );
};

export default VendorItems;