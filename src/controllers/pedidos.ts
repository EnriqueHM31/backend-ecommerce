import { CheckearCompra, CheckearProducto, CrearCompra, disminuirStock, InsertarItems, ModificarEstado, obtenerCompras, restaurarStock } from '@/utils/consultas/compras';
import { CheckearUsuario } from '@/utils/consultas/Usuario';
import { CartItemsValidation } from '@/utils/Validaciones/CartItems';
import { Request, Response } from 'express';
import { db } from '../database/db';
import { UsuarioValidation } from '@/utils/Validaciones/usuario';

export class pedidosController {
    static async crearPedido(req: Request, res: Response) {
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

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

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

            await connection.commit();

            const data = { pedido_id: pedido_id, total: total.toFixed(2), items_count: items_procesados.length, estado: 'pendiente' }

            // Respuesta exitosa
            res.status(201).json({ success: true, message: 'Pedido creado exitosamente', data: data })

        } catch (error) {
            await connection.rollback();
            console.error('Error al crear pedido:', error);

            res.status(500).json({ success: false, error: error });
        }
    }

    static async obtenerPedidosPorId(req: Request, res: Response) {
        const user_id = req.params.user_id;

        try {
            // Obtener pedidos del usuario sin paginación
            const { pedidos } = await obtenerCompras(user_id);
            res.json({ success: true, data: pedidos });

        } catch (error) {
            console.error('Error al obtener pedidos del usuario:', error);
            res.status(500).json({ success: false, error: error });
        }
    }

    static async actualizarCompraEstado(req: Request, res: Response) {
        const pedido_id = req.params.id;
        const { nuevo_estado } = req.body;

        const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
        const connection = await db.getConnection();
        try {

            if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                res.status(400).json({
                    success: false,
                    error: 'Estado no válido',
                    estados_validos
                });
            }

            await connection.beginTransaction();

            // Verificar que el pedido existe y obtener estado actual
            const { estado_actual } = await CheckearCompra(parseInt(pedido_id));
            // Si se confirma el pedido, reducir stock
            if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
                await disminuirStock(parseInt(pedido_id));
            }

            // Si se cancela un pedido confirmado, restaurar stock
            if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
                await restaurarStock(parseInt(pedido_id));

            }

            // Actualizar estado del pedido
            await ModificarEstado(parseInt(pedido_id), nuevo_estado);

            const data = { pedido_id: parseInt(pedido_id), estado_anterior: estado_actual, estado_nuevo: nuevo_estado }

            await connection.commit();

            res.json({ success: true, message: `Estado del pedido actualizado a: ${nuevo_estado}`, data: data });

        } catch (error) {
            await connection.rollback();
            console.error('Error al actualizar estado:', error);
            res.status(500).json({ success: false, error: error });
        }
    }
}