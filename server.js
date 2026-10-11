const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialisation de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. ROUTE : Envoyer un message anonyme (GRATUIT)
app.post('/api/messages/send', async (req, res) => {
  const { username, category, content } = req.body;

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const { error: msgError } = await supabase
      .from('messages')
      .insert([{
        user_id: user.id,
        category: category || 'general',
        content: content
      }]);

    if (msgError) throw msgError;

    res.status(201).json({ message: 'Message anonyme envoyé avec succès !' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ROUTE : Récupérer les messages (Paywall check)
app.get('/api/messages/my-inbox/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('active_until')
      .eq('user_id', userId)
      .gt('active_until', new Date().toISOString())
      .order('active_until', { ascending: false })
      .limit(1);

    const hasActiveSub = sub && sub.length > 0;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      category: msg.category,
      created_at: msg.created_at,
      content: hasActiveSub ? msg.content : '🔒 Message verrouillé. Payez 50 FCFA (24h) ou 650 FCFA (1 mois) pour lire.'
    }));

    res.json({
      is_unlocked: hasActiveSub,
      messages: formattedMessages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ROUTE : Initiateur de Paiement Maketou
app.post('/api/payments/checkout', async (req, res) => {
  const { userId, planType } = req.body;
  const amount = planType === 'daily_50' ? 50 : 650;

  try {
    const { data: tx, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        amount: amount,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    const redirectUrl = `https://ici-y-a-tout.mymaketou.shop/products/ia-business-le-guide-pour-generer-des-revenus/checkout?custom_ref=${tx.id}`;

    res.json({ payment_url: redirectUrl, transaction_id: tx.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. WEBHOOK MAKETOU : Confirmation
app.post('/api/payments/webhook', async (req, res) => {
  const { transaction_id, status } = req.body;

  if (status === 'completed' || status === 'success') {
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (tx) {
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction_id);

      const hoursToAdd = tx.amount === 50 ? 24 : 24 * 30;
      const activeUntil = new Date();
      activeUntil.setHours(activeUntil.getHours() + hoursToAdd);

      await supabase
        .from('subscriptions')
        .insert([{
          user_id: tx.user_id,
          plan_type: tx.amount === 50 ? 'daily_50' : 'monthly_650',
          active_until: activeUntil.toISOString()
        }]);
    }
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));

