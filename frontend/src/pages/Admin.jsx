import React, { useState, useEffect } from "react";
import axios from 'axios';
import Header from "./Header";

import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Card,
    CardContent,
    Stack,
    CircularProgress
} from "@mui/material";

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const themeColors = {
    background: '#FDF5E6',
    sidebarBackground: '#FAEBD7',
    primaryText: '#8B4513',
    secondaryText: '#6E482F',
    tableHeaderBackground: '#8B5E3C',
    gridLines: '#D2B48C',
};

const Admin = () => {
    const token = localStorage.getItem('token') || '';
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const adminIdPlaceholder = user['sub'] || '';
    const userRole = user['custom:role'] || 'buyer';
    console.log("userRole", userRole);
    console.log("user", user);

    const [hasAccess, setHasAccess] = useState(false);
    const [activeSection, setActiveSection] = useState('users');

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [userError, setUserError] = useState(null);

    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productError, setProductError] = useState(null);

    useEffect(() => {
        if (userRole.toLowerCase() === 'admin') {
            setHasAccess(true);
        } else {
            setHasAccess(false);
        }
    }, [userRole]);

    useEffect(() => {
        if (hasAccess) {
            if (activeSection === 'users') {
                fetchUsers();
            } else if (activeSection === 'listings') {
                fetchProducts();
            }
        }
    }, [activeSection, hasAccess]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        setUserError(null);
        try {
            const response = await axios.get("/api/admin/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error.response?.data?.detail || error.message);
            setUserError("Failed to fetch users: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        setProductError(null);
        try {
            const response = await axios.get("/api/products", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products:", error.response?.data?.detail || error.message);
            setProductError("Failed to fetch products: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoadingProducts(false);
        }
    };

    const toggleProductStatus = async (id, currentStatus) => {
        setLoadingProducts(true);
        setProductError(null);
        try {
            await axios.delete(`/api/admin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Product ${id} deleted successfully`);
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error.response?.data?.detail || error.message);
            setProductError("Failed to delete product: " + (error.response?.data?.detail || error.message));
            setLoadingProducts(false);
        }
    };

    const handleSectionChange = (section) => {
        setActiveSection(section);
    };

    if (!hasAccess) {
        return (
            <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: themeColors.background, display: 'flex', flexDirection: 'column' }}>
                <Header />
                <Box component="main" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'red', mt: 8 }}>
                        🚫 No Access
                    </Typography>
                    <Typography variant="body1" sx={{ color: themeColors.secondaryText, mt: 2 }}>
                        You must be an admin to view this page.
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: 'column', minHeight: "100vh", backgroundColor: themeColors.background }}>
            <Header />
            <Box sx={{ display: "flex", flexGrow: 1, width: '100%', pt: 8 }}>
                <Box sx={{
                    width: 250,
                    backgroundColor: themeColors.sidebarBackground,
                    padding: 3,
                    boxShadow: "2px 0 8px rgba(0,0,0,0.05)",
                    flexShrink: 0
                }}>
                    <Typography variant="h5" fontWeight="bold" mb={4} sx={{ color: themeColors.primaryText }}>
                        Admin Panel
                    </Typography>
                    <Stack spacing={2}>
                        <Button
                            variant="text"
                            onClick={() => handleSectionChange('users')}
                            sx={{
                                justifyContent: "flex-start",
                                color: activeSection === 'users' ? themeColors.primaryText : themeColors.secondaryText,
                                textTransform: 'none',
                                fontWeight: activeSection === 'users' ? 'bold' : 'normal'
                            }}
                        >
                            User Management
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => handleSectionChange('listings')}
                            sx={{
                                justifyContent: "flex-start",
                                color: activeSection === 'listings' ? themeColors.primaryText : themeColors.secondaryText,
                                textTransform: 'none',
                                fontWeight: activeSection === 'listings' ? 'bold' : 'normal'
                            }}
                        >
                            Listings Management
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ flexGrow: 1, padding: 4, overflowY: 'auto' }}>
                    {activeSection === 'users' && (
                        <Box>
                            <Typography variant="h4" fontWeight="bold" mb={4} sx={{ color: themeColors.primaryText }}>
                                User Management
                            </Typography>
                            {loadingUsers ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                    <CircularProgress sx={{ color: themeColors.primaryText }} />
                                </Box>
                            ) : userError ? (
                                <Typography color="error" sx={{ mt: 2 }}>
                                    {userError}
                                </Typography>
                            ) : (
                                <TableContainer component={Paper} sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: themeColors.tableHeaderBackground }}>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>User ID</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Email</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Role</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {users.length > 0 ? (
                                                users.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell>{user.id}</TableCell>
                                                        <TableCell>{user.email}</TableCell>
                                                        <TableCell>{user.role}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center">No users found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {activeSection === 'listings' && (
                        <Box>
                            <Typography variant="h4" fontWeight="bold" mb={4} sx={{ color: themeColors.primaryText }}>
                                Listings Management
                            </Typography>
                            {loadingProducts ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                    <CircularProgress sx={{ color: themeColors.primaryText }} />
                                </Box>
                            ) : productError ? (
                                <Typography color="error" sx={{ mt: 2 }}>
                                    {productError}
                                </Typography>
                            ) : (
                                <TableContainer component={Paper} sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: themeColors.tableHeaderBackground }}>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Product ID</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Title</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Seller ID</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Status</TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {products.length > 0 ? (
                                                products.map((product) => (
                                                    <TableRow key={product.ProductID}>
                                                        <TableCell>{product.ProductID}</TableCell>
                                                        <TableCell>{product.title}</TableCell>
                                                        <TableCell>{product.seller_id}</TableCell>
                                                        <TableCell>{product.status || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            {product.status !== 'sold' ? (
                                                                <Button
                                                                    variant="contained"
                                                                    size="small"
                                                                    color={product.status === "removed" ? "success" : "error"}
                                                                    onClick={() => toggleProductStatus(product.ProductID, product.status)}
                                                                    sx={{ textTransform: "none" }}
                                                                >
                                                                    {product.status === "removed" ? "Keep" : "Remove"}
                                                                </Button>
                                                            ) : (
                                                                <Typography variant="body2" color="textSecondary">Sold</Typography>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">No products found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default Admin;
