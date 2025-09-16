import { Request, Response } from 'express';
import fs from 'fs';
import { SistemaRecomendacion } from '../class/Prediccion2';
import { DATA_FILE } from '../constants/prediccion';
import type { RequestEntrenamiento, RequestPrediccion } from '../types/prediccion';
import { guardarCompras } from '../utils/pagos/predicciones';
import { trainingQueue } from '../utils/trainingQueue';

interface Compra {
    usuario: string;
    producto: string;
    cantidad?: number;
}

// ===============================
// 🚀 Persistencia en disco
// ===============================
function cargarCompras(): Compra[] {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Compra[];
    } catch (e) {
        console.error("Error al leer compras persistidas:", e);
        return [] as Compra[];
    }
}

let comprasPersistentes: Compra[] = cargarCompras();

// ===============================
// 🚀 Instancia global del sistema
// ===============================
const sistemaRecomendacion = new SistemaRecomendacion();

// ===============================
// 🚀 Inicialización automática
// ===============================
(async () => {
    const modelPath = './modelo-entrenado/model.json';

    if (fs.existsSync(modelPath)) {
        await sistemaRecomendacion.cargarModelo();
        console.log("✅ Modelo cargado desde archivo");
    } else {
        console.warn("⚠️ No se encontró modelo guardado, entrenando con datos persistentes...");
        if (comprasPersistentes.length > 0) {
            await sistemaRecomendacion.entrenar(comprasPersistentes);
        }
    }
})();


// ===============================
// 🚀 Controlador
// ===============================
export const PrediccionController = {
    // --- Obtener predicciones ---
    prediccion: async (req: RequestPrediccion, res: Response) => {
        console.log("PREDICCION");
        try {
            const { usuario, compras, entrenar = false, topK = 5 } = req.body;

            // 🔹 Guardar nuevas compras en persistencia
            if (Array.isArray(compras) && compras.length > 0) {
                comprasPersistentes.push(...compras as Compra[]);
                guardarCompras({ comprasPersistentes });
            }

            let recomendaciones: any[] = [];
            let esUsuarioNuevo = false;

            // 🔹 Opcional: reentrenar si se solicita
            if (entrenar) {

                await sistemaRecomendacion.entrenar(comprasPersistentes)
                    .then(() => console.log("✅ Entrenamiento completado"))
                    .catch(err => console.error("❌ Error en entrenamiento:", err));

                // 🔹 Generar predicciones después del entrenamiento tradicional
                recomendaciones = await sistemaRecomendacion.predecir(usuario, topK);
            }



            // 🔹 Si usuario nuevo, agregar info de que es fallback
            esUsuarioNuevo = sistemaRecomendacion.userEncoder.get(usuario) === undefined;
            if (esUsuarioNuevo) {
                recomendaciones = recomendaciones.map(r => ({ ...r, fallback: true }));
            }

            res.json({
                usuario,
                recomendaciones,
                esUsuarioNuevo,
                timestamp: new Date().toISOString(),
                mensaje: 'Recomendaciones generadas exitosamente'
            });
        } catch (error) {
            console.error('Error en predicción:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },


    // --- Info del modelo ---
    info: (_req: Request, res: Response) => {
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
    entrenar: async (req: RequestEntrenamiento, res: Response) => {
        console.log("ENTRENAAAAAAR");
        try {
            const { compras } = req.body;

            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }

            // 🔹 Actualizar persistencia
            comprasPersistentes.push(...compras);
            guardarCompras({ comprasPersistentes });

            let resultado: any = {
                mensaje: 'Reentrenamiento completado',
                numUsuarios: sistemaRecomendacion.numUsuarios,
                numProductos: sistemaRecomendacion.numProductos
            };

            // 🔹 Entrenamiento con o sin recomendaciones
            // 🔹 Entrenamiento tradicional
            await sistemaRecomendacion.entrenar(comprasPersistentes, 100)
                .then(() => console.log("✅ Reentrenamiento manual completado"))
                .catch(err => console.error("❌ Error en reentrenamiento manual:", err));

            res.json(resultado);
        } catch (error) {
            console.error('Error en entrenamiento:', error);
            res.status(500).json({
                error: 'Error al entrenar el modelo',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // --- Entrenar en segundo plano (asíncrono) ---
    entrenarAsync: async (req: RequestEntrenamiento, res: Response) => {
        console.log("ENTRENAMIENTO ASÍNCRONO");
        try {
            const { compras } = req.body;

            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }

            // 🔹 Actualizar persistencia
            comprasPersistentes.push(...compras);
            guardarCompras({ comprasPersistentes });

            // 🔹 Agregar trabajo a la cola
            const jobId = await trainingQueue.addJob(comprasPersistentes.length);

            res.json({
                mensaje: 'Entrenamiento iniciado en segundo plano',
                jobId,
                datasetSize: comprasPersistentes.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error al iniciar entrenamiento asíncrono:', error);
            res.status(500).json({
                error: 'Error al iniciar entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // --- Estado del entrenamiento ---
    estadoEntrenamiento: async (req: Request, res: Response) => {
        console.log("ESTADO ENTRENAMIENTO");
        try {
            const { jobId } = req.params;

            if (jobId) {
                // Estado de un trabajo específico
                const job = trainingQueue.getJobStatus(jobId);
                if (!job) {
                    res.status(404).json({ error: 'Trabajo no encontrado' });
                    return;
                }

                res.json({
                    jobId,
                    ...job
                });
            } else {
                // Estado general de la cola
                const queueStatus = trainingQueue.getQueueStatus();
                const allJobs = trainingQueue.getAllJobs();

                res.json({
                    queue: queueStatus,
                    jobs: allJobs,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error al obtener estado:', error);
            res.status(500).json({
                error: 'Error al obtener estado del entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // --- Cancelar entrenamiento ---
    cancelarEntrenamiento: async (req: Request, res: Response) => {
        console.log("CANCELAR ENTRENAMIENTO");
        try {
            const { jobId } = req.params;

            if (!jobId) {
                res.status(400).json({ error: 'ID de trabajo requerido' });
                return;
            }

            const success = trainingQueue.cancelJob(jobId);

            if (success) {
                res.json({
                    mensaje: 'Entrenamiento cancelado exitosamente',
                    jobId,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(400).json({
                    error: 'No se pudo cancelar el entrenamiento',
                    detalle: 'El trabajo no está en ejecución o no existe'
                });
            }
        } catch (error) {
            console.error('Error al cancelar entrenamiento:', error);
            res.status(500).json({
                error: 'Error al cancelar entrenamiento',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // --- Obtener recomendaciones populares ---
    populares: async (req: Request, res: Response) => {
        console.log("POPULARES");
        try {

            const { user_id, topK = 4 } = req.body;

            const predicciones = await sistemaRecomendacion.predecir(user_id, topK);


            res.json({
                predicciones,
                timestamp: new Date().toISOString(),
                mensaje: 'Recomendaciones generadas exitosamente'
            });
        } catch (error) {
            console.error('Error en predicción:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};
