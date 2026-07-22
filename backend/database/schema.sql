-- ============================================================
-- BASE DE DATOS: Casa Huéspedes Pimentel
-- Este archivo crea las tablas principales del sistema.
-- Incluye usuarios, clientes, habitaciones, reservas, pagos,
-- imágenes, servicios, consultas y lugares turísticos.
-- ============================================================


-- ============================================================
-- TABLA: users
-- Guarda los usuarios administradores del sistema.
-- Ejemplo: dueño, administrador o personal autorizado.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    -- Nombre del usuario administrador
    name VARCHAR(120) NOT NULL,

    -- Correo usado para iniciar sesión
    email VARCHAR(150) UNIQUE NOT NULL,

    -- Contraseña encriptada, nunca se guarda la contraseña real
    password_hash TEXT NOT NULL,

    -- Rol del usuario: admin o staff
    role VARCHAR(30) NOT NULL DEFAULT 'admin',

    -- Fecha de creación del usuario
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de última actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: customers
-- Guarda los datos de los clientes que hacen reservas o consultas.
-- También sirve para identificar clientes frecuentes.
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,

    -- Nombre completo del huésped
    full_name VARCHAR(150) NOT NULL,

    -- Teléfono o WhatsApp del cliente
    phone VARCHAR(30) NOT NULL,

    -- Correo del cliente, puede ser opcional
    email VARCHAR(150),

    -- Tipo de documento: DNI, CE, pasaporte, etc.
    document_type VARCHAR(30),

    -- Número de documento
    document_number VARCHAR(30),

    -- Notas internas del administrador sobre el cliente
    notes TEXT,

    -- Fecha de creación del cliente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de última actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: rooms
-- Guarda las habitaciones disponibles del hospedaje.
-- La disponibilidad no se maneja con "reservada" aquí,
-- sino mediante la tabla bookings por rango de fechas.
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,

    -- Nombre de la habitación
    name VARCHAR(120) NOT NULL,

    -- Descripción de la habitación
    description TEXT,

    -- Capacidad máxima de personas
    capacity INTEGER NOT NULL DEFAULT 1,

    -- Precio por noche
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Estado general de la habitación: active, inactive, maintenance
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    -- Imagen principal de la habitación
    main_image_url TEXT,

    -- Orden usado para mostrar las habitaciones
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de última actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: room_images
-- Guarda imágenes adicionales por habitación.
-- ============================================================
CREATE TABLE IF NOT EXISTS room_images (
    id SERIAL PRIMARY KEY,

    -- Relación con la habitación
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

    -- URL pública de la imagen
    image_url TEXT NOT NULL,

    -- ID público de Cloudinary para poder eliminar la imagen después
    public_id TEXT,

    -- Nombre y texto alternativo de la foto
    title VARCHAR(180),
    alt_text TEXT,

    -- Indica si esta imagen es la principal
    is_main BOOLEAN DEFAULT FALSE,

    -- Orden de aparición dentro de la galería de la habitación
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_images_room_id
ON room_images(room_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_room_images_one_main
ON room_images(room_id)
WHERE is_main = TRUE;


-- ============================================================
-- TABLA: room_videos
-- Guarda videos asociados a una habitación.
-- ============================================================
CREATE TABLE IF NOT EXISTS room_videos (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    public_id TEXT,
    title VARCHAR(180),
    poster_url TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_videos_room_id
ON room_videos(room_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_room_videos_one_main
ON room_videos(room_id)
WHERE is_main = TRUE;


-- ============================================================
-- TABLA: bookings
-- Guarda las reservas realizadas por los clientes.
-- Aquí se controla la ocupación real por fechas.
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,

    -- Cliente que hizo la reserva
    customer_id INTEGER NOT NULL REFERENCES customers(id),

    -- Habitación reservada
    room_id INTEGER NOT NULL REFERENCES rooms(id),

    -- Fecha de ingreso
    check_in DATE NOT NULL,

    -- Fecha de salida
    check_out DATE NOT NULL,

    -- Cantidad de huéspedes
    guests_count INTEGER NOT NULL DEFAULT 1,

    -- Cantidad de noches calculadas
    nights INTEGER NOT NULL DEFAULT 1,

    -- Monto total de la reserva
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Estado de la reserva:
    -- pending_payment, confirmed, cancelled, expired, completed, no_show
    status VARCHAR(40) NOT NULL DEFAULT 'pending_payment',

    -- Origen de la reserva: web, admin, whatsapp, phone
    source VARCHAR(40) NOT NULL DEFAULT 'web',

    -- Comentarios o solicitudes especiales del cliente
    special_requests TEXT,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Validación para evitar fechas incorrectas
    CONSTRAINT valid_booking_dates CHECK (check_out > check_in)
);


-- ============================================================
-- TABLA: payments
-- Guarda los pagos asociados a una reserva.
-- Puede integrarse luego con Mercado Pago, Culqi, Izipay o Niubiz.
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,

    -- Reserva asociada al pago
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    -- Proveedor de pago: mercado_pago, culqi, izipay, niubiz, manual
    payment_provider VARCHAR(50) NOT NULL,

    -- ID de transacción entregado por la pasarela de pago
    provider_transaction_id TEXT,

    -- Monto pagado
    amount NUMERIC(10,2) NOT NULL,

    -- Moneda del pago
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',

    -- Estado del pago: pending, paid, failed, refunded
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    -- Link de pago generado por la pasarela
    payment_url TEXT,

    -- Fecha en que se confirmó el pago
    paid_at TIMESTAMP,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: services
-- Guarda los servicios del hospedaje.
-- Puede incluir servicios incluidos y servicios con pago aparte.
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,

    -- Nombre del servicio
    name VARCHAR(120) NOT NULL,

    -- Descripción del servicio
    description TEXT,

    -- Imagen del servicio
    image_url TEXT,

    -- Tipo de precio: included, extra_payment, third_party, consult
    price_type VARCHAR(40) NOT NULL DEFAULT 'included',

    -- Precio si aplica
    price NUMERIC(10,2),

    -- Indica si el servicio está visible
    is_active BOOLEAN DEFAULT TRUE,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: gallery
-- Guarda fotos y videos generales de la web.
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,

    -- Título de la imagen o video
    title VARCHAR(150),

    -- Descripción del recurso
    description TEXT,

    -- Tipo de archivo: image o video
    media_type VARCHAR(30) NOT NULL DEFAULT 'image',

    -- URL pública del archivo
    url TEXT NOT NULL,

    -- ID público de Cloudinary
    public_id TEXT,

    -- Categoría: fachada, habitaciones, areas_comunes, servicios, pimentel, lambayeque, clientes, promociones
    category VARCHAR(80),

    -- Indica si se mostrará destacado en la web
    is_featured BOOLEAN DEFAULT FALSE,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: inquiries
-- Guarda consultas de clientes que no necesariamente reservan.
-- ============================================================
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,

    -- Nombre del cliente que consulta
    customer_name VARCHAR(150) NOT NULL,

    -- Teléfono o WhatsApp
    phone VARCHAR(30) NOT NULL,

    -- Correo opcional
    email VARCHAR(150),

    -- Asunto de la consulta
    subject VARCHAR(150),

    -- Mensaje del cliente
    message TEXT NOT NULL,

    -- Fecha tentativa de ingreso
    preferred_check_in DATE,

    -- Fecha tentativa de salida
    preferred_check_out DATE,

    -- Estado: pending, contacted, closed, discarded
    status VARCHAR(40) NOT NULL DEFAULT 'pending',

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- TABLA: tourism_places
-- Guarda lugares turísticos, comidas o experiencias de Lambayeque.
-- ============================================================
CREATE TABLE IF NOT EXISTS tourism_places (
    id SERIAL PRIMARY KEY,

    -- Nombre del lugar o experiencia
    name VARCHAR(150) NOT NULL,

    -- Descripción turística
    description TEXT,

    -- Categoría: beach, food, culture, museum, experience
    category VARCHAR(60),

    -- Ubicación referencial
    location VARCHAR(150),

    -- Imagen del lugar turístico
    image_url TEXT,

    -- Indica si está visible en la web
    is_active BOOLEAN DEFAULT TRUE,

    -- Fecha de creación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de actualización
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- ÍNDICES
-- Ayudan a que las búsquedas sean más rápidas.
-- Especialmente en reservas por habitación y fechas.
-- ============================================================

-- Índice para buscar reservas por habitación
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);

-- Índice para buscar reservas por fechas
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);

-- Índice para buscar reservas por estado
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Índice para buscar clientes por teléfono
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Índice para buscar clientes por correo
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
