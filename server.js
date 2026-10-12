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

// Servir les fichiers statiques (index.html)
app.use(express.static('.'));

// Route Webhook appelée par Maketou après paiement
app.post('/webhook-maketou', async (req, res) => {
    try {
        // Génération d'un code unique aléatoire (ex: HK-8F3A2)
        const randomCode = 'HK-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        // Insertion du code dans Supabase
        const { data, error } = await supabase
            .from('access_codes')
            .insert([{ code: randomCode, is_used: false }]);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur lors de la création du code' });
        }

        // Redirection vers le site avec le code dans l'URL pour déverrouillage automatique
        res.redirect(`https://hushnote-a.onrender.com?code=${randomCode}`);
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur Hushnote actif sur le port ${PORT}`));
