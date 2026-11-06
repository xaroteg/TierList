const games = [];

const defaultTiers = [
  { label: "S", color: "#ff7f7f" },
  { label: "A", color: "#ffbf7f" },
  { label: "B", color: "#ffdf7f" },
  { label: "C", color: "#bfff7f" },
  { label: "D", color: "#7fffff" },
  { label: "F", color: "#b9a0ff" }
];

// Colors offered to newly added tiers, in order. The first one not already
// used by another tier is picked; after that, colors are generated.
const extraTierColors = [
  "#ff9fd2", // pink
  "#9fb8ff", // periwinkle
  "#8fe3b0", // mint
  "#ffc9a3", // peach
  "#d9a7ff", // lilac
  "#a3e4e1", // aqua
  "#f2b8b8", // rose
  "#c9e68f"  // lime
];

const app = document.querySelector(".tierlist");
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
const titleElement = document.querySelector(".tierlist h1");
const targetTierSelect = document.querySelector("#target-tier-select");
const moveSelectedBtn = document.querySelector("#move-selected-btn");
const removeSelectedBtn = document.querySelector("#remove-selected-btn");
const deselectAllBtn = document.querySelector("#deselect-all-btn");
const selectAllBtn = document.querySelector("#select-all-btn");
const addTierBtn = document.querySelector("#add-tier-btn");
const selectedGames = new Set();
let tierCounter = 0;

// ---------- Zoom overlay ----------
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
app.append(zoomOverlay);

// ---------- Title ----------
titleInput.value = titleElement.textContent;
titleInput.addEventListener("input", () => {
  titleElement.textContent = titleInput.value;
});

// ---------- Helpers ----------
function cssVar(name, fallback) {
  const value = getComputedStyle(app).getPropertyValue(name).trim();
  return value || fallback;
}

// Dark text on light colors, light text on dark colors.
function readableTextColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#18181b";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? "#18181b" : "#ffffff";
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function getTierRows() {
  return [...tiersElement.querySelectorAll(":scope > .tier")];
}

function pickNewTierColor() {
  const used = new Set(getTierRows().map(row => row.dataset.color));
  const unused = extraTierColors.find(color => !used.has(color));
  if (unused) return unused;
  // Out of presets: spread hues around the wheel, pastel to match the others.
  const hue = (getTierRows().length * 47) % 360;
  return hslToHex(hue, 85, 75);
}

function applyTierColor(row, color) {
  const label = row.querySelector(".tier-label");
  row.dataset.color = color.toLowerCase();
  label.style.backgroundColor = color;
  label.style.color = readableTextColor(color);
  row.querySelector(".tier-color-input").value = color;
}

// ---------- Selection ----------
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
    const row = getTierRows().find(r => r.dataset.tierId === tierValue);
    if (!row) return;
    targetZone = row.querySelector(".tier-items");
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

// ---------- Names toggle ----------
function updateGameNamesVisibility() {
  app.classList.toggle("show-game-names", showNamesToggle.checked);
}
showNamesToggle.addEventListener("change", updateGameNamesVisibility);
updateGameNamesVisibility();

// ---------- Tiers ----------
// Rebuild the "move to" dropdown so it always matches the current tiers.
function refreshTierSelect() {
  const previous = targetTierSelect.value;
  targetTierSelect.replaceChildren(new Option("Select a tier...", ""));
  getTierRows().forEach(row => {
    const text = row.querySelector(".tier-label").textContent.trim() || "(untitled)";
    targetTierSelect.add(new Option(text, row.dataset.tierId));
  });
  targetTierSelect.add(new Option("Unsorted", "bank"));
  const stillThere = [...targetTierSelect.options].some(o => o.value === previous);
  targetTierSelect.value = stillThere ? previous : "";
  updateSelectionControls();
}

function updateTierControls() {
  const rows = getTierRows();
  rows.forEach((row, i) => {
    row.querySelector(".tier-up").disabled = i === 0;
    row.querySelector(".tier-down").disabled = i === rows.length - 1;
    row.querySelector(".tier-delete").disabled = rows.length === 1;
  });
}

function onTiersChanged() {
  refreshTierSelect();
  updateTierControls();
}

function makeTierButton(className, text, title) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `tier-btn ${className}`;
  btn.textContent = text;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  return btn;
}

function createTier(label, color) {
  const row = document.createElement("section");
  row.className = "tier";
  row.dataset.tierId = `tier-${++tierCounter}`;

  const labelElement = document.createElement("div");
  labelElement.className = "tier-label";
  labelElement.textContent = label;
  labelElement.contentEditable = true;
  labelElement.spellcheck = false;
  labelElement.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      labelElement.blur();
    }
  });
  labelElement.addEventListener("paste", e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " ");
    document.execCommand("insertText", false, text);
  });
  labelElement.addEventListener("input", refreshTierSelect);
  labelElement.addEventListener("blur", () => {
    if (!labelElement.textContent.trim()) labelElement.textContent = label;
    refreshTierSelect();
  });

  const items = document.createElement("div");
  items.className = "tier-items dropzone";

  const controls = document.createElement("div");
  controls.className = "tier-controls";

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "tier-color-input";
  colorInput.title = "Change tier color";
  colorInput.setAttribute("aria-label", "Change tier color");
  colorInput.addEventListener("input", () => applyTierColor(row, colorInput.value));

  const upBtn = makeTierButton("tier-up", "▲", "Move tier up");
  const downBtn = makeTierButton("tier-down", "▼", "Move tier down");
  const deleteBtn = makeTierButton("tier-delete", "✕", "Delete tier");

  upBtn.addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev) tiersElement.insertBefore(row, prev);
    onTiersChanged();
  });
  downBtn.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next) tiersElement.insertBefore(next, row);
    onTiersChanged();
  });
  deleteBtn.addEventListener("click", () => removeTier(row));

  controls.append(colorInput, upBtn, downBtn, deleteBtn);
  row.append(labelElement, items, controls);
  tiersElement.append(row);
  applyTierColor(row, color);
  return row;
}

// Deleting a tier sends its images back to Unsorted so nothing is lost.
function removeTier(row) {
  if (getTierRows().length <= 1) return;
  row.querySelectorAll(".game-card").forEach(card => bankElement.append(card));
  row.remove();
  onTiersChanged();
}

addTierBtn.addEventListener("click", () => {
  const number = getTierRows().length + 1;
  const row = createTier(`Tier ${number}`, pickNewTierColor());
  onTiersChanged();
  const label = row.querySelector(".tier-label");
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  label.focus();
  document.getSelection().selectAllChildren(label);
});

defaultTiers.forEach(({ label, color }) => createTier(label, color));
onTiersChanged();

// ---------- Game cards ----------
function createGameCard(game, index) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.draggable = true;
  card.dataset.id = `game-${index}`;

  card.addEventListener("click", e => {
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

// ---------- Zoom ----------
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

// ---------- Adding images ----------
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

// The whole bank area accepts file drops
const bankContent = document.querySelector(".bank-content");
bankContent.addEventListener("dragover", event => {
  if (Array.from(event.dataTransfer.types).includes("Files")) {
    event.preventDefault();
    imageDropArea.classList.add("drag-over");
  }
});
bankContent.addEventListener("dragleave", () => {
  imageDropArea.classList.remove("drag-over");
});
bankContent.addEventListener("drop", event => {
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

// ---------- Click handlers: zoom and delete ----------
document.addEventListener("click", e => {
  const zoomButton = e.target.closest(".zoom-game-button");
  if (zoomButton) {
    openZoom(zoomButton.closest(".game-card"));
    return;
  }
  const deleteButton = e.target.closest(".delete-game-button");
  if (deleteButton) removeGameCard(deleteButton.closest(".game-card"));
});

zoomOverlay.addEventListener("click", e => {
  if (e.target === zoomOverlay || e.target === zoomClose) closeZoom();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !zoomOverlay.hidden) closeZoom();
});

// ---------- Selection controls ----------
targetTierSelect.addEventListener("change", updateSelectionControls);
moveSelectedBtn.addEventListener("click", moveSelectedGames);
removeSelectedBtn.addEventListener("click", removeSelectedGames);
// Select every image in the Unsorted area (replaces the current selection).
selectAllBtn.addEventListener("click", () => {
  selectedGames.forEach(card => card.classList.remove("selected"));
  selectedGames.clear();
  bankElement.querySelectorAll(".game-card").forEach(card => {
    selectedGames.add(card);
    card.classList.add("selected");
  });
  updateSelectionControls();
});
deselectAllBtn.addEventListener("click", () => {
  selectedGames.forEach(card => card.classList.remove("selected"));
  selectedGames.clear();
  updateSelectionControls();
});

// Stop file drops from opening in the browser
["dragover", "drop"].forEach(type => {
  document.addEventListener(type, e => {
    if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
  }, true);
});

// ---------- Selection helpers ----------
function setSelected(card, on) {
  if (on) selectedGames.add(card);
  else selectedGames.delete(card);
  card.classList.toggle("selected", on);
}

function clearSelection() {
  selectedGames.forEach(card => card.classList.remove("selected"));
  selectedGames.clear();
  updateSelectionControls();
}

// Selected cards in on-screen order, so they keep their order when moved.
function selectedInDomOrder() {
  return [...selectedGames].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
}

// ---------- Rubber-band selection ----------
// Press on empty space in a tier or the Unsorted area and drag a box around
// images to select them. Hold Ctrl/Cmd/Shift to add to the current selection.
// A plain click on empty space clears the selection.
const marquee = document.createElement("div");
marquee.className = "marquee";
app.append(marquee);
let marqueeState = null;

document.addEventListener("mousedown", e => {
  if (e.button !== 0) return;
  if (!(e.target instanceof Element) || !e.target.classList.contains("dropzone")) return;
  e.preventDefault(); // no text selection while dragging the box
  document.activeElement?.blur?.();
  marqueeState = {
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    additive: e.ctrlKey || e.metaKey || e.shiftKey,
    base: new Set(selectedGames)
  };
});

document.addEventListener("mousemove", e => {
  if (!marqueeState) return;
  const s = marqueeState;
  const dx = e.clientX - s.startX;
  const dy = e.clientY - s.startY;
  if (!s.active) {
    if (Math.hypot(dx, dy) < 4) return;
    s.active = true;
    app.classList.add("marquee-active");
    marquee.style.display = "block";
  }
  const left = Math.min(e.clientX, s.startX);
  const top = Math.min(e.clientY, s.startY);
  const right = left + Math.abs(dx);
  const bottom = top + Math.abs(dy);
  Object.assign(marquee.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${right - left}px`,
    height: `${bottom - top}px`
  });

  app.querySelectorAll("#tiers .game-card, #game-bank .game-card").forEach(card => {
    const r = card.getBoundingClientRect();
    const hit = r.left < right && r.right > left && r.top < bottom && r.bottom > top;
    setSelected(card, hit || (s.additive && s.base.has(card)));
  });
  updateSelectionControls();
});

document.addEventListener("mouseup", () => {
  if (!marqueeState) return;
  if (!marqueeState.active && !marqueeState.additive) clearSelection();
  marqueeState = null;
  marquee.style.display = "none";
  app.classList.remove("marquee-active");
});

// ---------- Dragging cards (one or several at once) ----------
// Delegated so tiers added later work without extra wiring.
let hoverZone = null;
function setHoverZone(zone) {
  if (hoverZone === zone) return;
  hoverZone?.classList.remove("drag-hover");
  hoverZone = zone;
  hoverZone?.classList.add("drag-hover");
}

let dragGroup = [];      // the cards being dragged right now
let insertTarget = null; // { card, after }

// Insertion point: dropping on the left half of a card puts the dragged
// image(s) before it, the right half puts them after it.
function clearInsertTarget() {
  if (insertTarget) insertTarget.card.classList.remove("insert-before", "insert-after");
  insertTarget = null;
}

function setInsertTarget(card, after) {
  if (insertTarget && insertTarget.card === card && insertTarget.after === after) return;
  clearInsertTarget();
  if (!card) return;
  card.classList.add(after ? "insert-after" : "insert-before");
  insertTarget = { card, after };
}

// The picture under the cursor while dragging: the grabbed card plus a
// badge with the number of images when several are being moved.
function makeDragGhost(card, count) {
  const rect = card.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;

  const clone = card.cloneNode(true);
  clone.classList.remove("selected", "dragging");
  delete clone.dataset.id;
  ghost.append(clone);

  if (count > 1) {
    const badge = document.createElement("span");
    badge.className = "drag-count";
    badge.textContent = count;
    ghost.append(badge);
  }

  app.append(ghost);
  setTimeout(() => ghost.remove(), 0);
  return ghost;
}

document.addEventListener("dragstart", e => {
  const card = e.target.closest?.(".game-card");
  if (!card) return;

  // Like a file manager: dragging a selected image moves the whole selection,
  // dragging an unselected one drops the selection and moves just that image.
  if (!selectedGames.has(card)) clearSelection();
  dragGroup = selectedGames.has(card) ? selectedInDomOrder() : [card];

  e.dataTransfer.setData("text/plain", card.dataset.id);
  e.dataTransfer.effectAllowed = "move";
  const ghost = makeDragGhost(card, dragGroup.length);
  e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
  requestAnimationFrame(() => dragGroup.forEach(c => c.classList.add("dragging")));
});

document.addEventListener("dragend", () => {
  setHoverZone(null);
  clearInsertTarget();
  dragGroup.forEach(c => c.classList.remove("dragging"));
  dragGroup = [];
});

document.addEventListener("dragover", e => {
  if (!(e.target instanceof Element)) return;
  if (Array.from(e.dataTransfer.types).includes("Files")) return;
  if (dragGroup.length === 0) return;
  const zone = e.target.closest(".dropzone");
  if (!zone) {
    setHoverZone(null);
    clearInsertTarget();
    return;
  }
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  setHoverZone(zone);

  const overCard = e.target.closest(".game-card");
  if (overCard && !dragGroup.includes(overCard) && zone.contains(overCard)) {
    const rect = overCard.getBoundingClientRect();
    setInsertTarget(overCard, e.clientX > rect.left + rect.width / 2);
  } else {
    clearInsertTarget();
  }
});

document.addEventListener("drop", e => {
  if (!(e.target instanceof Element)) return;
  const zone = e.target.closest(".dropzone");
  setHoverZone(null);
  const target = insertTarget;
  clearInsertTarget();
  if (!zone || dragGroup.length === 0) return;
  if (Array.from(e.dataTransfer.types).includes("Files")) return;
  e.preventDefault();

  if (target && zone.contains(target.card)) {
    if (target.after) {
      let ref = target.card;
      dragGroup.forEach(c => { ref.after(c); ref = c; });
    } else {
      dragGroup.forEach(c => target.card.before(c));
    }
  } else {
    dragGroup.forEach(c => zone.append(c));
  }
  // The selection stays in place after a move, so it can be moved again.
});

// ---------- Leave-page warning ----------
// Closing or refreshing the tab throws the tier list away, so ask first.
// Only asks when there is something to lose (at least one image added).
window.addEventListener("beforeunload", e => {
  if (!document.querySelector(".game-card")) return;
  e.preventDefault();
  e.returnValue = ""; // required by some browsers to show the prompt
});

// ---------- Download PNG ----------
downloadButton.addEventListener("click", async () => {
  downloadButton.disabled = true;
  const bgColor = cssVar("--tl-bg", "#18181b");
  const exportContainer = document.createElement("div");
  exportContainer.style.backgroundColor = bgColor;

  const titleClone = titleElement.cloneNode(true);
  titleClone.style.margin = "0 0 8px";
  exportContainer.appendChild(titleClone);

  const tiersClone = tiersElement.cloneNode(true);
  exportContainer.appendChild(tiersClone);
  app.appendChild(exportContainer);

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
      bgcolor: bgColor,
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
    ctx.fillStyle = bgColor;
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
