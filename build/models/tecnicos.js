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
exports.ModeloTecnicos = void 0;
const db_1 = require("../database/db");
class ModeloTecnicos {
    static ListarTecnicos() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: dataProductosBase, error: errorProductosBase } = yield db_1.supabase.from('productos_base').select('*');
                const { data: dataVariantes, error: errorVariantes } = yield db_1.supabase.from('variantes').select('*');
                const { data: dataColores, error: errorColors } = yield db_1.supabase.from('colores').select('*');
                const { data: dataRams, error: errorRams } = yield db_1.supabase.from('especificaciones_ram').select('*');
                const { data: dataAlmacenamientos, error: errorAlmacenamientos } = yield db_1.supabase.from('almacenamientos').select('*');
                if (errorVariantes || errorColors || errorRams || errorAlmacenamientos || errorProductosBase) {
                    return { success: false, message: 'Error al obtener los datos de los productos' };
                }
                console.log(dataProductosBase, dataVariantes, dataColores, dataRams, dataAlmacenamientos);
                return { success: true, data: { dataProductosBase, dataVariantes, dataColores, dataRams, dataAlmacenamientos }, message: 'Productos obtenidos correctamente' };
            }
            catch (error) {
                return { success: false, message: error };
            }
        });
    }
}
exports.ModeloTecnicos = ModeloTecnicos;
