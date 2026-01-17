CREATE DATABASE IF NOT EXISTS katalog;
USE katalog;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Password disimpan dalam bentuk Hash',
    user_role ENUM('Admin', 'Staff') NOT NULL
);

CREATE TABLE IF NOT EXISTS produk (
    produk_id INT AUTO_INCREMENT PRIMARY KEY,
    produk_name VARCHAR(100) NOT NULL UNIQUE,
    kategori VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    harga INT NOT NULL,
    deskripsi VARCHAR(255) NULL,
    img_path VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS transaksi (
    transaksi_id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
    produk_id INT NOT NULL,
    qty_out INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Menambahkan Foreign Key (Relasi)
    CONSTRAINT fk_transaksi_produk 
        FOREIGN KEY (produk_id) REFERENCES produk(produk_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_transaksi_user 
        FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);


-- 1. Tambah kolom 'tipe' (masuk/keluar)
ALTER TABLE transaksi 
ADD COLUMN tipe ENUM('masuk', 'keluar') NOT NULL DEFAULT 'keluar' AFTER tanggal;

-- 2. Ubah user_id jadi boleh NULL (karena saat restock, datanya cuma qty_in)
ALTER TABLE transaksi 
MODIFY COLUMN user_id INT NULL;