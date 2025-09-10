import { PedidoExtendido, Producto, ProductoExtendido } from "@/types/producto";
import { db } from "../../database/db";
import { Usuario } from "@/types/usuario";
import { RowDataPacket } from "mysql2";

interface UsuarioExtendido extends Usuario, RowDataPacket { }

export async function CheckearUsuario(user_id: string) {
    const [userCheck] = await db.execute<UsuarioExtendido[]>(
        'SELECT id FROM customer WHERE id = ?',
        [user_id]
    );
    if (userCheck.length !== 0) return { existe: true }

    return { existe: false }
}

export async function CheckearProducto(product: Producto, quantity: number) {
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

    return { producto_db }
}

export async function CrearCompra(user_id: string, total: number, direccion_envio = '', referencias = '') {
    const [pedidoResult] = await db.execute<PedidoExtendido[]>(`
        INSERT INTO pedidos (usuario_id, total, direccion_envio, referencias)
        VALUES (?, ?, ?, ?)
    `, [user_id, total.toFixed(2), direccion_envio, referencias]);

    const pedido_id = pedidoResult[0].insertId;

    return { pedido_id }
}

export async function InsertarItems(pedido_id: number, item: { producto_id: number, cantidad: number, precio_unitario: number, subtotal: number }) {
    const [itemsResult] = await db.execute(`
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
    `, [pedido_id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal
    ]);

    if (!itemsResult) throw new Error("Error al crear el pedido");


}

export async function obtenerCompras(user_id: string) {
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

    return { pedidos }

}

export async function CheckearCompra(pedido_id: number) {
    const [pedidoCheck] = await db.execute<PedidoExtendido[]>(
        'SELECT * FROM pedidos WHERE id = ?',
        [pedido_id]
    );

    const estado_actual = pedidoCheck[0].estado;

    if (!pedidoCheck[0]) {
        throw new Error('Pedido no encontrado');
    }

    return { estado_actual }
}


export async function disminuirStock(pedido_id: number) {
    const [itemsResult] = await db.execute(`
    UPDATE productos_sku ps
    JOIN pedido_items pi ON ps.id = pi.producto_id
    SET ps.stock = ps.stock - pi.cantidad
    WHERE pi.pedido_id = ?
`, [pedido_id]);

    if (!itemsResult) throw new Error("Error al crear el pedido");
}

export async function restaurarStock(pedido_id: number) {
    const [itemsResult] = await db.execute(`
        UPDATE productos_sku ps
        JOIN pedido_items pi ON ps.id = pi.producto_id
        SET ps.stock = ps.stock + pi.cantidad
        WHERE pi.pedido_id = ?
    `, [pedido_id]);
    if (!itemsResult) throw new Error("Error al crear el pedido");
}

export async function ModificarEstado(pedido_id: number, nuevo_estado: string) {
    const [result] = await db.execute(
        'UPDATE pedidos SET estado = ? WHERE id = ?',
        [nuevo_estado, pedido_id]
    );
    if (!result) throw new Error("Error al actualizar estado");
}