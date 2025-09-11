"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckearProducto = CheckearProducto;
exports.CrearCompra = CrearCompra;
exports.InsertarItems = InsertarItems;
exports.obtenerCompras = obtenerCompras;
exports.CheckearCompra = CheckearCompra;
exports.disminuirStock = disminuirStock;
exports.restaurarStock = restaurarStock;
exports.ModificarEstado = ModificarEstado;
const db_1 = require("../../database/db");
function CheckearProducto(product, quantity) {
    return __awaiter(this, void 0, void 0, function* () {
        const [productCheck] = yield db_1.db.execute(`
        SELECT id, producto, precio_base, stock, activo 
        FROM productos_sku 
        WHERE id = ? AND activo = 1
    `, [product.id]);
        if (productCheck) {
            throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
        }
        const producto_db = productCheck[0];
        // Verificar stock disponible
        if (producto_db.stock < quantity) {
            throw new Error(`Stock insuficiente para ${producto_db.producto}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`);
        }
        return { producto_db };
    });
}
function CrearCompra(user_id_1, total_1) {
    return __awaiter(this, arguments, void 0, function* (user_id, total, direccion_envio = '', referencias = '') {
        const [pedidoResult] = yield db_1.db.execute(`
        INSERT INTO pedidos (usuario_id, total, direccion_envio, referencias)
        VALUES (?, ?, ?, ?)
    `, [user_id, total.toFixed(2), direccion_envio, referencias]);
        const pedido_id = pedidoResult[0].insertId;
        return { pedido_id };
    });
}
function InsertarItems(pedido_id, item) {
    return __awaiter(this, void 0, void 0, function* () {
        const [itemsResult] = yield db_1.db.execute(`
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
    `, [pedido_id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal
        ]);
        if (!itemsResult)
            throw new Error("Error al crear el pedido");
    });
}
function obtenerCompras(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pedidos] = yield db_1.db.execute(`
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
        return { pedidos };
    });
}
function CheckearCompra(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pedidoCheck] = yield db_1.db.execute('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
        const estado_actual = pedidoCheck[0].estado;
        if (!pedidoCheck[0]) {
            throw new Error('Pedido no encontrado');
        }
        return { estado_actual };
    });
}
function disminuirStock(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const [itemsResult] = yield db_1.db.execute(`
    UPDATE productos_sku ps
    JOIN pedido_items pi ON ps.id = pi.producto_id
    SET ps.stock = ps.stock - pi.cantidad
    WHERE pi.pedido_id = ?
`, [pedido_id]);
        if (!itemsResult)
            throw new Error("Error al crear el pedido");
    });
}
function restaurarStock(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const [itemsResult] = yield db_1.db.execute(`
        UPDATE productos_sku ps
        JOIN pedido_items pi ON ps.id = pi.producto_id
        SET ps.stock = ps.stock + pi.cantidad
        WHERE pi.pedido_id = ?
    `, [pedido_id]);
        if (!itemsResult)
            throw new Error("Error al crear el pedido");
    });
}
function ModificarEstado(pedido_id, nuevo_estado) {
    return __awaiter(this, void 0, void 0, function* () {
        const [result] = yield db_1.db.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevo_estado, pedido_id]);
        if (!result)
            throw new Error("Error al actualizar estado");
    });
}
