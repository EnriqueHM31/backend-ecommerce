import { supabase } from '@/database/db';
import { Request, Response } from 'express';
import { disminuirStock, obtenerCompras, restaurarStock } from '../utils/consultas/compras';

export class pedidosController {


    static async crearPedido(req: Request, res: Response) {
        const { user_id, cart_items, direccion_envio, referencias, checkout_session_id } = req.body;

        try {
            // 0. Validar que venga el checkout_session_id
            if (!checkout_session_id) {
                res.status(400).json({ success: false, message: 'Falta checkout_session_id' });
                return;
            }

            // 1. Verificar si ya existe pedido para esa sesión
            const { data: pedidoExistente, error: errorBuscar } = await supabase
                .from('pedidos')
                .select('id')
                .eq('id', checkout_session_id)
                .single();

            if (pedidoExistente && !errorBuscar) {
                res.status(200).json({
                    success: true,
                    message: 'Pedido ya existía, no se duplicó',
                    data: { pedido_id: pedidoExistente.id }
                });
                return;
            }

            // 2. Verificar usuario
            const { data: usuario, error: errorUsuario } = await supabase
                .from('usuarios')
                .select('id')
                .eq('id', user_id)
                .single();

            if (errorUsuario || !usuario) {
                res.status(400).json({ success: false, message: 'Usuario no encontrado' });
                return;
            }

            // 3. Obtener todos los productos de una sola vez
            console.log({ cart_items });
            const productIds = cart_items.map((i: { id: string }) => i.id);
            console.log({ productIds });
            const { data: productosDB, error: errorProductosDB } = await supabase
                .from('productos_sku')
                .select('id, sku, precio_base, stock')
                .in('id', productIds);

            if (errorProductosDB || !productosDB) {
                res.status(400).json({ success: false, message: 'Error al obtener productos' });
                return;
            }

            // 4. Validar stock y preparar items
            let total = 0;
            const itemsProcesados = [];

            for (const item of cart_items) {
                const producto_db = productosDB.find(p => p.id === item.id);
                if (!producto_db) {
                    res.status(400).json({ success: false, message: `Producto no válido: ${item.id}` });
                    return;
                }

                const quantity = parseInt(item.quantity);

                // Verificación de stock
                if (quantity > producto_db.stock) {
                    res.status(400).json({
                        success: false,
                        message: `Stock insuficiente para ${producto_db.sku}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`
                    });
                    return;
                }

                const precio_unitario = parseFloat(Number(producto_db.precio_base).toFixed(2));
                const subtotal = precio_unitario * quantity;
                total += subtotal;

                itemsProcesados.push({
                    producto_id: producto_db.id,
                    cantidad: quantity,
                    precio_unitario,
                    subtotal,
                });
            }

            // 5. Crear el pedido principal
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .insert([
                    {
                        id: checkout_session_id,
                        usuario_id: user_id,
                        total,
                        direccion_envio,
                        referencias,
                        estado: 'pendiente',
                    }
                ])
                .select('id')
                .single();

            if (errorPedido) throw errorPedido;
            const pedido_id = pedido.id;

            // 6. Insertar items
            const { error: errorItems } = await supabase.from('pedido_items').insert(
                itemsProcesados.map(item => ({
                    pedido_id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.subtotal
                }))
            );
            if (errorItems) throw errorItems;

            // 7. Disminuir stock de cada producto
            console.log({ itemsProcesados });
            await Promise.all(itemsProcesados.map(async i => {
                // Obtener stock actual
                const { data: producto, error: err } = await supabase
                    .from('productos_sku')
                    .select('stock')
                    .eq('id', i.producto_id)
                    .single();

                if (err || !producto) {
                    console.error(`No se pudo actualizar stock para ${i.producto_id}`);
                    return;
                }

                // Restar cantidad
                const nuevoStock = producto.stock - i.cantidad;

                const { error: stockError } = await supabase
                    .from('productos_sku')
                    .update({ stock: nuevoStock })
                    .eq('id', i.producto_id);

                if (stockError) console.error(`Error al actualizar stock producto ${i.producto_id}:`, stockError);
            }));

            // 8. Respuesta
            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                data: {
                    pedido_id,
                    total: total.toFixed(2),
                    items_count: itemsProcesados.length,
                    estado: 'pendiente'
                }
            });

        } catch (error) {
            console.error('Error al crear pedido:', error);
            res.status(500).json({ success: false, error });
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
        const pedido_id = parseInt(req.params.id)
        const { nuevo_estado } = req.body

        const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado']

        try {
            // Validación de estado
            if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                res.status(400).json({
                    success: false,
                    error: 'Estado no válido',
                    estados_validos
                })
            }

            // 1. Obtener estado actual del pedido
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .select('estado')
                .eq('id', pedido_id)
                .single()

            if (errorPedido || !pedido) {
                res.status(404).json({ success: false, error: 'Pedido no encontrado' })
            }

            const estado_actual = pedido?.estado

            // 2. Si pasa de pendiente → confirmado, reducir stock
            if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
                await disminuirStock(pedido_id)
            }

            // 3. Si pasa de confirmado → cancelado, restaurar stock
            if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
                await restaurarStock(pedido_id)
            }

            // 4. Actualizar estado del pedido
            const { error: errorUpdate } = await supabase
                .from('pedidos')
                .update({ estado: nuevo_estado })
                .eq('id', pedido_id)

            if (errorUpdate) throw errorUpdate

            const data = {
                pedido_id,
                estado_anterior: estado_actual,
                estado_nuevo: nuevo_estado
            }

            res.json({
                success: true,
                message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                data
            })
        } catch (error) {
            console.error('Error al actualizar estado:', error)
            res.status(500).json({ success: false, error })
        }
    }
}