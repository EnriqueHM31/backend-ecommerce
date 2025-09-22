import { Producto } from "../../types/producto";
import { supabase } from "../../database/db";

export async function CheckearProducto(product: Producto, quantity: number) {
    const { data: productCheck, error } = await supabase
        .from('productos_sku')
        .select('id, producto, precio_base, stock, activo')
        .eq('id', product.id)
        .eq('activo', 1)
        .single();

    if (error || !productCheck) {
        throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
    }

    const producto_db: Producto = productCheck as Producto;

    // Verificar stock disponible
    if (producto_db.stock < quantity) {
        throw new Error(`Stock insuficiente para ${producto_db.producto}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`);
    }

    return { producto_db }
}

export async function CrearCompra(user_id: string, total: number, direccion_envio = '', referencias = '') {
    const { data: pedidoResult, error } = await supabase
        .from('pedidos')
        .insert({
            usuario_id: user_id,
            total: total.toFixed(2),
            direccion_envio: direccion_envio,
            referencias: referencias
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Error al crear pedido: ${error.message}`);
    }

    const pedido_id = pedidoResult.id;

    return { pedido_id }
}

export async function InsertarItems(pedido_id: number, item: { producto_id: number, cantidad: number, precio_unitario: number, subtotal: number }) {
    const { data: itemsResult, error } = await supabase
        .from('pedido_items')
        .insert({
            pedido_id: pedido_id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
        });

    if (error) throw new Error(`Error al crear el pedido: ${error.message}`);

    console.log({ itemsResult });
}

export async function obtenerCompras(user_id: string) {
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
            id,
            fecha_pedido,
            estado,
            total,
            pedido_items(count)
        `)
        .eq('usuario_id', user_id)
        .order('fecha_pedido', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener compras: ${error.message}`);
    }

    return { pedidos }
}

export async function CheckearCompra(pedido_id: number) {
    const { data: pedidoCheck, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedido_id)
        .single();

    if (error || !pedidoCheck) {
        throw new Error('Pedido no encontrado');
    }

    const estado_actual = pedidoCheck.estado;

    return { estado_actual }
}


export async function disminuirStock(pedido_id: number) {
    // First get the items for this order
    const { data: items, error: itemsError } = await supabase
        .from('pedido_items')
        .select('producto_id, cantidad')
        .eq('pedido_id', pedido_id);

    if (itemsError) {
        throw new Error(`Error al obtener items del pedido: ${itemsError.message}`);
    }

    if (!items || items.length === 0) {
        throw new Error("No se encontraron items para el pedido");
    }

    // Update stock for each item
    for (const item of items) {
        const { error: updateError } = await supabase.rpc('decrease_stock', {
            product_id: item.producto_id,
            quantity: item.cantidad
        });

        if (updateError) {
            throw new Error(`Error al disminuir stock: ${updateError.message}`);
        }
    }
}

export async function restaurarStock(pedido_id: number) {
    // First get the items for this order
    const { data: items, error: itemsError } = await supabase
        .from('pedido_items')
        .select('producto_id, cantidad')
        .eq('pedido_id', pedido_id);

    if (itemsError) {
        throw new Error(`Error al obtener items del pedido: ${itemsError.message}`);
    }

    if (!items || items.length === 0) {
        throw new Error("No se encontraron items para el pedido");
    }

    // Restore stock for each item
    for (const item of items) {
        const { error: updateError } = await supabase.rpc('increase_stock', {
            product_id: item.producto_id,
            quantity: item.cantidad
        });

        if (updateError) {
            throw new Error(`Error al restaurar stock: ${updateError.message}`);
        }
    }
}

export async function ModificarEstado(pedido_id: number, nuevo_estado: string) {
    const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevo_estado })
        .eq('id', pedido_id);

    if (error) {
        throw new Error(`Error al actualizar estado: ${error.message}`);
    }
}