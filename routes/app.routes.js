const express = require('express');
const router = express.Router();
const controller = require('../controllers/master.controller'); // Panggil controller tadi
console.log("Cek Fungsi getAllUsers:", controller.getAllUsers);
console.log("Cek Fungsi updateUser:", controller.updateUser);

// Auth
router.post('/login', controller.login);
router.post('/register', controller.register);

// Produk
router.get('/products', controller.getAllProducts);
router.get('/products/:id', controller.getProductById);
router.post('/products', controller.createProduct);
router.put('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

// Fitur Lain
router.post('/products/restock/:id', controller.restockProduct);
router.post('/transactions', controller.createTransaction);
router.get('/history', controller.getHistory);
router.post('/upload', controller.uploadImageHandler);


// manage users
router.get('/users', controller.getAllUsers);       
router.put('/users/:id', controller.updateUser);    
router.delete('/users/:id', controller.deleteUser); 

module.exports = router;
