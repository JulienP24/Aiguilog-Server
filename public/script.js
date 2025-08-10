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
  function handleAuthError() {
    alert("Session expirée, veuillez vous reconnecter.");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "utilisateur.html";
  }

  /* =================== MOBILE MENU TOGGLE =================== */
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
      if (mobileMenu.classList.contains("open")) {
        // Bouton "close" (X)
        mobileMenuToggle.innerHTML = `
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="images/close-white.png">
            <source media="(prefers-color-scheme: light)" srcset="images/close-black.png">
            <img src="images/close-black.png" alt="Fermer le menu" class="hamburger-icon">
          </picture>
        `;
      } else {
        // Bouton "hamburger"
        mobileMenuToggle.innerHTML = `
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="images/hamburger-white.png">
            <source media="(prefers-color-scheme: light)" srcset="images/hamburger-black.png">
            <img src="images/hamburger-black.png" alt="Menu" class="hamburger-icon">
          </picture>
        `;
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

      // Validation simple
      if (!username || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
      }

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

      if (!firstName || !lastName || !username || !password || !birthdate) {
        alert("Veuillez remplir tous les champs.");
        return;
      }

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
      if (res.status === 401) {
        handleAuthError();
        return [];
      }
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

      // Validation simple
      if (!sommet || !altitude || !denivele || !methode || !cotation || !annee) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }

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
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.ok) {
          alert("Sortie à faire ajoutée !");
          await displaySorties(); // mise à jour sans reload
          formAFaire.reset();
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

      // Validation simple
      if (!sommet || !altitude || !denivele || !methode || !cotation || !dateVal) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }

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
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.ok) {
          alert("Sortie faite ajoutée !");
          await displaySorties(); // mise à jour sans reload
          formFait.reset();
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

    // Transforme la ligne en champ éditable
    cells[1].innerHTML = `<input type="text" value="${sommetVal}" style="width:100%;">`;
    cells[2].innerHTML = `<input type="number" value="${altitudeVal}" style="width:100%;">`;
    cells[3].innerHTML = `<input type="number" value="${deniveleVal}" style="width:100%;">`;

    // Méthode : select
    const methodeSelect = document.createElement("select");
    methods.forEach(m => {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = m;
      if (m === methodeVal) option.selected = true;
      methodeSelect.appendChild(option);
    });
    cells[4].innerHTML = "";
    cells[4].appendChild(methodeSelect);

    // Cotation : select, dépend de méthode
    const cotationSelect = document.createElement("select");
    function updateCotationOptions(selectedMethod, selectedCotation) {
      cotationSelect.innerHTML = "";
      const options = cotationsByMethod[selectedMethod] || [];
      options.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        if (opt === selectedCotation) o.selected = true;
        cotationSelect.appendChild(o);
      });
    }
    updateCotationOptions(methodeVal, cotationVal);
    cells[5].innerHTML = "";
    cells[5].appendChild(cotationSelect);

    // Quand méthode change, on met à jour cotation
    methodeSelect.addEventListener("change", () => {
      updateCotationOptions(methodeSelect.value, cotationSelect.value);
    });

    // Date ou année
    if (mode === "fait") {
      cells[6].innerHTML = `<input type="date" value="${dateOrYearVal}">`;
    } else {
      cells[6].innerHTML = `<input type="number" value="${dateOrYearVal}" style="width:100%;">`;
    }

    cells[7].innerHTML = `<input type="text" value="${detailsVal}" style="width:100%;">`;

    // Boutons save / cancel
    cells[0].innerHTML = `
      <button class="save-btn">💾</button>
      <button class="cancel-btn">❌</button>
    `;

    // Gestion boutons
    const saveBtn = cells[0].querySelector(".save-btn");
    const cancelBtn = cells[0].querySelector(".cancel-btn");

    cancelBtn.addEventListener("click", () => {
      displaySorties();
    });

    saveBtn.addEventListener("click", async () => {
      const token = getToken();
      if (!token) {
        alert("Session expirée, veuillez vous reconnecter.");
        handleAuthError();
        return;
      }

      // Récupération données modifiées
      const newSommet = cells[1].querySelector("input").value.trim();
      const newAltitude = cells[2].querySelector("input").value.trim();
      const newDenivele = cells[3].querySelector("input").value.trim();
      const newMethode = methodeSelect.value;
      const newCotation = cotationSelect.value;
      const newDateOrYearInput = cells[6].querySelector("input").value;
      const newDetails = cells[7].querySelector("input").value.trim();

      // Validation
      if (!newSommet || !newAltitude || !newDenivele || !newMethode || !newCotation || !newDateOrYearInput) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }

      const sortieUpdate = {
        sommet: newSommet,
        altitude: newAltitude,
        denivele: newDenivele,
        methode: newMethode,
        cotation: newCotation,
        details: newDetails,
      };
      if (mode === "fait") {
        sortieUpdate.date = newDateOrYearInput;
      } else {
        sortieUpdate.annee = newDateOrYearInput;
      }

      const sortieId = row.getAttribute("data-id");
      try {
        const res = await fetch("/api/sorties/" + sortieId, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(sortieUpdate)
        });
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.ok) {
          alert("Sortie mise à jour !");
          await displaySorties();
        } else {
          const errData = await res.json();
          alert("Erreur lors de la mise à jour : " + (errData.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur mise à jour :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  };

  /* =================== SUPPRESSION D'UNE SORTIE =================== */
  window.deleteRow = async function(row) {
    if (!confirm("Confirmez-vous la suppression de cette sortie ?")) return;

    const token = getToken();
    if (!token) {
      alert("Session expirée, veuillez vous reconnecter.");
      handleAuthError();
      return;
    }

    const sortieId = row.getAttribute("data-id");
    try {
      const res = await fetch("/api/sorties/" + sortieId, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        alert("Sortie supprimée !");
        await displaySorties();
      } else {
        const errData = await res.json();
        alert("Erreur lors de la suppression : " + (errData.error || "Inconnue"));
      }
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  };

  /* =================== AUTOCOMPLÉTION SOMMETS + ALTITUDE =================== */
  let debounceTimer = null;
  async function updateSummitsDatalist() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const inputSommet = document.getElementById("sommet");
      if (!inputSommet) return;
      const query = inputSommet.value.trim();
      const datalist = document.getElementById("liste-sommets");
      if (!query || query.length < 2) {
        datalist.innerHTML = "";
        return;
      }
      try {
        const res = await fetch("/api/sommets?q=" + encodeURIComponent(query));
        if (!res.ok) return;
        const sommets = await res.json();
        datalist.innerHTML = "";
        sommets.forEach(s => {
          const option = document.createElement("option");
          option.value = s.nom;
          datalist.appendChild(option);
        });
      } catch (err) {
        console.error("Erreur auto-complétion sommets :", err);
      }
    }, 300);
  }

  const inputSommet = document.getElementById("sommet");
  if (inputSommet) {
    inputSommet.addEventListener("input", updateSummitsDatalist);
    inputSommet.addEventListener("change", async () => {
      const val = inputSommet.value.trim();
      if (!val) return;
      try {
        const res = await fetch("/api/sommets?q=" + encodeURIComponent(val));
        if (!res.ok) return;
        const sommets = await res.json();
        const found = sommets.find(s => s.nom.toLowerCase() === val.toLowerCase());
        if (found) {
          const altInput = document.getElementById("altitude");
          if (altInput) altInput.value = found.altitude || "";
        }
      } catch (err) {
        console.error("Erreur récupération altitude :", err);
      }
    });
  }

});
