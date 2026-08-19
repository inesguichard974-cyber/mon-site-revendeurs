// =============================================================
// CONFIGURATION & SÉCURITÉ
// Empreinte SHA-256 pour le mot de passe "0211@"
// =============================================================
const PASSWORD_HASH = "e8cf1689ea523588fa8e202570077ca827f8d689b25547071db136894c7b802e";
const AUTH_KEY = "auth_labyrinthe_token";

let allRevendeurs = [];

// Fonction de hachage SHA-256
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================
// VÉRIFICATION D'AUTHENTIFICATION AU DÉMARRAGE
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    // Récupération du jeton mémorisé sur l'ordinateur
    let savedToken = null;
    try {
        savedToken = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    } catch (e) {
        console.warn("Stockage local inaccessible :", e);
    }

    if (savedToken === PASSWORD_HASH) {
        // Déjà connecté -> on masque l'écran de connexion et on charge
        if (loginOverlay) loginOverlay.style.display = 'none';
        loadData();
    } else {
        // Non connecté -> on affiche l'écran de mot de passe
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (passwordInput) passwordInput.focus();
    }

    // Gestion de la soumission du mot de passe
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = passwordInput.value.trim();
            const inputHash = await sha256(inputVal);

            if (inputHash === PASSWORD_HASH || inputVal === "0211@") {
                try {
                    localStorage.setItem(AUTH_KEY, PASSWORD_HASH);
                    sessionStorage.setItem(AUTH_KEY, PASSWORD_HASH);
                } catch (err) {
                    console.error("Erreur de sauvegarde locale :", err);
                }

                if (loginOverlay) loginOverlay.style.display = 'none';
                if (loginError) loginError.style.display = 'none';
                loadData();
            } else {
                if (loginError) loginError.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
});

// =============================================================
// CHARGEMENT DU FICHIER CSV (Compatible GitHub Pages)
// =============================================================
async function loadData() {
    const csvPaths = ['./revendeurs.csv', 'revendeurs.csv', './Revendeurs.csv', 'Revendeurs.csv'];
    let csvData = null;

    for (const path of csvPaths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                csvData = await response.text();
                break;
            }
        } catch (e) {
            // Essaie l'alternative
        }
    }

    if (!csvData) {
        const grid = document.getElementById('grid-revendeurs');
        if (grid) {
            grid.innerHTML = `
                <div class="no-result">
                    <p><strong>Fichier revendeurs.csv introuvable sur GitHub Pages.</strong></p>
                    <small>Vérifiez que le fichier se nomme bien <code>revendeurs.csv</code> dans votre dépôt GitHub.</small>
                </div>
            `;
        }
        return;
    }

    parseAndDisplayCSV(csvData);
}

function parseAndDisplayCSV(data) {
    const rows = data.split(/\r?\n/);
    const firstRow = rows[0] || "";
    const separator = firstRow.includes(';') ? ';' : ',';

    allRevendeurs = rows
        .map(row => row.trim())
        .filter(row => row !== "" && !row.toUpperCase().startsWith("CODE;"))
        .map(row => {
            const cols = row.split(separator);
            return {
                code: cols[0]?.trim() || "",
                nom: cols[1]?.trim() || "Inconnu",
                cp: cols[2]?.trim() || "",
                ville: cols[3]?.trim() || "",
                zone: cols[4]?.trim() || "NC",
                produits: cols[5]?.trim() || "Thé",
                statut: cols[6]?.trim() || "",
                type: cols[7]?.trim() || "",
                note: cols[8]?.trim() || ""
            };
        })
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

    setupCityFilter();
    setupEvents();
    updateDisplay();
}

// =============================================================
// FILTRES ET ÉVÉNEMENTS
// =============================================================
function setupEvents() {
    ['searchInput', 'zoneFilter', 'cityFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateDisplay);
            el.addEventListener('change', updateDisplay);
        }
    });
}

function setupCityFilter() {
    const citySelect = document.getElementById('cityFilter');
    if (!citySelect) return;

    citySelect.innerHTML = '<option value="toutes">Toutes les villes</option>';

    const uniqueCities = [...new Set(allRevendeurs.map(r => r.ville).filter(v => v && v.length > 0))]
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    uniqueCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

function updateDisplay() {
    const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    const zone = document.getElementById('zoneFilter')?.value || "tous";
    const city = document.getElementById('cityFilter')?.value || "toutes";

    const filtered = allRevendeurs.filter(r => {
        const matchesSearch = r.nom.toLowerCase().includes(search) || 
                              r.produits.toLowerCase().includes(search) ||
                              r.ville.toLowerCase().includes(search) ||
                              r.cp.toLowerCase().includes(search) ||
                              r.type.toLowerCase().includes(search);

        const matchesZone = (zone === "tous") || (r.zone.toLowerCase() === zone.toLowerCase());
        const matchesCity = (city === "toutes") || (r.ville.toLowerCase() === city.toLowerCase());

        return matchesSearch && matchesZone && matchesCity;
    });

    render(filtered);
}

// =============================================================
// RENDU DES CARTES
// =============================================================
function render(list) {
    const grid = document.getElementById('grid-revendeurs');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `<p class="no-result">Aucun revendeur ne correspond à votre recherche.</p>`;
        return;
    }

    grid.innerHTML = list.map(r => `
        <article class="card">
            <div class="card-header">
                <span class="card-tag">${r.zone}</span>
                <h3>${r.nom}</h3>
            </div>
            <div class="card-body">
                <p><i class="fa-solid fa-location-dot"></i> ${r.cp} ${r.ville}</p>
                <div class="card-footer">
                    <strong>Produits :</strong> ${r.produits}
                </div>
            </div>
        </article>
    `).join('');
}
