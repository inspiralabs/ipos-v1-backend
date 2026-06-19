import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from './lib/supabase';
import clientRoutes from './routes/client';
import adminRoutes from './routes/admin';

dotenv.config();

const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

const fastify = Fastify({
  logger: true,
});

// Register CORS
fastify.register(cors, {
  origin: '*', // Izinkan semua origin untuk kemudahan integrasi PWA
});

// Register JWT
fastify.register(jwt, {
  secret: jwtSecret,
});

// Register Routes
fastify.register(clientRoutes, { prefix: '/api/clients' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

// Function to seed default admin if none exists
async function seedDefaultAdmin() {
  try {
    const { count, error } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Gagal memeriksa tabel admins saat startup:', error.message);
      return;
    }

    if (count === 0) {
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const { error: insertError } = await supabase
        .from('admins')
        .insert({
          username: defaultUsername,
          password_hash: hashedPassword,
          name: 'Super Admin',
        });

      if (insertError) {
        console.error('Gagal membuat default admin:', insertError.message);
      } else {
        console.log('==================================================');
        console.log('SEEDING SUKSES: Akun default admin berhasil dibuat!');
        console.log(`Username: ${defaultUsername}`);
        console.log(`Password: ${defaultPassword}`);
        console.log('==================================================');
      }
    }
  } catch (err: any) {
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
