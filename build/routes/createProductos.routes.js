"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const createProductos_1 = require("../controllers/createProductos");
const RouterCreateProductos = (0, express_1.Router)();
RouterCreateProductos.post('/productos-sku', createProductos_1.CreateProductosController.createProductosSku);
RouterCreateProductos.put('/productos-sku/:id', createProductos_1.CreateProductosController.deleteProductosSku);
exports.default = RouterCreateProductos;
