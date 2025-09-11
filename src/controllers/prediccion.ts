import { Request, Response } from 'express';
import { guardarCompras } from '@/utils/pagos/predicciones';
import { SistemaRecomendacion } from '../class/Prediccion';
import type { RequestEntrenamiento, RequestPrediccion } from '../types/prediccion';
import fs from 'fs';
import { DATA_FILE } from '@/constants/prediccion';

interface Compra {
    usuario: string;
    producto: string;
    cantidad?: number;
}

// --- Persistencia en disco ---
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

// --- Instancia global del sistema ---
const sistemaRecomendacion = new SistemaRecomendacion();

// ===============================
// 🚀 Inicialización del modelo
// ===============================
(async () => {
    try {
        // Intenta cargar modelo exportado (ej: backend-ecommerce/modelo/model.json)
        await sistemaRecomendacion.cargarModelo('./modelo/model.json');
        console.log("✅ Modelo cargado desde archivo");

    } catch (err) {
        console.warn("⚠️ No se encontró modelo guardado, se usará entrenamiento inicial");
        if (comprasPersistentes.length > 0) {
            sistemaRecomendacion.entrenar(comprasPersistentes)
                .then(() => console.log('✅ Modelo entrenado con datos persistentes'))
                .catch(err => console.error('❌ Error entrenando modelo inicial:', err));
        }
    }
})();

export const PrediccionController = {
    // --- Obtener predicciones ---
    prediccion: async (req: RequestPrediccion, res: Response) => {
        try {
            const { usuario, compras, entrenar = false, topK = 5 } = req.body;

            // Guardar compras nuevas (solo persistencia, no reentrenar en Windows)
            if (Array.isArray(compras) && compras.length > 0) {
                comprasPersistentes.push(...compras as Compra[]);
                guardarCompras({ comprasPersistentes });
            }

            // ⚠️ Opción: si quieres reentrenar en Linux/Colab, habilita esto
            if (entrenar) {
                sistemaRecomendacion.entrenar(comprasPersistentes)
                    .then(() => console.log("🔄 Modelo reentrenado automáticamente"))
                    .catch(err => console.error("❌ Error reentrenando:", err));
            }

            const recomendaciones = await sistemaRecomendacion.predecir(usuario, topK);

            res.json({
                usuario,
                recomendaciones,
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
        res.json({
            modeloEntrenado: sistemaRecomendacion.isInitialized,
            numUsuarios: sistemaRecomendacion.numUsuarios,
            numProductos: sistemaRecomendacion.numProductos,
            mensaje: 'Información del sistema de recomendación'
        });
    },

    // --- Reentrenar manualmente ---
    entrenar: async (req: RequestEntrenamiento, res: Response) => {
        try {
            const { compras } = req.body;

            if (!Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
                return;
            }

            // Actualizar persistencia
            comprasPersistentes.push(...compras);
            guardarCompras({ comprasPersistentes });

            // 🚀 Entrenamiento manual (solo si puedes en tu entorno)
            sistemaRecomendacion.entrenar(comprasPersistentes, 100)
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
