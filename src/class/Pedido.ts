const { db } = require('../database/db');


interface Producto {
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

interface CartItem {
    product: Producto;
    quantity: number;
}

interface crearPedido {
    user_id: string;
    cart_items: CartItem[];
    direccion_envio: string;
    referencias: string;
}


interface responsePedido {
    success: boolean;
    pedido_id: number;
    total: number;
    items_count: number;
    estado: string;
    items: {
        producto_id: number;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
        nombre_producto: string;
    }[];
    direccion_envio: string;
    referencias: string;
}

export class PedidosService {



    static async crearPedido({ user_id, cart_items, direccion_envio, referencias = '' }: crearPedido): Promise<responsePedido> {

        console.log("ENTRO")
        console.log({ user_id, cart_items, direccion_envio, referencias });
        // Validar datos requeridos
        if (!user_id || !cart_items || !direccion_envio) {
            throw new Error('Faltan datos requeridos: user_id, cart_items, direccion_envio');
        }

        // Validar que cart_items sea un array y no esté vacío
        if (!Array.isArray(cart_items) || cart_items.length === 0) {
            throw new Error('El carrito está vacío o no es válido');
        }

        try {
            await db.beginTransaction();

            // 1. Verificar que el usuario existe
            const [userCheck] = await db.execute(
                'SELECT id FROM customer WHERE id = ?',
                [user_id]
            );

            if (userCheck.length === 0) {
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
                const quantity = item.quantity;

                if (quantity <= 0) {
                    throw new Error('La cantidad debe ser mayor a 0');
                }

                // Verificar que el producto existe y obtener datos actuales
                const [productCheck] = await db.execute(`
                    SELECT id, producto, precio_base, stock, activo 
                    FROM productos_sku 
                    WHERE id = ? AND activo = 1
                `, [product.id]);

                if (productCheck.length === 0) {
                    throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
                }

                const producto_db = productCheck[0];

                // Verificar stock disponible (para pedido pendiente_pago no reducimos aún)
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

            // 3. Crear el pedido principal en estado pendiente_pago
            const [pedidoResult] = await db.execute(`
                INSERT INTO pedidos (usuario_id, total, direccion_envio, referencias, estado)
                VALUES (?, ?, ?, ?, 'pendiente_pago')
            `, [user_id, total.toFixed(2), direccion_envio, referencias]);

            const pedido_id = pedidoResult.insertId;

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

            // Retornar datos del pedido creado
            return {
                success: true,
                pedido_id: pedido_id,
                total: parseFloat(total.toFixed(2)),
                items_count: items_procesados.length,
                estado: 'pendiente_pago',
                items: items_procesados,
                direccion_envio,
                referencias
            };

        } catch (error) {
            await db.rollback();
            throw error; // Relanzar el error para que lo maneje quien llama
        }
    }

    /**
     * Confirmar pedido después del pago exitoso (reduce stock)
     * @param {number} pedido_id - ID del pedido a confirmar
     * @returns {Promise<Object>} - Resultado de la confirmación
     */
    static async confirmarPedido(pedido_id: number) {
        try {
            await db.beginTransaction();

            // Verificar que el pedido existe y está en estado pendiente_pago
            const [pedidoCheck] = await db.execute(
                'SELECT id, estado, total FROM pedidos WHERE id = ? AND estado = "pendiente_pago"',
                [pedido_id]
            );

            if (pedidoCheck.length === 0) {
                throw new Error('Pedido no encontrado o ya procesado');
            }

            // Verificar stock nuevamente antes de confirmar
            const [stockCheck] = await db.execute(`
                SELECT 
                    pi.producto_id,
                    pi.cantidad,
                    ps.stock,
                    ps.producto,
                    (ps.stock >= pi.cantidad) as stock_suficiente
                FROM pedido_items pi
                JOIN productos_sku ps ON pi.producto_id = ps.id
                WHERE pi.pedido_id = ?
            `, [pedido_id]);

            // Verificar que todos los productos tengan stock suficiente
            for (const item of stockCheck) {
                if (!item.stock_suficiente) {
                    throw new Error(`Stock insuficiente para ${item.producto}. Disponible: ${item.stock}, Necesario: ${item.cantidad}`);
                }
            }

            // Reducir stock de todos los productos
            await db.execute(`
                UPDATE productos_sku ps
                JOIN pedido_items pi ON ps.id = pi.producto_id
                SET ps.stock = ps.stock - pi.cantidad
                WHERE pi.pedido_id = ?
            `, [pedido_id]);

            // Actualizar estado del pedido a confirmado
            await db.execute(
                'UPDATE pedidos SET estado = "confirmado" WHERE id = ?',
                [pedido_id]
            );

            await db.commit();

            return {
                success: true,
                pedido_id: pedido_id,
                estado: 'confirmado',
                message: 'Pedido confirmado y stock actualizado'
            };

        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    /**
     * Cancelar pedido por pago fallido o timeout
     * @param {number} pedido_id - ID del pedido a cancelar
     * @param {string} motivo - Motivo de cancelación
     * @returns {Promise<Object>} - Resultado de la cancelación
     */
    static async cancelarPedido({ pedido_id, motivo = 'pago_fallido' }: { pedido_id: number, motivo?: string }) {
        try {
            const estados_cancelables = ['pendiente_pago', 'pago_fallido'];
            const nuevo_estado = motivo === 'timeout' ? 'cancelado' : 'pago_fallido';

            const [result] = await db.execute(
                'UPDATE pedidos SET estado = ? WHERE id = ? AND estado IN (?, ?)',
                [nuevo_estado, pedido_id, ...estados_cancelables]
            );

            if (result.affectedRows === 0) {
                throw new Error('Pedido no encontrado o no se puede cancelar');
            }

            return {
                success: true,
                pedido_id: pedido_id,
                estado: nuevo_estado,
                message: `Pedido cancelado por: ${motivo}`
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener detalles de un pedido
     * @param {number} pedido_id - ID del pedido
     * @returns {Promise<Object>} - Datos completos del pedido
     */
    static async obtenerPedido(pedido_id: number) {
        try {
            // Obtener información del pedido
            const [pedidoData] = await db.execute(`
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

            if (pedidoData.length === 0) {
                throw new Error('Pedido no encontrado');
            }

            // Obtener items del pedido
            const [items] = await db.execute(`
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

            return {
                success: true,
                pedido: pedidoData[0],
                items: items
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Limpiar pedidos expirados (más de 30 minutos sin pagar)
     * @returns {Promise<Object>} - Resultado de la limpieza
     */
    static async limpiarPedidosExpirados() {
        try {
            const [result] = await db.execute(`
                UPDATE pedidos 
                SET estado = 'cancelado'
                WHERE estado = 'pendiente_pago' 
                AND fecha_pedido < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
            `);

            return {
                success: true,
                pedidos_cancelados: result.affectedRows,
                message: `${result.affectedRows} pedidos expirados cancelados`
            };

        } catch (error) {
            throw error;
        }
    }
}

module.exports = PedidosService;