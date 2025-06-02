import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography, Box, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const Header = () => (
  <AppBar
    position="static"
    sx={{
      backgroundColor: '#3e2c20', // deep antique brown
      color: '#f5e6c4',           // parchment beige
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    }}
  >
    <Toolbar>
      <Typography
        variant="h5"
        sx={{
          flexGrow: 1,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#e0c097',
        }}
      >
        The RAMM SHOP
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          component={Link}
          to="/"
          sx={{ color: '#f5e6c4', fontFamily: 'serif', mx: 1 }}
        >
          Logout
        </Button>
        <Button
          component={Link}
          to="/products"
          sx={{ color: '#f5e6c4', fontFamily: 'serif', mx: 1 }}
        >
          Products
        </Button>
        <Button
          component={Link}
          to="/orders"
          sx={{ color: '#f5e6c4', fontFamily: 'serif', mx: 1 }}
        >
          Orders
        </Button>
        <Button
          component={Link}
          to="/admin"
          sx={{ color: '#f5e6c4', fontFamily: 'serif', mx: 1 }}
        >
          Admin
        </Button>

        <IconButton
          component={Link}
          to="/search"
          sx={{ color: '#f5e6c4', ml: 2 }}
        >
          <SearchIcon />
        </IconButton>
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header;
