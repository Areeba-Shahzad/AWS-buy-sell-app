import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './Header';
import {
    Button,
    Typography,
    Grid,
    Paper,
    Box,
    Stack,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Modal,
    Fade,
    Backdrop
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Style for the modal box (copied from Products.jsx)
const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90%', sm: 400 }, // Responsive width
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    maxHeight: '90vh', // Limit height
    overflowY: 'auto', // Add scroll if content overflows
};

const Search = () => {
    const navigate = useNavigate();
    const [searchBy, setSearchBy] = useState('name'); // Default search criteria
    const [searchTerm, setSearchTerm] = useState(''); // Text input for most criteria
    const [minPrice, setMinPrice] = useState(''); // Input for min price
    const [maxPrice, setMaxPrice] = useState(''); // Input for max price
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchAttempted, setSearchAttempted] = useState(false);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userRole = user['custom:role'] || 'buyer';  // buyer as fallback
    const formSeller = user['sub'] || '';  // empty string fallback


    // --- Start: Copied from Products.jsx for Update Modal State ---
    const [openModal, setOpenModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        description: '', // Although backend uses category for description, keep this for form consistency if needed
        imageKey: ''
    });
    // --- End: Copied from Products.jsx ---


    // Placeholder for CDN URL - ensure this matches your Products.jsx setup
    const cdnBaseUrl = import.meta.env.VITE_CDN_URL;


    // Handle dropdown change
    const handleSearchByChange = (event) => {
        setSearchBy(event.target.value);
        // Reset search term and price range when criteria changes
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setSearchResults([]); // Clear previous results when criteria changes
        setError(null); // Clear errors
        setSearchAttempted(false); // Reset search attempted state
    };

    // Handle text input change
    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
    };

    // Handle price input changes
    const handleMinPriceChange = (event) => {
        setMinPrice(event.target.value);
    };

    const handleMaxPriceChange = (event) => {
        setMaxPrice(event.target.value);
    };


    // Handle the search action
    const handleSearch = async () => {
        setError(null); // Clear previous errors
        setLoading(true); // Start loading
        setSearchResults([]); // Clear previous results
        setSearchAttempted(true); // Mark that a search has been attempted

        const params = {};
        let validationError = false; // Still useful for specific type/format errors

        // Build parameters based on selected search criteria
        switch (searchBy) {
            case 'product_id':
                const id = parseInt(searchTerm, 10);
                if (!searchTerm || isNaN(id) || id <= 0) { // Added id <= 0 check
                    setError("Please enter a valid Product ID (a number greater than 0).");
                    validationError = true;
                } else {
                    params.product_id = id;
                }
                break;
            case 'name':
                // Allow empty search term for 'name' to trigger 'show all'
                if (searchTerm.trim() !== '') {
                    params.name = searchTerm.trim();
                }
                break;
            case 'category':
                // Allow empty search term for 'category' to trigger 'show all'
                if (searchTerm.trim() !== '') {
                    params.category = searchTerm.trim();
                }
                break;
            case 'seller_id':
                // Allow empty search term for 'seller_id' to trigger 'show all'
                if (searchTerm.trim() !== '') {
                    params.seller_id = searchTerm.trim();
                }
                break;
            case 'price_range':
                const min = parseFloat(minPrice);
                const max = parseFloat(maxPrice);

                if ((minPrice !== '' && isNaN(min)) || (maxPrice !== '' && isNaN(max))) {
                    setError("Please enter valid numbers for price.");
                    validationError = true;
                } else {
                    // Only add params if values are provided and are valid numbers
                    if (minPrice !== '') params.min_price = min;
                    if (maxPrice !== '' && max >= 0) params.max_price = max; // Ensure max is not negative

                    // Check for min/max consistency only if both are provided
                    if (minPrice !== '' && maxPrice !== '' && min > max) {
                        setError("Minimum price cannot be greater than maximum price.");
                        validationError = true;
                    }
                    // If searchBy is price_range, but no min or max was entered,
                    // don't set a validation error here. The backend will handle
                    // the empty params object by returning all products.
                }
                break;
            default:
                // Should not happen
                setError("Invalid search criteria selected.");
                validationError = true;
                break;
        }

        // If a specific input validation failed (e.g., invalid ID), stop here
        if (validationError) {
            setLoading(false);
            return;
        }

        try {
            // The API call proceeds even if params is empty (backend should handle this)
            const response = await axios.get('/api/search/', { params });

            // Apply buyer-specific filtering *after* getting results from the backend
            // Sellers see all search results regardless of status
            if (userRole !== 'seller') {
                 setSearchResults(response.data.filter(product => product.status !== 'sold'));
            } else {
                 setSearchResults(response.data);
            }

        } catch (e) {
            console.error('Search failed', e.response?.data || e.message);
            setError("Search failed: " + (e.response?.data?.detail || e.message || JSON.stringify(e)));
            setSearchResults([]); // Ensure results are cleared on error
        } finally {
            setLoading(false); // Stop loading
        }
    };


    // --- Start: Copied from Products.jsx for Modal Handlers and State Logic ---
    // Function to open the modal and populate the form
    const handleOpenModal = (product) => {
        setCurrentProduct(product);
        // Populate form data with existing product details
        setFormData({
            name: product.title || '', // Map title to name
            category: product.category || '', // Map category to category
            price: product.price !== undefined ? product.price.toString() : '', // Convert number to string for TextField
            imageKey: product.imageKey || '' // Map imageKey directly
            // Description field is not directly mapped for update based on Products.jsx form
        });
        setOpenModal(true);
    };

    // Function to close the modal
    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentProduct(null); // Clear current product data
        setFormData({}); // Clear form data
    };

    // Handle form field changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    // Handle modal form submission (Update Product) - Copied and adapted
    const handleModalSubmit = (e) => {
        e.preventDefault();

        if (!currentProduct) return; // Should not happen if modal is opened correctly

        const updates = {};
        // Iterate through form data and add to updates if value is not empty string
        for (const key in formData) {
            let backendKey = key;
            // Mapping frontend names back to backend names
            if (key === 'name') backendKey = 'name';
            if (key === 'category') backendKey = 'category';
            if (key === 'price') backendKey = 'price';
            if (key === 'imageKey') backendKey = 'image_key';

            if (formData[key] !== '') {
                if (key === 'price') {
                    const numValue = parseFloat(formData[key]);
                    if (!isNaN(numValue)) {
                        updates[backendKey] = numValue;
                    } else {
                         alert(`Please enter a valid number for price.`);
                         return; // Stop submission if price is invalid
                    }
                } else {
                    updates[backendKey] = formData[key];
                }
            }
        }

        // Check if there are any valid updates to send
        if (Object.keys(updates).length === 0) {
            alert("No changes detected or invalid input.");
            return;
        }

        const payload = new FormData();
        payload.append("seller_id", formSeller); // Include seller_id for authorization on backend
        // Send the updates object as a stringified JSON form field
        payload.append("updates_json_string", JSON.stringify(updates)); // Match backend param name

        axios.put(`/api/products/${currentProduct.ProductID}`, payload)
            .then((response) => {
                // Backend returns {"updated": true, "product": {...}}
                // Update the item in the search results list
                setSearchResults((prev) =>
                    prev.map((p) =>
                        p.ProductID === currentProduct.ProductID ? response.data.product : p
                    )
                );
                alert("Product updated successfully!");
                handleCloseModal(); // Close modal on success
            })
            .catch((e) => {
                console.error('Update failed', e.response?.data || e.message);
                alert("Update failed: " + (e.response?.data?.detail || e.message || JSON.stringify(e)));
            });
    };
    // --- End: Copied from Products.jsx for Modal Handlers and State Logic ---


    // --- Start: Copied from Products.jsx for Delete Handler ---
    const handleDelete = (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) {
            return; // User cancelled
        }

        const payload = new FormData();
        // Include seller_id in the DELETE request body as form data
        payload.append("seller_id", formSeller); // Include seller_id for authorization on backend

        // axios.delete with a body requires the data to be in the `data` property
        axios.delete(`/api/products/${id}`, { data: payload })
            .then(() => {
                // Remove the item from the search results list
                setSearchResults((prev) => prev.filter((p) => p.ProductID !== id));
                alert("Product deleted successfully!");
            })
            .catch((e) => {
                console.error('Delete failed', e.response?.data || e.message);
                alert("Delete failed: " + (e.response?.data?.detail || e.message || JSON.stringify(e)));
            });
    };
    // --- End: Copied from Products.jsx for Delete Handler ---


    // --- MODIFIED: handleBuy function to pass product_id and seller_id in URL ---
    const handleBuy = (product) => { // Accept the full product object
        // Your buy logic here, perhaps navigate to a product detail page or add to cart

        alert(`Buying product ${product.ProductID}`);
        // Navigate to the orders page with product_id and seller_id as query parameters
        // Make sure the backend can handle orders with product_id and seller_id
        navigate(`/orders?product_id=${product.ProductID}&seller_id=${product.seller_id}`);
    };


    // --- New: Function to generate specific 'No results' message ---
    const getNoResultsMessage = () => {
        // This message is shown when searchAttempted is true, loading is false, and searchResults is empty
        let message = "No products found matching your criteria."; // Default fallback

        const trimmedSearchTerm = searchTerm.trim();
        const hasSearchTerm = trimmedSearchTerm !== '';
        const hasMin = minPrice !== '';
        const hasMax = maxPrice !== '';

        if (searchBy === 'product_id' && hasSearchTerm) {
            message = `No product found with ID "${trimmedSearchTerm}".`;
        } else if (searchBy === 'name' && hasSearchTerm) {
            message = `No products found with name like "${trimmedSearchTerm}".`;
        } else if (searchBy === 'category' && hasSearchTerm) {
            message = `No products found in category like "${trimmedSearchTerm}".`;
        } else if (searchBy === 'seller_id' && hasSearchTerm) {
            message = `No products found for seller ID "${trimmedSearchTerm}".`;
        } else if (searchBy === 'price_range') {
            if (hasMin && hasMax) {
                message = `No products found with price between ${minPrice} and ${maxPrice}.`;
            } else if (hasMin) {
                message = `No products found with price greater than or equal to ${minPrice}.`;
            } else if (hasMax) {
                message = `No products found with price less than or equal to ${maxPrice}.`;
            } else {
                // Price range selected but no min/max entered - backend returns all.
                // If no results, means no products exist.
                message = "No products available at this time.";
            }
        } else if (!searchAttempted) {
             // Message before any search attempt
            return "Enter criteria and click 'Search' to find products.";
        } else if (!hasSearchTerm && searchBy !== 'price_range') {
             // User searched with an empty term for name/category/seller_id
             message = "No products available matching the criteria.";
        } else {
            // Other criteria selected or general 'no results' after search
             message = "No products found matching your criteria.";
        }

        // Add specific message if filtering by 'sold' status removed results for a buyer
        if (userRole !== 'seller' && searchAttempted && searchResults.length === 0) {
             // This check is less precise as we filter *before* setting state,
             // but as a fallback if searchResults is empty after attempt.
             // A more accurate check would be to compare original results vs filtered,
             // but the current filtering approach is simpler and mirrors Products.jsx
             // and this message is a general 'nothing found'.
             // If the backend correctly handles 'sold' status filtering for buyers,
             // this message will be accurate based on the backend response.
             // If backend returns all and FE filters, the "No products available at this time"
             // or similar message would still apply if *no* non-sold products were found.
             // For simplicity, the existing logic is sufficient.
        }


        return message;
    };
    // --- End: Function to generate specific 'No results' message ---


    return (
        <Box
            sx={{
                width: '100vw',
                minHeight: '100vh',
                backgroundColor: '#FDF5E6', // Consistent with Products.jsx
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Header />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    px: { xs: 2, md: 4 },
                    py: 4,
                }}
            >
                <Stack direction="column" spacing={3} mb={3}>
                    <Typography variant="h4" sx={{ color: '#8B4513' }}>
                        Search Products
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                        {/* Dropdown for search criteria */}
                        <FormControl sx={{ minWidth: 180, flexShrink: 0 }}>
                            <InputLabel id="search-by-label">Search By</InputLabel>
                            <Select
                                labelId="search-by-label"
                                value={searchBy}
                                label="Search By"
                                onChange={handleSearchByChange}
                            >
                                <MenuItem value="name">Product Name</MenuItem>
                                <MenuItem value="category">Category</MenuItem>
                                <MenuItem value="price_range">Price Range</MenuItem>
                                <MenuItem value="product_id">Product ID</MenuItem>
                                <MenuItem value="seller_id">Seller ID</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Input field(s) based on search criteria */}
                        {searchBy === 'price_range' ? (
                            <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
                                <TextField
                                    label="Min Price"
                                    type="number"
                                    value={minPrice}
                                    onChange={handleMinPriceChange}
                                    fullWidth
                                    variant="outlined"
                                    inputProps={{ step: "0.01", min: "0" }} // Added min 0
                                />
                                <TextField
                                    label="Max Price"
                                    type="number"
                                    value={maxPrice}
                                    onChange={handleMaxPriceChange}
                                    fullWidth
                                    variant="outlined"
                                    inputProps={{ step: "0.01", min: "0" }} // Added min 0
                                />
                            </Stack>
                        ) : (
                            <TextField
                                label={`Enter ${searchBy.replace('_', ' ').replace('id', 'ID')}`} // Dynamic label
                                value={searchTerm}
                                onChange={handleSearchTermChange}
                                fullWidth
                                variant="outlined"
                                // Adjust type for product_id if needed, though text is generally safer
                                type={searchBy === 'product_id' ? 'number' : 'text'}
                                inputProps={searchBy === 'product_id' ? { min: "1" } : {}}
                            />
                        )}

                        {/* Search Button */}
                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            sx={{
                                backgroundColor: '#8B5E3C', // Consistent styling
                                color: '#fff',
                                '&:hover': { backgroundColor: '#6E482F' },
                                // Add margin top for small screens when stacked
                                mt: { xs: 2, sm: 0 },
                                alignSelf: { xs: 'stretch', sm: 'center' } // Stretch on mobile, center on larger
                            }}
                            disabled={loading} // Disable button while loading
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                        </Button>
                    </Stack>
                </Stack>

                {/* Display Error Message */}
                {error && (
                    <Typography color="error" align="center" gutterBottom>
                        {error}
                    </Typography>
                )}

                {/* Display Search Results */}
                {/* Only show Grid if not loading, there are results, AND no error */}
                {!loading && searchResults.length > 0 && !error ? (
                    <Grid container spacing={3} justifyContent="center">
                         {/* Products are filtered for buyers directly after the API call */}
                         {searchResults.map((product) => ( // Changed 'i' to 'product' for clarity
                                <Grid item xs={12} sm={6} md={4} key={product.ProductID}>
                                    {/* Reusing the Paper/Box structure from Products.jsx */}
                                    <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Box
                                            component="img"
                                            // Use product.imageKey directly
                                            src={`${cdnBaseUrl}${product.imageKey}?auto=compress&width=600`}
                                            alt={product.title}
                                            sx={{
                                                width: '100%',
                                                height: 0,
                                                paddingBottom: '75%', // 4:3 aspect ratio
                                                objectFit: 'cover',
                                                borderRadius: 2,
                                            }}
                                        />
                                        <Typography variant="h6" mt={2}>
                                             {/* Use product.title */}
                                             {product.title}
                                        </Typography>
                                        <Typography>
                                            {/* Use product.price */}
                                            Price: ${product.price}
                                        </Typography>
                                        {/* Use product.description */}
                                        {product.description && <Typography mt={1}>{product.description}</Typography>}
                                        <Typography mt={1} fontSize="small" color="textSecondary">
                                            {/* Use product.seller_id */}
                                            Seller ID: {product.seller_id}
                                        </Typography>

                                        {/* Conditionally display status for sellers */}
                                        {userRole === 'seller' && (
                                            <Typography mt={1} fontSize="small" color="textSecondary">
                                                Status: {product.status}
                                            </Typography>
                                        )}


                                        <Box mt="auto" pt={2}>
                                             {/* Conditionally render buttons based on userRole */}
                                            {userRole === 'seller' ? (
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" variant="outlined" onClick={() => handleOpenModal(product)}>
                                                        Update
                                                    </Button>
                                                    <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(product.ProductID)}>
                                                        Delete
                                                    </Button>
                                                </Stack>
                                            ) : (
                                                <Button fullWidth variant="contained" onClick={() => handleBuy(product)}>
                                                    Buy Now
                                                </Button>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                    </Grid>
                 ) : (
                    // Display message when not loading, no results, and search was attempted
                    !loading && searchAttempted && searchResults.length === 0 && (
                         <Box sx={{ width: '100%', mt: 4 }}>
                              <Typography variant="h5" align="center" sx={{ color: '#8B4513' }}>
                                   {getNoResultsMessage()}
                              </Typography>
                         </Box>
                    )
                 )}
                 {/* Display initial message before search */}
                 {!loading && !searchAttempted && (
                      <Box sx={{ width: '100%', mt: 4 }}>
                           <Typography variant="h5" align="center" sx={{ color: '#8B4513' }}>
                                {getNoResultsMessage()}
                           </Typography>
                      </Box>
                 )}


            </Box>

            {/* Update Modal - Only relevant for sellers */}
            {userRole === 'seller' && (
                 <Modal
                    aria-labelledby="update-product-modal-title"
                    aria-describedby="update-product-modal-description"
                    open={openModal}
                    onClose={handleCloseModal}
                    closeAfterTransition
                    slots={{ backdrop: Backdrop }}
                    slotProps={{
                    backdrop: { timeout: 500 },
                    }}
                >
                    <Fade in={openModal}>
                    <Box sx={modalStyle} component="form" onSubmit={handleModalSubmit}>
                        <Typography id="update-product-modal-title" variant="h6" component="h2" gutterBottom>
                        Update Product
                        </Typography>

                        <Stack spacing={2}>
                        <TextField
                            label="Product Name"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            fullWidth
                            variant="outlined"
                            required
                        />
                        <TextField
                            label="Category"
                            name="category"
                            value={formData.category}
                            onChange={handleFormChange}
                            fullWidth
                            variant="outlined"
                            // category is required by backend update schema
                            required
                        />
                        <TextField
                            label="Price"
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleFormChange}
                            fullWidth
                            variant="outlined"
                            required
                            inputProps={{ step: "0.01" }}
                        />
                        <TextField
                            label="Image Key"
                            name="imageKey"
                            value={formData.imageKey}
                            onChange={handleFormChange}
                            fullWidth
                            variant="outlined"
                            // imageKey is required by backend update schema
                            required
                        />
                        </Stack>

                        <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
                        <Button onClick={handleCloseModal} variant="outlined">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary">
                            Save Changes
                        </Button>
                        </Stack>
                    </Box>
                    </Fade>
                </Modal>
            )}
             {/* End Update Modal */}

        </Box>
    );
};

export default Search;