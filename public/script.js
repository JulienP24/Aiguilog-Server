// script.js

// --- Données exemples pour cotations et années ---
const cotations = {
  Alpinisme: ["F", "PD", "AD", "D", "TD", "ED"],
  Randonnée: ["F", "P", "M", "D"],
  Escalade: ["3", "4", "5", "6a", "6b", "6c", "7a", "7b"]
};

const currentYear = new Date().getFullYear();
const years = [];
for (let y = currentYear; y >= 1950; y--) {
  years.push(y);
}

// --- UTILITAIRES ---

function $(id) {
  return document.getElementById(id);
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// --- SESSION UTILISATEUR ---

function getLoggedUser() {
  return loadFromStorage('loggedUser');
}

function setLoggedUser(username) {
  saveToStorage('loggedUser', username);
}

function clearLoggedUser() {
  localStorage.removeItem('loggedUser');
}

function getUsers() {
  return loadFromStorage('users') || [];
}

function saveUsers(users) {
  saveToStorage('users', users);
}

// --- PROTECTION DES PAGES ---

function checkAuth() {
  const logged = getLoggedUser();
  const protectedPages = ['sorties-faites.html', 'sorties-a-faire.html', 'mon-compte.html'];
  const page = window.location.pathname.split('/').pop();

  if (protectedPages.includes(page) && !logged) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "utilisateur.html";
  }
}

// --- NAVIGATION MOBILE ---

function setupMobileMenu() {
  const toggleBtn = $('mobile-menu-toggle');
  const menu = $('mobile-menu');
  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener('click', () => {
    menu.classList.toggle('open');
    toggleBtn.setAttribute(
      'aria-label',
      menu.classList.contains('open') ? 'Fermer le menu' : 'Ouvrir le menu'
    );
  });

  // Close menu on link click (optional)
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggleBtn.setAttribute('aria-label', 'Ouvrir le menu');
    });
  });
}

// --- FORMULAIRES D'AJOUT ---

// Remplit le select cotation selon la méthode choisie
function fillCotationSelect(selectId, methodeId) {
  const cotationSelect = $(selectId);
  const methodeSelect = $(methodeId);
  if (!cotationSelect || !methodeSelect) return;

  methodeSelect.addEventListener('change', () => {
    const methode = methodeSelect.value;
    cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
    if (cotations[methode]) {
      cotations[methode].forEach(cot => {
        const opt = document.createElement('option');
        opt.value = cot;
        opt.textContent = cot;
        cotationSelect.appendChild(opt);
      });
    }
  });
}

// Remplit la liste des années dans un select
function fillYearSelect(selectId) {
  const yearSelect = $(selectId);
  if (!yearSelect) return;

  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

// --- GESTION LISTES (À FAIRE ET FAIT) ---

function renderTable(bodyId, dataList, isFait) {
  const tbody = $(bodyId);
  if (!tbody) return;

  tbody.innerHTML = '';
  dataList.forEach((item, index) => {
    const tr = document.createElement('tr');

    // Actions: Edit / Delete buttons
    const tdActions = document.createElement('td');
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️';
    btnEdit.title = 'Modifier';
    btnEdit.type = 'button';
    btnEdit.addEventListener('click', () => editEntry(index, isFait));
    tdActions.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.textContent = '🗑️';
    btnDelete.title = 'Supprimer';
    btnDelete.type = 'button';
    btnDelete.addEventListener('click', () => deleteEntry(index, isFait));
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdActions);

    // Sommet
    const tdSommet = document.createElement('td');
    tdSommet.textContent = item.sommet;
    tr.appendChild(tdSommet);

    // Altitude
    const tdAltitude = document.createElement('td');
    tdAltitude.textContent = item.altitude;
    tr.appendChild(tdAltitude);

    // Dénivelé
    const tdDenivele = document.createElement('td');
    tdDenivele.textContent = item.denivele;
    tr.appendChild(tdDenivele);

    // Méthode
    const tdMethode = document.createElement('td');
    tdMethode.textContent = item.methode;
    tr.appendChild(tdMethode);

    // Cotation
    const tdCotation = document.createElement('td');
    tdCotation.textContent = item.cotation;
    tr.appendChild(tdCotation);

    // Année ou Date
    const tdYearDate = document.createElement('td');
    if (isFait) {
      tdYearDate.textContent = item.date || '';
    } else {
      tdYearDate.textContent = item.year || '';
    }
    tr.appendChild(tdYearDate);

    // Détails
    const tdDetails = document.createElement('td');
    tdDetails.textContent = item.details || '';
    tr.appendChild(tdDetails);

    tbody.appendChild(tr);
  });
}

function getDataList(isFait) {
  const logged = getLoggedUser();
  if (!logged) return [];
  const key = `user_${logged}_${isFait ? 'fait' : 'afaire'}`;
  return loadFromStorage(key) || [];
}

function saveDataList(isFait, list) {
  const logged = getLoggedUser();
  if (!logged) return;
  const key = `user_${logged}_${isFait ? 'fait' : 'afaire'}`;
  saveToStorage(key, list);
}

function addEntry(data, isFait) {
  const list = getDataList(isFait);
  list.push(data);
  saveDataList(isFait, list);
  renderTable(isFait ? 'table-body-fait' : 'table-body-afaire', list, isFait);
}

function editEntry(index, isFait) {
  const list = getDataList(isFait);
  const item = list[index];
  if (!item) return;

  // Remplir le formulaire avec les données de l'élément à modifier
  if (isFait) {
    $('sommet-fait').value = item.sommet;
    $('altitude-fait').value = item.altitude;
    $('denivele-fait').value = item.denivele;
    $('methode-fait').value = item.methode;
    // Déclenche la mise à jour de cotation
    const event = new Event('change');
    $('methode-fait').dispatchEvent(event);
    $('cotation-fait').value = item.cotation;
    $('date').value = item.date || '';
    $('details-fait').value = item.details || '';
    editingIndexFait = index;
  } else {
    $('sommet').value = item.sommet;
    $('altitude').value = item.altitude;
    $('denivele').value = item.denivele;
    $('methode').value = item.methode;
    const event = new Event('change');
    $('methode').dispatchEvent(event);
    $('cotation').value = item.cotation;
    $('year').value = item.year || '';
    $('details').value = item.details || '';
    editingIndexAf = index;
  }

  // Change le bouton submit en mode "modifier"
  const formId = isFait ? 'form-fait' : 'form-a-faire';
  const form = $(formId);
  if (form) {
    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.textContent = 'Modifier';
  }
}

function deleteEntry(index, isFait) {
  if (!confirm("Confirmer la suppression ?")) return;
  const list = getDataList(isFait);
  list.splice(index, 1);
  saveDataList(isFait, list);
  renderTable(isFait ? 'table-body-fait' : 'table-body-afaire', list, isFait);
}

// --- GESTION DES FORMULAIRES ---

let editingIndexFait = -1;
let editingIndexAf = -1;

function setupForm(formId, isFait) {
  const form = $(formId);
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Récupérer les valeurs
    const sommet = $(isFait ? 'sommet-fait' : 'sommet').value.trim();
    const altitude = $(isFait ? 'altitude-fait' : 'altitude').value.trim();
    const denivele = $(isFait ? 'denivele-fait' : 'denivele').value.trim();
    const methode = $(isFait ? 'methode-fait' : 'methode').value;
    const cotation = $(isFait ? 'cotation-fait' : 'cotation').value;
    const details = $(isFait ? 'details-fait' : 'details').value.trim();

    // Année ou Date selon le cas
    let year = '';
    let date = '';
    if (isFait) {
      date = $('date').value;
      if (!date) {
        alert("Veuillez renseigner la date.");
        return;
      }
    } else {
      year = $('year').value;
      if (!year) {
        alert("Veuillez renseigner l'année.");
        return;
      }
    }

    // Validation simple
    if (!sommet || !altitude || !denivele || !methode || !cotation) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const dataEntry = {
      sommet,
      altitude: Number(altitude),
      denivele: Number(denivele),
      methode,
      cotation,
      details
    };
    if (isFait) dataEntry.date = date;
    else dataEntry.year = year;

    // Ajouter ou modifier
    if (isFait) {
      if (editingIndexFait >= 0) {
        const list = getDataList(true);
        list[editingIndexFait] = dataEntry;
        saveDataList(true, list);
        editingIndexFait = -1;
        form.querySelector('button[type=submit]').textContent = 'Ajouter';
      } else {
        addEntry(dataEntry, true);
      }
      renderTable('table-body-fait', getDataList(true), true);
      form.reset();
    } else {
      if (editingIndexAf >= 0) {
        const list = getDataList(false);
        list[editingIndexAf] = dataEntry;
        saveDataList(false, list);
        editingIndexAf = -1;
        form.querySelector('button[type=submit]').textContent = 'Ajouter';
      } else {
        addEntry(dataEntry, false);
      }
      renderTable('table-body-afaire', getDataList(false), false);
      form.reset();
    }
  });
}

// --- CONNEXION & INSCRIPTION ---

function handleRegister() {
  const form = $('register-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const firstname = $('register-firstname').value.trim();
    const lastname = $('register-lastname').value.trim();
    const username = $('register-username').value.trim();
    const password = $('register-password').value;
    const birthdate = $('register-birthdate').value;

    if (!firstname || !lastname || !username || !password || !birthdate) {
      alert("Tous les champs sont obligatoires.");
      return;
    }

    let users = getUsers();
    if (users.find(u => u.username === username)) {
      alert("Cet identifiant existe déjà.");
      return;
    }

    users.push({ firstname, lastname, username, password, birthdate });
    saveUsers(users);
    alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    window.location.href = "utilisateur.html";
  });
}

function handleLogin() {
  const form = $('login-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const username = $('login-username').value.trim();
    const password = $('login-password').value;

    if (!username || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      alert("Identifiant ou mot de passe incorrect.");
      return;
    }

    setLoggedUser(username);
    alert(`Bienvenue ${user.firstname} !`);
    window.location.href = "mon-compte.html";
  });
}

// --- PAGE MON COMPTE ---

function loadAccountInfo() {
  const logged = getLoggedUser();
  if (!logged) {
    // Si non connecté, rediriger vers connexion
    window.location.href = "utilisateur.html";
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.username === logged);
  if (!user) {
    clearLoggedUser();
    window.location.href = "utilisateur.html";
    return;
  }

  const titre = $('titre-bienvenue');
  const info = $('info-membre');
  if (titre) titre.textContent = `Bienvenue ${user.firstname} ${user.lastname}`;
  if (info) {
    info.innerHTML = `
      <strong>Identifiant:</strong> ${user.username}<br/>
      <strong>Date de naissance:</strong> ${user.birthdate}
    `;
  }

  const btnLogout = $('logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      clearLoggedUser();
      window.location.href = "index.html";
    });
  }
}

// --- PAGE ACCUEIL ---

function setupAccueilButtons() {
  const btnLogin = $('btn-go-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      window.location.href = "utilisateur.html";
    });
  }

  // Ajout du lien "Créer un compte" sous le bouton
  const container = document.querySelector('.container');
  if (container) {
    const creerCompteLink = document.createElement('p');
    creerCompteLink.innerHTML = `Pas encore de compte ? <a href="creer-compte.html">Créer un compte</a>`;
    container.appendChild(creerCompteLink);
  }
}

// --- INIT ---

function init() {
  checkAuth();
  setupMobileMenu();

  const page = window.location.pathname.split('/').pop();

  // Cotation & Année selects (sur pages sorties)
  if (page === 'sorties-a-faire.html') {
    fillCotationSelect('cotation', 'methode');
    fillYearSelect('year');
    setupForm('form-a-faire', false);
    renderTable('table-body-afaire', getDataList(false), false);
  } else if (page === 'sorties-faites.html') {
    fillCotationSelect('cotation-fait', 'methode-fait');
    // Pour "fait", on a un champ date (input type date), pas année
    setupForm('form-fait', true);
    renderTable('table-body-fait', getDataList(true), true);
  } else if (page === 'creer-compte.html') {
    handleRegister();
  } else if (page === 'utilisateur.html') {
    handleLogin();
    setupAccueilButtons();
  } else if (page === 'mon-compte.html') {
    loadAccountInfo();
  } else if (page === 'index.html' || page === '') {
    setupAccueilButtons();
  }
}

window.addEventListener('DOMContentLoaded', init);
