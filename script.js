// =============================================================
// CONFIGURATION & SÉCURITÉ
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
// GESTION CONNEXION PERSISTANTE
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    let savedToken = null;
    try {
        savedToken = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    } catch (e) {}

    if (savedToken === PASSWORD_HASH) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        loadData();
    } else {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (passwordInput) passwordInput.focus();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = passwordInput.value.trim();
            const inputHash = await sha256(inputVal);

            if (inputHash === PASSWORD_HASH || inputVal === "0211@") {
                try {
                    localStorage.setItem(AUTH_KEY, PASSWORD_HASH);
                    sessionStorage.setItem(AUTH_KEY, PASSWORD_HASH);
                } catch (err) {}

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
// CHARGEMENT ET PARSING INTELLIGENT DU CSV
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
        } catch (e) {}
    }

    if (!csvData) {
        const grid = document.getElementById('grid-revendeurs');
        if (grid) {
            grid.innerHTML = `<p class="no-result">Fichier revendeurs.csv introuvable.</p>`;
        }
        return;
    }

    parseDynamicCSV(csvData);
}

function parseDynamicCSV(data) {
    const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return;

    // Détection du séparateur (; ou ,)
    const separator = lines[0].includes(';') ? ';' : ',';
    
    // Lecture des en-têtes (ligne 1)
    const headers = lines[0].split(separator).map(h => h.trim().toUpperCase());

    // Recherche automatique de l'index de chaque colonne par mot-clé
    const idxNom = headers.findIndex(h => h === "NOM" || h.includes("ENSEIGNE") || h.includes("REVENDEUR"));
    const idxCP = headers.findIndex(h => h.includes("POSTAL") || h === "CP");
    const idxVille = headers.findIndex(h => h.includes("COMMUNE") || h.includes("VILLE"));
    const idxZone = headers.findIndex(h => h.includes("ZONE") || h.includes("SECTEUR"));
    const idxProduits = headers.findIndex(h => h.includes("PRODUIT"));
    const idxType = headers.findIndex(h => h.includes("TYPE"));

    // Traitement des lignes de données (à partir de la 2e ligne)
    allRevendeurs = lines.slice(1).map(line => {
        const cols = line.split(separator);

        return {
            nom: (idxNom !== -1 ? cols[idxNom] : cols[1])?.trim() || "Inconnu",
            cp: (idxCP !== -1 ? cols[idxCP] : cols[2])?.trim() || "",
            ville: (idxVille !== -1 ? cols[idxVille] : cols[3])?.trim() || "",
            zone: (idxZone !== -1 ? cols[idxZone] : cols[4])?.trim() || "NC",
            produits: (idxProduits !== -1 ? cols[idxProduits] : cols[5])?.trim() || "Thé",
            type: (idxType !== -1 ? cols[idxType] : "")?.trim() || ""
        };
    })
    .filter(r => r.nom !== "Inconnu" && !r.nom.toUpperCase().includes("LISTE"))
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

    // Liste unique et propre des VILLES (non vides et sans chiffres)
    const uniqueCities = [...new Set(
        allRevendeurs
            .map(r => r.ville)
            .filter(v => v && isNaN(v.trim())) // Empêche d'ajouter des codes postaux par erreur
    )].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

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
                              r.cp.includes(search);

        const matchesZone = (zone === "tous") || (r.zone.toLowerCase() === zone.toLowerCase());
        const matchesCity = (city === "toutes") || (r.ville.toLowerCase() === city.toLowerCase());

        return matchesSearch && matchesZone && matchesCity;
    });

    render(filtered);
}

// =============================================================
// RENDU VISUEL DES CARTES
// =============================================================
function render(list) {
    const grid = document.getElementById('grid-revendeurs');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `<p class="no-result">Aucun revendeur ne correspond à vos critères.</p>`;
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
