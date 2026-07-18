-- ============================================================
-- DATOS INICIALES DEL SISTEMA
-- Este archivo inserta información de prueba para comenzar.
-- Luego podremos reemplazarla por información real del hospedaje.
-- ============================================================


-- ============================================================
-- HABITACIONES DE PRUEBA
-- Insertamos habitaciones iniciales para probar la web.
-- ============================================================
INSERT INTO rooms (name, description, capacity, price_per_night, status, main_image_url)
VALUES
('Habitación Matrimonial', 'Habitación cómoda para dos personas, ideal para parejas o visitantes de Pimentel.', 2, 120.00, 'active', NULL),
('Habitación Familiar', 'Habitación amplia para familias o grupos pequeños.', 4, 180.00, 'active', NULL),
('Habitación Simple', 'Habitación práctica para una persona.', 1, 80.00, 'active', NULL);


-- ============================================================
-- SERVICIOS DE PRUEBA
-- Insertamos servicios incluidos y servicios con pago aparte.
-- ============================================================
INSERT INTO services (name, description, price_type, price, is_active)
VALUES
('Cocina para huéspedes', 'Uso de cocina disponible para huéspedes según coordinación.', 'extra_payment', NULL, TRUE),
('Lavado y planchado', 'Servicio de lavandería con costo adicional.', 'extra_payment', NULL, TRUE),
('Servicios por terceros', 'Servicios externos coordinados con proveedores locales.', 'third_party', NULL, TRUE),
('WiFi', 'Internet disponible para huéspedes.', 'included', 0.00, TRUE);


-- ============================================================
-- LUGARES TURÍSTICOS DE PRUEBA
-- Insertamos atractivos turísticos para la página Conoce Lambayeque.
-- ============================================================
INSERT INTO tourism_places (name, description, category, location, image_url, is_active)
VALUES
('Playa Pimentel', 'Una de las playas más representativas de Lambayeque, conocida por su muelle y ambiente costero.', 'beach', 'Pimentel', NULL, TRUE),
('Museo Tumbas Reales de Sipán', 'Museo reconocido por su valor cultural e histórico relacionado con la cultura Mochica.', 'museum', 'Lambayeque', NULL, TRUE),
('Gastronomía lambayecana', 'Experiencia gastronómica con platos típicos como arroz con pato, cabrito y ceviche.', 'food', 'Lambayeque', NULL, TRUE);