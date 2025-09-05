import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { RequestEntrenamiento, RequestPrediccion } from '../types/prediccion';
import { SistemaRecomendacion } from '../class/Prediccion';

// Ruta del archivo de persistencia
const DATA_FILE = path.join(__dirname, '../data/compras.json');

// Cargar compras persistentes
let comprasPersistentes: any[] = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        comprasPersistentes = rawData ? JSON.parse(rawData) : [];
    } catch (err) {
        console.error('Error leyendo compras persistentes, se inicializa vacío:', err);
        comprasPersistentes = [];
    }
}
// Instancia global del sistema de recomendación
const sistemaRecomendacion = new SistemaRecomendacion();

// Entrenar modelo al iniciar si hay datos
if (comprasPersistentes.length > 0) {
    sistemaRecomendacion.entrenar(comprasPersistentes)
        .then(() => console.log('Modelo entrenado con datos persistentes'))
        .catch(err => console.error('Error entrenando modelo inicial:', err));
}

// Crear el router
export const PrediccionRouter = express.Router();

// Función para guardar compras persistentes
const guardarCompras = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(comprasPersistentes, null, 2));
};

// Endpoint para predicción
PrediccionRouter.post('/prediccion', async (req: RequestPrediccion, res: Response) => {
    try {
        const { usuario, compras, entrenar = false, topK = 5 } = req.body;

        if (!usuario) {
            res.status(400).json({ error: 'El parámetro "usuario" es requerido' });
        }

        // Entrenamiento si se solicita o si el modelo no está inicializado
        if (entrenar || !sistemaRecomendacion.isInitialized) {
            if (!compras || !Array.isArray(compras) || compras.length === 0) {
                res.status(400).json({ error: 'Los datos de "compras" son requeridos para entrenar el modelo' });
            }

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

            // Guardar compras y entrenar
            comprasPersistentes.push(...compras ?? []);
            guardarCompras();
            //await sistemaRecomendacion.entrenar(comprasPersistentes);
        }

        // Obtener recomendaciones
        const recomendaciones = await sistemaRecomendacion.predecir(usuario, topK);
        console.log({ recomendaciones });

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
});

// Endpoint para info del modelo
PrediccionRouter.get('/prediccion/info', (_req: Request, res: Response) => {
    res.json({
        modeloEntrenado: sistemaRecomendacion.isInitialized,
        numUsuarios: sistemaRecomendacion.numUsuarios,
        numProductos: sistemaRecomendacion.numProductos,
        mensaje: 'Información del sistema de recomendación'
    });
});

// Endpoint para reentrenar manualmente
PrediccionRouter.post('/prediccion/entrenar', async (req: RequestEntrenamiento, res: Response) => {
    try {
        const { compras } = req.body;

        if (!compras || !Array.isArray(compras) || compras.length === 0) {
            res.status(400).json({ error: 'Los datos de "compras" son requeridos' });
        }

        comprasPersistentes.push(...compras);
        guardarCompras();
        await sistemaRecomendacion.entrenar(comprasPersistentes);

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
});
