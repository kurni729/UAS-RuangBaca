-- Membuat database (jika belum ada)
-- CREATE DATABASE perpustakaan_db;
-- \c perpustakaan_db;

-- Membuat tabel users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nim VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
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

-- Memasukkan data admin contoh (password: admin123, di-hash dengan bcrypt)
-- Anda bisa mengganti ini dengan data Anda sendiri
INSERT INTO users (nim, password, role) 
VALUES ('admin123', '$2b$10$Ewxx0wFRunwNBQqCV522u.prOkKsghDrsxe8zJW0ej5lqiHiCZu7O', 'admin')
ON CONFLICT (nim) DO NOTHING;

-- Memasukkan data user contoh (password: user123)
INSERT INTO users (nim, password, role) 
VALUES ('user123', '$2b$10$6.HgAx77Z3k4JQraa1F5/u.HY7/qetdgvO5/o6NDNnI6VO8dtKqKi', 'user')
ON CONFLICT (nim) DO NOTHING;
