document.addEventListener("DOMContentLoaded", () => {
  // --------- UTILITAIRES ---------
  function formatValue(val) {
    return val ? `~${val}m` : "";
  }
  
  function getUser() {
    const stored = localStorage.getItem("user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }
  
  function getToken() {
    return localStorage.getItem("token");
  }
  
  // Mettre à jour le lien de l'icône utilisateur
  function updateUserIconLink() {
    const userIconLink = document.querySelector(".nav-right a");
    if (userIconLink) {
      userIconLink.href = getUser() ? "mon-compte.html" : "utilisateur.html";
    }
  }
  updateUserIconLink();
  
  // --------- Redirection pour pages protégées ---------
  const protectedPages = ["/mon-compte.html", "/sorties-a-faire.html", "/sorties-faites.html"];
  const currentPath = window.location.pathname;
  if (protectedPages.some(page => currentPath.endsWith(page))) {
    if (!getToken() || !getUser()) {
      window.location.href = "utilisateur.html";
      return;
    }
  }
  
  // --------- Gestion de la navigation (index, connexion, inscription) ---------
  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) {
    btnGoLogin.addEventListener("click", () => {
      window.location.href = "utilisateur.html";
    });
  }
  
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
        console.error("Erreur lors de la connexion:", err);
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
        console.error("Erreur lors de l'inscription:", err);
        alert("Erreur lors de l'inscription");
      }
    });
  }
  
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
  
  // --------- Chargement des sorties depuis le serveur ---------
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
      console.error("Erreur lors du chargement des sorties:", err);
      return [];
    }
  }
  
  // --------- Fonctions d'édition et suppression sur une ligne du tableau ---------
  
  // Affiche la ligne sous forme de champs éditables
  function editRow(row, mode) {
    // 'mode' est "fait" ou "a-faire" pour déterminer le type de champ pour la date/année
    const cells = row.querySelectorAll("td");
    // On suppose que les colonnes sont : 0: actions, 1: sommet, 2: altitude, 3: dénivelé, 4: détails, 5: méthode, 6: cotation, 7: date/année
    // Pour altitude et dénivelé, on utilise un input de type number
    // Pour méthode et cotation, on utilise des selects ; pour date/année, selon le mode
    const sommet = cells[1].textContent;
    const altitude = cells[2].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const denivele = cells[3].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const details = cells[4].textContent;
    const methode = cells[5].textContent;
    const cotation = cells[6].textContent;
    const dateOrYear = cells[7].textContent;
  
    // Remplacer le contenu des cellules par des champs de formulaire
    cells[1].innerHTML = `<input type="text" value="${sommet}" style="width:100%;">`;
    cells[2].innerHTML = `<input type="number" value="${altitude}" style="width:100%;">`;
    cells[3].innerHTML = `<input type="number" value="${denivele}" style="width:100%;">`;
    cells[4].innerHTML = `<textarea style="width:100%;">${details}</textarea>`;
  
    // Pour méthode, utiliser un select prérempli
    const methodOptions = ["Alpinisme", "Randonnée", "Escalade"];
    let methodSelect = `<select style="width:100%;">`;
    methodOptions.forEach(opt => {
      methodSelect += `<option value="${opt}" ${opt === methode ? "selected" : ""}>${opt}</option>`;
    });
    methodSelect += "</select>";
    cells[5].innerHTML = methodSelect;
  
    // Pour cotation, selon la méthode sélectionnée
    const cotationsMap = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };
    let currentMethod = cells[5].querySelector("select").value;
    let cotationOptions = cotationsMap[currentMethod] || [];
    let cotationSelect = `<select style="width:100%;">`;
    cotationOptions.forEach(opt => {
      cotationSelect += `<option value="${opt}" ${opt === cotation ? "selected" : ""}>${opt}</option>`;
    });
    cotationSelect += "</select>";
    cells[6].innerHTML = cotationSelect;
  
    // Pour le dernier champ, selon le mode, on affiche un input de type date ou un select pour l'année
    if (mode === "fait") {
      // Date (input de type date)
      cells[7].innerHTML = `<input type="date" value="${dateOrYear}" style="width:100%;">`;
    } else {
      // Année (select avec 10 années à partir de l'année courante)
      const currentYear = new Date().getFullYear();
      let yearSelectHTML = `<select style="width:100%;">`;
      for (let i = 0; i < 10; i++) {
        const yr = currentYear + i;
        yearSelectHTML += `<option value="${yr}" ${yr == dateOrYear ? "selected" : ""}>${yr}</option>`;
      }
      yearSelectHTML += "</select>";
      cells[7].innerHTML = yearSelectHTML;
  
      // Ajouter un gestionnaire de changement pour actualiser le select de cotation si la méthode change
      cells[5].querySelector("select").addEventListener("change", function() {
        const newMethod = this.value;
        const newOptions = cotationsMap[newMethod] || [];
        let newSelect = `<select style="width:100%;">`;
        newOptions.forEach(opt => {
          newSelect += `<option value="${opt}">${opt}</option>`;
        });
        newSelect += "</select>";
        cells[6].innerHTML = newSelect;
      });
    }
  
    // Changer le bouton d'action dans la première cellule pour "Sauvegarder" et "Annuler"
    cells[0].innerHTML = `
      <button class="save-btn">✔️</button>
      <button class="cancel-btn">↩</button>
      <button class="delete-btn">🗑</button>
    `;
  
    // Gestion du bouton Sauvegarder
    cells[0].querySelector(".save-btn").addEventListener("click", function() {
      saveRow(row, mode);
    });
  
    // Gestion du bouton Annuler : recharge la page ou restaure la ligne initiale
    cells[0].querySelector(".cancel-btn").addEventListener("click", function() {
      // Pour simplifier, rechargez la page pour réafficher les données depuis le serveur
      window.location.reload();
    });
  
    // Gestion du bouton Supprimer
    cells[0].querySelector(".delete-btn").addEventListener("click", function() {
      if (confirm("Confirmez-vous la suppression ?")) {
        deleteRow(row);
      }
    });
  }
  
  // Envoie de la mise à jour pour une ligne éditée
  async function saveRow(row, mode) {
    const sortieId = row.getAttribute("data-id");
    // Récupérer les valeurs depuis les inputs/selects
    const cells = row.querySelectorAll("td");
    const updated = {
      sommet: cells[1].querySelector("input").value.trim(),
      altitude: cells[2].querySelector("input").value.trim(),
      denivele: cells[3].querySelector("input").value.trim(),
      details: cells[4].querySelector("textarea").value.trim(),
      methode: cells[5].querySelector("select").value,
      cotation: cells[6].querySelector("select").value
    };
    if (mode === "fait") {
      updated.date = cells[7].querySelector("input[type=date]").value;
    } else {
      updated.annee = cells[7].querySelector("select").value;
    }
    // Envoyer une requête PUT à l'API
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
        // Pour simplifier, rechargez la page afin de voir la version actualisée depuis le serveur
        window.location.reload();
      } else {
        alert("Erreur de sauvegarde : " + (data.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  }
  
  // Supprime une ligne et envoie la requête DELETE
  async function deleteRow(row) {
    const sortieId = row.getAttribute("data-id");
    const token = getToken();
    try {
      const res = await fetch(`/api/sorties/${sortieId}`, {
        method: "DELETE",
        headers: {
          "Authorization": "Bearer " + token
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sortie supprimée");
        row.remove();
      } else {
        alert("Erreur lors de la suppression : " + (data.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  }
  
  // --------- Chargement et affichage des sorties ---------
  async function displaySorties() {
    const token = getToken();
    if (!token) return;
    const sorties = await loadSorties();
    // Selon la page, on filtre sur "a-faire" ou "fait"
    let typeToDisplay = currentPath.includes("sorties-faites") ? "fait" : "a-faire";
    const tableBody = document.getElementById(
      currentPath.includes("sorties-faites") ? "table-body-fait" : "table-body-afaire"
    );
    if (tableBody) {
      // Vider le tableau avant d'afficher
      tableBody.innerHTML = "";
      sorties.filter(s => s.type === typeToDisplay).forEach(s => {
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", s._id);
        // Conserver le rendu statique initial
        newRow.innerHTML = `
          <td>
            <button class="edit-btn" onclick="editRow(this.parentElement.parentElement, '${s.type}')">✏️</button>
            <button class="delete-btn" onclick="deleteRow(this.parentElement.parentElement)">🗑</button>
          </td>
          <td>${s.sommet}</td>
          <td>${formatValue(s.altitude)}</td>
          <td>${formatValue(s.denivele)}</td>
          <td>${s.details}</td>
          <td>${s.methode}</td>
          <td>${s.cotation}</td>
          <td>${s.type === "fait" ? s.date : s.annee || ""}</td>
        `;
        tableBody.appendChild(newRow);
      });
    }
  }
  displaySorties();
});
