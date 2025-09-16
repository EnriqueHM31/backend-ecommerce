import { Router, Request, Response } from 'express';
import { FiltradoColaborativo } from '../class/Prediccion2';
import { Compra } from '../types/prediccion';

const router = Router();
const sistemaRecomendacion = new FiltradoColaborativo();

// ==============================
// 🚀 MIDDLEWARE DE VALIDACIÓN
// ==============================
const validarUsuario = (req: Request, res: Response, next: Function) => {
    const { usuario } = req.params;
    if (!usuario || usuario.trim() === '') {
        res.status(400).json({
            success: false,
            error: 'El parámetro usuario es requerido'
        });
    }
    next();
};

const validarProducto = (req: Request, res: Response, next: Function) => {
    const { producto } = req.params;
    if (!producto || producto.trim() === '') {
        res.status(400).json({
            success: false,
            error: 'El parámetro producto es requerido'
        });
    }
    next();
};

// ==============================
// 🚀 RUTAS DE INICIALIZACIÓN
// ==============================

/**
 * POST /api/recomendaciones/inicializar
 * Inicializa el sistema con datos de compras
 */
router.post('/inicializar', async (req: Request, res: Response) => {
    try {
        const { compras }: { compras: Compra[] } = req.body;

        if (!compras || !Array.isArray(compras) || compras.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Se requiere un array de compras válido'
            });
        }

        // Validar estructura de compras
        for (const compra of compras) {
            if (!compra.usuario || !compra.producto || compra.cantidad === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Cada compra debe tener usuario, producto y cantidad'
                });
            }
        }

        await sistemaRecomendacion.inicializar(compras as Compra[]);
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            message: 'Sistema inicializado correctamente',
            estadisticas
        });

    } catch (error) {
        console.error('Error inicializando sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/recomendaciones/cargar
 * Carga un modelo previamente guardado
 */
router.post('/cargar', async (_req: Request, res: Response) => {
    try {
        await sistemaRecomendacion.cargarModelo();
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            message: 'Modelo cargado correctamente',
            estadisticas
        });

    } catch (error) {
        console.error('Error cargando modelo:', error);
        res.status(404).json({
            success: false,
            error: 'No se pudo cargar el modelo. Asegúrese de que existe.'
        });
    }
});

// ==============================
// 🚀 RUTAS DE RECOMENDACIÓN
// ==============================

/**
 * GET /api/recomendaciones/usuario/:usuario
 * Obtiene recomendaciones para un usuario específico
 */
router.get('/usuario/:usuario', validarUsuario, async (req: Request, res: Response) => {
    try {
        const { usuario } = req.params;
        const {
            limite = '5',
            metodo = 'coseno'
        } = req.query;

        const topK = parseInt(limite as string);
        const algoritmo = metodo as 'coseno' | 'pearson';

        if (isNaN(topK) || topK <= 0 || topK > 50) {
            res.status(400).json({
                success: false,
                error: 'El límite debe ser un número entre 1 y 50'
            });
        }

        if (!['coseno', 'pearson'].includes(algoritmo)) {
            res.status(400).json({
                success: false,
                error: 'El método debe ser "coseno" o "pearson"'
            });
        }

        const recomendaciones = await sistemaRecomendacion.predecir(
            usuario,
            topK,
            algoritmo
        );

        res.json({
            success: true,
            usuario,
            metodo: algoritmo,
            recomendaciones,
            total: recomendaciones.length
        });

    } catch (error) {
        console.error('Error generando recomendaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando recomendaciones'
        });
    }
});

/**
 * GET /api/recomendaciones/producto/:producto
 * Obtiene productos similares a uno dado
 */
router.get('/producto/:producto', validarProducto, async (req: Request, res: Response) => {
    try {
        const { producto } = req.params;
        const { limite = '5' } = req.query;

        const topK = parseInt(limite as string);

        if (isNaN(topK) || topK <= 0 || topK > 50) {
            res.status(400).json({
                success: false,
                error: 'El límite debe ser un número entre 1 y 50'
            });
        }

        const productosSimiliares = await sistemaRecomendacion.recomendarPorProducto(
            producto,
            topK
        );

        res.json({
            success: true,
            producto,
            similares: productosSimiliares,
            total: productosSimiliares.length
        });

    } catch (error) {
        console.error('Error buscando productos similares:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando productos similares'
        });
    }
});

// ==============================
// 🚀 RUTAS DE INFORMACIÓN
// ==============================

/**
 * GET /api/recomendaciones/estadisticas
 * Obtiene estadísticas del sistema
 */
router.get('/estadisticas', (_req: Request, res: Response) => {
    try {
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            estadisticas
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
});

/**
 * GET /api/recomendaciones/salud
 * Verifica el estado del sistema
 */
router.get('/salud', (_req: Request, res: Response) => {
    const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

    res.json({
        success: true,
        estado: 'activo',
        version: '1.0.0',
        inicializado: (estadisticas as any).inicializado,
        timestamp: new Date().toISOString()
    });
});

export default router;