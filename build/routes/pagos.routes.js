"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagosRouter = void 0;
// routes/compra.ts
const compra_1 = require("../controllers/compra");
const express_1 = require("express");
exports.PagosRouter = (0, express_1.Router)();
exports.PagosRouter.post("/checkout-session", compra_1.CompraController.RealizarCompra);
exports.PagosRouter.get("/checkout-session", compra_1.CompraController.ObtenerCompraPorSessionId);
exports.PagosRouter.get("/pedidos/:id", compra_1.CompraController.ObtenerCompraDeUnUsuarioPorId);
