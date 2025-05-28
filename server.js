const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const filePath = './products.json';

// Get all products
app.get('/api/products', (req, res) => {
  fs.readFile(filePath, (_, data) => res.json(JSON.parse(data)));
});

// Add new product
app.post('/api/products', (req, res) => {
  const newProduct = req.body;
  fs.readFile(filePath, (_, data) => {
    const products = JSON.parse(data);
    products.push(newProduct);
    fs.writeFile(filePath, JSON.stringify(products), () => res.json({ success: true }));
  });
});

// Delete product by index
app.delete('/api/products/:index', (req, res) => {
  const index = req.params.index;
  fs.readFile(filePath, (_, data) => {
    const products = JSON.parse(data);
    products.splice(index, 1);
    fs.writeFile(filePath, JSON.stringify(products), () => res.json({ success: true }));
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
