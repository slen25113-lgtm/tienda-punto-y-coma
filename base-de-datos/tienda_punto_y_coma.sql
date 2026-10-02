-- ===========================================================================
-- Tienda Punto & Coma — base de datos
-- Papelería universitaria: catálogo, clientes y pedidos de la página web.
--
-- Motor:      MySQL 8.0 o MariaDB 10.4 (el que trae XAMPP)
-- Juego de caracteres: utf8mb4, para que las tildes y el signo × se guarden bien
--
-- Cómo importarlo:
--   phpMyAdmin → pestaña "Importar" → elegir este archivo → Continuar
--   o por consola:  mysql -u root -p < tienda_punto_y_coma.sql
--
-- Proyecto universitario. Los productos, precios y pedidos son de ejemplo.
-- ===========================================================================

DROP DATABASE IF EXISTS tienda_punto_y_coma;
CREATE DATABASE tienda_punto_y_coma
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tienda_punto_y_coma;


-- ---------------------------------------------------------------------------
-- 1. categorias
-- Agrupa los productos. Se separa en su propia tabla para no repetir el texto
-- de la categoría en cada producto (primera forma normal).
-- ---------------------------------------------------------------------------
CREATE TABLE categorias (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 2. productos
-- El código (CU-175, ES-R04...) es la llave primaria porque es el
-- identificador que ya usa la papelería y el que viaja en los pedidos.
-- El precio es DECIMAL y no FLOAT: con dinero nunca se usan números
-- flotantes, porque pierden exactitud al sumar.
-- ---------------------------------------------------------------------------
CREATE TABLE productos (
  codigo          VARCHAR(10)   NOT NULL,
  nombre          VARCHAR(120)  NOT NULL,
  especificacion  VARCHAR(160)      NULL,
  precio          DECIMAL(10,2) NOT NULL,
  categoria_id    INT UNSIGNED  NOT NULL,
  existencias     INT UNSIGNED  NOT NULL DEFAULT 0,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo),
  KEY idx_productos_categoria (categoria_id),
  CONSTRAINT fk_productos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_productos_precio CHECK (precio > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 3. clientes
-- La tienda solo pide el nombre; el teléfono queda opcional para cuando el
-- pedido llega por WhatsApp y se quiere guardar el número.
-- ---------------------------------------------------------------------------
CREATE TABLE clientes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(120) NOT NULL,
  telefono   VARCHAR(20)      NULL,
  creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clientes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 4. pedidos
-- Cabecera del pedido. El número (PYC-000001) lo asigna el servidor y es
-- único: es el que ve el cliente y el que viaja en el mensaje de WhatsApp.
-- Los totales se guardan calculados porque un precio puede cambiar después,
-- y el pedido debe conservar lo que se cobró ese día.
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  numero         VARCHAR(12)   NOT NULL,
  cliente_id     INT UNSIGNED  NOT NULL,
  tipo_entrega   ENUM('campus','domicilio') NOT NULL DEFAULT 'campus',
  direccion      VARCHAR(200)      NULL,
  nota           VARCHAR(200)      NULL,
  subtotal       DECIMAL(10,2) NOT NULL,
  costo_entrega  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total          DECIMAL(10,2) NOT NULL,
  estado         ENUM('recibido','preparando','entregado','cancelado')
                 NOT NULL DEFAULT 'recibido',
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_numero (numero),
  KEY idx_pedidos_cliente (cliente_id),
  KEY idx_pedidos_fecha (creado_en),
  CONSTRAINT fk_pedidos_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  -- Un domicilio sin dirección no se puede entregar.
  CONSTRAINT ck_pedidos_direccion
    CHECK (tipo_entrega = 'campus' OR direccion IS NOT NULL),
  CONSTRAINT ck_pedidos_total CHECK (total = subtotal + costo_entrega)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 5. pedido_detalle
-- Las líneas del pedido: relación de muchos a muchos entre pedidos y
-- productos, con la cantidad y el precio del día.
-- subtotal es una columna generada: MySQL la calcula sola, no se inserta.
-- ---------------------------------------------------------------------------
CREATE TABLE pedido_detalle (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  pedido_id        INT UNSIGNED     NOT NULL,
  producto_codigo  VARCHAR(10)      NOT NULL,
  cantidad         SMALLINT UNSIGNED NOT NULL,
  precio_unitario  DECIMAL(10,2)    NOT NULL,
  subtotal         DECIMAL(12,2) AS (cantidad * precio_unitario) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_pedido_producto (pedido_id, producto_codigo),
  KEY idx_detalle_producto (producto_codigo),
  CONSTRAINT fk_detalle_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto
    FOREIGN KEY (producto_codigo) REFERENCES productos (codigo)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_detalle_cantidad CHECK (cantidad BETWEEN 1 AND 50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===========================================================================
-- DATOS DE EJEMPLO
-- Son los mismos productos y pedidos que usa la página web.
-- ===========================================================================

INSERT INTO categorias (id, nombre) VALUES
  (1, 'Cuadernos'),
  (2, 'Escritura'),
  (3, 'Dibujo técnico'),
  (4, 'Tecnología'),
  (5, 'Laboratorio');

INSERT INTO productos (codigo, nombre, especificacion, precio, categoria_id, existencias) VALUES
  ('CU-175',  'Cuaderno argollado 5 materias', '175 hojas · cuadriculado 7 mm',   18900.00, 1, 40),
  ('CU-080',  'Libreta de ingeniería',         '80 hojas · papel verde claro',    14500.00, 1, 25),
  ('ES-005',  'Portaminas 0,5 mm',             'Incluye tubo de 12 minas HB',      9800.00, 2, 60),
  ('ES-R04',  'Resaltadores × 4',              'Punta biselada de 1 a 5 mm',      12900.00, 2, 35),
  ('DT-B18',  'Block de dibujo 1/8',           '20 hojas · 120 g/m²',             11200.00, 3, 18),
  ('DT-R30',  'Regla metálica 30 cm',          'Escala en milímetros y pulgadas',  7500.00, 3, 22),
  ('TE-C417', 'Calculadora científica',        '417 funciones · pila incluida',   64900.00, 4, 12),
  ('TE-U64',  'Memoria USB 64 GB',             'USB 3.2 · llavero metálico',      32000.00, 4, 15),
  ('LB-BAT',  'Bata de laboratorio',           'Tallas S a XL · algodón',         58000.00, 5, 20);

INSERT INTO clientes (id, nombre, telefono) VALUES
  (1, 'Laura Gómez',   NULL),
  (2, 'Camila Rivera', NULL);

INSERT INTO pedidos (id, numero, cliente_id, tipo_entrega, direccion, nota, subtotal, costo_entrega, total, estado) VALUES
  (1, 'PYC-000001', 1, 'campus', NULL, 'Paso a las 10:00 a. m.', 50700.00,    0.00, 50700.00, 'entregado'),
  (2, 'PYC-000002', 2, 'campus', NULL, NULL,                     18900.00,    0.00, 18900.00, 'recibido');

INSERT INTO pedido_detalle (pedido_id, producto_codigo, cantidad, precio_unitario) VALUES
  (1, 'CU-175', 2, 18900.00),
  (1, 'ES-R04', 1, 12900.00),
  (2, 'CU-175', 1, 18900.00);


-- ===========================================================================
-- VISTAS
-- ===========================================================================

-- Catálogo tal como lo muestra la página: producto con el nombre de su
-- categoría, solo lo que está activo.
CREATE OR REPLACE VIEW v_catalogo AS
SELECT
  p.codigo,
  p.nombre,
  p.especificacion,
  p.precio,
  c.nombre AS categoria,
  p.existencias
FROM productos AS p
INNER JOIN categorias AS c ON c.id = p.categoria_id
WHERE p.activo = 1;

-- Resumen de pedidos para el panel de administración.
CREATE OR REPLACE VIEW v_pedidos_resumen AS
SELECT
  ped.numero,
  ped.creado_en               AS fecha,
  cli.nombre                  AS cliente,
  ped.tipo_entrega,
  COUNT(det.id)               AS lineas,
  SUM(det.cantidad)           AS articulos,
  ped.total,
  ped.estado
FROM pedidos AS ped
INNER JOIN clientes       AS cli ON cli.id = ped.cliente_id
LEFT  JOIN pedido_detalle AS det ON det.pedido_id = ped.id
GROUP BY ped.id, ped.numero, ped.creado_en, cli.nombre,
         ped.tipo_entrega, ped.total, ped.estado;


-- ===========================================================================
-- CONSULTAS DE EJEMPLO
-- Para comprobar que la base quedó bien y para la sustentación.
-- ===========================================================================

-- 1. Catálogo completo, ordenado por categoría y precio.
SELECT * FROM v_catalogo ORDER BY categoria, precio DESC;

-- 2. Todos los pedidos con su cliente y su total.
SELECT * FROM v_pedidos_resumen ORDER BY fecha DESC;

-- 3. Detalle de un pedido concreto.
SELECT
  det.producto_codigo,
  pro.nombre,
  det.cantidad,
  det.precio_unitario,
  det.subtotal
FROM pedido_detalle AS det
INNER JOIN productos AS pro ON pro.codigo = det.producto_codigo
INNER JOIN pedidos   AS ped ON ped.id = det.pedido_id
WHERE ped.numero = 'PYC-000001';

-- 4. Productos más vendidos.
SELECT
  pro.codigo,
  pro.nombre,
  SUM(det.cantidad)  AS unidades_vendidas,
  SUM(det.subtotal)  AS dinero_vendido
FROM pedido_detalle AS det
INNER JOIN productos AS pro ON pro.codigo = det.producto_codigo
GROUP BY pro.codigo, pro.nombre
ORDER BY unidades_vendidas DESC;

-- 5. Total vendido y número de pedidos.
SELECT
  COUNT(*)     AS pedidos_registrados,
  SUM(total)   AS total_vendido,
  AVG(total)   AS promedio_por_pedido
FROM pedidos
WHERE estado <> 'cancelado';

-- 6. Productos con menos de 20 unidades, para reponer inventario.
SELECT codigo, nombre, existencias
FROM productos
WHERE existencias < 20
ORDER BY existencias ASC;
