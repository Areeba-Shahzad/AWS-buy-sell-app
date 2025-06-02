import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Header from './Header'; // Import the Header component
import {
    Box,
    Typography,
    CircularProgress, // To show the finalizing state
    Stack, // For layout
    Paper // Optional: Could wrap content in Paper if desired
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Success icon

function OrderSuccess() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const buyer_id = queryParams.get("buyer_id");
    const seller_id = queryParams.get("seller_id");
    const product_id = queryParams.get("product_id");

    const [finalizing, setFinalizing] = useState(true); // State to track finalization process
    const [finalized, setFinalized] = useState(false); // State to indicate if finalization was successful
    const [error, setError] = useState(null); // State to capture any finalization errors

    useEffect(() => {
        const finalizeOrder = async () => {
            if (!buyer_id || !seller_id || !product_id) {
                console.warn("Missing order details in URL for finalization.");
                setError("Missing order details for finalization.");
                setFinalizing(false);
                // Still redirect after a short delay even on error
                setTimeout(() => 
                  navigate("/products")
                // alert("okayyy")
                , 3000);
                return;
            }

            setFinalizing(true); // Start finalizing process
            setError(null); // Clear any previous errors

            try {
                await axios.post("/api/orders/finalize-order", null, {
                    params: { buyer_id, seller_id, product_id },
                    // headers: { Authorization: `Bearer ${token}` }, // Uncomment later
                });
                console.log("✅ Order finalized after Stripe payment!");
                setFinalized(true); // Mark as finalized successfully

                // Start timer for redirection *after* successful finalization
                const timer = setTimeout(() => {
                //   alert("OKAYYY")

                    navigate("/products");
                }, 3000); // Redirect after 3 seconds

                return () => clearTimeout(timer); // Cleanup the timer

            } catch (err) {
                console.error("❌ Failed to finalize order:", err);
                setError("Failed to finalize your order. Please contact support."); // More user-friendly message
                setFinalized(false); // Ensure finalized is false on error

                // Still redirect after a delay even on API error
                 const timer = setTimeout(() => {
                //   alert("okayyy")
                    navigate("/products");
                }, 5000); // Maybe a bit longer delay on error

                return () => clearTimeout(timer); // Cleanup the timer

            } finally {
                setFinalizing(false); // Finalizing process is complete (either success or failure)
            }
        };

        // Only attempt to finalize if the necessary query params are present
        // This check is also inside finalizeOrder for robustness
        finalizeOrder();

        // Dependencies: Include query param variables and navigate
    }, [buyer_id, seller_id, product_id, navigate]); // Added navigate to dependencies

    return (
        <Box
            sx={{
                width: '100vw',
                minHeight: '100vh',
                bgcolor: '#FDF5E6', // Background color matching theme
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Center content horizontally
                justifyContent: 'center', // Center content vertically
                textAlign: 'center', // Center text
                p: 3 // Add some padding
            }}
        >
            <Header /> {/* Include the Header component */}

            {/* Use a Stack for vertical spacing of content */}
            <Stack spacing={2} sx={{ mt: 8 }}> {/* Add margin top to not be under header */}
                {finalizing ? (
                    <>
                        <Typography variant="h5" sx={{ color: '#8B4513' }}>
                            Finalizing your order...
                        </Typography>
                        <CircularProgress sx={{ color: '#8B4513' }} />
                    </>
                ) : error ? (
                     <>
                        <Typography variant="h5" color="error">
                            Error!
                        </Typography>
                        <Typography variant="body1" color="error">
                            {error}
                        </Typography>
                     </>
                ) : finalized ? (
                     <>
                        {/* Success Icon and Text */}
                        <CheckCircleOutlineIcon sx={{ fontSize: 80, color: 'green' }} />
                        <Typography variant="h4" sx={{ color: 'green', fontWeight: 'bold' }}>
                            Payment Successful!
                        </Typography>
                     </>
                ) : (
                     // Fallback state (should ideally not be reached if logic is correct)
                     <Typography variant="h5" sx={{ color: '#8B4513' }}>
                        Processing...
                    </Typography>
                )}

                {/* Message displayed after finalization completes (success or error) */}
                {!finalizing && (
                    <Typography variant="body1" sx={{ color: '#8B4513' }}>
                        Redirecting you to explore more products...
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

export default OrderSuccess;

// import React, { useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import axios from "axios";

// function OrderSuccess() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const queryParams = new URLSearchParams(location.search);

//   const buyer_id = queryParams.get("buyer_id");
//   const seller_id = queryParams.get("seller_id");
//   const product_id = queryParams.get("product_id");

//   useEffect(() => {
//     const finalizeOrder = async () => {
//       try {
//         await axios.post("/api/orders/finalize-order", null, {
//           params: { buyer_id, seller_id, product_id },
//         });
//         console.log("✅ Order finalized after Stripe payment!");
//       } catch (err) {
//         console.error("❌ Failed to finalize order:", err);
//       }
//     };

//     if (buyer_id && seller_id && product_id) {
//       finalizeOrder();
//     }

//     const timer = setTimeout(() => {
//       navigate("/search");
//     }, 3000);

//     return () => clearTimeout(timer);
//   }, [buyer_id, seller_id, product_id, navigate]);

//   return (
//     <div style={{ padding: "3rem", textAlign: "center" }}>
//       <h1 style={{ color: "green" }}>✅ Payment Successful!</h1>
//       <p>Redirecting you to explore more products...</p>
//     </div>
//   );
// }

// export default OrderSuccess;