document.addEventListener("DOMContentLoaded", () => {
  // ------------------ UTILITAIRES ------------------
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
  
  // Met à jour le lien de l’icône utilisateur dans le header
  function updateUserIconLink() {
    const userIconLink = document.querySelector(".nav-right a");
    if (userIconLink) {
      userIconLink.href = getUser() ? "mon-compte.html" : "utilisateur.html";
    }
  }
  updateUserIconLink();
  
  // ----------------- Redirection pour pages protégées -----------------
  const protectedPages = ["/mon-compte.html", "/sorties-a-faire.html", "/sorties-faites.html"];
  const currentPath = window.location.pathname;
  if (protectedPages.some(page => currentPath.endsWith(page))) {
    if (!getToken() || !getUser()) {
      window.location.href = "utilisateur.html";
      return;
    }
  }
  
  // ----------------- Navigation (Index, Connexion, Inscription) -----------------
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
  
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const firstName = document.getElementById("register-firstname").value.trim();
      const lastName  = document.getElementById("register-lastname").value.trim();
      const username  = document.getElementById("register-username").value.trim();
      const password  = document.getElementById("register-password").value.trim();
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
  
  // ----------------- Chargement des sorties -----------------
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
  
  // ----------------- Affichage des sorties -----------------
  async function displaySorties() {
    const sorties = await loadSorties();
    // Détermine le type à afficher selon la page (fait ou a-faire)
    const typeToDisplay = currentPath.includes("sorties-faites") ? "fait" : "a-faire";
    const tableBody = document.getElementById(
      currentPath.includes("sorties-faites") ? "table-body-fait" : "table-body-afaire"
    );
    if (tableBody) {
      tableBody.innerHTML = "";
      sorties.filter(s => s.type === typeToDisplay).forEach(s => {
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", s._id);
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
  
  // ----------------- Édition et suppression d'une sortie -----------------
  
  // Fonction d'édition d'une ligne
  window.editRow = function(row, mode) {
    // mode est "fait" ou "a-faire"
    const cells = row.querySelectorAll("td");
    // Extraire les valeurs existantes
    const sommetVal = cells[1].textContent;
    const altitudeVal = cells[2].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const deniveleVal = cells[3].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const detailsVal = cells[4].textContent;
    const methodeVal = cells[5].textContent;
    const cotationVal = cells[6].textContent;
    const dateOrYearVal = cells[7].textContent;

    // Remplacer par des champs d'édition
    cells[1].innerHTML = `<input type="text" value="${sommetVal}" style="width:100%;">`;
    cells[2].innerHTML = `<input type="number" value="${altitudeVal}" style="width:100%;">`;
    cells[3].innerHTML = `<input type="number" value="${deniveleVal}" style="width:100%;">`;
    cells[4].innerHTML = `<textarea style="width:100%;">${detailsVal}</textarea>`;
    
    // Pour méthode, créer un select
    const methods = ["Alpinisme", "Randonnée", "Escalade"];
    let methodSelect = `<select style="width:100%;">`;
    methods.forEach(opt => {
      methodSelect += `<option value="${opt}" ${opt === methodeVal ? "selected" : ""}>${opt}</option>`;
    });
    methodSelect += `</select>`;
    cells[5].innerHTML = methodSelect;
    
    // Pour cotation, dépendant de la méthode
    const cotationsByMethod = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };
    // Utiliser la méthode sélectionnée (initialement methodeVal)
    let currentMethod = cells[5].querySelector("select").value;
    let cotationOptions = cotationsByMethod[currentMethod] || [];
    let cotationSelect = `<select style="width:100%;">`;
    cotationOptions.forEach(opt => {
      cotationSelect += `<option value="${opt}" ${opt === cotationVal ? "selected" : ""}>${opt}</option>`;
    });
    cotationSelect += `</select>`;
    cells[6].innerHTML = cotationSelect;
    
    // Pour le champ date/année, selon le mode
    if (mode === "fait") {
      cells[7].innerHTML = `<input type="date" value="${dateOrYearVal}" style="width:100%;">`;
    } else {
      // Pour "a-faire", on construit un select pour les 10 prochaines années
      const currentYear = new Date().getFullYear();
      let yearSelectHTML = `<select style="width:100%;">`;
      for (let i = 0; i < 10; i++) {
        const yr = currentYear + i;
        yearSelectHTML += `<option value="${yr}" ${yr == dateOrYearVal ? "selected" : ""}>${yr}</option>`;
      }
      yearSelectHTML += `</select>`;
      cells[7].innerHTML = yearSelectHTML;
      
      // Actualisation dynamique si la méthode change pour mettre à jour le select de cotation
      cells[5].querySelector("select").addEventListener("change", function() {
        const newMethod = this.value;
        const newOptions = cotationsByMethod[newMethod] || [];
        let newSelect = `<select style="width:100%;">`;
        newOptions.forEach(opt => {
          newSelect += `<option value="${opt}">${opt}</option>`;
        });
        newSelect += `</select>`;
        cells[6].innerHTML = newSelect;
      });
    }
    
    // Dans la première cellule, remplacer les boutons par "Sauvegarder", "Annuler" et "Supprimer"
    cells[0].innerHTML = `
      <button class="save-btn">✔️</button>
      <button class="cancel-btn">↩</button>
      <button class="delete-btn">🗑</button>
    `;
    
    // Écouteur pour sauver (PUT)
    cells[0].querySelector(".save-btn").addEventListener("click", function() {
      saveRow(row, mode);
    });
    
    // Écouteur pour annuler : recharge la page (pour réafficher les données initiales)
    cells[0].querySelector(".cancel-btn").addEventListener("click", function() {
      window.location.reload();
    });
    
    // Écouteur pour supprimer
    cells[0].querySelector(".delete-btn").addEventListener("click", function() {
      if (confirm("Confirmez-vous la suppression ?")) {
        deleteRow(row);
      }
    });
  }
  
  // Envoie la mise à jour via PUT
  async function saveRow(row, mode) {
    const sortieId = row.getAttribute("data-id");
    const cells = row.querySelectorAll("td");
    const updatedData = {
      sommet: cells[1].querySelector("input").value.trim(),
      altitude: cells[2].querySelector("input").value.trim(),
      denivele: cells[3].querySelector("input").value.trim(),
      details: cells[4].querySelector("textarea").value.trim(),
      methode: cells[5].querySelector("select").value,
      cotation: cells[6].querySelector("select").value
    };
    if (mode === "fait") {
      updatedData.date = cells[7].querySelector("input[type=date]").value;
    } else {
      updatedData.annee = cells[7].querySelector("select").value;
    }
    
    const token = getToken();
    try {
      const res = await fetch(`/api/sorties/${sortieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sortie mise à jour !");
        window.location.reload();
      } else {
        alert("Erreur de sauvegarde : " + (data.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  }
  
  // Supprime la sortie via DELETE
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
  
  // ----------------- Affichage initial des sorties -----------------
  async function displaySorties() {
    const sorties = await loadSorties();
    // Détermine le type en fonction de la page
    const typeToDisplay = currentPath.includes("sorties-faites") ? "fait" : "a-faire";
    const tableBody = document.getElementById(
      currentPath.includes("sorties-faites") ? "table-body-fait" : "table-body-afaire"
    );
    if (tableBody) {
      tableBody.innerHTML = "";
      sorties.filter(s => s.type === typeToDisplay).forEach(s => {
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", s._id);
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
