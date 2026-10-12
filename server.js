const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = "https://tieptbsrgbshpixsgrht.supabase.co";
const SUPABASE_KEY = "sb_publishable_Okyc9y8VyBKDn4pKWrjrpw_JXgXB12r";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.static('.'));

// Envoi de message anonyme
app.post('/api/send-message', async (req, res) => {
    const { recipient_username, category, content, sender_pseudo } = req.body;
    if (!recipient_username || !content || !sender_pseudo) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const { error } = await supabase.from('messages').insert([{
        recipient_username: recipient_username.toLowerCase().trim(),
        category: category || '❓ Question',
        content,
        sender_pseudo
    }]);

    if (error) return res.status(500).json({ error: "Erreur lors de l'envoi du message." });
    res.json({ success: true });
});

// Récupération des messages
app.get('/api/messages/:username', async (req, res) => {
    const cleanUser = req.params.username.toLowerCase().trim();
    const { data, error } = await supabase.from('messages').select('*').eq('recipient_username', cleanUser).order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: "Erreur de chargement." });
    res.json({ success: true, messages: data || [] });
});

// Webhook Maketou
app.post('/webhook-maketou', async (req, res) => {
    try {
        const username = req.query.username || req.body.username;
        if (username) {
            return res.redirect(`https://hushnote-a.onrender.com?user=${username}&unlocked=true`);
        }
        res.redirect(`https://hushnote-a.onrender.com`);
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
