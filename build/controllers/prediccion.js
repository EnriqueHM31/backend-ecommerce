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
const fs_1 = __importDefault(require("fs"));
const Prediccion2_1 = require("../class/Prediccion2");
const prediccion_1 = require("../constants/prediccion");
const predicciones_1 = require("../utils/pagos/predicciones");
const trainingQueue_1 = require("../utils/trainingQueue");
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
const sistemaRecomendacion = new Prediccion2_1.SistemaRecomendacion();
// ===============================
// 🚀 Inicialización automática
// ===============================
(() => __awaiter(void 0, void 0, void 0, function* () {
    const modelPath = './modelo-entrenado/model.json';
    if (fs_1.default.existsSync(modelPath)) {
        yield sistemaRecomendacion.cargarModelo();
        console.log("✅ Modelo cargado desde archivo");
    }
    else {
        console.warn("⚠️ No se encontró modelo guardado, entrenando con datos persistentes...");
        if (comprasPersistentes.length > 0) {
            yield sistemaRecomendacion.entrenar(comprasPersistentes);
        }
    }
}))();
// ===============================
// 🚀 Controlador
// ===============================
exports.PrediccionController = {
    // --- Obtener predicciones ---
    prediccion: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("PREDICCION");
        try {
            const { usuario, compras, entrenar = false, topK = 5 } = req.body;
            // 🔹 Guardar nuevas compras en persistencia
            if (Array.isArray(compras) && compras.length > 0) {
                comprasPersistentes.push(...compras);
                (0, predicciones_1.guardarCompras)({ comprasPersistentes });
            }
            let recomendaciones = [];
            let esUsuarioNuevo = false;
            // 🔹 Opcional: reentrenar si se solicita
            if (entrenar) {
                yield sistemaRecomendacion.entrenar(comprasPersistentes)
                    .then(() => console.log("✅ Entrenamiento completado"))
                    .catch(err => console.error("❌ Error en entrenamiento:", err));
                // 🔹 Generar predicciones después del entrenamiento tradicional
                recomendaciones = yield sistemaRecomendacion.predecir(usuario, topK);
            }
            // 🔹 Si usuario nuevo, agregar info de que es fallback
            esUsuarioNuevo = sistemaRecomendacion.userEncoder.get(usuario) === undefined;
            if (esUsuarioNuevo) {
                recomendaciones = recomendaciones.map(r => (Object.assign(Object.assign({}, r), { fallback: true })));
            }
            res.json({
                usuario,
                recomendaciones,
                esUsuarioNuevo,
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
        console.log("INFO");
        // Ejecutar diagnóstico
        res.json({
            modeloEntrenado: sistemaRecomendacion.isInitialized,
            numUsuarios: sistemaRecomendacion.numUsuarios,
            numProductos: sistemaRecomendacion.numProductos,
            mensaje: 'Información del sistema de recomendación'
        });
    },
    // --- Reentrenar manualmente (síncrono) ---
    entrenar: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("ENTRENAAAAAAR");
        try {
            const { compras } = req.body;
            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }
            // 🔹 Actualizar persistencia
            comprasPersistentes.push(...compras);
            (0, predicciones_1.guardarCompras)({ comprasPersistentes });
            let resultado = {
                mensaje: 'Reentrenamiento completado',
                numUsuarios: sistemaRecomendacion.numUsuarios,
                numProductos: sistemaRecomendacion.numProductos
            };
            // 🔹 Entrenamiento con o sin recomendaciones
            // 🔹 Entrenamiento tradicional
            yield sistemaRecomendacion.entrenar(comprasPersistentes, 100)
                .then(() => console.log("✅ Reentrenamiento manual completado"))
                .catch(err => console.error("❌ Error en reentrenamiento manual:", err));
            res.json(resultado);
        }
        catch (error) {
            console.error('Error en entrenamiento:', error);
            res.status(500).json({
                error: 'Error al entrenar el modelo',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }),
    // --- Entrenar en segundo plano (asíncrono) ---
    entrenarAsync: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("ENTRENAMIENTO ASÍNCRONO");
        try {
            const { compras } = req.body;
            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }
            // 🔹 Actualizar persistencia
            comprasPersistentes.push(...compras);
            (0, predicciones_1.guardarCompras)({ comprasPersistentes });
            // 🔹 Agregar trabajo a la cola
            const jobId = yield trainingQueue_1.trainingQueue.addJob(comprasPersistentes.length);
            res.json({
                mensaje: 'Entrenamiento iniciado en segundo plano',
                jobId,
                datasetSize: comprasPersistentes.length,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error al iniciar entrenamiento asíncrono:', error);
            res.status(500).json({
                error: 'Error al iniciar entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }),
    // --- Estado del entrenamiento ---
    estadoEntrenamiento: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("ESTADO ENTRENAMIENTO");
        try {
            const { jobId } = req.params;
            if (jobId) {
                // Estado de un trabajo específico
                const job = trainingQueue_1.trainingQueue.getJobStatus(jobId);
                if (!job) {
                    res.status(404).json({ error: 'Trabajo no encontrado' });
                    return;
                }
                res.json(Object.assign({ jobId }, job));
            }
            else {
                // Estado general de la cola
                const queueStatus = trainingQueue_1.trainingQueue.getQueueStatus();
                const allJobs = trainingQueue_1.trainingQueue.getAllJobs();
                res.json({
                    queue: queueStatus,
                    jobs: allJobs,
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            console.error('Error al obtener estado:', error);
            res.status(500).json({
                error: 'Error al obtener estado del entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }),
    // --- Cancelar entrenamiento ---
    cancelarEntrenamiento: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("CANCELAR ENTRENAMIENTO");
        try {
            const { jobId } = req.params;
            if (!jobId) {
                res.status(400).json({ error: 'ID de trabajo requerido' });
                return;
            }
            const success = trainingQueue_1.trainingQueue.cancelJob(jobId);
            if (success) {
                res.json({
                    mensaje: 'Entrenamiento cancelado exitosamente',
                    jobId,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                res.status(400).json({
                    error: 'No se pudo cancelar el entrenamiento',
                    detalle: 'El trabajo no está en ejecución o no existe'
                });
            }
        }
        catch (error) {
            console.error('Error al cancelar entrenamiento:', error);
            res.status(500).json({
                error: 'Error al cancelar entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }),
    // --- Obtener recomendaciones populares ---
    populares: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("POPULARES");
        try {
            const { user_id, topK = 4 } = req.body;
            const predicciones = yield sistemaRecomendacion.predecir(user_id, topK);
            res.json({
                predicciones,
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
    })
};
