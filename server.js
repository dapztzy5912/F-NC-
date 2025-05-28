
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(bodyParser.json());

// Path file JSON yang benar
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Fungsi untuk memastikan file products.json ada
function ensureProductsFile() {
    if (!fs.existsSync(PRODUCTS_FILE)) {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
        console.log('File products.json dibuat otomatis');
    }
}

// Baca semua produk
app.get('/api/products', (req, res) => {
    ensureProductsFile();
    
    fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading products file:', err);
            return res.status(500).json({ error: 'Gagal membaca file produk' });
        }
        
        try {
            const products = JSON.parse(data || '[]');
            res.json(products);
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.json([]);
        }
    });
});

// Tambah produk baru
app.post('/api/add-product', (req, res) => {
    ensureProductsFile();
    
    const newProduct = req.body;
    
    // Validasi input
    if (!newProduct.title || !newProduct.price) {
        return res.status(400).json({ error: 'Judul dan harga produk harus diisi' });
    }
    
    fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading products file:', err);
            return res.status(500).json({ error: 'Gagal membaca file produk' });
        }
        
        try {
            const products = JSON.parse(data || '[]');
            products.push({
                ...newProduct,
                id: Date.now(), // Tambah ID unik
                createdAt: new Date().toISOString()
            });
            
            fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing products file:', writeErr);
                    return res.status(500).json({ error: 'Gagal menyimpan produk' });
                }
                console.log('Produk baru ditambahkan:', newProduct.title);
                res.json({ success: true, message: 'Produk berhasil ditambahkan' });
            });
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.status(500).json({ error: 'File produk rusak' });
        }
    });
});

// Hapus produk berdasarkan index
app.post('/api/delete-product', (req, res) => {
    ensureProductsFile();
    
    const { index } = req.body;
    
    if (typeof index !== 'number' || index < 0) {
        return res.status(400).json({ error: 'Index tidak valid' });
    }
    
    fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading products file:', err);
            return res.status(500).json({ error: 'Gagal membaca file produk' });
        }
        
        try {
            let products = JSON.parse(data || '[]');
            
            if (index >= products.length) {
                return res.status(400).json({ error: 'Produk tidak ditemukan' });
            }
            
            const deletedProduct = products[index];
            products.splice(index, 1);
            
            fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing products file:', writeErr);
                    return res.status(500).json({ error: 'Gagal menghapus produk' });
                }
                console.log('Produk dihapus:', deletedProduct.title);
                res.json({ success: true, message: 'Produk berhasil dihapus' });
            });
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.status(500).json({ error: 'File produk rusak' });
        }
    });
});

// Inisialisasi server
app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
    console.log(`Halaman utama: http://localhost:${PORT}/index.html`);
    console.log(`Upload produk: http://localhost:${PORT}/upload.html`);
    ensureProductsFile();
});
