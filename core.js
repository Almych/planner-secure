document.addEventListener("DOMContentLoaded", () => {
    fetch('https://online-planner.onrender.com/api/config')
        .then(response => response.json())
        .then(config => {
            const firebaseApp = firebase.initializeApp(config);
            const db = firebaseApp.database();
            const tasksRef = db.ref("tasks");
            initializePublicView(tasksRef);
        })
        .catch(error => {
            console.error("Error fetching Firebase config:", error);
        });
});

function initializePublicView(tasksRef) {
    const container = document.getElementById("plan-container");
    const infoDialog = document.getElementById("plan-card");
    const titleInput = document.getElementById("title-input");
    const filterSelect = document.getElementById("filter-select");
    const sortSelect = document.getElementById("sort-select");

    let tasks = [];
    let currentFilter = new URLSearchParams(location.search).get("filter") || "all";
    let currentSort = new URLSearchParams(location.search).get("sort") || "date";

    tasksRef.once("value", (snapshot) => {
        tasks = snapshot.val() || [];
         console.log("Loaded from public/tasks:", tasks);
        renderTasks();
    });

    function updateURLState() {
        const params = new URLSearchParams();
        params.set("filter", currentFilter);
        params.set("sort", currentSort);
        history.replaceState(null, "", "?" + params.toString());
    }

    function renderTasks() {
        container.innerHTML = "";

        let filtered = [...tasks];

        if (titleInput.value.trim() !== "") {
            const q = titleInput.value.trim().toLowerCase();
            filtered = filtered.filter(task => task.title.toLowerCase().includes(q));
        }

        // Apply filter
        if (currentFilter === "completed") {
            filtered = filtered.filter(t => t.completed);
        } else if (currentFilter === "incomplete") {
            filtered = filtered.filter(t => !t.completed);
        } else {
            filtered = filtered.filter(t => !t.completed); // hide completed by default
        }

        // Apply sort
        if (currentSort === "title") {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentSort === "date") {
            filtered.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        }

        filtered.forEach(task => container.appendChild(createReadOnlyTaskElement(task)));
    }

    function createReadOnlyTaskElement(task) {
        const el = document.createElement("article");
        el.className = "plan-box";
        if (task.completed) el.classList.add("completed");

        el.innerHTML = `
            <section class="title-wrap"><p class="title-text">${task.title}</p></section>
            <section class="desc-wrap"><p class="desc-text">${task.description}</p></section>
            <section class="status-wrap">
                <span>${task.category}</span>
                <span>${task.deadline}</span>
            </section>
        `;

        el.addEventListener("click", () => ShowInfo(task));

        return el;
    }

    function ShowInfo(task) {
        infoDialog.innerHTML = `
            <section class="info-wrap">
                <h1>${task.title}</h1>
                <p>${task.description}</p>
                <p>${task.deadline}</p>
                <p>${task.category}</p>
                <p>${task.createTime}</p>
                <button id="close-info-btn">Close</button>
            </section>
        `;
        infoDialog.showModal();

        document.getElementById("close-info-btn").addEventListener("click", () => {
            infoDialog.close();
        });
    }

    filterSelect.addEventListener("change", (e) => {
        currentFilter = e.target.value;
        updateURLState();
        renderTasks();
    });

    sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        updateURLState();
        renderTasks();
    });

    titleInput.addEventListener("input", () => renderTasks());
}
