import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  LinearProgress,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AddProduct = () => {
  const navigate = useNavigate();

  // Placeholder until you implement auth
  // const DEFAULT_SELLER = 'defaultUser123';

  const user = JSON.parse(localStorage.getItem('user')) || {};
  //   const userRole = user['custom:role'] || 'buyer';  // buyer as fallback
  //   const userID = user['sub'] || '';  // empty string fallback
  // const location = useLocation();
  const user_id = user['sub'] || 'defaultUser123';  // ← We are getting user_id from location.state
  console.log(user_id);


  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    seller_id: user_id,   // ← default placeholder
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If you integrate auth, override seller_id here:
  useEffect(() => {
    const user = location.state?.user_id;  // ← Get user_id from location state
    if (user) {
      setForm((f) => ({ ...f, seller_id: user }));
    }
  }, [location.state]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadProgress(0);
      setError('');
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleSubmit = async () => {
    setError('');
    if (!imageFile) {
      setError('Please select an image.');
      return;
    }
    if (!form.name || !form.price || !form.seller_id) {
      setError('Please fill in Name, Price, and Seller ID.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // 1) Get presigned URL
      setError('Step 1/3: Requesting upload URL...');
      const { data: { upload_url, key } } = await axios.get('/api/products/upload-url', {
        params: { filename: imageFile.name },
      });
      // alert(data)
      console.log('Upload URL received:', upload_url);
      console.log('Key:', key);
      // 2) Upload to S3
      setError('Step 2/3: Uploading image...');
      console.log('Uploading image to S3...');
      await axios.put(upload_url, imageFile, {
        headers: { 'Content-Type': imageFile.type },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(pct);
          console.log(`Upload progress: ${pct}%`);
        },
      });
      console.log('Image upload completed.');

      // 3) Create product
      setError('Step 3/3: Creating product entry...');
      const payload = new URLSearchParams();
      payload.append('name', form.name);
      payload.append('price', form.price);
      payload.append('category', form.description);
      payload.append('seller_id', form.seller_id);    // now a string username
      payload.append('image_keys', key);

      console.log('Payload:', payload);
      await axios.post('/api/products/create-product', payload);

      alert('Product created!');
      navigate('/products');
    } catch (err) {
      console.error(err);
      let msg = 'An unexpected error occurred.';
      if (err.response) {
        msg = `Backend Error (${err.response.status}): ${err.response.data.detail || err.message}`;
        console.log('Backend error:', err.response);
      } else if (err.request) {
        msg = 'Network or upload error. Please retry.';
        console.log('Network or request error:', err.request);
      }
      else
      {
        console.log('Unexpected error:', err.message);

      }
      setError(msg);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box p={4} sx={{ backgroundColor: '#FDF5E6', minHeight: '100vh' }}>
      <IconButton onClick={() => navigate('/products')} sx={{ mb: 2 }}>
        <ArrowBackIcon /> Back
      </IconButton>
      <Typography variant="h4" sx={{ color: '#8B4513' }} gutterBottom>
        Add New Product
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isSubmitting && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Submitting... {uploadProgress > 0 && `(Upload: ${uploadProgress}%)`}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          {/* Seller Username */}
          <TextField
            fullWidth
            required
            label="Seller Username"
            name="seller_id"
            type="text"
            value={form.seller_id}
            onChange={handleChange}
            margin="dense"
          />

          {/* Name, Price, Description */}
          {['name', 'price', 'description'].map((field) => (
            <TextField
              key={field}
              fullWidth
              required={field !== 'description'}
              label={field === 'description' ? 'Category' : field.charAt(0).toUpperCase() + field.slice(1)}
              name={field}
              type={field === 'price' ? 'number' : 'text'}
              value={form[field]}
              onChange={handleChange}
              multiline={field === 'description'}
              rows={field === 'description' ? 3 : 1}
              margin="dense"
            />
          ))}

          <Button component="label" variant="outlined" sx={{ mt: 2 }}>
            {imageFile ? 'Change Image' : 'Upload Image'}
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />
          </Button>

          {imagePreview && (
            <Box mt={2}>
              <Typography>Preview:</Typography>
              <Box component="img" src={imagePreview} alt="preview" sx={{ width: 200, mt: 1 }} />
            </Box>
          )}

          {isSubmitting && uploadProgress > 0 && (
            <Box mt={2}>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
            sx={{ mt: 4 }}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Product'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddProduct;