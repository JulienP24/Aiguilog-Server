document.addEventListener("DOMContentLoaded", () => {
  // ---- UTILITAIRES ----
  function formatValue(val) {
    return val ? `~${val}m` : "";
  }
  function getUser() {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }
  function getToken() {
    return localStorage.getItem("token");
  }
  // Mise à jour du lien sur l'icône utilisateur
  function updateUserIconLink() {
    const userIconLink = document.querySelector(".nav-right a");
    if (userIconLink) {
      userIconLink.href = getUser() ? "mon-compte.html" : "utilisateur.html";
    }
  }
  updateUserIconLink();
  
  // ---- Vérification de la connexion pour pages protégées ----
  const protectedPages = ["/mon-compte.html", "/sorties-a-faire.html", "/sorties-faites.html"];
  const currentPath = window.location.pathname;
  if (protectedPages.some(page => currentPath.endsWith(page))) {
    if (!getToken() || !getUser()) {
      window.location.href = "utilisateur.html";
      return;
    }
  }
  
  // ---- Index : bouton pour aller vers la connexion ----
  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) {
    btnGoLogin.addEventListener("click", () => {
      window.location.href = "utilisateur.html";
    });
  }
  
  // ---- Connexion (utilisateur.html) ----
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          updateUserIconLink();
          window.location.href = "mon-compte.html";
        } else {
          alert("Erreur de connexion : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la connexion :", err);
        alert("Erreur lors de la connexion");
      }
    });
    const btnCreerCompte = document.getElementById("btn-creer-compte");
    if (btnCreerCompte) {
      btnCreerCompte.addEventListener("click", () => {
        window.location.href = "creer-compte.html";
      });
    }
  }
  
  // ---- Inscription (creer-compte.html) ----
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const firstName = document.getElementById("register-firstname").value.trim();
      const lastName = document.getElementById("register-lastname").value.trim();
      const username = document.getElementById("register-username").value.trim();
      const password = document.getElementById("register-password").value.trim();
      const birthdate = document.getElementById("register-birthdate").value;
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, username, password, birthdate })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          updateUserIconLink();
          window.location.href = "mon-compte.html";
        } else {
          alert("Erreur d'inscription : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de l'inscription :", err);
        alert("Erreur lors de l'inscription");
      }
    });
  }
  
  // ---- Mon-compte (mon-compte.html) ----
  if (document.getElementById("titre-bienvenue")) {
    const userData = getUser();
    if (!userData) {
      window.location.href = "utilisateur.html";
    } else {
      const titreBienvenue = document.getElementById("titre-bienvenue");
      const infoMembre = document.getElementById("info-membre");
      titreBienvenue.textContent = `Bienvenue, ${userData.firstName} ${userData.lastName} (${userData.username})`;
      if (userData.birthdate) {
        const date = new Date(userData.birthdate);
        infoMembre.textContent = `Né(e) le ${date.toLocaleDateString("fr-FR")}`;
      }
    }
  }
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "utilisateur.html";
    });
  }
  
  // ---- Chargement des sorties ----
  async function loadSorties() {
    const token = getToken();
    if (!token) return [];
    try {
      const res = await fetch("/api/sorties", {
        headers: { "Authorization": "Bearer " + token }
      });
      const sorties = await res.json();
      return sorties;
    } catch (err) {
      console.error("Erreur lors du chargement des sorties :", err);
      return [];
    }
  }
  
  // ---- Ajout d'une sortie "à faire" ----
  const formAFaire = document.getElementById("form-a-faire");
  if (formAFaire) {
    const methodeSelect = document.getElementById("methode");
    const cotationSelect = document.getElementById("cotation");
    const yearSelect     = document.getElementById("year");
    const detailsInput   = document.getElementById("details");
    const cotationsMap = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"]
    };
  
    if (methodeSelect && cotationSelect) {
      methodeSelect.addEventListener("change", () => {
        const val = methodeSelect.value;
        cotationSelect.innerHTML = `<option value="" disabled selected>Cotation</option>`;
        if (cotationsMap[val]) {
          cotationsMap[val].forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            cotationSelect.appendChild(o);
          });
        }
      });
    }
    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 10; i++) {
        const op = document.createElement("option");
        op.value = currentYear + i;
        op.textContent = currentYear + i;
        yearSelect.appendChild(op);
      }
    }
    
    formAFaire.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet").value.trim();
      const altitude = document.getElementById("altitude").value.trim();
      const denivele = document.getElementById("denivele").value.trim();
      const methode = methodeSelect.value;
      const cotation = cotationSelect.value;
      const annee = yearSelect.value;
      const details = detailsInput.value.trim();
  
      const sortieData = {
        type: "a-faire",
        sommet,
        altitude,
        denivele,
        methode,
        cotation,
        annee,
        details
      };
      const token = getToken();
      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(sortieData)
        });
        const data = await res.json();
        if (res.ok) {
          alert("Sortie à faire ajoutée !");
          window.location.reload();
        } else {
          alert("Erreur lors de l'ajout de la sortie : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la requête :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  }
  
  // ---- Ajout d'une sortie "fait" ----
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    const methodeFaitSelect  = document.getElementById("methode-fait");
    const cotationFaitSelect = document.getElementById("cotation-fait");
    const dateInput          = document.getElementById("date");
    const detailsFait        = document.getElementById("details-fait");
    const cotationsMap = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"]
    };
  
    if (methodeFaitSelect && cotationFaitSelect) {
      methodeFaitSelect.addEventListener("change", () => {
        const val = methodeFaitSelect.value;
        cotationFaitSelect.innerHTML = `<option value="" disabled selected>Cotation</option>`;
        if (cotationsMap[val]) {
          cotationsMap[val].forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            cotationFaitSelect.appendChild(o);
          });
        }
      });
    }
    
    formFait.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet-fait").value.trim();
      const altitude = document.getElementById("altitude-fait").value.trim();
      const denivele = document.getElementById("denivele-fait").value.trim();
      const methode = methodeFaitSelect.value;
      const cotation = cotationFaitSelect.value;
      const dateVal = dateInput.value;
      const details = detailsFait.value.trim();
      
      const sortieData = {
        type: "fait",
        sommet,
        altitude,
        denivele,
        methode,
        cotation,
        date: dateVal,
        details
      };
      const token = getToken();
      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(sortieData)
        });
        const data = await res.json();
        if (res.ok) {
          alert("Sortie faite ajoutée !");
          window.location.reload();
        } else {
          alert("Erreur lors de l'ajout de la sortie : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la requête :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  }
  
  // ---- Affichage du tableau de sorties + édition/suppression ----
  async function displaySorties() {
    const sorties = await loadSorties();
    const typeToDisplay = currentPath.includes("sorties-faites") ? "fait" : "a-faire";
    const tableBody = document.getElementById(currentPath.includes("sorties-faites") ? "table-body-fait" : "table-body-afaire");
    if (tableBody) {
      tableBody.innerHTML = "";
      sorties.filter(s => s.type === typeToDisplay).forEach(s => {
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", s._id);
        // Ordre : Actions, Sommet, Altitude, Dénivelé, Méthode, Cotation, Date/Année, Détails
        newRow.innerHTML = `
          <td>
            <button class="edit-btn" onclick="editRow(this.parentElement.parentElement, '${s.type}')">✏️</button>
            <button class="delete-btn" onclick="deleteRow(this.parentElement.parentElement)">🗑</button>
          </td>
          <td>${s.sommet}</td>
          <td>${formatValue(s.altitude)}</td>
          <td>${formatValue(s.denivele)}</td>
          <td>${s.methode}</td>
          <td>${s.cotation}</td>
          <td>${s.type === "fait" ? s.date : s.annee || ""}</td>
          <td>${s.details}</td>
        `;
        tableBody.appendChild(newRow);
      });
    }
  }
  displaySorties();
  
  // ----- Méthodes, cotations, etc. pour l'édition des lignes -----
  const methods = ["Alpinisme", "Randonnée", "Escalade"];
  const cotationsByMethod = {
    "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
    "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
    "Escalade": ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"]
  };
  
  // Fonction d'édition (exposée globalement)
  window.editRow = function(row, mode) {
    // mode = "fait" ou "a-faire"
    const cells = row.querySelectorAll("td");
    // Indices : 1: Sommet, 2: Alt, 3: Dénivelé, 4: Méthode, 5: Cotation, 6: Date/Année, 7: Détails
    const sommetVal     = cells[1].textContent;
    const altitudeVal   = cells[2].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const deniveleVal   = cells[3].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const methodeVal    = cells[4].textContent;
    const cotationVal   = cells[5].textContent;
    const dateOrYearVal = cells[6].textContent;
    const detailsVal    = cells[7].textContent;
    
    cells[1].innerHTML = `<input type="text" value="${sommetVal}" style="width:100%;">`;
    cells[2].innerHTML = `<input type="number" value="${altitudeVal}" style="width:100%;">`;
    cells[3].innerHTML = `<input type="number" value="${deniveleVal}" style="width:100%;">`;
    
    // Méthode => select
    let methodSelectHTML = `<select style="width:100%;">`;
    methods.forEach(opt => {
      methodSelectHTML += `<option value="${opt}" ${opt===methodeVal?"selected":""}>${opt}</option>`;
    });
    methodSelectHTML += `</select>`;
    cells[4].innerHTML = methodSelectHTML;
    
    // Cotation => dépend de la méthode
    let currentMethod = methodeVal;
    let cotOptions = cotationsByMethod[currentMethod] || [];
    let cotSelectHTML = `<select style="width:100%;">`;
    cotOptions.forEach(opt => {
      cotSelectHTML += `<option value="${opt}" ${opt===cotationVal?"selected":""}>${opt}</option>`;
    });
    cotSelectHTML += `</select>`;
    cells[5].innerHTML = cotSelectHTML;
    
    // Si la méthode change, actualiser la cotation
    cells[4].querySelector("select").addEventListener("change", function() {
      const newMethod = this.value;
      const newCotOptions = cotationsByMethod[newMethod] || [];
      let newCotSelect = `<select style="width:100%;">`;
      newCotOptions.forEach(o => {
        newCotSelect += `<option value="${o}">${o}</option>`;
      });
      newCotSelect += `</select>`;
      cells[5].innerHTML = newCotSelect;
    });
    
    // Date ou Année
    if (mode === "fait") {
      cells[6].innerHTML = `<input type="date" value="${dateOrYearVal}" style="width:100%;">`;
    } else {
      const currentYear = new Date().getFullYear();
      let yearSelectHTML = `<select style="width:100%;">`;
      for (let i=0; i<10; i++){
        const yr = currentYear + i;
        yearSelectHTML += `<option value="${yr}" ${yr==dateOrYearVal?"selected":""}>${yr}</option>`;
      }
      yearSelectHTML += `</select>`;
      cells[6].innerHTML = yearSelectHTML;
    }
    
    // Détails => textarea
    cells[7].innerHTML = `<textarea style="width:100%;">${detailsVal}</textarea>`;
    
    // Boutons : Sauvegarder, Annuler, Supprimer
    cells[0].innerHTML = `
      <button class="save-btn">✔️</button>
      <button class="cancel-btn">↩</button>
      <button class="delete-btn">🗑</button>
    `;
    
    cells[0].querySelector(".save-btn").addEventListener("click", () => {
      saveRow(row, mode);
    });
    cells[0].querySelector(".cancel-btn").addEventListener("click", () => {
      window.location.reload();
    });
    cells[0].querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Confirmez-vous la suppression ?")) {
        deleteRow(row);
      }
    });
  };
  
  // Sauvegarder (PUT)
  async function saveRow(row, mode) {
    const sortieId = row.getAttribute("data-id");
    const cells = row.querySelectorAll("td");
    const updated = {
      sommet: cells[1].querySelector("input").value.trim(),
      altitude: cells[2].querySelector("input").value.trim(),
      denivele: cells[3].querySelector("input").value.trim(),
      methode: cells[4].querySelector("select").value,
      cotation: cells[5].querySelector("select").value,
      details: cells[7].querySelector("textarea").value.trim()
    };
    if (mode === "fait") {
      updated.date = cells[6].querySelector("input[type=date]").value;
    } else {
      updated.annee = cells[6].querySelector("select").value;
    }
    const token = getToken();
    try {
      const res = await fetch(`/api/sorties/${sortieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sortie mise à jour !");
        window.location.reload();
      } else {
        alert("Erreur de sauvegarde : " + (data.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur mise à jour :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  }
  
  // Supprimer (DELETE)
  window.deleteRow = async function(row) {
    const sortieId = row.getAttribute("data-id");
    if (!sortieId) return;
    const token = getToken();
    try {
      const res = await fetch(`/api/sorties/${sortieId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sortie supprimée !");
        row.remove();
      } else {
        alert("Erreur lors de la suppression : " + (data.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  };

  // Fonction pour mettre à jour le datalist avec les suggestions de sommets
  async function updateSummitsDatalist() {
    const inputSommet = document.getElementById("sommet");
    const datalist = document.getElementById("summits-list");
    const query = inputSommet.value.trim();
    if (query.length < 2) {
      datalist.innerHTML = "";
      return;
    }
    try {
      const res = await fetch(`/api/summits?q=${encodeURIComponent(query)}`);
      const suggestions = await res.json();
      // Remplir le datalist avec des <option> contenant le nom et un attribut data-altitude
      datalist.innerHTML = suggestions.map(s =>
        `<option data-altitude="${s.elevation}" value="${s.name}">`
      ).join('');
    } catch (err) {
      console.error("Erreur lors de l'auto-complétion des sommets :", err);
    }
  }

  // Attacher l'événement d'entrée sur le champ "sommet"
  const sommetInput = document.getElementById("sommet");
  if (sommetInput) {
    sommetInput.addEventListener("input", updateSummitsDatalist);

    // Lors du changement, vérifier la sélection et remplir le champ "Altitude" avec l'altitude correspondante
    sommetInput.addEventListener("change", () => {
      const datalist = document.getElementById("summits-list");
      const options = datalist.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value.toLowerCase() === sommetInput.value.trim().toLowerCase()) {
          const altitudeInput = document.getElementById("altitude");
          if (altitudeInput) {
            altitudeInput.value = options[i].getAttribute("data-altitude") || "";
          }
          break;
        }
      }
    });
  }

});
