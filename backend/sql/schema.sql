-- Membuat database (jika belum ada)
-- CREATE DATABASE perpustakaan_db;
-- \c perpustakaan_db;

-- Membuat tabel users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nim VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
    is_master BOOLEAN DEFAULT FALSE, -- Kolom untuk menandai admin master
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membuat tabel books
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    cover_image VARCHAR(255),
    file_url VARCHAR(255),
    rak VARCHAR(50), -- Lokasi rak buku
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membuat tabel loans
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrow_date DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dipinjam', 'dikembalikan')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membuat tabel logs untuk security logging
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membuat tabel login_attempts untuk pembatasan percobaan login
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memasukkan data admin contoh (password: Admin123, di-hash dengan bcrypt)
-- Anda bisa mengganti ini dengan data Anda sendiri
INSERT INTO users (nim, password, role, is_master) 
VALUES ('111111', '$2b$12$3DlM19FA7xVMGiSpORpHOOYHmtAQ0yxEt6wWmyvMQ/Ga.23fhyc.W', 'admin', TRUE)
ON CONFLICT (nim) DO NOTHING;

-- Memasukkan data user contoh (password: User1234)
INSERT INTO users (nim, password, role) 
VALUES ('222222', '$2b$12$ksg8BgCMSfO9kWKPk/KYjONRW.XYKaLYF36PN01Onv37fjz1UxbJ2', 'user')
ON CONFLICT (nim) DO NOTHING;
