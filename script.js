const themeToggle = document.querySelector(".theme-toggle");
const themeState = document.querySelector(".theme-toggle__state");
const profilePhotoStorageKey = "jinyu-profile-photo-preview";

function getSavedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    // Theme still works for the current page when storage is unavailable.
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  saveTheme(nextTheme);

  if (themeToggle) {
    const isDark = nextTheme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  if (themeState) {
    themeState.textContent = nextTheme === "dark" ? "Dark" : "Light";
  }
}

function getLocalProfilePhoto() {
  try {
    return localStorage.getItem(profilePhotoStorageKey);
  } catch (error) {
    return null;
  }
}

function saveLocalProfilePhoto(dataUrl) {
  try {
    localStorage.setItem(profilePhotoStorageKey, dataUrl);
    return true;
  } catch (error) {
    return false;
  }
}

function clearLocalProfilePhoto() {
  try {
    localStorage.removeItem(profilePhotoStorageKey);
  } catch (error) {
    // Ignore storage failures; the page can still continue.
  }
}

function showProfileImage(frame, src) {
  const image = frame.querySelector("[data-profile-photo-image]");
  const placeholder = frame.querySelector("[data-profile-photo-placeholder]");

  if (!image || !placeholder) {
    return;
  }

  image.src = src;
  image.hidden = false;
  placeholder.hidden = true;
  frame.classList.add("has-profile-photo");
}

function hideProfileImage(frame) {
  const image = frame.querySelector("[data-profile-photo-image]");
  const placeholder = frame.querySelector("[data-profile-photo-placeholder]");

  if (!image || !placeholder) {
    return;
  }

  image.removeAttribute("src");
  image.hidden = true;
  placeholder.hidden = false;
  frame.classList.remove("has-profile-photo");
}

function initProfilePhotoFrames() {
  document.querySelectorAll("[data-profile-photo-image]").forEach((image) => {
    const frame = image.closest(".portrait-frame");
    const localPhoto = getLocalProfilePhoto();

    if (!frame) {
      return;
    }

    if (localPhoto) {
      showProfileImage(frame, localPhoto);
      return;
    }

    const defaultSrc = image.dataset.defaultSrc;
    if (!defaultSrc) {
      hideProfileImage(frame);
      return;
    }

    const probe = new Image();
    probe.onload = () => showProfileImage(frame, defaultSrc);
    probe.onerror = () => hideProfileImage(frame);
    probe.src = defaultSrc;
  });
}

function initPhotoCropper() {
  const tool = document.querySelector("[data-photo-tool]");
  if (!tool) {
    return;
  }

  const canvas = tool.querySelector("[data-crop-canvas]");
  const stage = tool.querySelector("[data-crop-stage]");
  const empty = tool.querySelector("[data-crop-empty]");
  const status = tool.querySelector("[data-crop-status]");
  const fileInput = tool.querySelector("[data-photo-input]");
  const zoomInput = tool.querySelector("[data-crop-zoom]");
  const centerButton = tool.querySelector("[data-crop-center]");
  const saveButton = tool.querySelector("[data-crop-save]");
  const downloadButton = tool.querySelector("[data-crop-download]");
  const clearButton = tool.querySelector("[data-crop-clear]");
  const preview = tool.querySelector("[data-crop-preview]");
  const previewPlaceholder = tool.querySelector("[data-crop-preview-placeholder]");
  const context = canvas?.getContext("2d");

  if (!canvas || !stage || !context) {
    return;
  }

  const state = {
    image: null,
    scale: 1,
    minScale: 1,
    x: 0,
    y: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0
  };

  const width = canvas.width;
  const height = canvas.height;

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function setControlsEnabled(enabled) {
    [zoomInput, centerButton, saveButton, downloadButton].forEach((control) => {
      if (control) {
        control.disabled = !enabled;
      }
    });
  }

  function setPreview(src) {
    if (!preview || !previewPlaceholder) {
      return;
    }

    if (src) {
      preview.src = src;
      preview.hidden = false;
      previewPlaceholder.hidden = true;
    } else {
      preview.removeAttribute("src");
      preview.hidden = true;
      previewPlaceholder.hidden = false;
    }
  }

  function setEmptyVisible(visible) {
    if (empty) {
      empty.hidden = !visible;
    }
    stage.classList.toggle("is-empty", visible);
  }

  function constrainPosition() {
    if (!state.image) {
      return;
    }

    const imageWidth = state.image.naturalWidth * state.scale;
    const imageHeight = state.image.naturalHeight * state.scale;
    const minX = width - imageWidth;
    const minY = height - imageHeight;

    state.x = Math.min(0, Math.max(minX, state.x));
    state.y = Math.min(0, Math.max(minY, state.y));
  }

  function drawCrop() {
    context.clearRect(0, 0, width, height);
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--paper-2").trim() || "#121417";
    context.fillRect(0, 0, width, height);

    if (!state.image) {
      return;
    }

    constrainPosition();
    context.drawImage(
      state.image,
      state.x,
      state.y,
      state.image.naturalWidth * state.scale,
      state.image.naturalHeight * state.scale
    );
  }

  function centerImage() {
    if (!state.image) {
      return;
    }

    state.minScale = Math.max(width / state.image.naturalWidth, height / state.image.naturalHeight);
    state.scale = state.minScale * Number(zoomInput?.value || 1);
    state.x = (width - state.image.naturalWidth * state.scale) / 2;
    state.y = (height - state.image.naturalHeight * state.scale) / 2;
    drawCrop();
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
  }

  function loadImageFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.image = image;
        if (zoomInput) {
          zoomInput.value = "1";
        }
        setControlsEnabled(true);
        setEmptyVisible(false);
        centerImage();
        setStatus(`${file.name} loaded.`);
      };
      image.onerror = () => {
        setStatus("This image could not be loaded.");
      };
      image.src = String(reader.result);
    };
    reader.onerror = () => setStatus("This image could not be read.");
    reader.readAsDataURL(file);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  }

  const savedPreview = getLocalProfilePhoto();
  if (savedPreview) {
    setPreview(savedPreview);
    setStatus("A local preview is saved in this browser.");
  } else {
    setPreview(null);
    setStatus("No photo selected.");
  }
  setControlsEnabled(false);
  setEmptyVisible(true);
  drawCrop();

  fileInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    loadImageFromFile(file);
  });

  zoomInput?.addEventListener("input", () => {
    if (!state.image) {
      return;
    }

    const oldScale = state.scale;
    const anchorX = (width / 2 - state.x) / oldScale;
    const anchorY = (height / 2 - state.y) / oldScale;
    state.scale = state.minScale * Number(zoomInput.value);
    state.x = width / 2 - anchorX * state.scale;
    state.y = height / 2 - anchorY * state.scale;
    drawCrop();
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
  });

  centerButton?.addEventListener("click", () => {
    if (zoomInput) {
      zoomInput.value = "1";
    }
    centerImage();
  });

  saveButton?.addEventListener("click", () => {
    if (!state.image) {
      return;
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const saved = saveLocalProfilePhoto(dataUrl);
    setPreview(dataUrl);
    setStatus(saved ? "Saved as the local homepage preview." : "The browser could not save this preview.");
  });

  downloadButton?.addEventListener("click", () => {
    if (!state.image) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.download = "profile.jpg";
    link.click();
    setStatus("profile.jpg is ready to place in assets/profile/.");
  });

  clearButton?.addEventListener("click", () => {
    clearLocalProfilePhoto();
    setPreview(null);
    setStatus("Local preview cleared.");
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.image) {
      return;
    }

    const point = pointerPosition(event);
    state.dragging = true;
    state.dragStartX = point.x;
    state.dragStartY = point.y;
    state.dragOriginX = state.x;
    state.dragOriginY = state.y;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging || !state.image) {
      return;
    }

    const point = pointerPosition(event);
    state.x = state.dragOriginX + point.x - state.dragStartX;
    state.y = state.dragOriginY + point.y - state.dragStartY;
    drawCrop();
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
  });

  canvas.addEventListener("pointerup", (event) => {
    if (state.dragging) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.dragging = false;
  });

  canvas.addEventListener("pointercancel", () => {
    state.dragging = false;
  });
}

function initPortfolioViewers() {
  document.querySelectorAll("[data-portfolio-viewer]").forEach((viewer) => {
    const slides = Array.from(viewer.querySelectorAll(".portfolio-slide"));
    const tabs = Array.from(viewer.querySelectorAll("[data-slide-to]"));
    const counter = viewer.querySelector("[data-slide-counter]");
    const title = viewer.querySelector("[data-slide-title]");
    const openLink = viewer.querySelector("[data-slide-open]");
    const prevButton = viewer.querySelector("[data-slide-prev]");
    const nextButton = viewer.querySelector("[data-slide-next]");

    if (!slides.length) {
      return;
    }

    let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));

    function setSlide(index) {
      current = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === current;
        slide.classList.toggle("is-active", isActive);
        slide.hidden = !isActive;
      });

      tabs.forEach((tab, tabIndex) => {
        const isActive = tabIndex === current;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      const activeSlide = slides[current];
      const activeImageLink = activeSlide.querySelector("a[href]");
      const activeTitle = activeSlide.dataset.slideTitle || `Board ${current + 1}`;

      if (counter) {
        counter.textContent = `${current + 1} / ${slides.length}`;
      }

      if (title) {
        title.textContent = activeTitle;
      }

      if (openLink && activeImageLink) {
        openLink.href = activeImageLink.href;
      }
    }

    prevButton?.addEventListener("click", () => setSlide(current - 1));
    nextButton?.addEventListener("click", () => setSlide(current + 1));

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const nextIndex = Number(tab.dataset.slideTo);
        if (Number.isInteger(nextIndex)) {
          setSlide(nextIndex);
        }
      });
    });

    viewer.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        setSlide(current - 1);
      }
      if (event.key === "ArrowRight") {
        setSlide(current + 1);
      }
    });

    setSlide(current);
  });
}

applyTheme(getSavedTheme() || document.documentElement.dataset.theme || "dark");

themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

document.querySelectorAll("#year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

initProfilePhotoFrames();
initPhotoCropper();
initPortfolioViewers();
