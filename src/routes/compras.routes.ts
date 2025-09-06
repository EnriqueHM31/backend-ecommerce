import { Router } from 'express';
import { db } from '../database/db';
import { RowDataPacket } from 'mysql2/promise';

export const RouterCompras = Router();



export interface Producto extends RowDataPacket {
    activo: number;
    almacenamiento: string;
    bateria: string;
    camara: string;
    categoria: string;
    color: string;
    conectividad: string;
    created_at: string;
    descripcion: string;
    display: string;
    id: number;
    imagen_url: string;
    marca: string;
    precio_base: number;
    procesador: string;
    producto: string;
    producto_id: number;
    ram_especificacion: string;
    ram_variante: string;
    recomendado: number;
    sistema_operativo: string;
    sku: string;
    stock: number;
    updated_at: string;
}

export type ProductoPartial = Partial<Producto>;

export interface ProductoExtendido extends Producto, RowDataPacket { }

export interface Pedido extends RowDataPacket {
    id: number;
    usuario_id: number;
    fecha_pedido: string;
    estado: string;
    total: number;
    direccion_envio: string;
    referencias: string;
    cliente_nombre: string;
    cliente_email: string;
}

export type PedidoPartial = Partial<Pedido>;

export interface PedidoExtendido extends Pedido, RowDataPacket { }

export interface PedidoItem extends RowDataPacket {
    id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    nombre_producto: string;
}

// POST /api/compras/crear-pedido
RouterCompras.post('/crear-pedido', async (req, res) => {
    const { user_id, cart_items, direccion_envio, referencias = '' } = req.body;

    // Validar datos requeridos
    if (!user_id || !cart_items || !direccion_envio) {
        res.status(400).json({
            error: 'Faltan datos requeridos',
            required: ['user_id', 'cart_items', 'direccion_envio']
        });
    }

    // Validar que cart_items sea un array y no esté vacío
    if (!Array.isArray(cart_items) || cart_items.length === 0) {
        res.status(400).json({
            error: 'El carrito está vacío o no es válido'
        });
    }

    try {
        await db.beginTransaction();

        // 1. Verificar que el usuario existe
        const [userCheck] = await db.execute(
            'SELECT id FROM customer WHERE id = ?',
            [user_id]
        );

        if (userCheck) {
            throw new Error('Usuario no encontrado');
        }

        // 2. Validar productos y calcular total
        let total = 0;
        const items_procesados = [];

        for (const item of cart_items) {
            // Validar estructura del item
            if (!item.product || !item.quantity) {
                throw new Error('Estructura de item inválida');
            }

            const product = item.product;
            const quantity = parseInt(item.quantity);

            if (quantity <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }

            // Verificar que el producto existe y obtener datos actuales
            const [productCheck] = await db.execute<ProductoExtendido[]>(`
                SELECT id, producto, precio_base, stock, activo 
                FROM productos_sku 
                WHERE id = ? AND activo = 1
            `, [product.id]);

            if (productCheck) {
                throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
            }

            const producto_db: Producto = productCheck[0];

            // Verificar stock disponible
            if (producto_db.stock < quantity) {
                throw new Error(`Stock insuficiente para ${producto_db.producto}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`);
            }

            const precio_unitario = parseFloat(Number(producto_db.precio_base).toFixed(2));
            const subtotal = precio_unitario * quantity;
            total += subtotal;

            items_procesados.push({
                producto_id: product.id,
                cantidad: quantity,
                precio_unitario: precio_unitario,
                subtotal: subtotal,
                nombre_producto: producto_db.producto
            });
        }

        // 3. Crear el pedido principal
        const [pedidoResult] = await db.execute<PedidoExtendido[]>(`
            INSERT INTO pedidos (usuario_id, total, direccion_envio, referencias)
            VALUES (?, ?, ?, ?)
        `, [user_id, total.toFixed(2), direccion_envio, referencias]);

        const pedido_id = pedidoResult[0].insertId;

        // 4. Insertar items del pedido
        for (const item of items_procesados) {
            await db.execute(`
                INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `, [
                pedido_id,
                item.producto_id,
                item.cantidad,
                item.precio_unitario,
                item.subtotal
            ]);
        }

        await db.commit();

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: {
                pedido_id: pedido_id,
                total: total.toFixed(2),
                items_count: items_procesados.length,
                estado: 'pendiente'
            }
        });

    } catch (error) {
        await db.rollback();
        console.error('Error al crear pedido:', error);

        res.status(500).json({
            success: false,
            error: error
        });
    }
});

// GET /api/compras/pedido/:id - Obtener detalles de un pedido
RouterCompras.get('/pedido/:id', async (req, res) => {
    const pedido_id = req.params.id;

    try {
        // Obtener información del pedido
        const [pedidoData] = await db.execute<PedidoExtendido[]>(`
            SELECT 
                p.id,
                p.usuario_id,
                p.fecha_pedido,
                p.estado,
                p.total,
                p.direccion_envio,
                p.referencias,
                c.name as cliente_nombre,
                c.email as cliente_email
            FROM pedidos p
            JOIN customer c ON p.usuario_id = c.id
            WHERE p.id = ?
        `, [pedido_id]);

        if (pedidoData) {
            res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        // Obtener items del pedido
        const [items] = await db.execute<PedidoItem[]>(`
            SELECT 
                pi.id,
                pi.cantidad,
                pi.precio_unitario,
                pi.subtotal,
                ps.producto as nombre_producto,
                ps.descripcion,
                ps.imagen_url,
                ps.marca,
                ps.sku
            FROM pedido_items pi
            JOIN productos_sku ps ON pi.producto_id = ps.id
            WHERE pi.pedido_id = ?
        `, [pedido_id]);

        res.json({
            success: true,
            data: {
                pedido: pedidoData[0],
                items: items
            }
        });

    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({
            success: false,
            error: error
        });
    }
});

// GET /api/compras/usuario/:user_id - Obtener pedidos de un usuario
RouterCompras.get('/usuario/:user_id', async (req, res) => {
    const user_id = req.params.user_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
        // Obtener pedidos del usuario con paginación
        const [pedidos] = await db.execute(`
            SELECT 
                p.id,
                p.fecha_pedido,
                p.estado,
                p.total,
                COUNT(pi.id) as total_items
            FROM pedidos p
            LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
            WHERE p.usuario_id = ?
            GROUP BY p.id
            ORDER BY p.fecha_pedido DESC
            LIMIT ? OFFSET ?
        `, [user_id, limit, offset]);

        // Contar total de pedidos para paginación
        const [countResult] = await db.execute<PedidoExtendido[]>(
            'SELECT COUNT(*) as total FROM pedidos WHERE usuario_id = ?',
            [user_id]
        );

        const total_pedidos = countResult[0].total;
        const total_pages = Math.ceil(total_pedidos / limit);

        res.json({
            success: true,
            data: {
                pedidos,
                pagination: {
                    current_page: page,
                    total_pages,
                    total_pedidos,
                    items_per_page: limit
                }
            }
        });

    } catch (error) {
        console.error('Error al obtener pedidos del usuario:', error);
        res.status(500).json({
            success: false,
            error: error
        });
    }
});

// PUT /api/compras/pedido/:id/estado - Actualizar estado del pedido
RouterCompras.put('/pedido/:id/estado', async (req, res) => {
    const pedido_id = req.params.id;
    const { nuevo_estado } = req.body;

    const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

    if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
        res.status(400).json({
            success: false,
            error: 'Estado no válido',
            estados_validos
        });
    }

    try {
        await db.beginTransaction();

        // Verificar que el pedido existe y obtener estado actual
        const [pedidoCheck] = await db.execute<PedidoExtendido[]>(
            'SELECT * FROM pedidos WHERE id = ?',
            [pedido_id]
        );

        const estado_actual = pedidoCheck[0].estado;

        if (!pedidoCheck[0]) {
            throw new Error('Pedido no encontrado');
        }

        // Si se confirma el pedido, reducir stock
        if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
            await db.execute(`
                UPDATE productos_sku ps
                JOIN pedido_items pi ON ps.id = pi.producto_id
                SET ps.stock = ps.stock - pi.cantidad
                WHERE pi.pedido_id = ?
            `, [pedido_id]);
        }

        // Si se cancela un pedido confirmado, restaurar stock
        if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
            await db.execute(`
                UPDATE productos_sku ps
                JOIN pedido_items pi ON ps.id = pi.producto_id
                SET ps.stock = ps.stock + pi.cantidad
                WHERE pi.pedido_id = ?
            `, [pedido_id]);
        }

        // Actualizar estado del pedido
        await db.execute(
            'UPDATE pedidos SET estado = ? WHERE id = ?',
            [nuevo_estado, pedido_id]
        );

        await db.commit();

        res.json({
            success: true,
            message: `Estado del pedido actualizado a: ${nuevo_estado}`,
            data: {
                pedido_id: parseInt(pedido_id),
                estado_anterior: estado_actual,
                estado_nuevo: nuevo_estado
            }
        });

    } catch (error) {
        await db.rollback();
        console.error('Error al actualizar estado:', error);
        res.status(500).json({
            success: false,
            error: error
        });
    }
});

// GET /api/compras/stats - Estadísticas generales (opcional)
RouterCompras.get('/stats', async (_req, res) => {
    try {
        // Total de pedidos por estado
        const [estadoStats] = await db.execute(`
            SELECT estado, COUNT(*) as cantidad
            FROM pedidos
            GROUP BY estado
        `);



        // Productos más vendidos
        const [topProductos] = await db.execute(`
            SELECT 
                ps.producto,
                SUM(pi.cantidad) as total_vendido,
                SUM(pi.subtotal) as ingresos_generados
            FROM pedido_items pi
            JOIN productos_sku ps ON pi.producto_id = ps.id
            JOIN pedidos p ON pi.pedido_id = p.id
            WHERE p.estado IN ('confirmado', 'enviado', 'entregado')
            GROUP BY pi.producto_id, ps.producto
            ORDER BY total_vendido DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                pedidos_por_estado: estadoStats,
                productos_mas_vendidos: topProductos
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error
        });
    }
});
