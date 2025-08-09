// script.js

// URL API backend (adapter si besoin)
const API_BASE_URL = 'https://aiguilog-server.onrender.com/api';

// ------------------------------------
// Utilisateur (connexion / création)
// ------------------------------------

const userKey = 'aiguilog_user'; // clé localStorage

// Elements communs
const elLoginForm = document.getElementById('login-form');
const elBtnCreerCompte = document.getElementById('btn-creer-compte');
const elLogoutBtn = document.getElementById('logout');
const elInfoMembre = document.getElementById('info-membre');
const elTitreBienvenue = document.getElementById('titre-bienvenue');

// Vérifier si connecté (localStorage)
function getUserFromStorage() {
  const raw = localStorage.getItem(userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(userKey);
    return null;
  }
}

function saveUserToStorage(user) {
  localStorage.setItem(userKey, JSON.stringify(user));
}

function clearUserStorage() {
  localStorage.removeItem(userKey);
}

function isLoggedIn() {
  return !!getUserFromStorage();
}

// Rediriger si pas connecté
function redirectIfNotLoggedIn() {
  if (!isLoggedIn()) {
    window.location.href = 'utilisateur.html';
  }
}

// Afficher info utilisateur sur page mon-compte.html
function displayUserInfo() {
  const user = getUserFromStorage();
  if (!user) {
    elInfoMembre.textContent = "Vous n'êtes pas connecté.";
    return;
  }
  elTitreBienvenue.textContent = `Bienvenue, ${user.username} !`;
  elInfoMembre.textContent = `Identifiant : ${user.username}`;
}

// Gérer déconnexion
if (elLogoutBtn) {
  elLogoutBtn.addEventListener('click', () => {
    clearUserStorage();
    window.location.href = 'utilisateur.html';
  });
}

// ------------------------------------
// Gestion formulaire connexion / création
// ------------------------------------

if (elLoginForm) {
  elLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) return alert("Veuillez remplir tous les champs.");

    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Erreur lors de la connexion');
        return;
      }
      saveUserToStorage({ username, token: data.token });
      window.location.href = 'acceuil-connecte.html';
    } catch (err) {
      alert("Erreur serveur. Réessayez plus tard.");
      console.error(err);
    }
  });
}

// Bouton créer compte sur page connexion
if (elBtnCreerCompte) {
  elBtnCreerCompte.addEventListener('click', () => {
    window.location.href = 'creer-compte.html';
  });
}

// ------------------------------------
// Gestion création compte (page creer-compte.html)
// ------------------------------------

const elCreateForm = document.getElementById('create-account-form');
if (elCreateForm) {
  elCreateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('create-username').value.trim();
    const password = document.getElementById('create-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (!username || !password || !confirmPassword) return alert("Veuillez remplir tous les champs.");
    if (password !== confirmPassword) return alert("Les mots de passe ne correspondent pas.");

    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Erreur lors de la création du compte');
        return;
      }
      alert('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
      window.location.href = 'utilisateur.html';
    } catch (err) {
      alert("Erreur serveur. Réessayez plus tard.");
      console.error(err);
    }
  });
}

// ------------------------------------
// Gestion sorties (à faire et faites)
// ------------------------------------

// Vérifie que la page est bien protégée (redirige si pas connecté)
if (document.body.classList.contains('page-protegee')) {
  redirectIfNotLoggedIn();
}

// Fonction pour récupérer le token (pour appel API)
function getToken() {
  const user = getUserFromStorage();
  return user ? user.token : null;
}

// Gérer les cotations selon méthode (exemple)
const cotationsMap = {
  Alpinisme: ['F', 'PD', 'AD', 'D', 'TD', 'ED'],
  Randonnée: ['Facile', 'Moyen', 'Difficile'],
  Escalade: ['3', '4', '5', '6', '7', '8', '9'],
};

function updateCotationOptions(selectEl, methode) {
  selectEl.innerHTML = '<option value="" disabled selected>Cotation</option>';
  if (!methode || !cotationsMap[methode]) return;
  cotationsMap[methode].forEach(cot => {
    const option = document.createElement('option');
    option.value = cot;
    option.textContent = cot;
    selectEl.appendChild(option);
  });
}

// Remplir select année (dernières 30 années)
function fillYearSelect(selectEl) {
  const currentYear = new Date().getFullYear();
  selectEl.innerHTML = '<option value="" disabled selected>Année</option>';
  for (let y = currentYear; y >= currentYear - 30; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    selectEl.appendChild(option);
  }
}

// Gestion formulaire sorties à faire
const formAFaire = document.getElementById('form-a-faire');
const tbodyAFaire = document.getElementById('table-body-afaire');
if (formAFaire) {
  const selectCotation = formAFaire.querySelector('#cotation');
  const selectMethode = formAFaire.querySelector('#methode');
  const selectYear = formAFaire.querySelector('#year');
  fillYearSelect(selectYear);

  selectMethode.addEventListener('change', () => {
    updateCotationOptions(selectCotation, selectMethode.value);
  });

  formAFaire.addEventListener('submit', e => {
    e.preventDefault();

    const data = {
      sommet: formAFaire.sommet.value.trim(),
      altitude: parseInt(formAFaire.altitude.value),
      denivele: parseInt(formAFaire.denivele.value),
      methode: formAFaire.methode.value,
      cotation: formAFaire.cotation.value,
      annee: formAFaire.year.value,
      details: formAFaire.details.value.trim(),
    };

    if (!data.sommet || !data.altitude || !data.denivele || !data.methode || !data.cotation || !data.annee) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // TODO: Envoi vers API backend ici (exemple)
    // fetch(`${API_BASE_URL}/sorties/a-faire`, { ... })

    // Pour l'instant, stockage local (remplacer par API)
    let sorties = JSON.parse(localStorage.getItem('sortiesAFaire')) || [];
    sorties.push(data);
    localStorage.setItem('sortiesAFaire', JSON.stringify(sorties));

    formAFaire.reset();
    updateTableAFaire();
  });

  function updateTableAFaire() {
    let sorties = JSON.parse(localStorage.getItem('sortiesAFaire')) || [];
    tbodyAFaire.innerHTML = '';
    sorties.forEach((sortie, i) => {
      const tr = document.createElement('tr');

      // Col action (ex: supprimer)
      const tdAction = document.createElement('td');
      const btnSuppr = document.createElement('button');
      btnSuppr.textContent = 'Supprimer';
      btnSuppr.addEventListener('click', () => {
        sorties.splice(i, 1);
        localStorage.setItem('sortiesAFaire', JSON.stringify(sorties));
        updateTableAFaire();
      });
      tdAction.appendChild(btnSuppr);
      tr.appendChild(tdAction);

      // Autres colonnes
      ['sommet', 'altitude', 'denivele', 'methode', 'cotation', 'annee', 'details'].forEach(field => {
        const td = document.createElement('td');
        td.textContent = sortie[field] || '';
        tr.appendChild(td);
      });

      tbodyAFaire.appendChild(tr);
    });
  }

  updateTableAFaire();
}

// Gestion formulaire sorties faites
const formFait = document.getElementById('form-fait');
const tbodyFait = document.getElementById('table-body-fait');
if (formFait) {
  const selectCotation = formFait.querySelector('#cotation-fait');
  const selectMethode = formFait.querySelector('#methode-fait');
  const inputDate = formFait.querySelector('#date');

  selectMethode.addEventListener('change', () => {
    updateCotationOptions(selectCotation, selectMethode.value);
  });

  formFait.addEventListener('submit', e => {
    e.preventDefault();

    const data = {
      sommet: formFait['sommet-fait'].value.trim(),
      altitude: parseInt(formFait['altitude-fait'].value),
      denivele: parseInt(formFait['denivele-fait'].value),
      methode: formFait['methode-fait'].value,
      cotation: formFait['cotation-fait'].value,
      date: inputDate.value,
      details: formFait['details-fait'].value.trim(),
    };

    if (!data.sommet || !data.altitude || !data.denivele || !data.methode || !data.cotation || !data.date) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // TODO: Envoi vers API backend ici

    let sorties = JSON.parse(localStorage.getItem('sortiesFaites')) || [];
    sorties.push(data);
    localStorage.setItem('sortiesFaites', JSON.stringify(sorties));

    formFait.reset();
    updateTableFait();
  });

  function updateTableFait() {
    let sorties = JSON.parse(localStorage.getItem('sortiesFaites')) || [];
    tbodyFait.innerHTML = '';
    sorties.forEach((sortie, i) => {
      const tr = document.createElement('tr');

      // Col action
      const tdAction = document.createElement('td');
      const btnSuppr = document.createElement('button');
      btnSuppr.textContent = 'Supprimer';
      btnSuppr.addEventListener('click', () => {
        sorties.splice(i, 1);
        localStorage.setItem('sortiesFaites', JSON.stringify(sorties));
        updateTableFait();
      });
      tdAction.appendChild(btnSuppr);
      tr.appendChild(tdAction);

      // Autres colonnes
      ['sommet', 'altitude', 'denivele', 'methode', 'cotation', 'date', 'details'].forEach(field => {
        const td = document.createElement('td');
        td.textContent = sortie[field] || '';
        tr.appendChild(td);
      });

      tbodyFait.appendChild(tr);
    });
  }

  updateTableFait();
}

// ------------------------------------
// Page accueil connectée : message personnalisé
// ------------------------------------

const elAccueilConnecte = document.getElementById('accueil-connecte-message');
if (elAccueilConnecte) {
  const user = getUserFromStorage();
  if (user) {
    elAccueilConnecte.textContent = `Bienvenue sur Aiguilog, ${user.username} ! Votre carnet de sorties en montagne, tout simplement.`;
  }
}

// ------------------------------------
// Autres fonctions utilitaires si besoin
// ------------------------------------
