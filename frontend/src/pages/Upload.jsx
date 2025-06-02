import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from './Header';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Box
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Products = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get('/api/products').then(r => setItems(r.data));
  }, []);

  return (
    <>
      <Header />
      <Container sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography
            variant="h4"
            sx={{ fontFamily: 'Georgia, serif', color: '#3e2c20' }}
          >
            Our Collection
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            to="/products/create"
            sx={{
              backgroundColor: '#3e2c20',
              color: '#f5e6c4',
              fontFamily: 'serif',
              '&:hover': {
                backgroundColor: '#5a4030',
              },
            }}
          >
            Add Product
          </Button>
        </Box>

        <Grid container spacing={3}>
          {items.map(i => (
            <Grid item xs={12} sm={6} md={4} key={i.ProductID}>
              <Card
                sx={{
                  backgroundColor: '#fefaf0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  borderRadius: 2,
                }}
              >
                <CardMedia
                  component="img"
                  image={`${import.meta.env.VITE_CDN_URL}${i.imageKey}`}
                  alt={i.title}
                  sx={{ height: 200, objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontFamily: 'Georgia, serif', color: '#3e2c20' }}
                  >
                    {i.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

export default Products;
