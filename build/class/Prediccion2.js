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
exports.FiltradoColaborativo = void 0;
// sistema/FiltradoColaborativo.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prediccion_1 = require("../constants/prediccion");
const cargarCompras = () => {
    if (!fs_1.default.existsSync(prediccion_1.DATA_FILE))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(prediccion_1.DATA_FILE, 'utf8'));
    }
    catch (e) {
        console.error("Error al leer compras persistidas:", e);
        return [];
    }
};
class FiltradoColaborativo {
    constructor(rutaModelo) {
        this.matriz = {};
        this.usuarios = new Set();
        this.productos = new Set();
        this.isInitialized = false;
        this.rutaModelo = "./modelo-colaborativo";
        if (rutaModelo) {
            this.rutaModelo = rutaModelo;
        }
    }
    // ==============================
    // 🚀 INICIALIZACIÓN Y CARGA DE DATOS
    // ==============================
    inicializar(compras) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📊 Inicializando sistema de filtrado colaborativo...");
            this.construirMatriz(compras);
            yield this.guardarModelo();
            this.isInitialized = true;
            console.log(`✅ Sistema inicializado con ${this.usuarios.size} usuarios y ${this.productos.size} productos`);
        });
    }
    construirMatriz(compras) {
        // Limpiar datos anteriores
        this.matriz = {};
        this.usuarios.clear();
        this.productos.clear();
        // Construir matriz usuario-producto
        for (const compra of compras) {
            const { usuario, producto, cantidad, rating } = compra;
            // Inicializar usuario si no existe
            if (!this.matriz[usuario]) {
                this.matriz[usuario] = {};
            }
            // Usar rating si existe, sino usar cantidad normalizada
            const valor = rating || Math.min(cantidad / 10, 5); // Normalizar cantidad a escala 1-5
            this.matriz[usuario][producto] = valor;
            this.usuarios.add(usuario);
            this.productos.add(producto);
        }
    }
    // ==============================
    // 🚀 CÁLCULO DE SIMILITUDES
    // ==============================
    calcularSimilitudCoseno(usuario1, usuario2) {
        const productos1 = this.matriz[usuario1];
        const productos2 = this.matriz[usuario2];
        if (!productos1 || !productos2)
            return 0;
        // Encontrar productos en común
        const productosComunes = Object.keys(productos1).filter(producto => productos2.hasOwnProperty(producto));
        if (productosComunes.length === 0)
            return 0;
        // Calcular similitud de coseno
        let dotProduct = 0;
        let norma1 = 0;
        let norma2 = 0;
        for (const producto of productosComunes) {
            const rating1 = productos1[producto];
            const rating2 = productos2[producto];
            dotProduct += rating1 * rating2;
            norma1 += rating1 * rating1;
            norma2 += rating2 * rating2;
        }
        if (norma1 === 0 || norma2 === 0)
            return 0;
        return dotProduct / (Math.sqrt(norma1) * Math.sqrt(norma2));
    }
    calcularCorrelacionPearson(usuario1, usuario2) {
        const productos1 = this.matriz[usuario1];
        const productos2 = this.matriz[usuario2];
        if (!productos1 || !productos2)
            return 0;
        // Encontrar productos en común
        const productosComunes = Object.keys(productos1).filter(producto => productos2.hasOwnProperty(producto));
        if (productosComunes.length < 2)
            return 0;
        // Calcular medias
        const suma1 = productosComunes.reduce((sum, p) => sum + productos1[p], 0);
        const suma2 = productosComunes.reduce((sum, p) => sum + productos2[p], 0);
        const media1 = suma1 / productosComunes.length;
        const media2 = suma2 / productosComunes.length;
        // Calcular correlación de Pearson
        let numerador = 0;
        let denominador1 = 0;
        let denominador2 = 0;
        for (const producto of productosComunes) {
            const diff1 = productos1[producto] - media1;
            const diff2 = productos2[producto] - media2;
            numerador += diff1 * diff2;
            denominador1 += diff1 * diff1;
            denominador2 += diff2 * diff2;
        }
        if (denominador1 === 0 || denominador2 === 0)
            return 0;
        return numerador / Math.sqrt(denominador1 * denominador2);
    }
    // ==============================
    // 🚀 ENCONTRAR USUARIOS SIMILARES
    // ==============================
    encontrarUsuariosSimilares(usuario, k = 10, metodo = 'coseno') {
        if (!this.matriz[usuario])
            return [];
        const similitudes = [];
        for (const otroUsuario of this.usuarios) {
            if (otroUsuario === usuario)
                continue;
            const similitud = metodo === 'coseno'
                ? this.calcularSimilitudCoseno(usuario, otroUsuario)
                : this.calcularCorrelacionPearson(usuario, otroUsuario);
            if (similitud > 0) {
                similitudes.push({ usuario: otroUsuario, similitud });
            }
        }
        return similitudes
            .sort((a, b) => b.similitud - a.similitud)
            .slice(0, k);
    }
    // ==============================
    // 🚀 GENERAR RECOMENDACIONES
    // ==============================
    predecir(usuario_1) {
        return __awaiter(this, arguments, void 0, function* (usuario, topK = 4, metodo = 'coseno') {
            if (!this.isInitialized) {
                throw new Error('Sistema no inicializado. Ejecute inicializar() primero.');
            }
            if (!this.matriz[usuario]) {
                console.log(`⚠️ Usuario ${usuario} no encontrado`);
                return [];
            }
            console.log(`🔍 Generando recomendaciones para ${usuario}...`);
            // Encontrar usuarios similares
            const usuariosSimilares = this.encontrarUsuariosSimilares(usuario, 20, metodo);
            if (usuariosSimilares.length === 0) {
                console.log('⚠️ No se encontraron usuarios similares');
                return [];
            }
            // Obtener productos ya comprados por el usuario
            const productosComprados = new Set(Object.keys(this.matriz[usuario]));
            // Calcular scores para productos no comprados
            const scoresProductos = new Map();
            const sumaSimilitudes = new Map();
            for (const { usuario: usuarioSimilar, similitud } of usuariosSimilares) {
                const productosUsuarioSimilar = this.matriz[usuarioSimilar];
                for (const [producto, rating] of Object.entries(productosUsuarioSimilar)) {
                    // Solo recomendar productos no comprados
                    if (productosComprados.has(producto))
                        continue;
                    const scoreActual = scoresProductos.get(producto) || 0;
                    const sumaSimActual = sumaSimilitudes.get(producto) || 0;
                    scoresProductos.set(producto, scoreActual + (similitud * rating));
                    sumaSimilitudes.set(producto, sumaSimActual + similitud);
                }
            }
            // Normalizar scores y crear recomendaciones
            const recomendaciones = [];
            for (const [producto, scoreTotal] of scoresProductos.entries()) {
                const sumaSim = sumaSimilitudes.get(producto) || 1;
                const scoreNormalizado = scoreTotal / sumaSim;
                recomendaciones.push({
                    producto,
                    score: scoreNormalizado,
                    razon: `Basado en ${usuariosSimilares.length} usuarios similares (${metodo})`
                });
            }
            const resultado = recomendaciones
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
            console.log(`✅ Generadas ${resultado.length} recomendaciones`);
            return resultado;
        });
    }
    // ==============================
    // 🚀 RECOMENDACIONES POR PRODUCTO (Item-based)
    // ==============================
    recomendarPorProducto(producto_1) {
        return __awaiter(this, arguments, void 0, function* (producto, topK = 5) {
            if (!this.isInitialized) {
                throw new Error('Sistema no inicializado');
            }
            console.log(`🔍 Buscando productos similares a ${producto}...`);
            const similitudesProducto = new Map();
            // Obtener usuarios que compraron este producto
            const usuariosProductoBase = [];
            for (const [usuario, productos] of Object.entries(this.matriz)) {
                if (productos[producto]) {
                    usuariosProductoBase.push(usuario);
                }
            }
            if (usuariosProductoBase.length === 0) {
                return [];
            }
            // Calcular similitud con otros productos
            for (const otroProducto of this.productos) {
                if (otroProducto === producto)
                    continue;
                let coincidencias = 0;
                let totalUsuarios = 0;
                for (const usuario of usuariosProductoBase) {
                    if (this.matriz[usuario][otroProducto]) {
                        coincidencias++;
                    }
                    totalUsuarios++;
                }
                if (coincidencias > 0) {
                    const similitud = coincidencias / totalUsuarios;
                    similitudesProducto.set(otroProducto, similitud);
                }
            }
            const recomendaciones = Array.from(similitudesProducto.entries())
                .map(([prod, sim]) => ({
                producto: prod,
                score: sim,
                razon: `Producto similar (${Math.round(sim * 100)}% de usuarios en común)`
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
            console.log(`✅ Encontrados ${recomendaciones.length} productos similares`);
            return recomendaciones;
        });
    }
    cargarModelo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isInitialized) {
                    console.log("⚠️ El modelo ya está inicializado, no se recargará.");
                    return;
                }
                const rutaArchivo = path_1.default.join(this.rutaModelo, "modelo.json");
                if (fs_1.default.existsSync(rutaArchivo)) {
                    try {
                        const contenido = fs_1.default.readFileSync(rutaArchivo, "utf8");
                        const datos = JSON.parse(contenido);
                        this.matriz = datos.matriz || {};
                        this.usuarios = new Set(datos.usuarios || []);
                        this.productos = new Set(datos.productos || []);
                        this.isInitialized = true;
                        console.log(`✅ Modelo cargado desde ${rutaArchivo}`);
                        console.log(`📊 ${this.usuarios.size} usuarios, ${this.productos.size} productos`);
                        return;
                    }
                    catch (e) {
                        console.error("❌ Error parseando modelo.json, se intentará inicializar desde compras:", e);
                        // si falla el parseo, seguimos a la inicialización por compras
                    }
                }
                // Si no hay modelo.json o hay error, usar compras persistentes (DATA_FILE)
                const comprasPersistentes = cargarCompras();
                if (!comprasPersistentes || comprasPersistentes.length === 0) {
                    console.warn("⚠️ No hay compras persistentes ni modelo para cargar. No se inicializó el sistema.");
                    return;
                }
                yield this.inicializar(comprasPersistentes);
                console.log(`📊 Inicializado con ${comprasPersistentes.length} compras persistentes`);
            }
            catch (error) {
                console.error("❌ Error cargando modelo:", error);
                throw error;
            }
        });
    }
    // ==============================
    // 🚀 PERSISTENCIA
    // ==============================
    guardarModelo() {
        return __awaiter(this, arguments, void 0, function* (newUsuario = false) {
            try {
                if (!fs_1.default.existsSync(this.rutaModelo)) {
                    fs_1.default.mkdirSync(this.rutaModelo, { recursive: true });
                }
                const datos = {
                    matriz: this.matriz,
                    usuarios: Array.from(this.usuarios),
                    productos: Array.from(this.productos),
                    fechaGuardado: new Date().toISOString(),
                    incremental: newUsuario
                };
                const rutaArchivo = path_1.default.join(this.rutaModelo, "modelo.json");
                const tmp = rutaArchivo + ".tmp";
                // Escritura atómica: escribir a tmp y renombrar
                fs_1.default.writeFileSync(tmp, JSON.stringify(datos, null, 2), "utf8");
                fs_1.default.renameSync(tmp, rutaArchivo);
                console.log(`✅ Modelo sobrescrito en ${rutaArchivo} ${newUsuario ? "(actualización incremental)" : "(entrenamiento completo)"}`);
            }
            catch (error) {
                console.error("❌ Error guardando modelo:", error);
                throw error;
            }
        });
    }
    /*private async guardarComprasPersistentes(nuevasCompras: Compra[]): Promise<void> {
        try {
            let existentes: Compra[] = [];

            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
                existentes = JSON.parse(raw) as Compra[];
            }

            // Evitar duplicados por usuario+producto
            const claves = new Set(existentes.map(c => `${c.usuario}::${c.producto}`));
            for (const c of nuevasCompras) {
                const clave = `${c.usuario}::${c.producto}`;
                if (!claves.has(clave)) {
                    existentes.push(c);
                    claves.add(clave);
                }
            }

            fs.writeFileSync(DATA_FILE, JSON.stringify(existentes, null, 2), 'utf8');
            console.log(`✅ Compras persistentes guardadas en ${DATA_FILE}`);
        } catch (err) {
            console.error("❌ Error guardando compras persistentes:", err);
            throw err;
        }
    }*/
    agregarUsuario(compras) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!compras || compras.length === 0) {
                const populares = this.obtenerProductosPopulares();
                return { prediccionesall: null, populares };
            }
            const nuevoUsuario = compras[0].usuario;
            console.log(`👤 Agregando/actualizando usuario: ${nuevoUsuario} con ${compras.length} compras`);
            // Asegurar que la estructura exista
            if (!this.matriz[nuevoUsuario]) {
                this.matriz[nuevoUsuario] = {};
            }
            // Insertar compras en la matriz existente (normalización como antes)
            for (const compra of compras) {
                const { usuario, producto, cantidad, rating } = compra;
                const valor = rating || Math.min(cantidad / 10, 5);
                // Si prefieres binario: const valor = 1;
                this.matriz[usuario] = this.matriz[usuario] || {};
                this.matriz[usuario][producto] = valor;
                this.usuarios.add(usuario);
                this.productos.add(producto);
            }
            // Persistir compras en DATA_FILE para que sobrevivieran reinicios (opcional pero recomendable)
            /*   try {
                   await this.guardarComprasPersistentes(compras);
               } catch (err) {
                   console.warn("⚠️ No se pudieron guardar las compras persistentes:", err);
               }
       
               // Guardar y sobreescribir modelo.json (escritura atómica implementada)
               await this.guardarModelo(true);
       
               // Marcar inicializado y devolver predicciones
               this.isInitialized = true;*/
            // Devolver predicciones para el nuevo usuario
            const predicciones = yield this.predecir(nuevoUsuario);
            const populares = this.obtenerProductosPopulares();
            return { prediccionesall: predicciones, populares };
        });
    }
    // ==============================
    // 🚀 MÉTODOS DE UTILIDAD
    // ==============================
    obtenerEstadisticas() {
        const totalInteracciones = Object.values(this.matriz)
            .reduce((total, productos) => total + Object.keys(productos).length, 0);
        return {
            usuarios: this.usuarios.size,
            productos: this.productos.size,
            interacciones: totalInteracciones,
            densidad: (totalInteracciones / (this.usuarios.size * this.productos.size) * 100).toFixed(2) + '%',
            inicializado: this.isInitialized
        };
    }
    obtenerProductosPopulares(topK = 4) {
        if (!this.isInitialized) {
            throw new Error('Sistema no inicializado. Ejecuta inicializar() primero.');
        }
        const conteoProductos = new Map();
        for (const productosUsuario of Object.values(this.matriz)) {
            for (const [producto] of Object.entries(productosUsuario)) {
                const actual = conteoProductos.get(producto) || 0;
                conteoProductos.set(producto, actual + 1); // contar usuarios que compraron
            }
        }
        const populares = Array.from(conteoProductos.entries())
            .map(([producto, count]) => ({
            producto,
            score: count, // score = cantidad de usuarios que compraron
            razon: `Comprado por ${count} usuario(s)`
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        console.log(`✅ Top ${populares.length} productos populares generados`);
        return populares;
    }
    get numUsuarios() { return this.usuarios.size; }
    get numProductos() { return this.productos.size; }
}
exports.FiltradoColaborativo = FiltradoColaborativo;
