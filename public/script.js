document.addEventListener("DOMContentLoaded", () => {
  // ===== Pour index.html =====
  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) {
    btnGoLogin.addEventListener("click", () => {
      window.location.href = "utilisateur.html";
    });
  }

  // ===== Pour utilisateur.html (Login) =====
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();
      const userData = JSON.parse(localStorage.getItem('user_' + username));
      if (!userData) {
        alert("Cet identifiant n'existe pas. Veuillez créer un compte.");
        return;
      }
      if (userData.password !== password) {
        alert("Mot de passe incorrect.");
        return;
      }
      sessionStorage.setItem('connectedUser', username);
      window.location.href = "mon-compte.html";
    });
    const btnCreerCompte = document.getElementById("btn-creer-compte");
    if (btnCreerCompte) {
      btnCreerCompte.addEventListener("click", () => {
        window.location.href = "creer-compte.html";
      });
    }
  }

  // ===== Pour creer-compte.html (Registration) =====
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("register-username").value.trim();
      const password = document.getElementById("register-password").value.trim();
      const birthdate = document.getElementById("register-birthdate").value;
      if (localStorage.getItem("user_" + username)) {
        alert("Cet identifiant existe déjà, veuillez en choisir un autre.");
        return;
      }
      const createdAt = new Date().toISOString();
      const userData = {
        username: username,
        password: password,
        birthdate: birthdate,
        createdAt: createdAt
      };
      localStorage.setItem("user_" + username, JSON.stringify(userData));
      sessionStorage.setItem("connectedUser", username);
      window.location.href = "mon-compte.html";
    });
  }

  // ===== Pour mon-compte.html =====
  const connectedUser = sessionStorage.getItem("connectedUser");
  if (document.getElementById("titre-bienvenue") && !connectedUser) {
    window.location.href = "utilisateur.html";
  }
  if (document.getElementById("titre-bienvenue") && connectedUser) {
    const userData = JSON.parse(localStorage.getItem("user_" + connectedUser) || "{}");
    const titreBienvenue = document.getElementById("titre-bienvenue");
    const infoMembre = document.getElementById("info-membre");
    if (userData.username) {
      titreBienvenue.textContent = "Bienvenue, " + userData.username;
      if (userData.createdAt) {
        const date = new Date(userData.createdAt);
        infoMembre.textContent = "Membre depuis le " + date.toLocaleDateString("fr-FR");
      }
    }

    const changeUsernameForm = document.getElementById("change-username-form");
    if (changeUsernameForm) {
      changeUsernameForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newUsername = document.getElementById("new-username").value.trim();
        if (localStorage.getItem("user_" + newUsername)) {
          alert("Ce nom d'utilisateur est déjà utilisé.");
          return;
        }
        localStorage.removeItem("user_" + userData.username);
        userData.username = newUsername;
        localStorage.setItem("user_" + newUsername, JSON.stringify(userData));
        sessionStorage.setItem("connectedUser", newUsername);
        alert("Nom d'utilisateur mis à jour avec succès !");
        window.location.reload();
      });
    }

    const changePasswordForm = document.getElementById("change-password-form");
    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newPassword = document.getElementById("new-password").value.trim();
        userData.password = newPassword;
        localStorage.setItem("user_" + userData.username, JSON.stringify(userData));
        alert("Mot de passe mis à jour avec succès !");
        window.location.reload();
      });
    }

    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("connectedUser");
        window.location.href = "index.html";
      });
    }
  }

  // ===== Pour sorties-a-faire.html =====
  const formAFaire = document.getElementById("form-a-faire");
  if (formAFaire) {
    const methodeSelect = document.getElementById("methode");
    const cotationSelect = document.getElementById("cotation");
    const tableBodyAFaire = document.getElementById("table-body-afaire");
    const cotationsParMéthode = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };

    if (methodeSelect && cotationSelect) {
      methodeSelect.addEventListener("change", () => {
        const methode = methodeSelect.value;
        cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
        if (cotationsParMéthode[methode]) {
          cotationsParMéthode[methode].forEach(cot => {
            const opt = document.createElement("option");
            opt.value = cot;
            opt.textContent = cot;
            cotationSelect.appendChild(opt);
          });
        }
      });
    }

    formAFaire.addEventListener("submit", (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet").value.trim();
      const altitudeVal = document.getElementById("altitude").value.trim();
      const deniveleVal = document.getElementById("denivele").value.trim();
      const details = document.getElementById("details").value.trim();
      const methode = methodeSelect.value;
      const cotation = cotationSelect.value;
      const date = document.getElementById("date").value;

      function formatValue(val) {
        return val ? `~${val}m` : "";
      }
      const altFormatted = formatValue(altitudeVal);
      const denFormatted = formatValue(deniveleVal);

      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td><button class="edit-btn" onclick="toggleEdit(this)">✏️</button></td>
        <td>${sommet}</td>
        <td>${altFormatted}</td>
        <td>${denFormatted}</td>
        <td>${details}</td>
        <td>${methode}</td>
        <td>${cotation}</td>
        <td>${date}</td>
      `;
      tableBodyAFaire.appendChild(newRow);
      formAFaire.reset();
      cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
    });
  }

  // ===== Pour sorties-faites.html =====
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    const methodeFait = document.getElementById("methode-fait");
    const cotationFait = document.getElementById("cotation-fait");
    const yearFait = document.getElementById("year-fait");
    const tableBodyFait = document.getElementById("table-body-fait");
    const cotationsParMéthode = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };

    if (methodeFait && cotationFait) {
      methodeFait.addEventListener("change", () => {
        const methode = methodeFait.value;
        cotationFait.innerHTML = '<option value="" disabled selected>Cotation</option>';
        if (cotationsParMéthode[methode]) {
          cotationsParMéthode[methode].forEach(cot => {
            const opt = document.createElement("option");
            opt.value = cot;
            opt.textContent = cot;
            cotationFait.appendChild(opt);
          });
        }
      });
    }

    if (yearFait) {
      const currentYear = new Date().getFullYear();
      const range = 10; // Par exemple, 10 prochaines années
      for (let i = 0; i < range; i++) {
        const option = document.createElement("option");
        option.value = currentYear + i;
        option.textContent = currentYear + i;
        yearFait.appendChild(option);
      }
    }

    formFait.addEventListener("submit", (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet-fait").value.trim();
      const altitudeVal = document.getElementById("altitude-fait").value.trim();
      const deniveleVal = document.getElementById("denivele-fait").value.trim();
      const details = document.getElementById("details-fait").value.trim();
      const methode = methodeFait.value;
      const cotation = cotationFait.value;
      const annee = yearFait.value;

      function formatValue(val) {
        return val ? `~${val}m` : "";
      }
      const altFormatted = formatValue(altitudeVal);
      const denFormatted = formatValue(deniveleVal);

      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td><button class="edit-btn" onclick="toggleEdit(this)">✏️</button></td>
        <td>${sommet}</td>
        <td>${altFormatted}</td>
        <td>${denFormatted}</td>
        <td>${details}</td>
        <td>${methode}</td>
        <td>${cotation}</td>
        <td>${annee}</td>
      `;
      tableBodyFait.appendChild(newRow);
      formFait.reset();
      cotationFait.innerHTML = '<option value="" disabled selected>Cotation</option>';
    });
  }

  // ===== Fonction de basculement du mode édition =====
  window.toggleEdit = function (btn) {
    const row = btn.parentElement.parentElement;
    const isEditing = row.getAttribute("data-editing") === "true";
    const cells = row.querySelectorAll("td:not(:first-child)");
    function formatValue(val) {
      return val ? `~${val}m` : "";
    }
    if (!isEditing) {
      // Activer l'édition
      cells.forEach(cell => {
        cell.contentEditable = "true";
        cell.classList.add("editable");
      });
      row.setAttribute("data-editing", "true");
      btn.textContent = "✔️";
    } else {
      // Désactiver l'édition et reformater les colonnes altitude et dénivelé
      cells.forEach(cell => {
        cell.contentEditable = "false";
        cell.classList.remove("editable");
      });
      const altitudeCell = row.children[2];
      altitudeCell.textContent = formatValue(
        altitudeCell.textContent.replace(/^~/, "").replace(/m$/, "").trim()
      );
      const deniveleCell = row.children[3];
      deniveleCell.textContent = formatValue(
        deniveleCell.textContent.replace(/^~/, "").replace(/m$/, "").trim()
      );
      row.setAttribute("data-editing", "false");
      btn.textContent = "✏️";
    }
  }
});
