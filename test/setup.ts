// Setup global para tests
import 'dotenv/config';

// Configuración de variables de entorno para testing
process.env.NODE_ENV = 'test';

// Mock de console.log para evitar logs innecesarios en tests
global.console = {
    ...console,
    log: () => { },
    error: () => { },
    warn: () => { },
    info: () => { },
    debug: () => { },
};
