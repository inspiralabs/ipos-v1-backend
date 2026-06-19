"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const supabase_1 = require("./lib/supabase");
const client_1 = __importDefault(require("./routes/client"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';
const fastify = (0, fastify_1.default)({
    logger: true,
});
// Register CORS
fastify.register(cors_1.default, {
    origin: '*', // Izinkan semua origin untuk kemudahan integrasi PWA
});
// Register JWT
fastify.register(jwt_1.default, {
    secret: jwtSecret,
});
// Register Routes
fastify.register(client_1.default, { prefix: '/api/clients' });
fastify.register(admin_1.default, { prefix: '/api/admin' });
// Function to seed default admin if none exists
async function seedDefaultAdmin() {
    try {
        const { count, error } = await supabase_1.supabase
            .from('admins')
            .select('*', { count: 'exact', head: true });
        if (error) {
            console.error('Gagal memeriksa tabel admins saat startup:', error.message);
            return;
        }
        if (count === 0) {
            const defaultUsername = 'admin';
            const defaultPassword = 'admin123';
            const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
            const { error: insertError } = await supabase_1.supabase
                .from('admins')
                .insert({
                username: defaultUsername,
                password_hash: hashedPassword,
                name: 'Super Admin',
            });
            if (insertError) {
                console.error('Gagal membuat default admin:', insertError.message);
            }
            else {
                console.log('==================================================');
                console.log('SEEDING SUKSES: Akun default admin berhasil dibuat!');
                console.log(`Username: ${defaultUsername}`);
                console.log(`Password: ${defaultPassword}`);
                console.log('==================================================');
            }
        }
    }
    catch (err) {
        console.error('Terjadi kesalahan saat seeding default admin:', err.message);
    }
}
// Start Server
const start = async () => {
    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Backend server Fastify berjalan di http://localhost:${port}`);
        // Seed admin secara otomatis jika database kosong
        await seedDefaultAdmin();
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
