import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Header from './Header'; // Import the Header component
import {
    Box,
    Typography,
    Button,
    Stack,
    Paper,
    Grid,
    List,      // Added for the orders list
    ListItem,  // Added for individual order items
    CircularProgress // Added for potential loading state if needed later
} from '@mui/material'; // Import necessary Material UI components

function Orders() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const product_id = queryParams.get("product_id");
    const seller_id = queryParams.get("seller_id");

    const [orders, setOrders] = useState([]);
    const [error, setError] = useState("");
    const [loadingOrders, setLoadingOrders] = useState(false); // State for loading past orders
    const [loadingCheckout, setLoadingCheckout] = useState(false); // State for checkout button loading

    const token = localStorage.getItem('token') || '';
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const buyer_id = user['sub'] || ''; // 'sub' is the user id from Cognito
    const userRole = user['custom:role'] || 'buyer';

    const fetchOrders = async () => {
      setLoadingOrders(true);
      setError("");
      try {
          const res = await axios.get("/api/orders", {
              params: { buyer_id,seller_id, userRole }, // 🛠️ Corrected params
          });
          console.log(res.data);
          setOrders(res.data);
      } catch (err) {
          console.error("Failed to fetch orders:", JSON.stringify(err));
          setError("Failed to fetch orders: " + (err.response?.data?.detail || err.message));
      } finally {
          setLoadingOrders(false);
      }
  };

    const startStripeCheckout = async () => {
        setLoadingCheckout(true); // Start loading for checkout button
        setError(""); // Clear previous errors
        try {
            const res = await axios.post(
                "/api/orders/create-checkout-session",
                null, // No request body needed for this endpoint with params
                {
                    params: { buyer_id, seller_id, product_id },
                    // headers: { Authorization: `Bearer ${token}` }, // Uncomment later
                }
            );
            console.log(res.data);
            // Redirect to Stripe checkout page - ensure res.data.checkout_url exists
            if (res.data && res.data.checkout_url) {
                window.location.href = res.data.checkout_url;
            } else {
                 console.error("Checkout URL not received from backend");
                 setError("❌ Failed to initiate payment: Invalid response from server.");
                 setLoadingCheckout(false); // Stop loading on error
            }

        } catch (err) {
            console.error("Failed to start checkout:", err);
            setError("❌ Failed to initiate payment: " + (err.response?.data?.detail || err.message));
            setLoadingCheckout(false); // Stop loading on error
        }
        // Note: Loading state is not turned off on success because the user is redirected
    };

    useEffect(() => {
        fetchOrders();
        // Dependencies: fetchOrders doesn't change, so [] is fine
        // If buyer_id could change while on the page, you might add it: [buyer_id]
    }, []);

    return (
        <Box
            sx={{
                width: '100vw',
                minHeight: '100vh',
                bgcolor: '#FDF5E6', // Background color matching Products.jsx
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Header /> {/* Include the Header component */}

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    px: { xs: 2, md: 4 },
                    py: 4,
                }}
            >
                <Typography variant="h4" sx={{ color: '#8B4513', mb: 3 }}> {/* Title styling */}
                    🛒 Your Orders
                </Typography>

                {product_id && seller_id && (
                    <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#FFEBCD' }}> {/* Paper for the checkout section */}
                        <Typography variant="h6" gutterBottom>
                           Complete Your Purchase
                        </Typography>
                         <Typography variant="body1" sx={{ mb: 2 }}>
                            Proceed to payment for the item you selected.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={startStripeCheckout}
                            disabled={loadingCheckout} // Disable button while loading
                            sx={{
                                backgroundColor: '#635bff', // Stripe's color or similar
                                color: 'white',
                                '&:hover': { backgroundColor: '#5048d8' },
                            }}
                        >
                             {loadingCheckout ? <CircularProgress size={24} color="inherit" /> : 'Pay with Stripe 💳'}
                        </Button>
                        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>} {/* Display error below button */}
                    </Paper>
                )}

                <Typography variant="h5" sx={{ color: '#8B4513', mb: 2 }}> {/* Past Orders Title */}
                    📋 Past Orders:
                </Typography>

                {loadingOrders ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress sx={{ color: '#8B4513' }} />
                    </Box>
                ) : orders.length === 0 ? (
                    <Typography variant="body1">
                        No orders yet.
                    </Typography>
                ) : (
                    <List> {/* Use MUI List component */}
                        {orders.map((order) => (
                            <Paper key={order.transaction_id} elevation={1} sx={{ mb: 2, p: 2, bgcolor: '#FAEBD7' }}> {/* Paper for each order item */}
                                <ListItem sx={{ padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Typography variant="body1" component="div">
                                        <strong>{order.name}</strong> | {order.category} | Rs.{order.price}
                                    </Typography>
                                     <Typography variant="body2" color="textSecondary">
                                        Placed on {new Date(order.created_at).toLocaleString()}
                                    </Typography>
                                     <Typography variant="body2" color="textSecondary">
                                        Status: {order.status}
                                    </Typography>
                                     {/* You might add more order details here */}
                                </ListItem>
                            </Paper>
                        ))}
                    </List>
                )}

            </Box>
        </Box>
    );
}

export default Orders;
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useLocation } from "react-router-dom";

// function Orders() {
//   const location = useLocation();
//   const queryParams = new URLSearchParams(location.search);
//   const product_id = queryParams.get("product_id");
//   const seller_id = queryParams.get("seller_id");

//   const [orders, setOrders] = useState([]);
//   const [error, setError] = useState("");

//   const buyer_id = "defaultBuyer123"; // 🔥 Hardcoded string for now (later replace with token)
//   // alert("Product id"+product_id)
//   // alert("Seller id"+seller_id)


//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("/api/orders", {
//         params: { buyer_id },
//       });
//       setOrders(res.data);
//     } catch (err) {
//       console.error("Failed to fetch orders:", err);
//     }
//   };

//   const startStripeCheckout = async () => {
//     try {
//       const res = await axios.post(
//         "/api/orders/create-checkout-session",
//         null,
//         {
//           params: { buyer_id, seller_id, product_id },
//           // headers: { Authorization: `Bearer ${token}` }, // Uncomment later
//         }
//       );
//       console.log(res.data);
//       window.location.href = res.data.checkout_url; // 🚀 Redirect to Stripe checkout page
//     } catch (err) {
//       console.error("Failed to start checkout:", err);
//       setError("❌ Failed to initiate payment.");
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   return (
//     <div style={{ padding: "2rem" }}>
//       <h2>🛒 Your Orders</h2>

//       {product_id && seller_id && (
//         <div style={{ marginBottom: "1rem" }}>
//           <button
//             onClick={startStripeCheckout}
//             style={{
//               padding: "10px 20px",
//               backgroundColor: "#635bff",
//               color: "white",
//               border: "none",
//               borderRadius: "5px",
//               cursor: "pointer",
//               fontSize: "16px",
//               fontWeight: "bold",
//             }}
//           >
//             Pay with Stripe 💳
//           </button>
//           {error && <p style={{ color: "red" }}>{error}</p>}
//         </div>
//       )}

//       <h3>📋 Past Orders:</h3>
//       {orders.length === 0 ? (
//         <p>No orders yet.</p>
//       ) : (
//         <ul>
//           {orders.map((order) => (
//             <li key={order.transaction_id} style={{ marginBottom: "1rem" }}>
//               <strong>{order.name}</strong> | {order.category} | Rs.{order.price} | 
//               Placed on {new Date(order.created_at).toLocaleString()} | Status: {order.status}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// export default Orders;