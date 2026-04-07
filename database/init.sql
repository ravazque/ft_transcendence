-- Database initialisation
-- Runs only once when the container is first created.
-- Table schema is managed by Prisma migrations, not this file.

-- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Column-level encryption (AES-256 via pgp_sym_encrypt/decrypt)
-- Required when storing encrypted personal data (phone, address, etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
