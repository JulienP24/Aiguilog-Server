// script.js

const API_URL = 'http://localhost:3000/api';

// Gestion menu mobile (toggle)
document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('open');
});

// Stockage local user et token
function saveUserData(data) {
  localStorage.setItem('aiguilog_token', data.token);
  localStorage.setItem('aiguilog_user', JSON.stringify(data.user));
}
function clearUserData() {
  localStorage.removeItem('aiguilog_token');
  localStorage.removeItem('aiguilog_user');
}
function getUser() {
  const user = localStorage.getItem('aiguilog_user');
  return user ? JSON.parse(user) : null;
}
function getToken() {
  return localStorage.getItem('aiguilog_token');
}

// Redirection si non connecté sur pages protégées
const protectedPages = ['sorties-faites.html', 'sorties-a-faire.html', 'mon-compte.html', 'acceuil-connecte.html'];
const currentPage = window.location.pathname.split('/').pop();

if (protectedPages.includes(currentPage) && !getToken()) {
  window.location.href = 'connexion.html';
}

// Affichage utilisateur sur accueil connecté
if (currentPage === 'acceuil-connecte.html') {
  const user = getUser();
  if (user) {
    document.getElementById('username-welcome').textContent = user.firstname || user.username;
  }
}

// Affichage info utilisateur sur mon compte
if (currentPage === 'mon-compte.html') {
  const user = getUser();
  if (user) {
    document.getElementById('user-fullname').textContent = `${user.firstname} ${user.lastname}`;
    document.getElementById('user-username').textContent = user.username;
    document.getElementById('user-birthdate').textContent = new Date(user.birthdate).toLocaleDateString('fr-FR');
  }
}

// Déconnexion (boutons)
function logout() {
  clearUserData();
  window.location.href = 'index.html';
}
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('logout-mobile-btn')?.addEventListener('click', logout);

// Formulaire de connexion
const loginForm = document.getElementById('login-form');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    alert('Veuillez remplir tous les champs.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Erreur lors de la connexion.');
      return;
    }

    saveUserData(data);
    window.location.href = 'acceuil-connecte.html';
  } catch (error) {
    console.error(error);
    alert('Erreur réseau, veuillez réessayer plus tard.');
  }
});

// Formulaire d'inscription
const registerForm = document.getElementById('register-form');
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstname = document.getElementById('register-firstname').value.trim();
  const lastname = document.getElementById('register-lastname').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const birthdate = document.getElementById('register-birthdate').value;

  if (!firstname || !lastname || !username || !password || !birthdate) {
    alert('Veuillez remplir tous les champs.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname, lastname, username, password, birthdate }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Erreur lors de la création du compte.');
      return;
    }

    alert('Compte créé avec succès, vous pouvez maintenant vous connecter.');
    window.location.href = 'connexion.html';
  } catch (error) {
    console.error(error);
    alert('Erreur réseau, veuillez réessayer plus tard.');
  }
});
