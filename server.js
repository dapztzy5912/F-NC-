
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create data directory for JSON storage
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const productsFile = path.join(dataDir, 'products.json');

// Initialize products file if it doesn't exist
if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan (JPEG, JPG, PNG, GIF, WebP)'));
        }
    }
});

// Helper functions for data management
function readProducts() {
    try {
        const data = fs.readFileSync(productsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading products:', error);
        return [];
    }
}

function writeProducts(products) {
    try {
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing products:', error);
        return false;
    }
}

// Routes

// Get all products
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts();
        res.json(products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Error retrieving products' });
    }
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    try {
        const products = readProducts();
        const product = products.find(p => p.id === req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({ message: 'Error retrieving product' });
    }
});

// Create new product
app.post('/api/products', upload.single('imageFile'), (req, res) => {
    try {
        const { title, description, price, imageUrl } = req.body;
        
        // Validation
        if (!title || !price) {
            return res.status(400).json({ 
                message: 'Judul dan harga produk wajib diisi' 
            });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({ 
                message: 'Harga produk harus berupa angka yang valid' 
            });
        }

        // Create product object
        const product = {
            id: uuidv4(),
            title: title.trim(),
            description: description ? description.trim() : '',
            price: priceNum,
            imageUrl: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Handle image
        if (req.file) {
            // Use uploaded file
            product.imageUrl = `/uploads/${req.file.filename}`;
        } else if (imageUrl && imageUrl.trim()) {
            // Use provided URL
            product.imageUrl = imageUrl.trim();
        }

        // Save to database
        const products = readProducts();
        products.unshift(product); // Add to beginning for newest first
        
        if (!writeProducts(products)) {
            return res.status(500).json({ 
                message: 'Error saving product' 
            });
        }

        res.status(201).json({
            message: 'Produk berhasil ditambahkan',
            product: product
        });

    } catch (error) {
        console.error('Error creating product:', error);
        
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({ 
            message: error.message || 'Error creating product' 
        });
    }
});

// Update product
app.put('/api/products/:id', upload.single('imageFile'), (req, res) => {
    try {
        const { title, description, price, imageUrl } = req.body;
        const productId = req.params.id;
        
        const products = readProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const product = products[productIndex];
        
        // Update fields
        if (title) product.title = title.trim();
        if (description !== undefined) product.description = description.trim();
        if (price) {
            const priceNum = parseFloat(price);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({ 
                    message: 'Harga produk harus berupa angka yang valid' 
                });
            }
            product.price = priceNum;
        }
        
        // Handle image update
        if (req.file) {
            // Delete old file if it exists and is local
            if (product.imageUrl && product.imageUrl.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, product.imageUrl);
                fs.unlink(oldPath, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
            product.imageUrl = `/uploads/${req.file.filename}`;
        } else if (imageUrl !== undefined) {
            product.imageUrl = imageUrl.trim();
        }
        
        product.updatedAt = new Date().toISOString();
        
        if (!writeProducts(products)) {
            return res.status(500).json({ 
                message: 'Error updating product' 
            });
        }
        
        res.json({
            message: 'Produk berhasil diupdate',
            product: product
        });
        
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            message: error.message || 'Error updating product' 
        });
    }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const products = readProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const product = products[productIndex];
        
        // Delete associated image file if it's local
        if (product.imageUrl && product.imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, product.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
        }
        
        // Remove product from array
        products.splice(productIndex, 1);
        
        if (!writeProducts(products)) {
            return res.status(500).json({ 
                message: 'Error deleting product' 
            });
        }
        
        res.json({
            message: 'Produk berhasil dihapus',
            deletedProduct: product
        });
        
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            message: 'Error deleting product' 
        });
    }
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        products: readProducts().length
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File terlalu besar. Maksimal 5MB' 
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ 
        message: error.message || 'Internal server error' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        message: 'Endpoint not found' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`💾 Data directory: ${dataDir}`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`📤 Upload page: http://localhost:${PORT}/upload.html`);
    console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});
