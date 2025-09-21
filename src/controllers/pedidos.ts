import { supabase } from '@/database/db';
import { Request, Response } from 'express';
import { disminuirStock, obtenerCompras, restaurarStock } from '../utils/consultas/compras';

export class pedidosController {


    static async crearPedido(req: Request, res: Response) {
        const { user_id, cart_items, direccion_envio, referencias } = req.body

        try {
            // 1. Verificar usuario
            const { data: usuario, error: errorUsuario } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', user_id)
                .single()

            if (errorUsuario || !usuario) {
                res.status(400).json({ success: false, message: 'Usuario no encontrado' })
            }

            // 2. Validar productos y calcular total
            let total = 0
            const itemsProcesados = []

            for (const item of cart_items) {
                const { data: producto_db, error: errorProducto } = await supabase
                    .from('productos_base')
                    .select('id, nombre, precio_base')
                    .eq('id', item.product.id)
                    .single()

                if (errorProducto || !producto_db) {
                    res.status(400).json({ success: false, message: 'Producto no válido' })
                }

                const quantity = parseInt(item.quantity)
                const precio_unitario = parseFloat(Number(producto_db?.precio_base).toFixed(2))
                const subtotal = precio_unitario * quantity
                total += subtotal

                itemsProcesados.push({
                    producto_id: producto_db?.id,
                    cantidad: quantity,
                    precio_unitario,
                    subtotal,
                    nombre_producto: producto_db?.nombre
                })
            }

            // 3. Crear el pedido principal
            const { data: pedido, error: errorPedido } = await supabase
                .from('pedidos')
                .insert([
                    {
                        usuario_id: user_id,
                        total,
                        direccion_envio,
                        referencias,
                        estado: 'pendiente'
                    }
                ])
                .select('id')
                .single()

            if (errorPedido) throw errorPedido

            const pedido_id = pedido.id

            // 4. Insertar items
            const { error: errorItems } = await supabase.from('pedido_items').insert(
                itemsProcesados.map(item => ({
                    pedido_id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.subtotal
                }))
            )

            if (errorItems) throw errorItems

            // 5. Respuesta
            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                data: {
                    pedido_id,
                    total: total.toFixed(2),
                    items_count: itemsProcesados.length,
                    estado: 'pendiente'
                }
            })
        } catch (error) {
            console.error('Error al crear pedido:', error)
            res.status(500).json({ success: false, error })
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
                return res.status(400).json({
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
                return res.status(404).json({ success: false, error: 'Pedido no encontrado' })
            }

            const estado_actual = pedido.estado

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

            return res.json({
                success: true,
                message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                data
            })
        } catch (error) {
            console.error('Error al actualizar estado:', error)
            return res.status(500).json({ success: false, error })
        }
    }
}