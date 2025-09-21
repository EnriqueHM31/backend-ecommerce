# Supabase Setup Guide

This guide will help you set up Supabase PostgreSQL to replace MySQL2 in your backend e-commerce application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `backend-ecommerce`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
5. Click "Create new project"

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - Anon public key (starts with `eyJ...`)

## Step 3: Set Environment Variables

Create a `.env` file in your project root with:

```env
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Database Schema

You need to create the following tables in your Supabase database. You can do this through the Supabase SQL Editor:

### Create Tables

```sql
-- Products table
CREATE TABLE productos_sku (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Variants table
CREATE TABLE variantes (
    id SERIAL PRIMARY KEY,
    nombre_variante VARCHAR(255) NOT NULL,
    procesador VARCHAR(255),
    display VARCHAR(255),
    camara VARCHAR(255),
    bateria VARCHAR(255),
    conectividad VARCHAR(255),
    sistema_operativo VARCHAR(255),
    recomendado BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true
);

-- Colors table
CREATE TABLE colores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- Storage table
CREATE TABLE almacenamientos (
    id SERIAL PRIMARY KEY,
    capacidad VARCHAR(50) NOT NULL
);

-- RAM specifications table
CREATE TABLE especificaciones_ram (
    id SERIAL PRIMARY KEY,
    capacidad VARCHAR(50) NOT NULL
);

-- Base products table
CREATE TABLE productos_base (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    marca VARCHAR(100),
    activo BOOLEAN DEFAULT true
);

-- Categories table
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- Orders table
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) NOT NULL,
    fecha_pedido TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL,
    direccion_envio TEXT,
    referencias TEXT
);

-- Order items table
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    producto_id INTEGER REFERENCES productos_sku(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- Customer table
CREATE TABLE customer (
    id VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    avatar TEXT
);
```

## Step 5: Install Required SQL Functions

Run the SQL functions from `supabase_functions.sql` in your Supabase SQL Editor:

```sql
-- Function to decrease stock
CREATE OR REPLACE FUNCTION decrease_stock(product_id INTEGER, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE productos_sku 
    SET stock = stock - quantity 
    WHERE id = product_id AND stock >= quantity;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or insufficient stock';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increase stock
CREATE OR REPLACE FUNCTION increase_stock(product_id INTEGER, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE productos_sku 
    SET stock = stock + quantity 
    WHERE id = product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user purchases with product details
CREATE OR REPLACE FUNCTION get_user_purchases(user_id_param TEXT)
RETURNS TABLE(
    cantidad INTEGER,
    sku TEXT,
    nombre_variante TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.cantidad,
        ps.sku,
        v.nombre_variante
    FROM 
        pedido_items pi
    JOIN 
        pedidos p ON p.id = pi.pedido_id
    JOIN 
        productos_sku ps ON ps.id = pi.producto_id
    JOIN
        variantes v ON ps.variante_id = v.id
    WHERE 
        p.usuario_id = user_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Step 6: Update RLS (Row Level Security)

Enable RLS on your tables:

```sql
-- Enable RLS on all tables
ALTER TABLE productos_sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE especificaciones_ram ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access" ON productos_sku FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON variantes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON colores FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON almacenamientos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON especificaciones_ram FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON productos_base FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON categorias FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON pedido_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON customer FOR SELECT USING (true);

-- Allow insert/update/delete operations (adjust as needed)
CREATE POLICY "Allow public insert" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON pedido_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON customer FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON pedidos FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON productos_sku FOR UPDATE USING (true);
```

## Step 7: Test the Connection

Run your application:

```bash
npm run dev
```

The application should now connect to Supabase instead of MySQL2.

## Troubleshooting

1. **Connection Issues**: Verify your environment variables are correct
2. **Permission Errors**: Check your RLS policies
3. **Function Errors**: Ensure all SQL functions are created correctly
4. **Schema Issues**: Verify all tables exist with correct column names

## Migration Notes

- All MySQL2 queries have been converted to Supabase queries
- RowDataPacket interfaces have been removed
- Database connection pooling is handled by Supabase
- Stock management uses custom PostgreSQL functions
- All TypeScript typing errors have been resolved

Your application is now ready to use Supabase PostgreSQL!
