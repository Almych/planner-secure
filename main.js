document.addEventListener("DOMContentLoaded", () => {
    fetch('https://online-planner.onrender.com/api/config')
        .then(response => response.json())
        .then(config => {
            const firebaseApp = firebase.initializeApp(config);
            const db = firebaseApp.database();
            const tasksRef = db.ref("tasks");
            initializeApp(tasksRef);
        })
        .catch(error => {
            console.error("Error fetching Firebase config:", error);
        });
});


function initializeApp(tasksRef) {
    const container = document.getElementById("plan-container");
    const dialog = document.getElementById("plan-dialog");
    const infoDialog = document.getElementById("plan-card");
    const openButton = document.getElementById("add-button");
    const closeButton = document.getElementById("cancel-button");
    const createButton = document.getElementById("create-button");
    const titleDialog = document.getElementById("dialog-title");
    const descDialog = document.getElementById("dialog-desc");
    const categoryDialog = document.getElementById("category");
    const deadlineDialog = document.getElementById("datetime");
    const filterSelect = document.getElementById("filter-select");
    const sortSelect = document.getElementById("sort-select");
    const titleInput = document.getElementById("title-input");

    let tasks = [];
    tasksRef.on("value", (snapshot) => {
        tasks = snapshot.val() || [];
        renderTasks();
    });

    let selectedTaskIds = new Set();
    let lastSelectedIndex = null;
    let currentFilter = new URLSearchParams(location.search).get("filter") || "all";
    let currentSort = new URLSearchParams(location.search).get("sort") || "date";

    function saveTasks() {
        tasksRef.set(tasks);
    }

    function updateURLState() {
        const params = new URLSearchParams();
        params.set("filter", currentFilter);
        params.set("sort", currentSort);
        history.replaceState(null, "", "?" + params.toString());
    }

    function clearDialog() {
        titleDialog.value = "";
        descDialog.value = "";
        categoryDialog.value = "work";
        deadlineDialog.value = "";
    }

    function renderTasks() {
        container.innerHTML = "";
    
        let filtered = [...tasks];
    
        // Apply title search first
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
            // Default: hide completed unless explicitly filtered
            filtered = filtered.filter(t => !t.completed);
        }
    
        // Apply sort
        if (currentSort === "title") {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentSort === "date") {
            filtered.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        } else if (currentSort === "status") {
            filtered.sort((a, b) => a.completed - b.completed);
        }
    
        filtered.forEach(task => container.appendChild(createTaskElement(task)));
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

    function createTaskElement(task) {
        const el = document.createElement("article");
        el.className = "plan-box";
        el.dataset.id = task.id;
        el.draggable = true;

        if (task.completed) el.classList.add("completed");
        if (selectedTaskIds.has(task.id)) el.classList.add("selected");

        el.innerHTML = `
            <section class="title-wrap"><p class="title-text">${task.title}</p></section>
            <section class="desc-wrap"><p class="desc-text">${task.description}</p></section>
            <section class="status-wrap">
                <input type="checkbox" ${task.completed ? "checked" : ""} class="complete-check">
                <button class="edit-button">✏️</button>
                <button class="delete-button">🗑️</button>
            </section>
        `;

        el.addEventListener("click", (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            const idx = tasks.findIndex(t => t.id === task.id);
            if (e.shiftKey && lastSelectedIndex !== null) {
                const range = [lastSelectedIndex, idx].sort((a, b) => a - b);
                for (let i = range[0]; i <= range[1]; i++) selectedTaskIds.add(tasks[i].id);
            } else {
                selectedTaskIds = new Set([task.id]);
                lastSelectedIndex = idx;
            }
            renderTasks();
            ShowInfo(task);
        });

        // Toggle completion (but don’t delete)
        el.querySelector(".complete-check").addEventListener("change", () => {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        });

        // Edit task
        el.querySelector(".edit-button").addEventListener("click", () => {
            titleDialog.value = task.title;
            descDialog.value = task.description;
            categoryDialog.value = task.category;
            deadlineDialog.value = task.deadline;

            dialog.showModal();
            createButton.innerText = "edit";
            createButton.removeEventListener("click", handleCreate);

            const onSave = () => {
                task.title = titleDialog.value.trim();
                task.description = descDialog.value.trim();
                task.category = categoryDialog.value;
                task.deadline = deadlineDialog.value;

                saveTasks();
                dialog.close();
                createButton.innerText = "create";
                createButton.removeEventListener("click", onSave);
                createButton.addEventListener("click", handleCreate);
                clearDialog();
            };

            createButton.addEventListener("click", onSave);
        });

        // Delete task
        el.querySelector(".delete-button").addEventListener("click", () => {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            renderTasks();
        });

        el.addEventListener("dragstart", () => el.classList.add("dragging"));
        el.addEventListener("dragend", () => {
            el.classList.remove("dragging");
            const elements = [...container.querySelectorAll(".plan-box")];
            elements.forEach((el, index) => {
                const task = tasks.find(t => t.id === el.dataset.id);
                task.order = index;
            });
            saveTasks();
        });

        return el;
    }

    container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging");
        const after = getDragAfterElement(container, e.clientY);
        if (!after) container.appendChild(dragging);
        else container.insertBefore(dragging, after);
    });

    function getDragAfterElement(container, y) {
        const boxes = [...container.querySelectorAll(".plan-box:not(.dragging)")];
        return boxes.reduce((closest, box) => {
            const rect = box.getBoundingClientRect();
            const offset = y - rect.top - rect.height / 2;
            return offset < 0 && offset > closest.offset ? { offset, element: box } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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

    function handleCreate() {
        const title = titleDialog.value.trim();
        const description = descDialog.value.trim();
        if (!title) return alert("Title is required");

        const task = {
            id: crypto.randomUUID(),
            title,
            description,
            category: categoryDialog.value,
            deadline: deadlineDialog.value,
            completed: false,
            createTime: new Date().toISOString(),
            order: tasks.length
        };

        tasks.push(task);

        // Cap total to 20, remove oldest
        if (tasks.length > 20) {
            tasks.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
            tasks = tasks.slice(tasks.length - 20);
        }

        // Reassign order
        tasks.forEach((t, idx) => t.order = idx);

        saveTasks();
        dialog.close();
        clearDialog();
        renderTasks();
    }

    createButton.addEventListener("click", handleCreate);

    openButton.addEventListener("click", () => {
        dialog.showModal();
        clearDialog();
    });

    closeButton.addEventListener("click", () => {
        clearDialog();
        dialog.close();
        createButton.innerText = "create";
        createButton.removeEventListener("click", handleCreate);
        createButton.addEventListener("click", handleCreate);
    });
}
