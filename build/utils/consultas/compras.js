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
        const { data: productCheck, error } = yield db_1.supabase
            .from('productos_sku')
            .select('id, producto, precio_base, stock, activo')
            .eq('id', product.id)
            .eq('activo', 1)
            .single();
        if (error || !productCheck) {
            throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
        }
        const producto_db = productCheck;
        // Verificar stock disponible
        if (producto_db.stock < quantity) {
            throw new Error(`Stock insuficiente para ${producto_db.producto}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`);
        }
        return { producto_db };
    });
}
function CrearCompra(user_id_1, total_1) {
    return __awaiter(this, arguments, void 0, function* (user_id, total, direccion_envio = '', referencias = '') {
        const { data: pedidoResult, error } = yield db_1.supabase
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
        return { pedido_id };
    });
}
function InsertarItems(pedido_id, item) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: itemsResult, error } = yield db_1.supabase
            .from('pedido_items')
            .insert({
            pedido_id: pedido_id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
        });
        if (error)
            throw new Error(`Error al crear el pedido: ${error.message}`);
        console.log({ itemsResult });
    });
}
function obtenerCompras(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: pedidos, error } = yield db_1.supabase
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
        return { pedidos };
    });
}
function CheckearCompra(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: pedidoCheck, error } = yield db_1.supabase
            .from('pedidos')
            .select('*')
            .eq('id', pedido_id)
            .single();
        if (error || !pedidoCheck) {
            throw new Error('Pedido no encontrado');
        }
        const estado_actual = pedidoCheck.estado;
        return { estado_actual };
    });
}
function disminuirStock(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        // First get the items for this order
        const { data: items, error: itemsError } = yield db_1.supabase
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
            const { error: updateError } = yield db_1.supabase.rpc('decrease_stock', {
                product_id: item.producto_id,
                quantity: item.cantidad
            });
            if (updateError) {
                throw new Error(`Error al disminuir stock: ${updateError.message}`);
            }
        }
    });
}
function restaurarStock(pedido_id) {
    return __awaiter(this, void 0, void 0, function* () {
        // First get the items for this order
        const { data: items, error: itemsError } = yield db_1.supabase
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
            const { error: updateError } = yield db_1.supabase.rpc('increase_stock', {
                product_id: item.producto_id,
                quantity: item.cantidad
            });
            if (updateError) {
                throw new Error(`Error al restaurar stock: ${updateError.message}`);
            }
        }
    });
}
function ModificarEstado(pedido_id, nuevo_estado) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield db_1.supabase
            .from('pedidos')
            .update({ estado: nuevo_estado })
            .eq('id', pedido_id);
        if (error) {
            throw new Error(`Error al actualizar estado: ${error.message}`);
        }
    });
}
