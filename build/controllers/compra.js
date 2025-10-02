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
exports.CompraController = void 0;
const db_1 = require("../database/db");
const Stripe_1 = require("../constants/Stripe");
const compra_1 = require("../models/compra");
const stripe_1 = require("../utils/pagos/stripe");
const cartItems_1 = require("../utils/validaciones/cartItems");
const usuario_1 = require("../utils/validaciones/usuario");
class CompraController {
    static RealizarCompra(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { items, customer } = req.body;
                // Validar items del carrito
                const resultadoValidarItems = cartItems_1.CartItemsValidation.RevisarItems(items);
                if (!resultadoValidarItems.success) {
                    res.status(400).json({
                        success: false,
                        message: 'Error en validación de items',
                        error: JSON.stringify(resultadoValidarItems.error)
                    });
                    return;
                }
                // Validar datos del cliente
                const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario({
                    id: customer.id,
                    nombre: customer.name,
                    correo: customer.email
                });
                if (!resultadoValidarUsuario.success) {
                    res.status(400).json({
                        success: false,
                        message: 'Error en validación de cliente',
                        error: JSON.stringify(resultadoValidarUsuario.error)
                    });
                    return;
                }
                console.log("ENTRO CREAR SESOOON");
                // Crear sesión de pago
                const { success, data, message } = yield compra_1.ModeloCompra.crearSesion(items, customer);
                if (!success) {
                    res.status(400).json({
                        success: false,
                        message: message,
                        data: null
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: data,
                    message: message
                });
            }
            catch (error) {
                console.error("Error creando sesión de Stripe:", error);
                res.status(500).json({
                    success: false,
                    message: "Error interno del servidor",
                    error: "Error creando la sesión de pago"
                });
            }
        });
    }
    static ObtenerCompraPorSessionId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { sessionId } = req.query;
                if (!sessionId) {
                    res.status(400).json({ success: false, message: "No se proporcionó sessionId" });
                    return;
                }
                // 1️⃣ Traer el pedido por sessionId
                const { data: pedidos, error: pedidosError } = yield db_1.supabase
                    .from("pedidos")
                    .select("*")
                    .eq("id", sessionId);
                if (pedidosError)
                    res.status(400).json({ success: false, error: pedidosError.message });
                if (!pedidos || pedidos.length === 0) {
                    res.status(404).json({ success: false, message: "No se encontró el pedido" });
                    return;
                }
                const pedido = pedidos[0];
                // 2️⃣ Traer items del pedido
                const { data: items, error: itemsError } = yield db_1.supabase
                    .from("pedido_items")
                    .select("*")
                    .eq("pedido_id", sessionId);
                if (itemsError)
                    res.status(400).json({ success: false, error: itemsError.message });
                if (!items || items.length === 0) {
                    res.status(404).json({ success: false, message: "No se encontró el pedido" });
                    return;
                }
                // 3️⃣ Traer productos_sku relacionados
                const productoSkuIds = items.map(i => i.producto_id);
                const { data: productosSku, error: skuError } = yield db_1.supabase
                    .from("productos_sku")
                    .select(`
              id,
              sku,
              stock,
              imagen_url,
              active,
              precio,
              productos_base(id,nombre,descripcion,marca,categorias(nombre)),
              variantes(id,nombre_variante,procesador,display,camara,bateria,conectividad,sistema_operativo),
              colores(nombre),
              almacenamientos(capacidad),
              especificaciones_ram(capacidad,tipo)
            `)
                    .in("id", productoSkuIds);
                if (skuError)
                    res.status(400).json({ success: false, error: skuError.message });
                if (!productosSku || productosSku.length === 0) {
                    res.status(404).json({ success: false, message: "No se encontró el pedido" });
                    return;
                }
                // 4️⃣ Mapear productos en items
                const itemsConProductos = items.map(item => {
                    var _a;
                    const sku = productosSku.find(p => p.id === item.producto_id);
                    return Object.assign(Object.assign({}, item), { cantidad: (_a = item.cantidad) !== null && _a !== void 0 ? _a : 1, producto: sku });
                });
                // 5️⃣ Traer dirección del pedido
                const { data: direcciones, error: direccionError } = yield db_1.supabase
                    .from("direcciones")
                    .select("*")
                    .eq("id_direccion", pedido.direccion_envio_id);
                if (direccionError)
                    res.status(400).json({ success: false, error: direccionError.message });
                const direccion = (_a = direcciones === null || direcciones === void 0 ? void 0 : direcciones[0]) !== null && _a !== void 0 ? _a : null;
                const { data: usuario, error: usuarioError } = yield db_1.supabase
                    .from("usuarios")
                    .select("*")
                    .eq("id_usuario", pedido.usuario_id);
                if (usuarioError)
                    res.status(400).json({ success: false, error: usuarioError.message });
                const usuarioDB = (_b = usuario === null || usuario === void 0 ? void 0 : usuario[0]) !== null && _b !== void 0 ? _b : null;
                // 6️⃣ Construir objeto final
                const pedidoConItemsYDireccion = Object.assign(Object.assign({}, pedido), {
                    fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', {
                        timeZone: 'America/Mexico_City'
                    }), items: itemsConProductos, direccion, usuario: usuarioDB
                });
                res.status(200).json({ success: true, data: pedidoConItemsYDireccion });
            }
            catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Error interno del servidor" });
            }
        });
    }
    static ObtenerComprasPorEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                const { email, id } = req.params;
                const { data: pedidos, error: pedidosError } = yield db_1.supabase
                    .from('pedidos')
                    .select('id')
                    .eq('usuario_id', id);
                if (pedidosError || !pedidos || pedidos.length === 0) {
                    res.status(200).json({
                        success: false,
                        message: 'No se encontraron pedidos',
                        data: []
                    });
                    return;
                }
                // Buscar todos los clientes con ese email
                const customers = yield stripe.customers.list({ email, limit: 100 });
                if (customers.data.length === 0) {
                    res.json({
                        success: true,
                        data: [],
                        total: 0,
                        message: 'No se encontraron compras para este email'
                    });
                    return;
                }
                // Buscar todas las sesiones de todos los clientes encontrados
                let allSessions = [];
                for (const customer of customers.data) {
                    const sessions = yield (0, stripe_1.getAllSessions)(stripe, customer.id);
                    allSessions.push(...sessions);
                }
                // Traer line_items de cada sesión
                const pedidosConItems = yield Promise.all(allSessions.map((session) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    const lineItems = yield (0, stripe_1.getAllLineItems)(stripe, session.id);
                    return {
                        id: session.id,
                        amount_total: session.amount_total,
                        currency: session.currency,
                        status: session.payment_status,
                        created: session.created,
                        line_items: lineItems,
                        url: session.success_url,
                        customer: {
                            address: (_a = session.customer_details) === null || _a === void 0 ? void 0 : _a.address,
                            email: (_b = session.customer_details) === null || _b === void 0 ? void 0 : _b.email,
                            name: (_c = session.customer_details) === null || _c === void 0 ? void 0 : _c.name,
                        },
                    };
                })));
                // Ordenar pedidos por fecha de creación
                pedidosConItems.sort((a, b) => b.created - a.created);
                res.json({
                    success: true,
                    data: pedidosConItems,
                    total: pedidosConItems.length,
                    message: 'Compras obtenidas correctamente'
                });
            }
            catch (error) {
                console.error("Error al obtener compras por email:", error);
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error.message
                });
            }
        });
    }
    static ObtenerCompraDeUnUsuarioPorId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // 1️⃣ Traer pedidos del usuario
                const { data: pedidos, error: pedidosError } = yield db_1.supabase
                    .from("pedidos")
                    .select("*")
                    .eq("usuario_id", id);
                if (pedidosError)
                    res.status(400).json({ error: pedidosError.message });
                if (!pedidos || pedidos.length === 0) {
                    res.status(404).json({ message: "No se encontraron pedidos" });
                    return;
                }
                // 2️⃣ Traer items de todos los pedidos
                const pedidoIds = pedidos.map(p => p.id);
                const { data: items, error: itemsError } = yield db_1.supabase
                    .from("pedido_items")
                    .select("*")
                    .in("pedido_id", pedidoIds);
                if (itemsError)
                    res.status(400).json({ error: itemsError.message });
                if (!items || items.length === 0) {
                    res.status(404).json({ message: "No se encontraron items" });
                    return;
                }
                // 3️⃣ Traer productos_sku relacionados
                const productoSkuIds = items.map(i => i.producto_id);
                const { data: productosSku, error: skuError } = yield db_1.supabase
                    .from("productos_sku")
                    .select(`
              id,
              sku,
              stock,
              imagen_url,
              active,
              precio,
              productos_base(id,nombre,descripcion,marca,categorias(nombre)),
              variantes(id,nombre_variante,procesador,display,camara,bateria,conectividad,sistema_operativo),
              colores(nombre),
              almacenamientos(capacidad),
              especificaciones_ram(capacidad,tipo)
            `)
                    .in("id", productoSkuIds);
                if (skuError) {
                    res.status(400).json({ error: skuError.message });
                    return;
                }
                // 4️⃣ Mapear productos en items
                const itemsConProductos = items.map(item => {
                    var _a;
                    const sku = productosSku.find(p => p.id === item.producto_id);
                    return Object.assign(Object.assign({}, item), { cantidad: (_a = item.cantidad) !== null && _a !== void 0 ? _a : 1, producto: sku });
                });
                // 5️⃣ Traer todas las direcciones relacionadas con los pedidos
                const direccionIds = pedidos.map(p => p.direccion_envio_id);
                console.log({ direccionIds });
                const { data: direcciones, error: direccionError } = yield db_1.supabase
                    .from("direcciones") // ajusta el nombre de la tabla si es distinto
                    .select("*")
                    .in("id_direccion", direccionIds);
                if (direccionError)
                    res.status(400).json({ error: direccionError.message });
                const usuariosIds = pedidos.map(p => p.usuario_id);
                const { data: usuarios, error: usuarioError } = yield db_1.supabase
                    .from("usuarios")
                    .select("*")
                    .in("id_usuario", usuariosIds);
                if (usuarioError)
                    res.status(400).json({ error: usuarioError.message });
                // 6️⃣ Agrupar items y agregar dirección a cada pedido
                const pedidosConItemsYDireccion = pedidos.map(pedido => {
                    var _a, _b;
                    return (Object.assign(Object.assign({}, pedido), { items: itemsConProductos.filter(item => item.pedido_id === pedido.id), direccion: (_a = direcciones === null || direcciones === void 0 ? void 0 : direcciones.find(d => d.id_direccion === pedido.direccion_envio_id)) !== null && _a !== void 0 ? _a : null, usuario: (_b = usuarios === null || usuarios === void 0 ? void 0 : usuarios.find(u => u.id_usuario === pedido.usuario_id)) !== null && _b !== void 0 ? _b : null }));
                });
                const pedidosConHoraLocal = pedidosConItemsYDireccion === null || pedidosConItemsYDireccion === void 0 ? void 0 : pedidosConItemsYDireccion.map(pedido => (Object.assign(Object.assign({}, pedido), {
                    fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', {
                        timeZone: 'America/Mexico_City'
                    })
                })));
                res.status(200).json({ success: true, data: pedidosConHoraLocal });
            }
            catch (err) {
                console.error(err);
                res.status(500).json({ error: "Error interno del servidor" });
            }
        });
    }
}
exports.CompraController = CompraController;
