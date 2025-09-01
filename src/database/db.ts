// lib/db.ts
import mysql from 'mysql2/promise';

declare global {
    // Evita múltiples instancias en dev
    var mysqlPool: mysql.Pool | undefined;
}

export const db = global.mysqlPool || mysql.createPool({
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    port: Number(process.env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
});

if (process.env.NODE_ENV !== 'production') global.mysqlPool = db;