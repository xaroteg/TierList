const games = [];

const tierSettings = [
  { label: "S", color: "#ff7f7f" },
  { label: "A", color: "#ffbf7f" },
  { label: "B", color: "#ffdf7f" },
  { label: "C", color: "#bfff7f" },
  { label: "D", color: "#7fffff" },
  { label: "F", color: "#b9a0ff" }
];

const tiersElement = document.querySelector("#tiers");
const bankElement = document.querySelector("#game-bank");
const addGameForm = document.querySelector("#add-game-form");
const nameInput = document.querySelector("#game-name-input");
const imageFileInput = document.querySelector("#image-file-input");
const imageDropArea = document.querySelector("#image-drop-area");
const imageUrlInput = document.querySelector("#game-image-url");
const downloadButton = document.querySelector("#download-png");
const showNamesToggle = document.querySelector("#toggle-names");
const titleInput = document.querySelector("#title-input");
const titleElement = document.querySelector("h1");
const targetTierSelect = document.querySelector("#target-tier-select");
const moveSelectedBtn = document.querySelector("#move-selected-btn");
const removeSelectedBtn = document.querySelector("#remove-selected-btn");
const deselectAllBtn = document.querySelector("#deselect-all-btn");
const selectedGames = new Set();

// Zoom overlay
const zoomOverlay = document.createElement("div");
zoomOverlay.id = "zoom-overlay";
zoomOverlay.hidden = true;

const zoomImage = document.createElement("img");
zoomImage.id = "zoom-image";

const zoomClose = document.createElement("button");
zoomClose.id = "zoom-close";
zoomClose.type = "button";
zoomClose.textContent = "×";
zoomClose.setAttribute("aria-label", "Close zoomed image");

zoomOverlay.append(zoomImage, zoomClose);
document.body.append(zoomOverlay);

// Initialize title input
titleInput.value = titleElement.textContent;
titleInput.addEventListener("input", () => {
  titleElement.textContent = titleInput.value;
});

// Selection functions
function toggleSelection(card) {
  if (selectedGames.has(card)) {
    selectedGames.delete(card);
    card.classList.remove("selected");
  } else {
    selectedGames.add(card);
    card.classList.add("selected");
  }
  updateSelectionControls();
}

function updateSelectionControls() {
  const hasSelection = selectedGames.size > 0;
  moveSelectedBtn.disabled = !hasSelection || !targetTierSelect.value;
  removeSelectedBtn.disabled = !hasSelection;
}

function moveSelectedGames() {
  const tierValue = targetTierSelect.value;
  if (!tierValue || selectedGames.size === 0) return;

  let targetZone = bankElement;
  if (tierValue !== "bank") {
    const tiers = document.querySelectorAll("#tiers > .tier");
    for (const tier of tiers) {
      const label = tier.querySelector(".tier-label");
      if (label && label.textContent.trim() === tierValue) {
        targetZone = tier.querySelector(".tier-items");
        break;
      }
    }
  }

  Array.from(selectedGames).forEach(card => {
    targetZone.appendChild(card);
    card.classList.remove("selected");
  });

  selectedGames.clear();
  updateSelectionControls();
}

function removeSelectedGames() {
  Array.from(selectedGames).forEach(card => {
    const img = card.querySelector("img");
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    card.remove();
  });
  selectedGames.clear();
  updateSelectionControls();
}

// Game names toggle
function updateGameNamesVisibility() {
  document.body.classList.toggle("show-game-names", showNamesToggle.checked);
}
showNamesToggle.addEventListener("change", updateGameNamesVisibility);
updateGameNamesVisibility();

// Create tiers
tierSettings.forEach(({ label, color }) => {
  const row = document.createElement("section");
  row.className = "tier";
  const labelElement = document.createElement("div");
  labelElement.className = "tier-label";
  labelElement.style.backgroundColor = color;
  labelElement.textContent = label;
  const items = document.createElement("div");
  items.className = "tier-items dropzone";
  row.append(labelElement, items);
  tiersElement.append(row);
});

// Create game card
function createGameCard(game, index) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.draggable = true;
  card.dataset.id = `game-${index}`;

  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    toggleSelection(card);
  });

  const img = document.createElement("img");
  img.src = game.image;
  img.alt = game.name;
  img.loading = "lazy";
  img.draggable = false;

  const name = document.createElement("div");
  name.className = "game-name";
  name.textContent = game.name;

  const zoomBtn = document.createElement("button");
  zoomBtn.className = "zoom-game-button";
  zoomBtn.type = "button";
  zoomBtn.draggable = false;
  zoomBtn.title = `Zoom in on ${game.name}`;
  zoomBtn.setAttribute("aria-label", `Zoom in on ${game.name}`);
  zoomBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="7"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="11" y1="8" x2="11" y2="14"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-game-button";
  deleteBtn.type = "button";
  deleteBtn.textContent = "×";
  deleteBtn.title = `Delete ${game.name}`;
  deleteBtn.setAttribute("aria-label", `Delete ${game.name}`);
  deleteBtn.draggable = false;

  card.append(img, name, zoomBtn, deleteBtn);
  return card;
}

// Remove single card
function removeGameCard(card) {
  if (!card) return;
  if (selectedGames.has(card)) {
    selectedGames.delete(card);
    updateSelectionControls();
  }
  const img = card.querySelector("img");
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  card.remove();
}

// Zoom functions
function openZoom(card) {
  const img = card?.querySelector("img");
  if (!img) return;
  zoomImage.src = img.src;
  zoomImage.alt = img.alt;
  zoomOverlay.hidden = false;
  zoomClose.focus();
}

function closeZoom() {
  zoomOverlay.hidden = true;
  zoomImage.removeAttribute("src");
}

// Add images
function addImageFiles(files) {
  const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return;
  const customName = nameInput.value.trim();
  imageFiles.forEach(file => {
    const filename = file.name.replace(/\.[^/.]+$/, "");
    const game = {
      name: imageFiles.length === 1 && customName ? customName : filename,
      image: URL.createObjectURL(file)
    };
    const index = games.length;
    games.push(game);
    bankElement.append(createGameCard(game, index));
  });
  nameInput.value = "";
  imageFileInput.value = "";
}

// Event listeners for image upload
imageFileInput.addEventListener("change", () => {
  if (imageFileInput.files.length > 0) addImageFiles(imageFileInput.files);
});

imageDropArea.addEventListener("dragover", e => {
  e.preventDefault();
  imageDropArea.classList.add("drag-over");
});
imageDropArea.addEventListener("dragleave", () => {
  imageDropArea.classList.remove("drag-over");
});
imageDropArea.addEventListener("drop", e => {
  e.preventDefault();
  imageDropArea.classList.remove("drag-over");
  addImageFiles(e.dataTransfer.files);
});

// Make the entire bank content area a file drop zone
const bankContent = document.querySelector(".bank-content");
bankContent.addEventListener("dragover", (event) => {
  if (Array.from(event.dataTransfer.types).includes("Files")) {
    event.preventDefault();
    imageDropArea.classList.add("drag-over");
  }
});
bankContent.addEventListener("dragleave", () => {
  imageDropArea.classList.remove("drag-over");
});
bankContent.addEventListener("drop", (event) => {
  if (Array.from(event.dataTransfer.types).includes("Files")) {
    event.preventDefault();
    imageDropArea.classList.remove("drag-over");
    addImageFiles(event.dataTransfer.files);
  }
});

addGameForm.addEventListener("submit", e => {
  e.preventDefault();
  const imageUrl = imageUrlInput.value.trim();
  if (!imageUrl) return;
  const game = {
    name: nameInput.value.trim() || "New Game",
    image: imageUrl
  };
  const index = games.length;
  games.push(game);
  bankElement.append(createGameCard(game, index));
  addGameForm.reset();
  nameInput.value = "";
});

// Click handlers for zoom and delete
document.addEventListener("click", e => {
  const zoomButton = e.target.closest(".zoom-game-button");
  if (zoomButton) {
    openZoom(zoomButton.closest(".game-card"));
    return;
  }
  const deleteButton = e.target.closest(".delete-game-button");
  if (deleteButton) removeGameCard(deleteButton.closest(".game-card"));
});

// Zoom overlay close handlers
zoomOverlay.addEventListener("click", e => {
  if (e.target === zoomOverlay || e.target === zoomClose) closeZoom();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !zoomOverlay.hidden) closeZoom();
});

// Selection controls
targetTierSelect.addEventListener("change", updateSelectionControls);
moveSelectedBtn.addEventListener("click", moveSelectedGames);
removeSelectedBtn.addEventListener("click", removeSelectedGames);
deselectAllBtn.addEventListener("click", () => {
  selectedGames.forEach(card => card.classList.remove("selected"));
  selectedGames.clear();
  updateSelectionControls();
});

// Prevent file drops from opening in browser
["dragover", "drop"].forEach(type => {
  document.addEventListener(type, e => {
    if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
  }, true);
});

// Drag and drop for game cards
document.addEventListener("dragstart", e => {
  const card = e.target.closest(".game-card");
  if (!card) return;
  e.dataTransfer.setData("text/plain", card.dataset.id);
  e.dataTransfer.effectAllowed = "move";
  requestAnimationFrame(() => card.classList.add("dragging"));
});

document.addEventListener("dragend", e => {
  const card = e.target.closest(".game-card");
  if (card) {
    card.classList.remove("dragging");
    if (selectedGames.has(card)) {
      selectedGames.delete(card);
      card.classList.remove("selected");
      updateSelectionControls();
    }
  }
});

document.querySelectorAll(".dropzone").forEach(zone => {
  zone.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  zone.addEventListener("drop", e => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      zone.append(card);
      if (selectedGames.has(card)) {
        selectedGames.delete(card);
        card.classList.remove("selected");
        updateSelectionControls();
      }
    }
  });
});

// Download PNG
downloadButton.addEventListener("click", async () => {
  downloadButton.disabled = true;
  const exportContainer = document.createElement("div");
  exportContainer.style.backgroundColor = "#18181b";

  const titleClone = titleElement.cloneNode(true);
  titleClone.style.margin = "0 0 8px";
  exportContainer.appendChild(titleClone);

  const tiersClone = tiersElement.cloneNode(true);
  exportContainer.appendChild(tiersClone);
  document.querySelector("main").appendChild(exportContainer);

  const borderedElements = [tiersClone, ...tiersClone.querySelectorAll(".tier")];
  const originalBorderColors = borderedElements.map(el => el.style.borderColor);

  try {
    tiersClone.classList.add("exporting");
    const images = [...tiersClone.querySelectorAll("img")];
    await Promise.all(images.map(img => img.decode().catch(() => undefined)));

    const scale = window.devicePixelRatio || 1;
    const width = exportContainer.offsetWidth;
    const height = exportContainer.offsetHeight;

    borderedElements.forEach(el => el.style.borderColor = "transparent");

    const exportBlob = await domtoimage.toBlob(exportContainer, {
      bgcolor: "#18181b",
      width: width * scale,
      height: height * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${width}px`,
        height: `${height}px`
      }
    });

    const exportBitmap = await createImageBitmap(exportBlob);
    const padding = Math.round(20 * scale);
    const output = document.createElement("canvas");
    output.width = exportBitmap.width + padding * 2;
    output.height = exportBitmap.height + padding * 2;
    const ctx = output.getContext("2d");
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(exportBitmap, padding, padding);
    exportBitmap.close();

    output.toBlob(blob => {
      if (!blob) {
        alert("Could not create the PNG.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${titleInput.value || "Tier List"}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  } catch (error) {
    console.error("PNG export failed:", error);
    alert("Could not create the PNG.");
  } finally {
    tiersClone.classList.remove("exporting");
    borderedElements.forEach((el, i) => el.style.borderColor = originalBorderColors[i]);
    exportContainer.remove();
    downloadButton.disabled = false;
  }
});
