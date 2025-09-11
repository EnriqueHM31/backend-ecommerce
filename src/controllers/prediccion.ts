import { Request, Response } from 'express';
import { guardarCompras } from '@/utils/pagos/predicciones';
import { SistemaRecomendacion } from '../class/Prediccion';
import type { RequestEntrenamiento, RequestPrediccion } from '../types/prediccion';

interface Compra {
    usuario: string;
    producto: string;
    cantidad?: number;
}

// Persistencia en memoria
let comprasPersistentes: Compra[] = [];

// Instancia global
const sistemaRecomendacion = new SistemaRecomendacion();

// Entrenar modelo si hay datos
if (comprasPersistentes.length > 0 && !sistemaRecomendacion.isInitialized) {
    sistemaRecomendacion.entrenar(comprasPersistentes)
        .then(() => console.log('Modelo entrenado con datos persistentes'))
        .catch(err => console.error('Error entrenando modelo inicial:', err));
}

export const PrediccionController = {
    prediccion: async (req: RequestPrediccion, res: Response) => {
        try {
            const { usuario, compras, entrenar = false, topK = 5 } = req.body;


            if (entrenar || !sistemaRecomendacion.isInitialized) {

                const comprasValidas = compras?.every(c =>
                    c.usuario && c.producto &&
                    typeof c.usuario === 'string' &&
                    typeof c.producto === 'string'
                );

                if (!comprasValidas) {
                    res.status(400).json({
                        error: 'Las compras deben tener formato: { usuario: string, producto: string, cantidad?: number }'
                    });
                }

                comprasPersistentes.push(...compras ?? []);
                guardarCompras({ comprasPersistentes });
                //await sistemaRecomendacion.entrenar(comprasPersistentes);
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

    info: (_req: Request, res: Response) => {
        res.json({
            modeloEntrenado: sistemaRecomendacion.isInitialized,
            numUsuarios: sistemaRecomendacion.numUsuarios,
            numProductos: sistemaRecomendacion.numProductos,
            mensaje: 'Información del sistema de recomendación'
        });
    },

    entrenar: async (req: RequestEntrenamiento, res: Response) => {
        try {
            const { compras } = req.body;

            if (!compras || !Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
            }

            comprasPersistentes.push(...compras);
            guardarCompras({ comprasPersistentes });
            await sistemaRecomendacion.entrenar(comprasPersistentes, 100);

            res.json({
                mensaje: 'Modelo reentrenado exitosamente',
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
