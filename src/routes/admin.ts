import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { generateLicenseKey } from '../lib/license';

interface JwtPayload {
  id: string;
  username: string;
  name: string;
}

export default async function adminRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Pre-handler hook to authenticate admin JWT for all routes except login
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.routerPath === '/api/admin/auth/login') return;
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Sesi tidak valid.' });
    }
  });

  // Admin Login
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username dan password wajib diisi.' });
    }

    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: 'Gagal mengambil data admin.', details: error.message });
      }

      if (!admin) {
        return reply.status(401).send({ error: 'Username atau password salah.' });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        return reply.status(401).send({ error: 'Username atau password salah.' });
      }

      // Generate JWT Token
      const token = fastify.jwt.sign({
        id: admin.id,
        username: admin.username,
        name: admin.name,
      });

      return reply.send({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // List Clients
  fastify.get('/clients', async (request, reply) => {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: 'Gagal mengambil data klien.', details: error.message });
      }

      return reply.send(clients || []);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Generate License for Client
  fastify.post('/clients/generate-license', async (request, reply) => {
    const { clientId, planTier = 'LITE' } = request.body as { clientId?: string; planTier?: 'LITE' | 'PRO' };

    if (!clientId) {
      return reply.status(400).send({ error: 'clientId wajib disertakan.' });
    }

    try {
      // 1. Get client details
      const { data: client, error: getError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (getError || !client) {
        return reply.status(404).send({ error: 'Klien tidak ditemukan.', details: getError?.message });
      }

      // 2. Generate license key
      const licenseKey = generateLicenseKey(client.device_id, planTier);

      // 3. Update client in Supabase
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          license_status: 'ACTIVE',
          license_key: licenseKey,
          plan_tier: planTier,
        })
        .eq('id', clientId);

      if (updateError) {
        return reply.status(500).send({ error: 'Gagal memperbarui status lisensi klien.', details: updateError.message });
      }

      // 4. Log the license generation
      const adminUser = request.user as JwtPayload;
      await supabase
        .from('license_logs')
        .insert({
          client_id: clientId,
          license_key: licenseKey,
          generated_by: adminUser.id,
          plan_tier: planTier,
        });

      return reply.send({ success: true, licenseKey, planTier, storeName: client.store_name });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // List Admin Users
  fastify.get('/users', async (request, reply) => {
    try {
      const { data: admins, error } = await supabase
        .from('admins')
        .select('id, username, name, created_at')
        .order('username', { ascending: true });

      if (error) {
        return reply.status(500).send({ error: 'Gagal mengambil data admin.', details: error.message });
      }

      return reply.send(admins || []);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Create Admin User
  fastify.post('/users', async (request, reply) => {
    const { username, password, name } = request.body as {
      username?: string;
      password?: string;
      name?: string;
    };

    if (!username || !password || !name) {
      return reply.status(400).send({ error: 'Username, password, dan nama wajib diisi.' });
    }

    try {
      // Check if username already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admins')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        return reply.status(500).send({ error: 'Gagal memverifikasi username.', details: checkError.message });
      }

      if (existingAdmin) {
        return reply.status(400).send({ error: 'Username sudah digunakan oleh admin lain.' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Save to Supabase
      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert({
          username: username.trim().toLowerCase(),
          password_hash: passwordHash,
          name: name.trim(),
        })
        .select('id, username, name, created_at')
        .single();

      if (insertError) {
        return reply.status(500).send({ error: 'Gagal membuat admin baru.', details: insertError.message });
      }

      return reply.status(201).send({ success: true, admin: newAdmin });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Delete Admin User
  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const adminUser = request.user as JwtPayload;

    if (id === adminUser.id) {
      return reply.status(400).send({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    }

    try {
      // Ensure there is at least one admin remaining after deletion
      const { count, error: countError } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return reply.status(500).send({ error: 'Gagal memverifikasi jumlah admin.', details: countError.message });
      }

      if (count && count <= 1) {
        return reply.status(400).send({ error: 'Gagal menghapus. Minimal harus tersisa satu akun admin di sistem.' });
      }

      const { error: deleteError } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return reply.status(500).send({ error: 'Gagal menghapus admin.', details: deleteError.message });
      }

      return reply.send({ success: true, message: 'Admin berhasil dihapus.' });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Deactivate Client (soft delete / non-aktifkan)
  fastify.post('/clients/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          license_status: 'REVOKED'
        })
        .eq('id', id);

      if (updateError) {
        return reply.status(500).send({ error: 'Gagal menonaktifkan klien.', details: updateError.message });
      }

      return reply.send({ success: true, message: 'Klien berhasil dinonaktifkan.' });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Delete Client
  fastify.delete('/clients/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // 1. Hapus license logs terlebih dahulu untuk menghindari constraint FK jika ada
      await supabase
        .from('license_logs')
        .delete()
        .eq('client_id', id);

      // 2. Hapus data klien
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return reply.status(500).send({ error: 'Gagal menghapus data klien.', details: deleteError.message });
      }

      return reply.send({ success: true, message: 'Klien berhasil dihapus.' });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });
}
