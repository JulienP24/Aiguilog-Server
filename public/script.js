document.addEventListener("DOMContentLoaded", () => {

  /* =================== UTILITAIRES =================== */
  function formatValue(val) {
    return val ? `~${val}m` : "";
  }

  function getUser() {
    const raw = localStorage.getItem("user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  /* =================== MOBILE MENU TOGGLE =================== */
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
      if (mobileMenu.classList.contains("open")) {
        mobileMenuToggle.innerHTML = "✕";
        mobileMenuToggle.style.color = "var(--primary)";
      } else {
        mobileMenuToggle.innerHTML = "&#9776;";
        mobileMenuToggle.style.color = "#fff";
      }
    });
  }

  /* =================== NAVIGATION & REDIRECTION =================== */
  const currentPath = window.location.pathname;

  function updateUserIconLink() {
    const links = document.querySelectorAll("a[href='mon-compte.html']");
    links.forEach(link => {
      link.href = getUser() ? "mon-compte.html" : "utilisateur.html";
    });
  }
  updateUserIconLink();

  // Redirection si page protégée
  const protectedPages = ["/mon-compte.html", "/sorties-a-faire.html", "/sorties-faites.html"];
  if (protectedPages.some(page => currentPath.endsWith(page))) {
    if (!getToken() || !getUser()) {
      window.location.href = "utilisateur.html";
      return;
    }
  }

  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) {
    btnGoLogin.addEventListener("click", () => {
      window.location.href = "utilisateur.html";
    });
  }

  /* =================== CONNEXION (utilisateur.html) =================== */
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

  /* =================== INSCRIPTION (creer-compte.html) =================== */
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

  /* =================== MON COMPTE (mon-compte.html) =================== */
  if (document.getElementById("titre-bienvenue")) {
    const userData = getUser();
    if (!userData) {
      window.location.href = "utilisateur.html";
    } else {
      const titreBienvenue = document.getElementById("titre-bienvenue");
      const infoMembre = document.getElementById("info-membre");
      titreBienvenue.textContent = `Bienvenue, ${userData.firstName} ${userData.lastName} (${userData.username})`;
      if (userData.birthdate) {
        const d = new Date(userData.birthdate);
        infoMembre.textContent = `Né(e) le ${d.toLocaleDateString("fr-FR")}`;
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

  /* =================== CHARGEMENT & AFFICHAGE DES SORTIES =================== */
  async function loadSorties() {
    const token = getToken();
    if (!token) return [];
    try {
      const res = await fetch("/api/sorties", {
        headers: { "Authorization": "Bearer " + token }
      });
      return await res.json();
    } catch (err) {
      console.error("Erreur lors du chargement des sorties :", err);
      return [];
    }
  }

  async function displaySorties() {
    const sorties = await loadSorties();
    const typeToDisplay = currentPath.includes("sorties-faites") ? "fait" : "a-faire";
    const tableBody = document.getElementById(
      currentPath.includes("sorties-faites") ? "table-body-fait" : "table-body-afaire"
    );
    if (tableBody) {
      tableBody.innerHTML = "";
      sorties
        .filter(s => s.type === typeToDisplay)
        .forEach(s => {
          const tr = document.createElement("tr");
          tr.setAttribute("data-id", s._id);
          tr.innerHTML = `
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
          tableBody.appendChild(tr);
        });
    }
  }
  displaySorties();

  /* =================== FORM "SORTIES À FAIRE" =================== */
  const formAFaire = document.getElementById("form-a-faire");
  if (formAFaire) {
    const methodeSelect = document.getElementById("methode");
    const cotationSelect = document.getElementById("cotation");
    const yearSelect = document.getElementById("year");
    const detailsInput = document.getElementById("details");
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
      const token = getToken();
      if (!token) {
        alert("Vous n'êtes pas connecté.");
        window.location.href = "utilisateur.html";
        return;
      }

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

  /* =================== FORM "SORTIES FAITES" =================== */
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    const methodeFaitSelect = document.getElementById("methode-fait");
    const cotationFaitSelect = document.getElementById("cotation-fait");
    const dateInput = document.getElementById("date");
    const detailsFait = document.getElementById("details-fait");

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
      const token = getToken();
      if (!token) {
        alert("Vous n'êtes pas connecté.");
        window.location.href = "utilisateur.html";
        return;
      }

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

  /* =================== ÉDITION DES SORTIES =================== */
  const methods = ["Alpinisme", "Randonnée", "Escalade"];
  const cotationsByMethod = {
    "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
    "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
    "Escalade": ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"]
  };

  window.editRow = function(row, mode) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) {
      console.error("La ligne n'a pas le nombre de cellules attendu.", row);
      return;
    }

    const sommetVal = cells[1].textContent;
    const altitudeVal = cells[2].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const deniveleVal = cells[3].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const methodeVal = cells[4].textContent;
    const cotationVal = cells[5].textContent;
    const dateOrYearVal = cells[6].textContent;
    const detailsVal = cells[7].textContent;

    // Sommet
    cells[1].innerHTML = `<input type="text" value="${sommetVal}" style="width:100%;">`;
    // Altitude
    cells[2].innerHTML = `<input type="number" value="${altitudeVal}" style="width:100%;">`;
    // Dénivelé
    cells[3].innerHTML = `<input type="number" value="${deniveleVal}" style="width:100%;">`;

    // Méthode
    let methodSelectHTML = `<select style="width:100%;">`;
    methods.forEach(opt => {
      methodSelectHTML += `<option value="${opt}" ${opt === methodeVal ? "selected" : ""}>${opt}</option>`;
    });
    methodSelectHTML += `</select>`;
    cells[4].innerHTML = methodSelectHTML;

    // Cotation
    let currentMethod = cells[4].querySelector("select").value;
    let cotSelectHTML = `<select style="width:100%;">`;
    (cotationsByMethod[currentMethod] || []).forEach(opt => {
      cotSelectHTML += `<option value="${opt}" ${opt === cotationVal ? "selected" : ""}>${opt}</option>`;
    });
    cotSelectHTML += `</select>`;
    cells[5].innerHTML = cotSelectHTML;

    // Mise à jour de la cotation quand la méthode change
    cells[4].querySelector("select").addEventListener("change", function() {
      const newMethod = this.value;
      const newCotSelect = document.createElement("select");
      newCotSelect.style.width = "100%";
      (cotationsByMethod[newMethod] || []).forEach(o => {
        const option = document.createElement("option");
        option.value = o;
        option.textContent = o;
        newCotSelect.appendChild(option);
      });
      cells[5].innerHTML = "";
      cells[5].appendChild(newCotSelect);
    });

    // Date ou Année
    cells[6].innerHTML = "";
    if (mode === "fait") {
      cells[6].innerHTML = `<input type="date" value="${dateOrYearVal}" style="width:100%;">`;
    } else {
      let selectYearHTML = `<select style="width:100%;">`;
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 10; i++) {
        const yr = currentYear + i;
        selectYearHTML += `<option value="${yr}" ${String(yr) === dateOrYearVal ? "selected" : ""}>${yr}</option>`;
      }
      selectYearHTML += `</select>`;
      cells[6].innerHTML = selectYearHTML;
    }

    // Détails
    cells[7].innerHTML = `<textarea style="width:100%;">${detailsVal}</textarea>`;

    // Boutons Save/Cancel
    cells[0].innerHTML = "";
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "✔️";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "↩";
    cells[0].appendChild(saveBtn);
    cells[0].appendChild(cancelBtn);

    saveBtn.addEventListener("click", () => { saveRow(row, mode); });
    cancelBtn.addEventListener("click", () => { window.location.reload(); });
  };

  async function saveRow(row, mode) {
    const sortieId = row.getAttribute("data-id");
    const cells = row.querySelectorAll("td");
    const updatedData = {
      sommet: cells[1].querySelector("input").value.trim(),
      altitude: cells[2].querySelector("input").value.trim(),
      denivele: cells[3].querySelector("input").value.trim(),
      methode: cells[4].querySelector("select").value,
      details: cells[7].querySelector("textarea").value.trim()
    };

    const cotationSel = cells[5].querySelector("select");
    if (cotationSel) {
      updatedData.cotation = cotationSel.value;
    }
    if (mode === "fait") {
      const dateField = cells[6].querySelector("input[type=date]");
      updatedData.date = dateField ? dateField.value : "";
    } else {
      const yearSel = cells[6].querySelector("select");
      updatedData.annee = yearSel ? yearSel.value : "";
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

  /* =================== AUTO-COMPLÉTION "SOMMET" =================== */
  let sommetInput = document.getElementById("sommet");
  if (!sommetInput) { 
    sommetInput = document.getElementById("sommet-fait");
  }
  if (sommetInput) {
    sommetInput.addEventListener("input", updateSummitsDatalist);
    sommetInput.addEventListener("change", () => {
      const datalist = document.getElementById("summits-list");
      if (!datalist) return;
      const options = datalist.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value.toLowerCase() === sommetInput.value.trim().toLowerCase()) {
          let altitudeInput = document.getElementById("altitude");
          if (!altitudeInput) { 
            altitudeInput = document.getElementById("altitude-fait");
          }
          if (altitudeInput) {
            altitudeInput.value = options[i].getAttribute("data-altitude") || "";
          }
          break;
        }
      }
    });
  }

  async function updateSummitsDatalist() {
    const query = sommetInput.value.trim();
    const datalist = document.getElementById("summits-list");
    if (!datalist) return;
    if (query.length < 2) {
      datalist.innerHTML = "";
      return;
    }
    try {
      // Recherche sur /api/summits?q= ...
      const res = await fetch(`/api/summits?q=${encodeURIComponent(query)}`);
      const suggestions = await res.json();

      // Utilisation de "s.nom" pour la valeur et "s.altitude" pour data-altitude
      datalist.innerHTML = suggestions.map(s =>
        `<option data-altitude="${s.altitude}" value="${s.nom}">`
      ).join('');
    } catch (err) {
      console.error("Erreur lors de l'auto-complétion des sommets :", err);
    }
  }

});
