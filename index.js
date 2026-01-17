const express = require('express');
const cors = require('cors');
const path = require('path');
// const db = ... (Tidak perlu panggil db disini lagi, sudah di controller)

const appRoutes = require('./routes/app.routes'); // Panggil file route yg baru dibuat

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', appRoutes); 



app.get('/', (req, res) => {
    res.json({ message: "Server Toko Online Berjalan (Modular Structure)!" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});