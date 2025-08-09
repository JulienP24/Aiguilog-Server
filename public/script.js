"use strict";

// === UTILS ===

// Accès localStorage en JSON avec fallback
const storageGet = (key) => {
  const val = localStorage.getItem(key);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

const storageSet = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

const storageRemove = (key) => {
  localStorage.removeItem(key);
};

// Générer liste années récentes (2000 à aujourd'hui)
function generateYears(start = 2000) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= start; y--) {
    years.push(y);
  }
  return years;
}

// Cotations selon méthode
const cotationsByMethod = {
  Alpinisme: ["F", "PD", "AD", "D", "TD", "ED"],
  Randonnée: ["Facile", "Moyen", "Difficile"],
  Escalade: ["3", "4", "5", "6", "7", "8", "9"],
};

// === SESSION & UTILISATEUR ===

let currentUser = null;

function getSessionUser() {
  return sessionStorage.getItem("currentUser");
}

function setSessionUser(username) {
  sessionStorage.setItem("currentUser", username);
}

function clearSessionUser() {
  sessionStorage.removeItem("currentUser");
}

// Récupérer les données utilisateur
function getUserData(username) {
  return storageGet(`user_${username}`) || {
    comptes: { username },
    sortiesAFaire: [],
    sortiesFaites: [],
  };
}

function saveUserData(username, data) {
  storageSet(`user_${username}`, data);
}

// === NAVIGATION MOBILE ===

const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });

  // Fermer menu si clic sur lien
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
    });
  });
}

// === FORMULAIRES & LISTES DYNAMIQUES ===

// Remplit select cotation selon méthode sélectionnée
function updateCotationOptions(methodeSelect, cotationSelect) {
  const methode = methodeSelect.value;
  cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
  if (cotationsByMethod[methode]) {
    cotationsByMethod[methode].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      cotationSelect.appendChild(opt);
    });
  }
}

// Remplit select année (pour sorties à faire)
function fillYearSelect(yearSelect) {
  yearSelect.innerHTML = '<option value="" disabled selected>Année</option>';
  generateYears().forEach((year) => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });
}

// Remplit datalist sommets avec tous les sommets existants dans données de l’utilisateur
function fillSummitsDatalist(summitsListId, data) {
  const datalist = document.getElementById(summitsListId);
  if (!datalist) return;
  // Récupérer tous sommets uniques (faits + à faire)
  const sommets = new Set();
  data.sortiesAFaire.forEach((s) => sommets.add(s.sommet));
  data.sortiesFaites.forEach((s) => sommets.add(s.sommet));
  datalist.innerHTML = "";
  sommets.forEach((sommet) => {
    const option = document.createElement("option");
    option.value = sommet;
    datalist.appendChild(option);
  });
}

// === AFFICHAGE TABLEAUX & ÉDITION INLINE ===

// Crée une cellule editable avec événement sauvegarde sur blur ou enter
function createEditableCell(text, onSave) {
  const td = document.createElement("td");
  td.contentEditable = "true";
  td.classList.add("editable");
  td.textContent = text;

  td.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      td.blur();
    }
  });
  td.addEventListener("blur", () => {
    onSave(td.textContent.trim());
  });

  return td;
}

// Génère une ligne tableau sortie
function createRow(sortie, onChange, onDelete, isFait = false) {
  const tr = document.createElement("tr");

  // Actions
  const tdActions = document.createElement("td");
  const btnDelete = document.createElement("button");
  btnDelete.textContent = "🗑️";
  btnDelete.title = "Supprimer";
  btnDelete.style.cursor = "pointer";
  btnDelete.style.background = "none";
  btnDelete.style.border = "none";
  btnDelete.style.fontSize = "1.2rem";
  btnDelete.addEventListener("click", () => {
    if (confirm("Supprimer cette sortie ?")) {
      onDelete(sortie.id);
    }
  });
  tdActions.appendChild(btnDelete);
  tr.appendChild(tdActions);

  // Sommet editable
  tr.appendChild(createEditableCell(sortie.sommet, (val) => {
    sortie.sommet = val;
    onChange(sortie);
  }));

  // Altitude editable (numérique)
  tr.appendChild(createEditableCell(sortie.altitude, (val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) {
      sortie.altitude = num;
      onChange(sortie);
    } else {
      alert("Altitude invalide");
      // Reset à valeur précédente
      tr.cells[2].textContent = sortie.altitude;
    }
  }));

  // Dénivelé editable (numérique)
  tr.appendChild(createEditableCell(sortie.denivele, (val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) {
      sortie.denivele = num;
      onChange(sortie);
    } else {
      alert("Dénivelé invalide");
      tr.cells[3].textContent = sortie.denivele;
    }
  }));

  // Méthode editable via select in place
  const tdMethode = document.createElement("td");
  const selectMethode = document.createElement("select");
  Object.keys(cotationsByMethod).forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    selectMethode.appendChild(option);
  });
  selectMethode.value = sortie.methode;
  selectMethode.addEventListener("change", () => {
    sortie.methode = selectMethode.value;
    // Update cotation select options accordingly
    tdCotation.innerHTML = "";
    cotationsByMethod[sortie.methode].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      tdCotation.appendChild(opt);
    });
    tdCotation.value = sortie.cotation;
    onChange(sortie);
  });
  tdMethode.appendChild(selectMethode);
  tr.appendChild(tdMethode);

  // Cotation editable via select
  const tdCotation = document.createElement("td");
  const selectCotation = document.createElement("select");
  cotationsByMethod[sortie.methode].forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    selectCotation.appendChild(opt);
  });
  selectCotation.value = sortie.cotation;
  selectCotation.addEventListener("change", () => {
    sortie.cotation = selectCotation.value;
    onChange(sortie);
  });
  tdCotation.appendChild(selectCotation);
  tr.appendChild(tdCotation);

  // Date / Année
  const tdDate = document.createElement("td");
  if (isFait) {
    // Date input
    const inputDate = document.createElement("input");
    inputDate.type = "date";
    inputDate.value = sortie.date || "";
    inputDate.addEventListener("change", () => {
      sortie.date = inputDate.value;
      onChange(sortie);
    });
    tdDate.appendChild(inputDate);
  } else {
    // Année editable (number or select)
    const inputYear = document.createElement("input");
    inputYear.type = "number";
    inputYear.min = "1900";
    inputYear.max = new Date().getFullYear();
    inputYear.value = sortie.annee || "";
    inputYear.style.width = "5rem";
    inputYear.addEventListener("change", () => {
      const val = parseInt(inputYear.value);
      if (!isNaN(val) && val >= 1900 && val <= new Date().getFullYear()) {
        sortie.annee = val;
        onChange(sortie);
      } else {
        alert("Année invalide");
        inputYear.value = sortie.annee || "";
      }
    });
    tdDate.appendChild(inputYear);
  }
  tr.appendChild(tdDate);

  // Détails editable
  tr.appendChild(createEditableCell(sortie.details || "", (val) => {
    sortie.details = val;
    onChange(sortie);
  }));

  return tr;
}

// === GESTION SORTIES A FAIRE ===

function loadSortiesAFaire() {
  if (!currentUser) return;
  const data = getUserData(currentUser);
  fillSummitsDatalist("summits-list", data);
  fillYearSelect(document.getElementById("year"));

  const tbody = document.getElementById("table-body-afaire");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.sortiesAFaire.forEach((sortie) => {
    const tr = createRow(sortie, (updated) => {
      // Update sortie in data
      const index = data.sortiesAFaire.findIndex((s) => s.id === updated.id);
      if (index >= 0) {
        data.sortiesAFaire[index] = updated;
        saveUserData(currentUser, data);
      }
    }, (id) => {
      data.sortiesAFaire = data.sortiesAFaire.filter((s) => s.id !== id);
      saveUserData(currentUser, data);
      loadSortiesAFaire();
    }, false);
    tbody.appendChild(tr);
  });
}

// Ajoute une sortie à faire
function addSortieAFaire(event) {
  event.preventDefault();
  if (!currentUser) return alert("Veuillez vous connecter.");

  const sommet = document.getElementById("sommet").value.trim();
  const altitude = parseInt(document.getElementById("altitude").value);
  const denivele = parseInt(document.getElementById("denivele").value);
  const methode = document.getElementById("methode").value;
  const cotation = document.getElementById("cotation").value;
  const annee = parseInt(document.getElementById("year").value);
  const details = document.getElementById("details").value.trim();

  if (
    !sommet ||
    isNaN(altitude) ||
    altitude < 0 ||
    isNaN(denivele) ||
    denivele < 0 ||
    !methode ||
    !cotation ||
    isNaN(annee)
  ) {
    return alert("Veuillez remplir correctement tous les champs obligatoires.");
  }

  const data = getUserData(currentUser);

  const newSortie = {
    id: Date.now().toString(),
    sommet,
    altitude,
    denivele,
    methode,
    cotation,
    annee,
    details,
  };

  data.sortiesAFaire.push(newSortie);
  saveUserData(currentUser, data);

  // Reset form
  event.target.reset();
  // Remise à l'état initial du select cotation
  updateCotationOptions(document.getElementById("methode"), document.getElementById("cotation"));

  loadSortiesAFaire();
}

// === GESTION SORTIES FAITES ===

function loadSortiesFaites() {
  if (!currentUser) return;
  const data = getUserData(currentUser);
  fillSummitsDatalist("summits-list", data);

  const tbody = document.getElementById("table-body-fait");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.sortiesFaites.forEach((sortie) => {
    const tr = createRow(sortie, (updated) => {
      const index = data.sortiesFaites.findIndex((s) => s.id === updated.id);
      if (index >= 0) {
        data.sortiesFaites[index] = updated;
        saveUserData(currentUser, data);
      }
    }, (id) => {
      data.sortiesFaites = data.sortiesFaites.filter((s) => s.id !== id);
      saveUserData(currentUser, data);
      loadSortiesFaites();
    }, true);
    tbody.appendChild(tr);
  });
}

// Ajoute une sortie faite
function addSortieFaite(event) {
  event.preventDefault();
  if (!currentUser) return alert("Veuillez vous connecter.");

  const sommet = document.getElementById("sommet-fait").value.trim();
  const altitude = parseInt(document.getElementById("altitude-fait").value);
  const denivele = parseInt(document.getElementById("denivele-fait").value);
  const methode = document.getElementById("methode-fait").value;
  const cotation = document.getElementById("cotation-fait").value;
  const date = document.getElementById("date").value;
  const details = document.getElementById("details-fait").value.trim();

  if (
    !sommet ||
    isNaN(altitude) ||
    altitude < 0 ||
    isNaN(denivele) ||
    denivele < 0 ||
    !methode ||
    !cotation ||
    !date
  ) {
    return alert("Veuillez remplir correctement tous les champs obligatoires.");
  }

  const data = getUserData(currentUser);

  const newSortie = {
    id: Date.now().toString(),
    sommet,
    altitude,
    denivele,
    methode,
    cotation,
    date,
    details,
  };

  data.sortiesFaites.push(newSortie);
  saveUserData(currentUser, data);

  event.target.reset();
  updateCotationOptions(document.getElementById("methode-fait"), document.getElementById("cotation-fait"));

  loadSortiesFaites();
}

// === CONNEXION / CREATION DE COMPTE SIMPLIFIÉE ===

function initLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!username || !password) {
      return alert("Veuillez remplir tous les champs.");
    }

    // Simuler la connexion : chercher utilisateur dans localStorage
    const userData = getUserData(username);
    if (!userData || !userData.comptes) {
      return alert("Utilisateur non trouvé. Veuillez créer un compte.");
    }

    // Pour simplifier, stocker mdp en clair (pas sécurisé en vrai !)
    if (userData.comptes.password !== password) {
      return alert("Mot de passe incorrect.");
    }

    setSessionUser(username);
    alert(`Bienvenue ${username} !`);
    window.location.href = "mon-compte.html";
  });

  // Création compte bouton
  const btnCreate = document.getElementById("btn-creer-compte");
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      window.location.href = "creer-compte.html";
    });
  }
}

function initCreateAccountPage() {
  const form = document.getElementById("create-account-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("new-username").value.trim();
    const password = document.getElementById("new-password").value.trim();
    const passwordConfirm = document.getElementById("confirm-password").value.trim();

    if (!username || !password || !passwordConfirm) {
      return alert("Veuillez remplir tous les champs.");
    }
    if (password !== passwordConfirm) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    const userData = getUserData(username);
    if (userData && userData.comptes) {
      return alert("Ce nom d'utilisateur existe déjà.");
    }

    const newUser = {
      comptes: { username, password },
      sortiesAFaire: [],
      sortiesFaites: [],
    };

    saveUserData(username, newUser);
    alert("Compte créé avec succès, vous pouvez maintenant vous connecter.");
    window.location.href = "utilisateur.html"; // ou page de login
  });
}

function initMonComptePage() {
  if (!currentUser) {
    alert("Veuillez vous connecter.");
    window.location.href = "utilisateur.html";
    return;
  }

  // Afficher nom utilisateur
  const userNameDisplay = document.getElementById("user-name-display");
  if (userNameDisplay) {
    userNameDisplay.textContent = currentUser;
  }

  // Bouton déconnexion
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      clearSessionUser();
      window.location.href = "utilisateur.html";
    });
  }
}

// === INIT PAGE SELON URL ===

document.addEventListener("DOMContentLoaded", () => {
  currentUser = getSessionUser();

  // Initialiser select cotation selon méthode (form Sorties à faire)
  const methodeSelect = document.getElementById("methode");
  const cotationSelect = document.getElementById("cotation");
  if (methodeSelect && cotationSelect) {
    updateCotationOptions(methodeSelect, cotationSelect);
    methodeSelect.addEventListener("change", () => {
      updateCotationOptions(methodeSelect, cotationSelect);
    });
  }

  // Initialiser select cotation selon méthode (form Sorties faites)
  const methodeFaitSelect = document.getElementById("methode-fait");
  const cotationFaitSelect = document.getElementById("cotation-fait");
  if (methodeFaitSelect && cotationFaitSelect) {
    updateCotationOptions(methodeFaitSelect, cotationFaitSelect);
    methodeFaitSelect.addEventListener("change", () => {
      updateCotationOptions(methodeFaitSelect, cotationFaitSelect);
    });
  }

  // Remplir année select sorties à faire
  const yearSelect = document.getElementById("year");
  if (yearSelect) {
    fillYearSelect(yearSelect);
  }

  // Gestion formulaire Sorties à faire
  const formAFaire = document.getElementById("form-afaire");
  if (formAFaire) {
    formAFaire.addEventListener("submit", addSortieAFaire);
    loadSortiesAFaire();
  }

  // Gestion formulaire Sorties faites
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    formFait.addEventListener("submit", addSortieFaite);
    loadSortiesFaites();
  }

  // Initialiser page connexion
  if (document.getElementById("login-form")) {
    initLoginPage();
  }

  // Initialiser page création compte
  if (document.getElementById("create-account-form")) {
    initCreateAccountPage();
  }

  // Initialiser page mon compte
  if (document.body.classList.contains("page-mon-compte")) {
    initMonComptePage();
  }
});
