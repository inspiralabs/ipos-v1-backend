import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { supabase } from '../lib/supabase';

export default async function clientRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // Register Client (onboarding)
  fastify.post('/register', async (request, reply) => {
    const { storeName, address, phone, deviceId } = request.body as {
      storeName: string;
      address?: string;
      phone?: string;
      deviceId: string;
    };

    if (!storeName || !deviceId) {
      return reply.status(400).send({ error: 'storeName dan deviceId wajib diisi.' });
    }

    try {
      // Check if client with this deviceId already exists
      const { data: existingClient, error: getError } = await supabase
        .from('clients')
        .select('*')
        .eq('device_id', deviceId.trim().toLowerCase())
        .maybeSingle();

      if (getError) {
        return reply.status(500).send({ error: 'Gagal memeriksa data klien di database.', details: getError.message });
      }

      if (existingClient) {
        return reply.send({ success: true, client: existingClient });
      }

      // Create new client record in Supabase
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          store_name: storeName.trim(),
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          device_id: deviceId.trim().toLowerCase(),
          license_status: 'TRIAL',
          trial_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return reply.status(500).send({ error: 'Gagal mendaftarkan klien baru.', details: insertError.message });
      }

      return reply.status(201).send({ success: true, client: newClient });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });

  // Check License Status
  fastify.get('/license-status', async (request, reply) => {
    const { deviceId } = request.query as { deviceId?: string };

    if (!deviceId) {
      return reply.status(400).send({ error: 'deviceId wajib disertakan dalam query parameter.' });
    }

    try {
      const { data: client, error: getError } = await supabase
        .from('clients')
        .select('*')
        .eq('device_id', deviceId.trim().toLowerCase())
        .maybeSingle();

      if (getError) {
        return reply.status(500).send({ error: 'Gagal mengambil status lisensi.', details: getError.message });
      }

      if (!client) {
        return reply.status(404).send({ error: 'Klien dengan Device ID ini tidak ditemukan.' });
      }

      let licenseStatus = client.license_status;
      let trialDaysLeft = 14;

      if (licenseStatus === 'TRIAL') {
        const startedAt = new Date(client.trial_started_at);
        const now = new Date();
        const diffTime = now.getTime() - startedAt.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        trialDaysLeft = Math.max(0, 14 - diffDays);

        if (diffDays >= 14) {
          licenseStatus = 'EXPIRED';
          // Update status to EXPIRED in Supabase database
          await supabase
            .from('clients')
            .update({ license_status: 'EXPIRED' })
            .eq('id', client.id);
        }
      } else if (licenseStatus === 'ACTIVE') {
        trialDaysLeft = 0;
      } else if (licenseStatus === 'EXPIRED') {
        trialDaysLeft = 0;
      }

      return reply.send({
        storeName: client.store_name,
        licenseStatus,
        trialDaysLeft,
        licenseKey: client.license_key,
        planTier: client.plan_tier || 'LITE',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Terjadi kesalahan sistem.', details: err.message });
    }
  });
}
