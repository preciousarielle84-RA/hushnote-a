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

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });

    const cleanUser = username.toLowerCase().trim();
    const { data, error } = await supabase.from('users').insert([{ username: cleanUser, password }]).select();

    if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris." });
        return res.status(500).json({ error: "Erreur lors de l'inscription." });
    }
    res.json({ success: true, user: data[0] });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const cleanUser = username.toLowerCase().trim();

    const { data, error } = await supabase.from('users').select('*').eq('username', cleanUser).eq('password', password);

    if (error || !data || data.length === 0) {
        return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }
    res.json({ success: true, user: data[0] });
});

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

app.get('/api/messages/:username', async (req, res) => {
    const cleanUser = req.params.username.toLowerCase().trim();
    const { data, error } = await supabase.from('messages').select('*').eq('recipient_username', cleanUser).order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: "Erreur de chargement." });
    res.json({ success: true, messages: data });
});

app.post('/webhook-maketou', async (req, res) => {
    try {
        const username = req.query.username || req.body.username;
        if (username) {
            await supabase.from('users').update({ is_subscribed: true }).eq('username', username.toLowerCase().trim());
            return res.redirect(`https://hushnote-a.onrender.com?user=${username}&unlocked=true`);
        }
        res.redirect(`https://hushnote-a.onrender.com`);
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
