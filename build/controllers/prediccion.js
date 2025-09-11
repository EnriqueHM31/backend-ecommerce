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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrediccionController = void 0;
const predicciones_1 = require("../utils/pagos/predicciones");
const Prediccion_1 = require("../class/Prediccion");
const fs_1 = __importDefault(require("fs"));
const prediccion_1 = require("../constants/prediccion");
// ===============================
// 🚀 Persistencia en disco
// ===============================
function cargarCompras() {
    if (!fs_1.default.existsSync(prediccion_1.DATA_FILE))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(prediccion_1.DATA_FILE, 'utf8'));
    }
    catch (e) {
        console.error("Error al leer compras persistidas:", e);
        return [];
    }
}
let comprasPersistentes = cargarCompras();
// ===============================
// 🚀 Instancia global del sistema
// ===============================
const sistemaRecomendacion = new Prediccion_1.SistemaRecomendacion();
// ===============================
// 🚀 Inicialización automática
// ===============================
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sistemaRecomendacion.cargarModelo('./modelo-entrenado/model.json');
        console.log("✅ Modelo cargado desde archivo");
    }
    catch (err) {
        console.warn("⚠️ No se encontró modelo guardado, se intentará entrenar con datos persistentes");
        if (comprasPersistentes.length > 0) {
            sistemaRecomendacion.entrenar(comprasPersistentes)
                .then(() => console.log('✅ Modelo entrenado con datos persistentes'))
                .catch(err => console.error('❌ Error entrenando modelo inicial:', err));
        }
    }
}))();
// ===============================
// 🚀 Controlador
// ===============================
exports.PrediccionController = {
    // --- Obtener predicciones ---
    prediccion: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { usuario, compras, entrenar = false, topK = 5 } = req.body;
            // 🔹 Guardar nuevas compras en persistencia
            if (Array.isArray(compras) && compras.length > 0) {
                comprasPersistentes.push(...compras);
                (0, predicciones_1.guardarCompras)({ comprasPersistentes });
            }
            // 🔹 Opcional: reentrenar si se solicita
            if (entrenar) {
                sistemaRecomendacion.entrenar(comprasPersistentes)
                    .then(() => console.log("🔄 Modelo reentrenado automáticamente"))
                    .catch(err => console.error("❌ Error reentrenando:", err));
            }
            // 🔹 Generar predicciones
            const recomendaciones = yield sistemaRecomendacion.predecir(usuario, topK);
            res.json({
                usuario,
                recomendaciones,
                timestamp: new Date().toISOString(),
                mensaje: 'Recomendaciones generadas exitosamente'
            });
        }
        catch (error) {
            console.error('Error en predicción:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }),
    // --- Info del modelo ---
    info: (_req, res) => {
        res.json({
            modeloEntrenado: sistemaRecomendacion.isInitialized,
            numUsuarios: sistemaRecomendacion.numUsuarios,
            numProductos: sistemaRecomendacion.numProductos,
            mensaje: 'Información del sistema de recomendación'
        });
    },
    // --- Reentrenar manualmente ---
    entrenar: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { compras } = req.body;
            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }
            // 🔹 Actualizar persistencia
            comprasPersistentes.push(...compras);
            (0, predicciones_1.guardarCompras)({ comprasPersistentes });
            // 🔹 Entrenamiento manual
            sistemaRecomendacion.entrenar(comprasPersistentes, 100)
                .then(() => console.log("✅ Reentrenamiento manual completado"))
                .catch(err => console.error("❌ Error en reentrenamiento manual:", err));
            res.json({
                mensaje: 'Reentrenamiento iniciado en background',
                numUsuarios: sistemaRecomendacion.numUsuarios,
                numProductos: sistemaRecomendacion.numProductos
            });
        }
        catch (error) {
            console.error('Error en entrenamiento:', error);
            res.status(500).json({
                error: 'Error al entrenar el modelo',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    })
};
