import { PedidoExtendido, Producto, ProductoExtendido } from "@/types/producto";
import { db } from "../../database/db";

export async function CheckearUsuario(user_id: string) {
    const [userCheck] = await db.execute(
        'SELECT id FROM customer WHERE id = ?',
        [user_id]
    );

    if (userCheck) {
        throw new Error('Usuario no encontrado');
    }
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