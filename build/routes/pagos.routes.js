"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompraRouter = void 0;
// routes/compra.ts
const compra_1 = require("../controllers/compra");
const express_1 = require("express");
exports.CompraRouter = (0, express_1.Router)();
exports.CompraRouter.post("/checkout-session", compra_1.CompraController.RealizarCompra);
exports.CompraRouter.get("/checkout-session", compra_1.CompraController.ObtenerCompraIdSession);
exports.CompraRouter.get("/pedidos/:email", compra_1.CompraController.ObtenerComprasPorEmail);
