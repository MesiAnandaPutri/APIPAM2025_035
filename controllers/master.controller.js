const db = require('../config/db.config');
const bcrypt = require('bcrypt'); // Jika pakai hash
const multer = require('multer');
const path = require('path');
// === AUTH ===
exports.register = async (req, res) => {
    const { username, password, user_role } = req.body;

    if (!username || !password || !user_role) {
        return res.status(400).json({ 
            success: false, 
            message: "Username, Password, dan Role wajib diisi!" 
        });
    }

    try {
        // Cek apakah user sudah ada
        const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: "Username sudah digunakan!" });
        }

        // --- PERUBAHAN: HASH PASSWORD ---
        // Angka 10 adalah salt rounds (biaya komputasi), standar keamanan saat ini
        const hashedPassword = await bcrypt.hash(password, 10); 

        const query = `INSERT INTO users (username, password, user_role) VALUES (?, ?, ?)`;
        
        // Simpan hashedPassword, BUKAN password biasa
        await db.query(query, [username, hashedPassword, user_role]);

        res.status(201).json({ 
            success: true, 
            message: "User berhasil didaftarkan" 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // --- PERUBAHAN: Cek Username Saja Dulu ---
        // Jangan cek password di query SQL karena password di DB sudah di-hash (acak)
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Username tidak ditemukan!" });
        }

        const user = rows[0];

        // --- PERUBAHAN: Bandingkan Password ---
        // bcrypt.compare(passwordInput, passwordHashDiDB)
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Password salah!" });
        }

        // Jika cocok, kirim response sukses
        res.json({
            success: true,
            message: "Login Berhasil",
            data: { 
                user_id: user.user_id, 
                username: user.username, 
                user_role: user.user_role 
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// === PRODUK ===
exports.getAllProducts = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM produk');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM produk WHERE produk_id = ?', [req.params.id]);
        if (rows.length > 0) res.json({ success: true, data: rows[0] });
        else res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    const { produk_name, kategori, unit, stock_qty, harga, deskripsi, img_path } = req.body;
    
    if (user_role !== 'Admin') {
        return res.status(403).json({ 
            success: false, 
            message: "Akses Ditolak! Hanya Admin yang boleh tambah produk." 
        });
    }

    try {
        const query = `INSERT INTO produk (produk_name, kategori, unit, stock_qty, harga, deskripsi, img_path) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.query(query, [produk_name, kategori, unit, stock_qty || 0, harga, deskripsi, img_path]);
        
        res.status(201).json({ success: true, message: "Produk berhasil ditambahkan", id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { produk_name, kategori, unit, harga, deskripsi, img_path } = req.body;
    try {
        // Update data produk umum (biasanya stok diupdate lewat restock/transaksi, tapi kalau mau edit manual bisa ditambah di sini)
        await db.query(`UPDATE produk SET produk_name=?, kategori=?, unit=?, harga=?, deskripsi=?, img_path=? WHERE produk_id=?`, 
        [produk_name, kategori, unit, harga, deskripsi, img_path, id]);
        res.json({ success: true, message: "Produk berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM produk WHERE produk_id = ?', [id]);
        res.json({ success: true, message: "Produk berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// === TRANSAKSI & RESTOCK ===
exports.restockProduct = async (req, res) => {
    const { id } = req.params;
    const { qty_in } = req.body;
    
    // Validasi input
    if (!qty_in || qty_in <= 0) {
        return res.status(400).json({ success: false, message: "Jumlah stok harus lebih dari 0" });
    }

    try {
        await db.query(`UPDATE produk SET stock_qty = stock_qty + ? WHERE produk_id = ?`, [qty_in, id]);
        
        const queryInsert = `INSERT INTO transaksi (produk_id, user_id, qty_out, tanggal, tipe) VALUES (?, NULL, ?, NOW(), 'masuk')`;
        await db.query(queryInsert, [id, qty_in]); 

        res.json({ success: true, message: "Stok berhasil ditambahkan" });

    } catch (error) {
        console.error("Error Restock:", error); 
        res.status(500).json({ success: false, message: "Gagal Restock: " + error.message });
    }
};

exports.createTransaction = async (req, res) => {
    const { produk_id, user_id, qty_out } = req.body;
    
    try {
        const [cekStok] = await db.query('SELECT stock_qty FROM produk WHERE produk_id = ?', [produk_id]);
        
        if (cekStok.length === 0 || cekStok[0].stock_qty < qty_out) {
            return res.status(400).json({ success: false, message: "Stok tidak cukup/Produk hilang!" });
        }

        await db.query('UPDATE produk SET stock_qty = stock_qty - ? WHERE produk_id = ?', [qty_out, produk_id]);
        
        const queryInsert = `INSERT INTO transaksi (produk_id, user_id, qty_out, tanggal, tipe) VALUES (?, ?, ?, NOW(), 'keluar')`;
        await db.query(queryInsert, [produk_id, user_id, qty_out]);
        
        res.status(201).json({ success: true, message: "Transaksi berhasil" });

    } catch (error) {
        console.error("Error Transaksi:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.transaksi_id as id, 
                p.produk_name, 
                t.tipe, 
                t.qty_out as jumlah, 
                DATE_FORMAT(t.tanggal, '%Y-%m-%d %H:%i:%s') as tanggal
            FROM transaksi t
            JOIN produk p ON t.produk_id = p.produk_id
            ORDER BY t.tanggal DESC
        `;

        const [rows] = await db.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};




exports.getAllUsers = async (req, res) => {
    try {
        // Kita ambil user_id, username, dan role saja (password jangan dikirim)
        const [rows] = await db.query('SELECT user_id, username, user_role FROM users');
        
        // Return format JSON standar
        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.deleteUser = async (req, res) => {
    const { id } = req.params; // Menangkap ID dari URL
    try {
        await db.query('DELETE FROM users WHERE user_id = ?', [id]);
        
        // Cocok dengan return type Android: BaseResponse
        res.json({ 
            success: true, 
            message: "User berhasil dihapus" 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, user_role } = req.body;
    try {
        await db.query('UPDATE users SET username=?, user_role=? WHERE user_id=?', 
            [username, user_role, id]);
        res.json({ success: true, message: "User diupdate" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};





const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
}).single('image');

exports.uploadImageHandler = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Tidak ada file yang diupload!" });
        }

        res.json({ 
            success: true, 
            message: "Upload Berhasil", 
            filename: req.file.filename 
        });
    });
};