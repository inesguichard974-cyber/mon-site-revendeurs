const motDePasse = "0211@";
const acces = prompt("Veuillez entrer le mot de passe pour accéder à l'annuaire :");

if (acces !== motDePasse) {
    alert("Accès refusé");
    document.body.innerHTML = "<h1>Accès non autorisé</h1>";
} else {
    let allRevendeurs = [];

    document.addEventListener('DOMContentLoaded', () => {
        fetch('revendeurs.csv')
            .then(response => response.text())
            .then(data => {
                const rows = data.split('\n');
                const separator = rows[0].includes(';') ? ';' : ',';

                // ✅ CORRECTION : On ignore la ligne d'en-tête ET les lignes vides
                allRevendeurs = rows
                    .slice(1) // Ignore la première ligne (en-têtes)
                    .filter(row => row.trim() !== "")
                    .map(row => {
                        const cols = row.split(separator);
                        
                        // ✅ ADAPTATION AUX VRAIES POSITIONS DE VOS COLONNES
                        return {
                            code: cols[0]?.trim() || "",           // Code
                            nom: cols[1]?.trim() || "Inconnu",      // NOM
                            // cols[2] = Prénom (ignoré car vide)
                            cp: cols[3]?.trim() || "",              // Code postal
                            ville: cols[4]?.trim() || "",           // Commune
                            zone: cols[5]?.trim() || "NC",          // Zone
                            produits: cols[6]?.trim() || "Gamme Labyrinthe" // Produits
                        };
                    })
                    .filter(r => r.nom !== "Inconnu") // Supprime les lignes mal formées
                    .sort((a, b) => a.nom.localeCompare(b.nom));

                console.log("✅ Revendeurs chargés :", allRevendeurs.length);
                setupCityFilter();
                updateDisplay();
            })
            .catch(error => {
                console.error("❌ Erreur chargement CSV :", error);
                document.getElementById('grid-revendeurs').innerHTML = 
                    `<p class="no-result">Erreur de chargement du fichier CSV</p>`;
            });

        ['searchInput', 'zoneFilter', 'cityFilter'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateDisplay);
        });
    });

    // Crée dynamiquement la liste des villes à partir du CSV
    function setupCityFilter() {
        const citySelect = document.getElementById('cityFilter');
        const uniqueCities = [...new Set(allRevendeurs.map(r => r.ville))]
            .filter(city => city) // Supprime les villes vides
            .sort();

        uniqueCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }

    function updateDisplay() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const zone = document.getElementById('zoneFilter').value;
        const city = document.getElementById('cityFilter').value;

        let filtered = allRevendeurs.filter(r => {
            const matchesSearch = r.nom.toLowerCase().includes(search);
            const matchesZone = zone === "tous" || r.zone === zone;
            const matchesCity = city === "toutes" || r.ville === city;

            return matchesSearch && matchesZone && matchesCity;
        });

        render(filtered);
    }

    function render(list) {
        const grid = document.getElementById('grid-revendeurs');
        if (list.length === 0) {
            grid.innerHTML = `<p class="no-result">Aucun revendeur ne correspond à ces critères.</p>`;
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
}
