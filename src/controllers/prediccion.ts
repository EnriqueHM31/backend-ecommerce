import { Request, Response } from 'express';
import { guardarCompras } from '../utils/pagos/predicciones';
import { SistemaRecomendacion } from '../class/Prediccion';
import type { RequestEntrenamiento, RequestPrediccion } from '../types/prediccion';
import fs from 'fs';
import { DATA_FILE } from '../constants/prediccion';

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
    try {
        await sistemaRecomendacion.cargarModelo('./modelo-entrenado/model.json');
        console.log("✅ Modelo cargado desde archivo");
        // Asegurarte de guardar meta.json si no existía

    } catch (err) {
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

            // 🔹 Opcional: reentrenar si se solicita
            if (entrenar) {
                await sistemaRecomendacion.entrenar(comprasPersistentes)
                    .then(() => console.log("✅ Entrenamiento completado"))
                    .catch(err => console.error("❌ Error en entrenamiento:", err));
            }

            // 🔹 Generar predicciones
            let recomendaciones = await sistemaRecomendacion.predecir(usuario, topK);

            // 🔹 Si usuario nuevo, agregar info de que es fallback
            const esUsuarioNuevo = sistemaRecomendacion.userEncoder.get(usuario) === undefined;
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
        res.json({
            modeloEntrenado: sistemaRecomendacion.isInitialized,
            numUsuarios: sistemaRecomendacion.numUsuarios,
            numProductos: sistemaRecomendacion.numProductos,
            mensaje: 'Información del sistema de recomendación'
        });
    },

    // --- Reentrenar manualmente ---
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

            // 🔹 Entrenamiento manual
            await sistemaRecomendacion.entrenar(comprasPersistentes, 100)
                .then(() => console.log("✅ Reentrenamiento manual completado"))
                .catch(err => console.error("❌ Error en reentrenamiento manual:", err));


            res.json({
                mensaje: 'Reentrenamiento iniciado en background',
                numUsuarios: sistemaRecomendacion.numUsuarios,
                numProductos: sistemaRecomendacion.numProductos
            });
        } catch (error) {
            console.error('Error en entrenamiento:', error);
            res.status(500).json({
                error: 'Error al entrenar el modelo',
                detalle: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};
