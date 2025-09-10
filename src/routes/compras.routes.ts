import type { PedidoExtendido } from '@/types/producto';
import { CheckearProducto, CheckearUsuario, CrearCompra, InsertarItems } from '@/utils/consultas/compras';
import { CartItemsValidation } from '@/utils/Validaciones/CartItems';
import { UsuarioValidation } from '@/utils/Validaciones/usuario';
import { Router } from 'express';
import { db } from '../database/db';

export const RouterCompras = Router();

// POST /api/compras/crear-pedido
RouterCompras.post('/crear-pedido', async (req, res) => {
    const { user_id, cart_items, direccion_envio = '', referencias = '' } = req.body;

    const resultadoValidarCartItems = CartItemsValidation.RevisarItems(cart_items);

    if (!resultadoValidarCartItems.success) {
        res.status(400).json({ success: false, error: resultadoValidarCartItems.error.message });
        return
    }

    const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario(user_id);
    if (!resultadoValidarUsuario.success) {
        res.status(400).json({ success: false, error: resultadoValidarUsuario.error.message });
        return
    }

    try {
        await db.beginTransaction();

        // 1. Verificar que el usuario existe
        await CheckearUsuario(user_id);

        // 2. Validar productos y calcular total
        let total = 0;
        const items_procesados = [];

        for (const item of cart_items) {

            const product = item.product;
            const quantity = parseInt(item.quantity);

            // Verificar que el producto existe y obtener datos actuales
            const { producto_db } = await CheckearProducto(product, quantity);

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
        const { pedido_id } = await CrearCompra(user_id, total, direccion_envio, referencias);

        // 4. Insertar items del pedido
        for (const item of items_procesados) {
            await InsertarItems(pedido_id, item);
        }

        await db.commit();

        const data = {
            pedido_id: pedido_id,
            total: total.toFixed(2),
            items_count: items_procesados.length,
            estado: 'pendiente'
        }

        // Respuesta exitosa
        res.status(201).json({ success: true, message: 'Pedido creado exitosamente', data: data })

    } catch (error) {
        await db.rollback();
        console.error('Error al crear pedido:', error);

        res.status(500).json({ success: false, error: error });
    }
});


// GET /api/compras/usuario/:user_id - Obtener TODOS los pedidos de un usuario (sin paginación)
RouterCompras.get('/usuario/:user_id', async (req, res) => {
    const user_id = req.params.user_id;

    try {
        // Obtener pedidos del usuario sin paginación
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
        `, [user_id]);

        res.json({
            success: true,
            data: pedidos
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
