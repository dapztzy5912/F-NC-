
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(bodyParser.json());

// Baca semua produk
app.get('/api/product', (req, res) => {
    fs.readFile('product.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(data);
    });
});

// Tambah produk baru
app.post('/api/add-product', (req, res) => {
    const newProduct = req.body;
    fs.readFile('product.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const products = JSON.parse(data);
        products.push(newProduct);
        fs.writeFile('product.json', JSON.stringify(products, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.send({ success: true });
        });
    });
});

// Hapus produk berdasarkan index
app.post('/api/delete-product', (req, res) => {
    const { index } = req.body;
    fs.readFile('product.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        let products = JSON.parse(data);
        products.splice(index, 1); // hapus berdasarkan index
        fs.writeFile('product.json', JSON.stringify(products, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.send({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});
