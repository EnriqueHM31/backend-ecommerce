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
exports.CategoriasController = void 0;
const categorias_1 = require("../models/categorias");
class CategoriasController {
    static obtenerCategorias(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resultDataProductos = yield categorias_1.ModeloCategorias.ListarCategorias();
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
    static crearCategoria(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { nombre } = req.body;
                const resultDataProductos = yield categorias_1.ModeloCategorias.CrearCategoria(nombre);
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
    static modificarCategoria(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, nombre } = req.body;
                const resultDataProductos = yield categorias_1.ModeloCategorias.ModificarCategoria(id, nombre);
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
    static eliminarCategoria(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.body;
                const resultDataProductos = yield categorias_1.ModeloCategorias.EliminarCategoria(id);
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
exports.CategoriasController = CategoriasController;
