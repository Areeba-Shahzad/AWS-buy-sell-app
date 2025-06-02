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
    CircularProgress,
    Modal,
    Fade,
    Backdrop,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90%', sm: 400 },
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    maxHeight: '90vh',
    overflowY: 'auto',
};

const Products = () => {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userRole = user['custom:role'] || 'buyer';  // buyer as fallback
    const userID = user['sub'] || '';  // empty string fallback

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [openModal, setOpenModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        description: '',
        imageKey: '',
    });

    const cdnBaseUrl = import.meta.env.VITE_CDN_URL || ''; // Fallback if not set

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                let endpoint = '/api/products/';
                const params = {};

                if (userRole === 'seller') {
                    params.seller_id = userID;
                }

                const response = await axios.get(endpoint, { params });

                if (userRole !== 'seller') {
                    setProducts(response.data.filter(product => product.status !== 'sold'));
                } else {
                    setProducts(response.data);
                }

            } catch (err) {
                console.error('Failed to fetch products', err.response?.data || err.message);
                setError("Failed to load products: " + (err.response?.data?.detail || err.message));
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [userRole, userID]);

    const handleOpenModal = (product) => {
        setCurrentProduct(product);
        setFormData({
            name: product.name || '',
            category: product.category || '',
            price: product.price !== undefined ? product.price.toString() : '',
            description: product.description || '',
            imageKey: product.image_key || '',
        });
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentProduct(null);
        setFormData({
            name: '',
            category: '',
            price: '',
            description: '',
            imageKey: '',
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        if (!currentProduct) return;

        const updates = {};

        if (formData.name) updates.name = formData.name;
        if (formData.category) updates.category = formData.category;
        if (formData.description) updates.description = formData.description;
        if (formData.imageKey) updates.image_key = formData.imageKey;

        if (formData.price) {
            const numValue = parseFloat(formData.price);
            if (!isNaN(numValue) && numValue >= 0) {
                updates.price = numValue;
            } else {
                alert("Please enter a valid positive number for price.");
                return;
            }
        }

        if (Object.keys(updates).length === 0) {
            alert("No changes detected or invalid input.");
            return;
        }

        const payload = new FormData();
        payload.append("seller_id", userID);
        payload.append("updates_json_string", JSON.stringify(updates));

        try {
            const response = await axios.put(`/api/products/${currentProduct.ProductID}`, payload);

            setProducts(prev =>
                prev.map(p =>
                    p.ProductID === currentProduct.ProductID ? response.data.product : p
                )
            );
            alert("Product updated successfully!");
            handleCloseModal();
        } catch (e) {
            console.error('Update failed', e.response?.data || e.message);
            alert("Update failed: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;

        const payload = new FormData();
        payload.append("seller_id", userID);

        try {
            await axios.delete(`/api/products/${id}`, { data: payload });
            setProducts(prev => prev.filter(p => p.ProductID !== id));
            alert("Product deleted successfully!");
        } catch (e) {
            console.error('Delete failed', e.response?.data || e.message);
            alert("Delete failed: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleBuy = (product) => {
        alert("Buying Product: " + product.ProductID+" From seller: "+product.seller_id);
        navigate(`/orders?product_id=${product.ProductID}&seller_id=${product.seller_id}`);
    };

    const pageTitle = userRole === 'seller' ? 'My Products' : 'Available Products';

    return (
        <Box sx={{
            width: '100vw',
            minHeight: '100vh',
            backgroundColor: '#FDF5E6',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Header />

            <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, py: 4 }}>
                <Typography variant="h4" sx={{ color: '#8B4513', mb: 4 }}>
                    {pageTitle}
                </Typography>
                {userRole === 'seller' && (
            <Button
              variant="contained"
              onClick={() => navigate('/add-product')}
              sx={{
                backgroundColor: '#8B5E3C',
                color: '#fff',
                '&:hover': { backgroundColor: '#6E482F' },
              }}
            >
              Create Product
            </Button>
          )}

                {loading && (
                    <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
                        {error}
                    </Typography>
                )}

                {!loading && !error && products.length === 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" align="center" sx={{ color: '#8B4513' }}>
                            {userRole === 'seller' ? "You don't have any products listed yet." : "No products available at this time."}
                        </Typography>
                    </Box>
                )}

                <Grid container spacing={3} justifyContent="center">
                    {products.map((product) => {
                        const productName = product.name || product.title;
                        const productPrice = product.price;
                        const productDescription = product.description;
                        const productImageKey = product.image_key || product.imageKey;
                        const fullImageUrl = productImageKey ? `${cdnBaseUrl}${productImageKey}?auto=compress&width=600` : '';

                        return (
                            <Grid item xs={12} sm={6} md={4} key={product.ProductID}>
                                <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{
                                        position: 'relative',
                                        width: '100%',
                                        paddingBottom: '75%',
                                        overflow: 'hidden',
                                        borderRadius: 2,
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        {fullImageUrl ? (
                                            <Box component="img" src={fullImageUrl} alt={productName} sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 2,
                                            }} />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">No Image</Typography>
                                        )}
                                    </Box>

                                    <Box sx={{ flexGrow: 1, mt: 2 }}>
                                        <Typography variant="h6">{productName}</Typography>
                                        {productPrice !== undefined && (
                                            <Typography>Price: ${productPrice}</Typography>
                                        )}
                                        {productDescription && (
                                            <Typography mt={1} variant="body2" color="text.secondary">
                                                {productDescription.length > 100 ? productDescription.substring(0, 100) + '...' : productDescription}
                                            </Typography>
                                        )}
                                        {productImageKey && (
                                            <Typography mt={1} fontSize="0.8rem" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                                                Image Key: {productImageKey}
                                            </Typography>
                                        )}
                                        {userRole === 'seller' && product.status && (
                                            <Typography mt={1} fontSize="small" color="text.secondary">
                                                Status: {product.status}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box mt="auto" pt={2}>
                                        {userRole === 'seller' ? (
                                            <Stack direction="row" spacing={1}>
                                            <Button size="small" variant="outlined" onClick={() => handleOpenModal(product)}>
                                                Update
                                            </Button>
                                            <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(product.ProductID)}>
                                                Delete
                                            </Button>
                                            </Stack>
                                        ) : userRole === 'admin' ? null : (
                                            <Button fullWidth variant="contained" onClick={() => handleBuy(product)}>
                                            Buy Now
                                            </Button>
                                        )}
                                    </Box>

                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            </Box>

            {/* Update Modal */}
            <Modal
                open={openModal}
                onClose={handleCloseModal}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{ backdrop: { timeout: 500 } }}
            >
                <Fade in={openModal}>
                    <Box sx={modalStyle} component="form" onSubmit={handleModalSubmit}>
                        <Typography variant="h6" gutterBottom>Update Product</Typography>

                        <Stack spacing={2}>
                            <TextField name="name" label="Product Name" value={formData.name} onChange={handleFormChange} fullWidth />
                            <TextField name="category" label="Category" value={formData.category} onChange={handleFormChange} fullWidth />
                            <TextField name="price" label="Price" type="number" value={formData.price} onChange={handleFormChange} fullWidth />
                            <TextField name="description" label="Description" value={formData.description} onChange={handleFormChange} multiline rows={3} fullWidth />
                            <TextField name="imageKey" label="Image Key" value={formData.imageKey} onChange={handleFormChange} fullWidth />

                            <Button type="submit" variant="contained" fullWidth>Save Changes</Button>
                        </Stack>
                    </Box>
                </Fade>
            </Modal>
        </Box>
    );
};

export default Products;
