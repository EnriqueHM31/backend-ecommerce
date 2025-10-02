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
exports.CreateProductosController = void 0;
const createProductos_1 = require("../models/createProductos");
class CreateProductosController {
    static createProductosSku(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sku, producto_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio } = req.body;
                console.log({ sku, producto_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio });
                const resultDataProductos = yield createProductos_1.ModeloCreateProductos.createProductos(sku, producto_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio);
                if (!resultDataProductos.success) {
                    res.status(400).json({ success: false, message: resultDataProductos.message });
                    return;
                }
                res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
            }
            catch (error) {
                res.status(500).json({ success: false, message: "Error interno del servidor" });
            }
        });
    }
    static deleteProductosSku(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const resultDataProductos = yield createProductos_1.ModeloCreateProductos.deleteProductosSku(id);
                if (!resultDataProductos.success) {
                    res.status(400).json({ success: false, message: resultDataProductos.message });
                    return;
                }
                res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
            }
            catch (error) {
                res.status(500).json({ success: false, message: "Error interno del servidor" });
            }
        });
    }
}
exports.CreateProductosController = CreateProductosController;
