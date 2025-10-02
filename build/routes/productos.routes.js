"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductosRouter = void 0;
const express_1 = require("express");
const productos_1 = require("../controllers/productos");
exports.ProductosRouter = (0, express_1.Router)();
exports.ProductosRouter.get("/todos", productos_1.ProductosController.ListarProductos);
exports.ProductosRouter.get("/todos/activos", productos_1.ProductosController.ListarProductosActivos);
exports.ProductosRouter.get("/top", productos_1.ProductosController.topProductos);
