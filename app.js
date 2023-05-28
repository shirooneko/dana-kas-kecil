//use path module
const path = require('path');
//use express module
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
//use hbs view engine
const hbs = require('hbs');
//use bodyParser middleware
const bodyParser = require('body-parser');
//use mysql database
const mysql = require('mysql');
const app = express();


//konfigurasi koneksi
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_lingkom'
});

//connect ke database
conn.connect((err) => {
    if (err) throw err;
    console.log('Mysql Connected...');
});

//server listening
app.listen(3038, () => {
    console.log('Server is running at port 3030, silakan akses localhost:3030');
});

//set views file
app.set('views', path.join(__dirname, 'views'));
//set view engine
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//set folder public sebagai static folder untuk static file
app.use('/assets', express.static(__dirname + '/public'));

hbs.registerHelper('inc', function (value, options) {
    return parseInt(value) + 1;
});

// formatDate
hbs.registerHelper('formatDate', function (date) {
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return formattedDate;
});

hbs.registerHelper('formatRupiah', function (number) {
    return "Rp" + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
});

// Inisialisasi nomor bukti awal
let counter = 1;

/////////////////////////
// sistem login start //
///////////////////////

app.use(session({
    secret: 'rahasia',
    resave: false,
    saveUninitialized: false,
  }));

// Middleware untuk memeriksa autentikasi pengguna
function requireLogin(req, res, next) {
    if (req.session.user) {
      // Pengguna sudah diautentikasi, lanjutkan ke rute berikutnya
      next();
    } else {
      // Pengguna belum diautentikasi, redirect ke halaman login
      res.redirect('/login');
    }
  }

// Rute root untuk halaman login
app.get('/', (req, res) => {
    res.render('login');
});

// Rute untuk halaman login
app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Cari pengguna berdasarkan username
    conn.query('SELECT * FROM tbl_user WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Terjadi kesalahan saat mencari pengguna:', err);
            res.render('login', { error: 'Terjadi kesalahan. Silakan coba lagi.' });
        } else {
            // Periksa apakah pengguna ditemukan
            if (results.length > 0) {
                const user = results[0];

                // Periksa kecocokan password tanpa enkripsi
                if (password === user.password) {
                    // Set session untuk pengguna yang berhasil login
                    req.session.user = user;

                    res.redirect('/dashboard');
                } else {
                    res.render('login', { error: 'Password salah. Silakan coba lagi.' });
                }
            } else {
                res.render('login', { error: 'Pengguna tidak ditemukan.' });
            }
        }
    });
});



// Rute untuk logout
app.get('/logout', (req, res) => {
    // Hapus session pengguna
    req.session.destroy();
    res.redirect('/login');
});

/////////////////////////
// sistem login end //
///////////////////////

//////////////////////////////////
// main sistem dashboard start //
////////////////////////////////

// route untuk dashboard
app.get('/dashboard', (req, res) => {
    let sql = "SELECT * FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
    let query = conn.query(sql, (err, results) => {
        if (err) throw err;
        let kasMasuk = 0;
        let kasKeluar = 0;

        if (results.length > 0) {
            kasMasuk = results[0].KasMasuk;
            kasKeluar = results[0].KasKeluar; // Mengambil nilai kas keluar dari hasil query
        }

        let totalKasMasuk = 0;
        let totalKasKeluar = 0;
        let totalSql = "SELECT SUM(kas_masuk) AS total_kas_masuk, SUM(kas_keluar) AS total_kas_keluar FROM tbl_transaksi WHERE tgl = CURDATE()";
        let totalQuery = conn.query(totalSql, (err, totalResults) => {
            if (err) throw err;
            if (totalResults.length > 0 && totalResults[0].total_kas_masuk !== null) {
                totalKasMasuk = totalResults[0].total_kas_masuk;
                totalKasKeluar = totalResults[0].total_kas_keluar; // Mengambil nilai total kas keluar dari hasil query
            }

            const user = req.session.user;
            res.render('dashboard', {
                results: results,
                kasMasuk: kasMasuk,
                kasKeluar: kasKeluar,
                totalKasMasuk: totalKasMasuk,
                totalKasKeluar: totalKasKeluar,
                user
            }); // Merender file dashboard.hbs dengan hasil query dan nilai kas masuk dan kas keluar
        });
    });
});

////////////////////////////////
// main sistem dashboard end //
//////////////////////////////

////////////////////////////////////
// main sistem tampil akun start //
//////////////////////////////////

app.get('/tampilakun', requireLogin, (req, res) => {
    let sql = "SELECT * FROM tbl_akun";
    let query = conn.query(sql, (err, results) => {
        if (err) throw err;
        const user = req.session.user;
        res.render('akun', {
            results: results,
            user
        });
    });
});

//route untuk insert data
app.post('/addakun', (req, res) => {
    let data = { no_akun: req.body.no_akun, nm_akun: req.body.nm_akun };
    let sql = "INSERT INTO tbl_akun SET ?";
    conn.query(sql, data, (err, results) => {
        if (err) {
            // Tangani jika terjadi error
            console.error('Error updating data:', err);
            return;
        }
    });
});

app.post('/editakun/:id', (req, res) => {
    let editdata = { no_akun: req.body.no_akun, nm_akun: req.body.nm_akun, id_akun: req.params.id };
    const sql = 'UPDATE tbl_akun SET no_akun = ?, nm_akun = ? WHERE id_akun = ?';
    conn.query(sql, [editdata.no_akun, editdata.nm_akun, editdata.id_akun], (err, result) => {
        if (err) {
            // Tangani jika terjadi error
            console.error('Error updating data:', err);
            return;
        }
        res.redirect('/tampilakun');
    });
});

//////////////////////////////////
// main sistem tampil akun end //
////////////////////////////////

//////////////////////////////////
// main sistem kas masuk start //
////////////////////////////////

app.get('/kasmasuk', requireLogin, (req, res) => {
    // query untuk data no buti terakhir
    let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti DESC";
    // query untuk menampilkan data kedalam tabel
    let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti ASC";

    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error saat mengambil data nomor bukti:', err);
            throw err;
        }

        let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKM-000';
        let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
        const buktiNumber = 'BKM-' + counter.toString().padStart(3, '0');

        conn.query(sql2, (err, data) => {
            if (err) {
                console.error('Error saat mengambil data untuk tabel:', err);
                throw err;
            }

            let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
            conn.query(sqlAkun, (err, options) => {
                if (err) {
                    console.error('Error saat mengambil data akun:', err);
                    throw err;
                }

                const user = req.session.user;
                res.render('kas_masuk', {
                    results: data,
                    options: options,
                    buktiNumber: buktiNumber,
                    user
                });
            });
        });
    });
});

app.post('/addKasmasuk', (req, res) => {
    let data = {
        tgl: req.body.tgl,
        no_bukti: req.body.no_bukti,
        tujuan: req.body.tujuan,
        no_akun: req.body.no_akun,
        jumlah: req.body.jumlah,
        tipe: "DEBET",
        kas_masuk: req.body.jumlah, // Jumlah kas masuk
        kas_keluar: 0 // Kas keluar diatur menjadi 0
    };

    // Mengambil saldo saat ini dari transaksi terakhir
    let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
    conn.query(getSaldoQuery, (err, result) => {
        if (err) {
            console.error('Error saat mengambil saldo:', err);
            throw err;
        }

        let saldo = 0;
        if (result.length > 0) {
            saldo = result[0].saldo; // Nilai saldo saat ini
        }

        let jumlahKasMasuk = parseInt(req.body.jumlah);

        // Memperbarui saldo dengan menambahkan jumlah kas masuk
        let updatedSaldo = saldo + jumlahKasMasuk;

        // Menyimpan data transaksi kas masuk dan memperbarui saldo
        let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
        conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
            if (err) {
                console.error('Error saat menyimpan data:', err);
                throw err;
            }
            res.redirect('/kasmasuk');
        });
    });
});

////////////////////////////////
// main sistem kas masuk end //
//////////////////////////////

///////////////////////////////////
// main sistem kas keluar start //
//////////////////////////////////

// menampilkan data table kas keluar
app.get('/kaskeluar', requireLogin, (req, res) => {
    // query untuk data no buti terakhir
    let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti DESC";
    // query untuk menampilkan data kedalam tabel
    let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti ASC";

    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error saat mengambil data nomor bukti:', err);
            throw err;
        }

        let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKK-000';
        let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
        const buktiNumber = 'BKK-' + counter.toString().padStart(3, '0');

        conn.query(sql2, (err, data) => {
            if (err) {
                console.error('Error saat mengambil data untuk tabel:', err);
                throw err;
            }

            let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
            conn.query(sqlAkun, (err, options) => {
                if (err) {
                    console.error('Error saat mengambil data akun:', err);
                    throw err;
                }

                const user = req.session.user;
                res.render('kas_keluar', {
                    results: data,
                    options: options,
                    buktiNumber: buktiNumber,
                    user
                });
            });
        });
    });
});

// route untuk menyimpan kas keluar
app.post('/addKaskeluar', requireLogin, (req, res) => {
    let data = {
        tgl: req.body.tgl,
        no_bukti: req.body.no_bukti,
        tujuan: req.body.tujuan,
        no_akun: req.body.no_akun,
        jumlah: req.body.jumlah,
        tipe: "KREDIT",
        kas_masuk: 0,
        kas_keluar: req.body.jumlah
    };

    // Mengambil saldo saat ini dari transaksi terakhir
    let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
    conn.query(getSaldoQuery, (err, result) => {
        if (err) {
            console.error('Error saat mengambil saldo:', err);
            throw err;
        }

        let saldo = 0;
        if (result.length > 0) {
            saldo = result[0].saldo; // Nilai saldo saat ini
        }

        let jumlahKasKeluar = parseInt(req.body.jumlah);

        // Memperbarui saldo dengan menambahkan jumlah kas masuk
        let updatedSaldo = saldo - jumlahKasKeluar;

        // Menyimpan data transaksi kas masuk dan memperbarui saldo
        let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
        conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
            if (err) {
                console.error('Error saat menyimpan data:', err);
                throw err;
            }
            res.redirect('/kaskeluar');
        });
    });
});

/////////////////////////////////
// main sistem kas keluar end //
///////////////////////////////

// Tampilkan halaman untuk memilih bulan dan laporan
app.get('/laporan', requireLogin, (req, res) => {
    if (!req.query.bulan) {
        // Query untuk mengambil bulan dengan transaksi
        const query = 'SELECT DISTINCT MONTH(tgl) AS bulan FROM tbl_transaksi ORDER BY bulan DESC';
        conn.query(query, (error, results) => {
            if (error) throw error;
            const bulan = results.map(result => result.bulan);
            res.render('laporan', { bulan });
        });
    } else {
        const bulan = req.query.bulan;
        const query = `SELECT * FROM tbl_transaksi WHERE MONTH(tgl) = ?`;
        conn.query(query, [bulan], (error, results) => {

            const user = req.session.user;
            if (error) throw error;
            const transaksi = results;
            res.render('laporan_transaksi', { bulan, transaksi ,user});
        });
    }
});

