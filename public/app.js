const apiUrl = 'https://aiguilog-server.onrender.com/api'; // adapte selon ta config

// Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnShowLogin = document.getElementById('btn-show-login');
const btnShowRegister = document.getElementById('btn-show-register');
const closeLogin = document.getElementById('close-login');
const closeRegister = document.getElementById('close-register');
const mainContent = document.getElementById('main-content');
const navLinks = document.getElementById('nav-links');
const userIcon = document.getElementById('user-icon');
const welcomeMsg = document.getElementById('welcome-msg');
const authForms = document.getElementById('auth-forms');

// Stockage token + user
let currentUser = null;
let token = null;

// Afficher/masquer formulaire
btnShowLogin.addEventListener('click', () => {
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
});
btnShowRegister.addEventListener('click', () => {
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});
closeLogin.addEventListener('click', () => loginForm.classList.add('hidden'));
closeRegister.addEventListener('click', () => registerForm.classList.add('hidden'));

// Register
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nom = document.getElementById('reg-nom').value.trim();
  const prenom = document.getElementById('reg-prenom').value.trim();
  const pseudo = document.getElementById('reg-pseudo').value.trim();
  const dateNaissance = document.getElementById('reg-dateNaissance').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, pseudo, dateNaissance, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur inscription');

    token = data.token;
    currentUser = data.user;

    updateUIAfterLogin();
    registerForm.classList.add('hidden');
  } catch (err) {
    alert('Erreur inscription : ' + err.message);
  }
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pseudo = document.getElementById('login-pseudo').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur connexion');

    token = data.token;
    currentUser = data.user;

    updateUIAfterLogin();
    loginForm.classList.add('hidden');
  } catch (err) {
    alert('Erreur connexion : ' + err.message);
  }
});

// Mise à jour de l’UI selon état connexion
function updateUIAfterLogin() {
  welcomeMsg.textContent = `Bonjour, ${currentUser.prenom} !`;
  authForms.style.display = 'none';
  navLinks.style.display = 'flex';
  userIcon.textContent = currentUser.pseudo;
  userIcon.style.cursor = 'pointer';
  userIcon.onclick = () => {
    // afficher profil ou déconnexion
    showProfile();
  };
}

// Afficher profil simple + bouton déconnexion
function showProfile() {
  mainContent.innerHTML = `
    <h2>Profil de ${currentUser.prenom} ${currentUser.nom}</h2>
    <p>Pseudo: ${currentUser.pseudo}</p>
    <p>Date de naissance: ${new Date(currentUser.dateNaissance).toLocaleDateString()}</p>
    <button id="btn-logout">Se déconnecter</button>
  `;
  document.getElementById('btn-logout').addEventListener('click', logout);
}

// Déconnexion
function logout() {
  token = null;
  currentUser = null;
  welcomeMsg.textContent = '';
  authForms.style.display = 'block';
  navLinks.style.display = 'none';
  userIcon.textContent = '';
  mainContent.innerHTML = `<h1>Bienvenue sur Aiguilog</h1>`;
  userIcon.onclick = null;
}

// Au départ : masquer liens nav
navLinks.style.display = 'none';

// Logo aiguilog clique
document.getElementById('logo').addEventListener('click', () => {
  if (!currentUser) {
    alert('Tu n\'es pas connecté, redirection vers connexion');
    loginForm.classList.remove('hidden');
  } else {
    mainContent.innerHTML = `<h1>Bonjour, ${currentUser.prenom} ! Bienvenue sur Aiguilog.</h1><p>Profite bien !</p>`;
  }
});
