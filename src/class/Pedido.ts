import { supabase } from '../database/db';
import type { CartItem } from '../types/producto';

export class PedidosService {

    static async crearPedido(user_id: string, cart_items: CartItem[], referencias: string = '') {
        if (!user_id || !cart_items) throw new Error('Faltan datos requeridos: user_id, cart_items');
        if (!Array.isArray(cart_items) || cart_items.length === 0) throw new Error('El carrito está vacío o no es válido');

        try {
            // 1. Verificar usuario
            const { data: userCheck, error: userError } = await supabase
                .from('usuarios')
                .select('id')
                .eq('id', user_id)
                .single();
            if (userError || !userCheck) throw new Error('Usuario no encontrado');

            // 2. Validar productos y calcular total
            let total = 0;
            const itemsProcesados: { producto_id: string; cantidad: number; precio_unitario: number; subtotal: number }[] = [];

            for (const item of cart_items) {
                if (!item.product || !item.quantity) throw new Error('Estructura de item inválida');
                if (item.quantity <= 0) throw new Error('La cantidad debe ser mayor a 0');

                const { data: productCheck, error: prodError } = await supabase
                    .from('productos_sku')
                    .select('id, precio_base, stock, activo')
                    .eq('id', item.product.id)
                    .eq('activo', true)
                    .single();
                if (prodError || !productCheck) throw new Error(`Producto no encontrado o inactivo: ${item.product.producto}`);

                if (productCheck.stock < item.quantity) throw new Error(`Stock insuficiente para ${item.product.producto}. Disponible: ${productCheck.stock}, Solicitado: ${item.quantity}`);

                const precio_unitario = parseFloat(Number(productCheck.precio_base).toFixed(2));

                const subtotal = precio_unitario * item.quantity;
                total += subtotal;

                itemsProcesados.push({
                    producto_id: productCheck.id,
                    cantidad: item.quantity,
                    precio_unitario,
                    subtotal
                });
            }

            // 3. Crear pedido principal
            const { data: pedidoResult, error: pedidoError } = await supabase
                .from('pedidos')
                .insert([{ usuario_id: user_id, total: total.toFixed(2), direccion_envio: 'hola', referencias }])
                .select('id')
                .single();
            if (pedidoError || !pedidoResult) throw new Error('Error al crear el pedido');

            const pedido_id = pedidoResult.id;

            // 4. Insertar items
            const itemsInsert = itemsProcesados.map(i => ({
                pedido_id,
                producto_id: i.producto_id,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
                subtotal: i.subtotal
            }));
            const { error: itemsError } = await supabase.from('pedido_items').insert(itemsInsert);
            if (itemsError) throw new Error('Error al insertar los items del pedido');

            return { success: true, pedido_id, total: parseFloat(total.toFixed(2)), items_count: itemsProcesados.length, estado: 'pendiente_pago', items: itemsProcesados, referencias };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

}
