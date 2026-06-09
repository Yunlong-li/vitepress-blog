CREATE DATABASE IF NOT EXISTS fastapi_lab_bycodex
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE fastapi_lab_bycodex;

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description TEXT NULL,
  price_cents INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  owner_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_name (name),
  CONSTRAINT fk_products_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, username, hashed_password, is_active) VALUES
  (
    1,
    'admin',
    'pbkdf2_sha256$120000$fastapi-lab-bycodex$e25749bf3227d78cbc517e938883059f75da3bb6491c14af88600eb9f5d1bb4a',
    TRUE
  );

INSERT INTO products (name, description, price_cents, stock, owner_id) VALUES
  ('Mechanical Keyboard', 'A compact keyboard for coding practice.', 29900, 8, 1),
  ('USB-C Dock', 'Small desk dock with HDMI and ethernet.', 45900, 5, 1),
  ('FastAPI Notebook', 'A demo product for the FastAPI lab.', 3900, 30, 1);
