"use strict";

const getUser = () => { const raw = localStorage.getItem("user"); try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
const getToken = () => localStorage.getItem("token") || "";
const isAuthed = () => !!(getToken() && getUser());
const formatValue = v => v ? `~${v}m` : "";
const handleAuthError = () => { alert("Session expirée, veuillez vous reconnecter."); localStorage.removeItem("token"); localStorage.removeItem("user"); location.href="utilisateur.html"; };
const jsonOrError = async (res) => { const ct = (res.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return await res.json(); } catch { return {error:"JSON invalide"}; } } return {error:`Réponse ${res.status}`}; };

document.addEventListener("DOMContentLoaded", () => {
  const file = (location.pathname.split("/").pop() || "index.html");

  /* Liens dynamiques (logo -> accueil si connecté) */
  const updateLinksForAuth = () => {
    document.querySelectorAll('a.logo-link, a.logo-link-mobile').forEach(a => a.href = isAuthed() ? "accueil.html" : "index.html");
    document.querySelectorAll('a[href="mon-compte.html"]').forEach(a => a.href = isAuthed() ? "mon-compte.html" : "utilisateur.html");
  };
  updateLinksForAuth();

  /* Routes protégées */
  const protectedFiles = new Set(["mon-compte.html","sorties-a-faire.html","sorties-faites.html","accueil.html"]);
  if (protectedFiles.has(file) && !isAuthed()) { location.replace("utilisateur.html"); return; }

  /* Menu mobile */
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuToggle && mobileMenu){
    const setIcon = open => {
      mobileMenuToggle.innerHTML = open
        ? `<picture><source media="(prefers-color-scheme: dark)" srcset="images/close-white.png"><source media="(prefers-color-scheme: light)" srcset="images/close-black.png"><img src="images/close-black.png" alt="Fermer" class="hamburger-icon"></picture>`
        : `<picture><source media="(prefers-color-scheme: dark)" srcset="images/hamburger-white.png"><source media="(prefers-color-scheme: light)" srcset="images/hamburger-black.png"><img src="images/hamburger-black.png" alt="Menu" class="hamburger-icon"></picture>`;
      mobileMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    setIcon(false);
    mobileMenuToggle.addEventListener("click", () => { const open = !mobileMenu.classList.contains("open"); mobileMenu.classList.toggle("open", open); setIcon(open); });
  }

  /* Index : Se connecter */
  document.getElementById("btn-go-login")?.addEventListener("click", ()=>location.href="utilisateur.html");

  /* Connexion */
  const loginForm = document.getElementById("login-form");
  if (loginForm){
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username")?.value.trim() || "";
      const password = document.getElementById("login-password")?.value.trim() || "";
      if (!username || !password) return alert("Veuillez remplir tous les champs.");
      try{
        const res = await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
        const data = await jsonOrError(res);
        if (res.ok && data?.token){
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user||{}));
          updateLinksForAuth();
          location.replace("accueil.html");              // -> plus de fallback
        } else alert("Erreur de connexion : " + (data?.error || `Statut ${res.status}`));
      }catch(err){ console.error(err); alert("Erreur lors de la connexion au serveur"); }
    });
    document.getElementById("btn-creer-compte")?.addEventListener("click",()=>location.assign("creer-compte.html"));
  }

  /* Inscription */
  const registerForm = document.getElementById("register-form");
  if (registerForm){
    registerForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const firstName = document.getElementById("register-firstname")?.value.trim()||"";
      const lastName  = document.getElementById("register-lastname")?.value.trim()||"";
      const username  = document.getElementById("register-username")?.value.trim()||"";
      const password  = document.getElementById("register-password")?.value.trim()||"";
      const birthdate = document.getElementById("register-birthdate")?.value||"";
      if(!firstName||!lastName||!username||!password||!birthdate) return alert("Veuillez remplir tous les champs.");
      try{
        const res = await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({firstName,lastName,username,password,birthdate})});
        const data = await jsonOrError(res);
        if (res.ok && data?.token){
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user||{}));
          updateLinksForAuth();
          location.replace("accueil.html");              // -> plus de fallback
        } else alert("Erreur d'inscription : " + (data?.error || `Statut ${res.status}`));
      }catch(err){ console.error(err); alert("Erreur lors de la connexion au serveur"); }
    });
  }

  /* Logout */
  document.getElementById("logout")?.addEventListener("click",(e)=>{e.preventDefault();localStorage.removeItem("token");localStorage.removeItem("user");updateLinksForAuth();location.replace("index.html")});

  /* Helpers */
  async function loadSorties(){
    const token = getToken(); if(!token) return [];
    try{
      const res = await fetch("/api/sorties",{headers:{Authorization:"Bearer "+token}});
      if (res.status===401){ handleAuthError(); return []; }
      const data = await jsonOrError(res);
      return Array.isArray(data) ? data : [];
    }catch(err){ console.error("loadSorties:",err); return []; }
  }
  const formatFRDate = (iso) => {
    if(!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("fr-FR"); // JJ/MM/AAAA
  };

  /* Affichage des sorties (sans colgroup JS) */
  async function displaySorties(){
    const sorties = await loadSorties();
    const isFaites = file.includes("sorties-faites");
    const type = isFaites ? "fait" : "a-faire";
    const body = document.getElementById(isFaites ? "table-body-fait" : "table-body-afaire");
    if(!body) return;
    body.innerHTML = "";

    sorties.filter(s=>s.type===type).forEach(s=>{
      const tr=document.createElement("tr");
      tr.setAttribute("data-id", s._id);
      if (s.type==="fait") tr.dataset.dateIso = s.date || "";
      tr.innerHTML = `
        <td class="cell-actions">
          <button class="edit-btn" type="button" onclick="editRow(this.closest('tr'), '${s.type}')">✏️</button>
          <button class="delete-btn" type="button" onclick="deleteRow(this.closest('tr'))">🗑</button>
        </td>
        <td>${s.sommet||""}</td>
        <td>${formatValue(s.altitude)}</td>
        <td>${formatValue(s.denivele)}</td>
        <td>${s.methode||""}</td>
        <td>${s.cotation||""}</td>
        <td>${s.type==="fait" ? formatFRDate(s.date) : (s.annee||"")}</td>
        <td></td>
      `;
      const detailsTd = tr.children[7];
      const clamp = document.createElement("div");
      clamp.className = "clamp-3";
      clamp.textContent = s.details || "";
      detailsTd.appendChild(clamp);

      body.appendChild(tr);
    });
  }
  displaySorties();

  /* FAB + modales */
  function wireModal(fabId, dialogId){
    const fab = document.getElementById(fabId);
    const dlg = document.getElementById(dialogId);
    if(!fab || !dlg) return;
    fab.addEventListener("click", ()=>dlg.showModal());
    dlg.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click", ()=>dlg.close()));
  }
  wireModal("fab-add-fait", "modal-fait");
  wireModal("fab-add-afaire", "modal-afaire");

  /* Ajout À faire */
  const formAFaire = document.getElementById("form-a-faire");
  if(formAFaire){
    const methodeSelect=document.getElementById("methode");
    const cotationSelect=document.getElementById("cotation");
    const yearSelect=document.getElementById("year");
    const detailsInput=document.getElementById("details");
    const dlg = document.getElementById("modal-afaire");
    const cotationsMap={Alpinisme:["F","PD","AD","D","TD","ED","ABO"], Randonnée:["Facile","Moyen","Difficile","Expert"], Escalade:["3","4a","4b","4c","5a","5b","5c","6a","6b","6c","7a","7b","7c"]};
    methodeSelect?.addEventListener("change",()=>{
      cotationSelect.innerHTML=`<option value="" disabled selected>Cotation</option>`;
      (cotationsMap[methodeSelect.value]||[]).forEach(opt=>{ const o=document.createElement("option"); o.value=opt; o.textContent=opt; cotationSelect.appendChild(o); });
    });
    if(yearSelect){
      const y0=new Date().getFullYear();
      yearSelect.innerHTML=`<option value="" disabled selected>Année</option>`;
      for(let i=0;i<10;i++){ const y=y0+i; const o=document.createElement("option"); o.value=y; o.textContent=y; yearSelect.appendChild(o); }
    }
    formAFaire.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const token=getToken(); if(!token){ alert("Vous n'êtes pas connecté."); return location.replace("utilisateur.html"); }
      const sommet=(document.getElementById("sommet")?.value||"").trim();
      const altitude=(document.getElementById("altitude")?.value||"").trim();
      const denivele=(document.getElementById("denivele")?.value||"").trim();
      const methode=methodeSelect?.value||""; const cotation=cotationSelect?.value||"";
      const annee=yearSelect?.value||""; const details=(detailsInput?.value||"").trim();
      if(!sommet||!altitude||!denivele||!methode||!cotation||!annee) return alert("Veuillez remplir tous les champs obligatoires.");
      try{
        const res=await fetch("/api/sorties",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({type:"a-faire",sommet,altitude,denivele,methode,cotation,annee,details})});
        if(res.status===401) return handleAuthError();
        const data=await jsonOrError(res);
        if(res.ok){ dlg?.close(); formAFaire.reset(); await displaySorties(); }
        else alert("Erreur : "+(data.error||`Statut ${res.status}`));
      }catch(err){ console.error(err); alert("Erreur réseau"); }
    });
  }

  /* Ajout Fait */
  const formFait = document.getElementById("form-fait");
  if(formFait){
    const methodeFaitSelect=document.getElementById("methode-fait");
    const cotationFaitSelect=document.getElementById("cotation-fait");
    const dateInput=document.getElementById("date");
    const detailsFait=document.getElementById("details-fait");
    const dlg = document.getElementById("modal-fait");
    const cotationsMap={Alpinisme:["F","PD","AD","D","TD","ED","ABO"], Randonnée:["Facile","Moyen","Difficile","Expert"], Escalade:["3","4a","4b","4c","5a","5b","5c","6a","6b","6c","7a","7b","7c"]};
    methodeFaitSelect?.addEventListener("change",()=>{
      cotationFaitSelect.innerHTML=`<option value="" disabled selected>Cotation</option>`;
      (cotationsMap[methodeFaitSelect.value]||[]).forEach(opt=>{ const o=document.createElement("option"); o.value=opt; o.textContent=opt; cotationFaitSelect.appendChild(o); });
    });
    formFait.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const token=getToken(); if(!token){ alert("Vous n'êtes pas connecté."); return location.replace("utilisateur.html"); }
      const sommet=(document.getElementById("sommet-fait")?.value||"").trim();
      const altitude=(document.getElementById("altitude-fait")?.value||"").trim();
      const denivele=(document.getElementById("denivele-fait")?.value||"").trim();
      const methode=methodeFaitSelect?.value||""; const cotation=cotationFaitSelect?.value||"";
      const dateVal=dateInput?.value||""; const details=(detailsFait?.value||"").trim();
      if(!sommet||!altitude||!denivele||!methode||!cotation||!dateVal) return alert("Veuillez remplir tous les champs obligatoires.");
      try{
        const res=await fetch("/api/sorties",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({type:"fait",sommet,altitude,denivele,methode,cotation,date:dateVal,details})});
        if(res.status===401) return handleAuthError();
        const data=await jsonOrError(res);
        if(res.ok){ dlg?.close(); formFait.reset(); await displaySorties(); }
        else alert("Erreur : "+(data.error||`Statut ${res.status}`));
      }catch(err){ console.error(err); alert("Erreur réseau"); }
    });
  }

  /* Edition */
  const methods=["Alpinisme","Randonnée","Escalade"];
  const cotationsByMethod={
    Alpinisme:["F","PD","AD","D","TD","ED","ABO"],
    Randonnée:["Facile","Moyen","Difficile","Expert"],
    Escalade:["3","4a","4b","4c","5a","5b","5c","6a","6b","6c","7a","7b","7c"],
  };
  const autoResize = ta => { ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,200)+"px"; };

  window.editRow = function(row, mode){
    const cells=row.querySelectorAll("td");
    if(cells.length<8) return console.error("Ligne invalide",row);
    const sommetVal=cells[1].textContent;
    const altitudeVal=cells[2].textContent.replace(/^~/,"").replace(/m$/,"").trim();
    const deniveleVal=cells[3].textContent.replace(/^~/,"").replace(/m$/,"").trim();
    const methodeVal=cells[4].textContent;
    const cotationVal=cells[5].textContent;
    const dateOrYearIso=row.dataset.dateIso || "";
    const detailsVal=cells[7].textContent;

    cells[1].innerHTML=`<input type="text" value="${sommetVal}" class="tbl-input">`;
    cells[2].innerHTML=`<input type="number" value="${altitudeVal}" class="tbl-input tbl-input--num">`;
    cells[3].innerHTML=`<input type="number" value="${deniveleVal}" class="tbl-input tbl-input--num">`;

    const met=document.createElement("select"); met.className="tbl-input tbl-input--method";
    methods.forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; if(m===methodeVal) o.selected=true; met.appendChild(o); });
    cells[4].innerHTML=""; cells[4].appendChild(met);

    const cot=document.createElement("select"); cot.className="tbl-input tbl-input--cot";
    const refill=(meth,sel)=>{ cot.innerHTML=""; (cotationsByMethod[meth]||[]).forEach(x=>{ const o=document.createElement("option"); o.value=x; o.textContent=x; if(x===sel) o.selected=true; cot.appendChild(o); }); };
    refill(methodeVal, cotationVal);
    cells[5].innerHTML=""; cells[5].appendChild(cot);
    met.addEventListener("change",()=>refill(met.value, cot.value));

    cells[6].innerHTML = mode==="fait"
      ? `<input type="date" value="${dateOrYearIso || ""}" class="tbl-input tbl-input--date">`
      : `<input type="number" value="${cells[6].textContent.trim()}" class="tbl-input tbl-input--year">`;

    const ta=document.createElement("textarea"); ta.className="tbl-input tbl-input--details"; ta.rows=3; ta.value=detailsVal;
    cells[7].innerHTML=""; cells[7].appendChild(ta); autoResize(ta); ta.addEventListener("input",()=>autoResize(ta));

    cells[0].innerHTML=`
      <div class="cell-actions">
        <button class="edit-btn save-btn" type="button" title="Sauvegarder">💾</button>
        <button class="delete-btn cancel-btn" type="button" title="Annuler">❌</button>
      </div>
    `;
    cells[0].querySelector(".cancel-btn").addEventListener("click", ()=>displaySorties());
    cells[0].querySelector(".save-btn").addEventListener("click", async ()=>{
      const token=getToken(); if(!token) return handleAuthError();
      const sortieUpdate={
        sommet: cells[1].querySelector("input").value.trim(),
        altitude: cells[2].querySelector("input").value.trim(),
        denivele: cells[3].querySelector("input").value.trim(),
        methode: met.value,
        cotation: cot.value,
        details: cells[7].querySelector("textarea").value.trim(),
      };
      const d=cells[6].querySelector("input").value;
      if(!sortieUpdate.sommet||!sortieUpdate.altitude||!sortieUpdate.denivele||!sortieUpdate.methode||!sortieUpdate.cotation||!d)
        return alert("Veuillez remplir tous les champs obligatoires.");
      if(mode==="fait") sortieUpdate.date=d; else sortieUpdate.annee=d;

      const id=row.getAttribute("data-id");
      try{
        const res=await fetch("/api/sorties/"+id,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(sortieUpdate)});
        if(res.status===401) return handleAuthError();
        const data=await jsonOrError(res);
        if(res.ok){ alert("Sortie mise à jour !"); await displaySorties(); }
        else alert("Erreur : "+(data.error||`Statut ${res.status}`));
      }catch(err){ console.error("update:",err); alert("Erreur réseau"); }
    });
  };

  /* Autocomplétion sommets */
  let debounce=null;
  async function updateSummitsDatalist(){
    clearTimeout(debounce);
    debounce=setTimeout(async ()=>{
      const input=document.getElementById("sommet"); if(!input) return;
      const q=input.value.trim(); const datalist=document.getElementById("summits-list"); if(!datalist) return;
      if(!q || q.length<2){ datalist.innerHTML=""; return; }
      try{
        const res=await fetch("/api/sommets?q="+encodeURIComponent(q)); if(!res.ok) return;
        const list=await res.json(); datalist.innerHTML="";
        list.forEach(s=>{ const o=document.createElement("option"); o.value=s.nom; datalist.appendChild(o); });
      }catch(err){ console.error("autocomplete:",err); }
    },300);
  }
  const sommetInput=document.getElementById("sommet");
  if(sommetInput){
    sommetInput.addEventListener("input",updateSummitsDatalist);
    sommetInput.addEventListener("change", async ()=>{
      const val=sommetInput.value.trim(); if(!val) return;
      try{
        const res=await fetch("/api/sommets?q="+encodeURIComponent(val)); if(!res.ok) return;
        const list=await res.json(); const found=list.find(s=>(s.nom||"").toLowerCase()===val.toLowerCase());
        if(found){ const alt=document.getElementById("altitude"); if(alt) alt.value=found.altitude||""; }
      }catch(err){ console.error("altitude:",err); }
    });
  }
});

/* Suppression (inchangé) */
window.deleteRow = async function(row){
  if(!confirm("Confirmez-vous la suppression de cette sortie ?")) return;
  const token=getToken(); if(!token) return handleAuthError();
  const sortieId=row.getAttribute("data-id");
  try{
    const res=await fetch("/api/sorties/"+sortieId,{method:"DELETE",headers:{Authorization:"Bearer "+token}});
    if(res.status===401) return handleAuthError();
    if(res.ok){ alert("Sortie supprimée !"); row.remove(); }
    else{
      const errData=await res.json().catch(()=>({}));
      alert("Erreur lors de la suppression : "+(errData.error||"Inconnue"));
    }
  }catch(err){ console.error("Erreur suppression :",err); alert("Erreur lors de la connexion au serveur"); }
};
