import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
// import Admin from "./pages/Admin";
import AddProduct from "./pages/AddProduct";
import Search from "./pages/Search";
import OrderSuccess from "./pages/OrderSuccess";
import Admin from "./pages/Admin";
import ConfirmSignup from "./pages/Confirmation";



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin" element={<Admin />} />
        {/* <Route path="/admin" element={<Admin />} /> */}
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/search" element={<Search />} />
        <Route path="/ordersuccess" element={<OrderSuccess />} />
        <Route path="/confirmation" element={< ConfirmSignup />} />


      </Routes>
    </Router>
  );
}

export default App;