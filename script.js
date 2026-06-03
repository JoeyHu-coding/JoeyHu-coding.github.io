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

    function loadSlideImage(slide) {
      const image = slide?.querySelector("img[data-src]");
      if (image) {
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
      }
    }

    function setSlide(index) {
      current = (index + slides.length) % slides.length;
      loadSlideImage(slides[current]);
      loadSlideImage(slides[(current + 1) % slides.length]);
      loadSlideImage(slides[(current - 1 + slides.length) % slides.length]);

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

function initAcademicWebGIS() {
  const map = document.querySelector("[data-webgis-map]");
  if (!map) {
    return;
  }
  if (map.dataset.webgisInitialized === "true") {
    return;
  }

  const viewport = map.querySelector("[data-webgis-tiles]")?.parentElement;
  const tilesLayer = map.querySelector("[data-webgis-tiles]");
  const markersLayer = map.querySelector("[data-webgis-markers]");
  const status = map.querySelector("[data-webgis-status]");
  const zoomInButton = map.querySelector("[data-map-zoom-in]");
  const zoomOutButton = map.querySelector("[data-map-zoom-out]");
  const resetButton = map.querySelector("[data-map-reset]");
  const token = map.dataset.tdtToken || "";

  if (!viewport || !tilesLayer || !markersLayer) {
    return;
  }
  map.dataset.webgisInitialized = "true";

  const tileSize = 256;
  const initialView = {
    lat: 26,
    lng: 72,
    zoom: 2
  };
  const state = {
    center: { lat: initialView.lat, lng: initialView.lng },
    zoom: initialView.zoom,
    providerIndex: 0,
    generation: 0,
    dragging: false,
    renderQueued: false,
    dragStart: null,
    dragCenterPx: null
  };

  const providers = [
    {
      id: "tianditu-en",
      ready: "Basemap: Tianditu English tiles. Drag to pan; scroll or use controls to zoom.",
      failed: "Tianditu tiles did not load here; switching to an interactive fallback basemap.",
      layers: [
        (z, x, y) => `https://t${positiveModulo(x + y, 8)}.tianditu.gov.cn/DataServer?T=vec_w&x=${positiveModulo(x, 2 ** z)}&y=${y}&l=${z}&tk=${token}`,
        (z, x, y) => `https://t${positiveModulo(x + y + 3, 8)}.tianditu.gov.cn/DataServer?T=eva_w&x=${positiveModulo(x, 2 ** z)}&y=${y}&l=${z}&tk=${token}`
      ]
    },
    {
      id: "carto-voyager",
      ready: "Basemap fallback: CartoDB Voyager. Drag to pan; scroll or use controls to zoom.",
      layers: [
        (z, x, y) => {
          const subdomains = ["a", "b", "c", "d"];
          const subdomain = subdomains[positiveModulo(x + y, subdomains.length)];
          return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${positiveModulo(x, 2 ** z)}/${y}.png`;
        }
      ]
    }
  ];

  const locations = [
    { name: "Shanghai", lat: 31.2304, lng: 121.4737, type: "primary" },
    { name: "Beijing", lat: 39.9042, lng: 116.4074, type: "both" },
    { name: "Nanjing", lat: 32.0603, lng: 118.7969, type: "primary" },
    { name: "Osaka", lat: 34.6937, lng: 135.5023, type: "primary" },
    { name: "New York", lat: 40.7128, lng: -74.006, type: "primary" },
    { name: "Nanchang", lat: 28.682, lng: 115.8581, type: "primary" },
    { name: "Shenzhen", lat: 22.5431, lng: 114.0579, type: "network" },
    { name: "Hong Kong", lat: 22.3193, lng: 114.1694, type: "network" },
    { name: "Tokyo", lat: 35.6762, lng: 139.6503, type: "network" },
    { name: "Auckland", lat: -36.8509, lng: 174.7645, type: "network" },
    { name: "Amsterdam", lat: 52.3676, lng: 4.9041, type: "network" },
    { name: "Boston", lat: 42.3601, lng: -71.0589, type: "network" },
    { name: "Ann Arbor", lat: 42.2808, lng: -83.743, type: "network" },
    { name: "Canberra", lat: -35.2809, lng: 149.13, type: "network" },
    { name: "Wuhan", lat: 30.5928, lng: 114.3055, type: "network" },
    { name: "Guangzhou", lat: 23.1291, lng: 113.2644, type: "network" },
    { name: "Manchester", lat: 53.4808, lng: -2.2426, type: "network" },
    { name: "Singapore", lat: 1.3521, lng: 103.8198, type: "network" }
  ];

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wrapLng(lng) {
    return positiveModulo(lng + 180, 360) - 180;
  }

  function project(lat, lng, zoom) {
    const siny = clamp(Math.sin((lat * Math.PI) / 180), -0.9999, 0.9999);
    const scale = tileSize * 2 ** zoom;
    return {
      x: ((lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale
    };
  }

  function unproject(x, y, zoom) {
    const scale = tileSize * 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return {
      lat: clamp(lat, -80, 80),
      lng: wrapLng(lng)
    };
  }

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function switchProvider(nextIndex) {
    if (!providers[nextIndex] || state.providerIndex === nextIndex) {
      return;
    }
    setStatus(providers[state.providerIndex].failed || "Switching basemap.");
    state.providerIndex = nextIndex;
    scheduleRender();
  }

  function renderMarkers(topLeft, viewportWidth, viewportHeight) {
    const fragment = document.createDocumentFragment();
    locations.forEach((location) => {
      const point = project(location.lat, location.lng, state.zoom);
      let x = point.x - topLeft.x;
      const worldWidth = tileSize * 2 ** state.zoom;
      if (x < -viewportWidth / 2) {
        x += worldWidth;
      }
      if (x > viewportWidth * 1.5) {
        x -= worldWidth;
      }
      const y = point.y - topLeft.y;

      if (y < -24 || y > viewportHeight + 24 || x < -120 || x > viewportWidth + 120) {
        return;
      }

      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "about-webgis__marker";
      marker.dataset.type = location.type;
      marker.style.transform = `translate(${x}px, ${y}px)`;
      marker.title = `${location.name} - ${location.type === "primary" ? "My location" : location.type === "network" ? "Collaboration network" : "My location and collaboration network"}`;
      marker.innerHTML = `<span class="about-webgis__pin" aria-hidden="true"></span><span class="about-webgis__label">${location.name}</span>`;
      fragment.append(marker);
    });
    markersLayer.replaceChildren(fragment);
  }

  function render() {
    state.renderQueued = false;
    state.generation += 1;
    const generation = state.generation;
    const provider = providers[state.providerIndex];
    const bounds = viewport.getBoundingClientRect();
    const viewportWidth = Math.max(1, Math.round(bounds.width));
    const viewportHeight = Math.max(1, Math.round(bounds.height));
    const centerPx = project(state.center.lat, state.center.lng, state.zoom);
    const topLeft = {
      x: centerPx.x - viewportWidth / 2,
      y: centerPx.y - viewportHeight / 2
    };
    const maxTile = 2 ** state.zoom;
    const minTileX = Math.floor(topLeft.x / tileSize) - 1;
    const maxTileX = Math.floor((topLeft.x + viewportWidth) / tileSize) + 1;
    const minTileY = clamp(Math.floor(topLeft.y / tileSize) - 1, 0, maxTile - 1);
    const maxTileY = clamp(Math.floor((topLeft.y + viewportHeight) / tileSize) + 1, 0, maxTile - 1);
    const fragment = document.createDocumentFragment();
    const stats = { loaded: 0, errored: 0 };

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        provider.layers.forEach((tileUrl, layerIndex) => {
          const image = document.createElement("img");
          image.className = "about-webgis__tile";
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          image.loading = "eager";
          image.style.left = `${tileX * tileSize - topLeft.x}px`;
          image.style.top = `${tileY * tileSize - topLeft.y}px`;
          image.style.zIndex = String(layerIndex + 1);
          image.src = tileUrl(state.zoom, tileX, tileY);
          image.addEventListener("load", () => {
            if (generation !== state.generation) {
              return;
            }
            stats.loaded += 1;
            if (stats.loaded >= provider.layers.length) {
              setStatus(provider.ready);
            }
          });
          image.addEventListener("error", () => {
            if (generation !== state.generation) {
              return;
            }
            stats.errored += 1;
            if (state.providerIndex === 0 && stats.errored >= 8 && stats.loaded < 2) {
              switchProvider(1);
            }
          });
          fragment.append(image);
        });
      }
    }

    window.setTimeout(() => {
      if (generation === state.generation && state.providerIndex === 0 && stats.loaded < 2) {
        switchProvider(1);
      }
    }, 1800);

    tilesLayer.replaceChildren(fragment);
    renderMarkers(topLeft, viewportWidth, viewportHeight);
  }

  function scheduleRender() {
    if (state.renderQueued) {
      return;
    }
    state.renderQueued = true;
    window.setTimeout(render, 0);
  }

  function zoomBy(delta, anchorPoint) {
    const nextZoom = clamp(state.zoom + delta, 2, 7);
    if (nextZoom === state.zoom) {
      return;
    }

    if (anchorPoint) {
      const bounds = viewport.getBoundingClientRect();
      const oldCenterPx = project(state.center.lat, state.center.lng, state.zoom);
      const oldTopLeft = {
        x: oldCenterPx.x - bounds.width / 2,
        y: oldCenterPx.y - bounds.height / 2
      };
      const anchorWorld = {
        x: oldTopLeft.x + anchorPoint.x,
        y: oldTopLeft.y + anchorPoint.y
      };
      const nextAnchorWorld = {
        x: anchorWorld.x * 2 ** (nextZoom - state.zoom),
        y: anchorWorld.y * 2 ** (nextZoom - state.zoom)
      };
      const nextCenterPx = {
        x: nextAnchorWorld.x - anchorPoint.x + bounds.width / 2,
        y: nextAnchorWorld.y - anchorPoint.y + bounds.height / 2
      };
      state.zoom = nextZoom;
      state.center = unproject(nextCenterPx.x, nextCenterPx.y, state.zoom);
    } else {
      state.zoom = nextZoom;
    }

    scheduleRender();
  }

  function startDrag(clientX, clientY) {
    state.dragging = true;
    state.dragStart = { x: clientX, y: clientY };
    state.dragCenterPx = project(state.center.lat, state.center.lng, state.zoom);
    viewport.classList.add("is-dragging");
  }

  function moveDrag(clientX, clientY) {
    if (!state.dragging || !state.dragStart || !state.dragCenterPx) {
      return;
    }
    const dx = clientX - state.dragStart.x;
    const dy = clientY - state.dragStart.y;
    state.center = unproject(state.dragCenterPx.x - dx, state.dragCenterPx.y - dy, state.zoom);
    scheduleRender();
  }

  function finishDrag() {
    state.dragging = false;
    state.dragStart = null;
    state.dragCenterPx = null;
    viewport.classList.remove("is-dragging");
  }

  let lastPointerStartAt = 0;

  viewport.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    lastPointerStartAt = Date.now();
    startDrag(event.clientX, event.clientY);
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture is a convenience; drag still works without it.
    }
  });

  viewport.addEventListener("pointermove", (event) => {
    moveDrag(event.clientX, event.clientY);
  });

  function endDrag(event) {
    if (state.dragging && event.pointerId !== undefined) {
      try {
        viewport.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture can already be released by the browser.
      }
    }
    finishDrag();
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("mousedown", (event) => {
    if (Date.now() - lastPointerStartAt < 450) {
      return;
    }
    event.preventDefault();
    startDrag(event.clientX, event.clientY);
  });
  document.addEventListener("mousemove", (event) => {
    if (Date.now() - lastPointerStartAt < 450) {
      return;
    }
    moveDrag(event.clientX, event.clientY);
  });
  document.addEventListener("mouseup", () => {
    if (Date.now() - lastPointerStartAt < 450) {
      return;
    }
    finishDrag();
  });
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const bounds = viewport.getBoundingClientRect();
    zoomBy(event.deltaY < 0 ? 1 : -1, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  }, { passive: false });

  zoomInButton?.addEventListener("click", () => zoomBy(1));
  zoomOutButton?.addEventListener("click", () => zoomBy(-1));
  resetButton?.addEventListener("click", () => {
    state.center = { lat: initialView.lat, lng: initialView.lng };
    state.zoom = initialView.zoom;
    scheduleRender();
  });

  window.addEventListener("resize", scheduleRender);
  setStatus("Loading Tianditu English basemap...");
  scheduleRender();
}

applyTheme(getSavedTheme() || document.documentElement.dataset.theme || "dark");

themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

document.querySelectorAll("#year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

function initPage() {
  initProfilePhotoFrames();
  initPhotoCropper();
  initPortfolioViewers();
  initAcademicWebGIS();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
