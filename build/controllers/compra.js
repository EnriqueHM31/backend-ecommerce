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
const Stripe_1 = require("../constants/Stripe");
const compra_1 = require("../models/compra");
//import { ModeloFactura } from "../utils/contacto/factura";
const stripe_1 = require("../utils/pagos/stripe");
const cartItems_1 = require("../utils/validaciones/cartItems");
const sprite_1 = require("../utils/validaciones/sprite");
const usuario_1 = require("../utils/validaciones/usuario");
class CompraController {
    static RealizarCompra(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { items, customer } = req.body;
                const resultadoValidarItems = cartItems_1.CartItemsValidation.RevisarItems(items);
                if (!resultadoValidarItems.success) {
                    res.status(400).json({ success: false, error: JSON.stringify(resultadoValidarItems.error) });
                    return;
                }
                const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario({ usuario_id: customer.id, nombre: customer.name, correo: customer.email, });
                console.log({ resultadoValidarUsuario });
                if (!resultadoValidarUsuario.success) {
                    res.status(400).json({ success: false, error: JSON.stringify(resultadoValidarUsuario.error) });
                    return;
                }
                const { success, data, message } = yield compra_1.ModeloCompra.RealizarCompra(items, customer);
                if (!success) {
                    res.status(400).json({ success: false, message: message, data: [] });
                }
                res.status(200).json({ success: true, data: data, message: message });
            }
            catch (error) {
                console.error("Error creando sesión de Stripe:", JSON.stringify(error));
                res.status(500).json({ error: "Error creando la sesión de pago" + error });
            }
        });
    }
    static ObtenerCompraIdSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                const { sessionId } = req.query;
                // ✅ Validar sessionId
                const resultadoValidarSessionId = sprite_1.StripeValidation.RevisarSessionId(sessionId);
                if (!resultadoValidarSessionId.success) {
                    res.status(400).json({
                        success: false,
                        message: resultadoValidarSessionId.error.message,
                    });
                }
                // ✅ Recuperar sesión con line_items + customer
                const session = yield stripe.checkout.sessions.retrieve(sessionId, {
                    expand: ["line_items", "customer", "line_items.data.price.product"],
                });
                // ✅ Verificar si ya se envió factura (usando metadata de Stripe)
                if (((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.facturaEnviada) === "true") {
                    res.status(200).json({
                        success: true,
                        message: "Factura ya fue enviada previamente",
                        data: session,
                    });
                    return;
                }
                // 🚀 Generar y enviar factura PDF
                /*await ModeloFactura.EnviarFacturaPDF({
                    nombre: session.customer_details?.name || "Cliente",
                    correo: session.customer_details?.email || "sin-correo@dominio.com",
                    monto: `$${(session.amount_total === null ? 0 : session.amount_total) / 100} MXN`,
                    fecha: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    
                    direccion1: session.customer_details?.address?.line1 || "",
                    direccion2: session.customer_details?.address?.line2 || "",
                    ciudad: session.customer_details?.address?.city || "",
                    estado: session.customer_details?.address?.state || "",
                    cp: session.customer_details?.address?.postal_code || "",
                    pais: session.customer_details?.address?.country || "",
    
                    items: session.line_items?.data.map((item: any) => ({
                        producto: item.description,
                        cantidad: item.quantity,
                        precio: `$${(item.price.unit_amount / 100).toFixed(2)} MXN`,
                        total: `$${(item.amount_total / 100).toFixed(2)} MXN`,
                    })) || [],
                });
    */
                // ✅ Marcar como enviada en metadata de Stripe
                yield stripe.checkout.sessions.update(sessionId, {
                    metadata: Object.assign(Object.assign({}, session.metadata), { facturaEnviada: "true" }),
                });
                res.status(200).json({
                    success: true,
                    message: "Factura enviada exitosamente",
                    data: session,
                });
            }
            catch (error) {
                console.error("Error al obtener sesión de Stripe:", error);
                res.status(500).json({
                    success: false,
                    message: "Error al obtener la sesión de compra",
                    data: null,
                });
            }
        });
    }
    static ObtenerComprasPorEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                const { email } = req.params;
                // 1️⃣ Buscar todos los clientes con ese email
                const customers = yield stripe.customers.list({ email, limit: 100 });
                if (customers.data.length === 0) {
                    res.json({ data: [], total: 0 });
                }
                // 2️⃣ Buscar todas las sesiones de todos los clientes encontrados
                let allSessions = [];
                for (const customer of customers.data) {
                    const sessions = yield (0, stripe_1.getAllSessions)(stripe, customer.id);
                    allSessions.push(...sessions);
                }
                // 3️⃣ Traer line_items de cada sesión
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
                // 4️⃣ Ordenar pedidos por fecha de creación
                pedidosConItems.sort((a, b) => b.created - a.created);
                res.json({ data: pedidosConItems, total: pedidosConItems.length });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
exports.CompraController = CompraController;
