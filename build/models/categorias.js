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
exports.ModeloCategorias = void 0;
const db_1 = require("../database/db");
class ModeloCategorias {
    static ListarCategorias() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield db_1.supabase.from('categorias').select('*');
                if (error) {
                    return { success: false, message: error.message };
                }
                return { success: true, data: data, message: 'Categorias obtenidas correctamente' };
            }
            catch (error) {
                return { success: false, message: error };
            }
        });
    }
    static CrearCategoria(nombre) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: categoria, error } = yield db_1.supabase
                    .from('categorias')
                    .insert([{ nombre }]) // nota que va dentro de un array de objetos
                    .select('*');
                if (error) {
                    return { success: false, categoria, message: error.message };
                }
                return { success: true, data: categoria, message: 'Categoria creada correctamente' };
            }
            catch (error) {
                return { success: false, message: error };
            }
        });
    }
    static ModificarCategoria(id, nombre) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(id, nombre);
                const { data: categoria, error } = yield db_1.supabase
                    .from('categorias')
                    .update({ nombre })
                    .eq('id_categoria', id)
                    .select('*');
                if (error) {
                    return { success: false, categoria, message: error.message };
                }
                return { success: true, data: categoria, message: 'Categoria modificada correctamente' };
            }
            catch (error) {
                return { success: false, message: error };
            }
        });
    }
    static EliminarCategoria(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: categoria, error } = yield db_1.supabase
                    .from('categorias')
                    .delete()
                    .eq('id_categoria', id)
                    .select('*');
                if (error) {
                    return { success: false, categoria, message: error.message };
                }
                return { success: true, data: categoria, message: 'Categoria eliminada correctamente' };
            }
            catch (error) {
                return { success: false, message: error };
            }
        });
    }
}
exports.ModeloCategorias = ModeloCategorias;
