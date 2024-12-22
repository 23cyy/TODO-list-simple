/***********************
 *  GESTION DES TACHES  *
 ***********************/
let tasks = [];

// Sélecteurs
const taskForm      = document.getElementById('taskForm');
const taskList      = document.getElementById('taskList');
const editModal     = document.getElementById('editModal');
const closeModal    = document.getElementById('closeModal');
const editTaskForm  = document.getElementById('editTaskForm');
const editTaskId    = document.getElementById('editTaskId');
const editTitle     = document.getElementById('editTitle');
const editDesc      = document.getElementById('editDescription');
const editDueDate   = document.getElementById('editDueDate');

// Sélecteurs pour la modale d’alarme
const alarmModal       = document.getElementById('alarmModal');
const alarmCloseBtn    = document.getElementById('alarmCloseBtn');
const alarmMessageElem = document.getElementById('alarmMessage');

let alarmAudio; // Variable globale pour stocker l'Audio en cours

// Chargement des tâches depuis localStorage au démarrage
window.addEventListener('DOMContentLoaded', () => {
  loadTasksFromLocalStorage();
  renderTasks();

  // Lance la vérification des alarmes toutes les 10 secondes
  setInterval(checkTaskAlarms, 10_000);
});

/**
 * Ajoute une nouvelle tâche à la liste.
 */
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title       = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const dueDate     = document.getElementById('dueDate').value;

  if (!title || !description || !dueDate) {
    alert("Veuillez remplir tous les champs avant d'ajouter la tâche.");
    return;
  }

  const newTask = {
    id: Date.now(),
    title,
    description,
    dueDate,
    completed: false,
    alarmTriggered: false
  };

  tasks.push(newTask);
  saveTasksToLocalStorage();
  renderTasks();
  taskForm.reset();
});

/**
 * Met à jour l’affichage des tâches.
 */
function renderTasks() {
  taskList.innerHTML = '';

  // Tri par date d'échéance
  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.classList.add('task-item');

    // Vérification de l’échéance proche
    const now    = new Date();
    const due    = new Date(task.dueDate);
    const diffMs = due - now;
    const diff   = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diff <= 3 && !task.completed && diffMs > 0) {
      li.classList.add('due-soon');
    }

    if (task.completed) {
      li.classList.add('completed');
    }

    // Conversion pour affichage
    const dateTimeStr = formatDateTime(due);

    li.innerHTML = `
      <div class="task-title">${task.title}</div>
      <div class="task-desc">${task.description}</div>
      <div class="task-due-date">Échéance : ${dateTimeStr}</div>
      <div class="task-actions">
        <button class="btn-complete">
          ${task.completed ? 'Non fait' : 'Fait'}
        </button>
        <button class="btn-edit">Modifier</button>
        <button class="btn-delete">Supprimer</button>
      </div>
    `;

    // Bouton (compléter)
    const btnComplete = li.querySelector('.btn-complete');
    btnComplete.addEventListener('click', () => {
      task.completed = !task.completed;
      if (task.completed) {
        task.alarmTriggered = true;
      }
      saveTasksToLocalStorage();
      renderTasks();
    });

    // Bouton (éditer)
    const btnEdit = li.querySelector('.btn-edit');
    btnEdit.addEventListener('click', () => {
      openEditModal(task);
    });

    // Bouton (supprimer)
    const btnDelete = li.querySelector('.btn-delete');
    btnDelete.addEventListener('click', () => {
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });
}

/**
 * Vérifie si l’heure d’une tâche est arrivée et lance l’alarme le cas échéant.
 */
function checkTaskAlarms() {
  const now = new Date();
  tasks.forEach((task) => {
    if (!task.completed && !task.alarmTriggered) {
      const dueDateObj = new Date(task.dueDate);
      if (now >= dueDateObj) {
        // On déclenche l’alarme (non bloquante)
        showAlarmModal(task);
        task.alarmTriggered = true;
        saveTasksToLocalStorage();
      }
    }
  });
}

/**
 * Affiche la modale d’alarme, lance la musique immédiatement (non bloquante).
 */
function showAlarmModal(task) {
  // Texte dans la modale
  alarmMessageElem.textContent = `C'est l'heure de la tâche : ${task.title}`;

  // Affichage de la modale
  alarmModal.style.display = 'block';

  // Lecture d'un son d'alarme
  alarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
  alarmAudio.play().catch(err => {
    console.warn("Le son n'a pas pu être joué automatiquement :", err);
  });

  // Arrête le son au bout de 10 secondes
  setTimeout(() => {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  }, 10_000);
}

/**
 * Ferme la modale d’alarme.
 */
function closeAlarmModal() {
  alarmModal.style.display = 'none';
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
}

/**
 * Evenement de fermeture via le bouton (croix)
 */
alarmCloseBtn.addEventListener('click', closeAlarmModal);

/**
 * Fermer la modal si on clique en dehors
 */
window.addEventListener('click', (event) => {
  // Modale d'édition ?
  if (event.target === editModal) {
    editModal.style.display = 'none';
  }
  // Modale d'alarme ?
  if (event.target === alarmModal) {
    closeAlarmModal();
  }
});

/**
 * Définition de la modale d'édition
 */
function openEditModal(task) {
  editTaskId.value   = task.id;
  editTitle.value    = task.title;
  editDesc.value     = task.description;
  editDueDate.value  = task.dueDate;
  editModal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
  editModal.style.display = 'none';
});

editTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id          = parseInt(editTaskId.value);
  const newTitle    = editTitle.value.trim();
  const newDesc     = editDesc.value.trim();
  const newDueDate  = editDueDate.value;

  if (!newTitle || !newDesc || !newDueDate) {
    alert("Veuillez remplir tous les champs avant de sauvegarder la tâche.");
    return;
  }

  tasks = tasks.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        title: newTitle,
        description: newDesc,
        dueDate: newDueDate,
        // On réinitialise l'alarme si la date a changé
        alarmTriggered: false
      };
    }
    return t;
  });

  saveTasksToLocalStorage();
  renderTasks();
  editModal.style.display = 'none';
});

/**
 * Supprime une tâche
 */
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasksToLocalStorage();
  renderTasks();
}

/**
 * Sauvegarde
 */
function saveTasksToLocalStorage() {
  localStorage.setItem('myTasks', JSON.stringify(tasks));
}

/**
 * Chargement
 */
function loadTasksFromLocalStorage() {
  const storedTasks = localStorage.getItem('myTasks');
  if (storedTasks) {
    tasks = JSON.parse(storedTasks);
  }
}

/**
 * Formatage de la date pour l'affichage
 */
function formatDateTime(dateObj) {
  if (isNaN(dateObj.getTime())) return 'Date invalide';

  const optionsDate = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const optionsTime = { hour: '2-digit', minute: '2-digit' };

  const datePart = dateObj.toLocaleDateString('fr-FR', optionsDate);
  const timePart = dateObj.toLocaleTimeString('fr-FR', optionsTime);

  return `${datePart} à ${timePart}`;
}
