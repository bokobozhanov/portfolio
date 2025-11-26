import { preloadImages } from './utils.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// Create a ScrollSmoother instance for smooth scrolling with lag effects
const smoother = ScrollSmoother.create({
  smooth: 1, // Smoothing factor for scroll (0 = no smoothing, 1 = full smoothing)
  effects: true, // Enable lag/scroll-based effects
  normalizeScroll: true, // Prevents mobile address bar resizing, disables overscroll bounce, and ensures scroll value consistency
});

const _panelRestore = {
  parent: null,
  nextSibling: null,
  styles: {},
  moved: false,
};

const movePanelToBodyPinned = () => {
  if (_panelRestore.moved) return;

  // remember original place + inline styles we will change
  _panelRestore.parent = panel.parentNode;
  _panelRestore.nextSibling = panel.nextSibling;
  _panelRestore.styles = {
    position: panel.style.position || '',
    top: panel.style.top || '',
    left: panel.style.left || '',
    width: panel.style.width || '',
    height: panel.style.height || '',
    transform: panel.style.transform || '',
    zIndex: panel.style.zIndex || '',
  };

  // measure current visual position (viewport coords)
  const rect = panel.getBoundingClientRect();

  // move to body and pin to the exact same screen rect
  panel.style.position = 'fixed';
  panel.style.top = `${rect.top}px`;
  panel.style.left = `${rect.left}px`;
  panel.style.width = `${rect.width}px`;
  panel.style.height = `${rect.height}px`;
  panel.style.transform = 'none';
  panel.style.zIndex = '2147483646'; // very high but leave room for image

  // ensure the panel image is above movers
  const panelImg = panel.querySelector('.panel__img');
  if (panelImg) {
    panelImg.style.position = 'relative';
    panelImg.style.zIndex = '2147483647';
    panelImg.style.willChange = 'clip-path, transform, opacity';
  }

  document.body.appendChild(panel);
  _panelRestore.moved = true;
};

const restorePanel = () => {
  if (!_panelRestore.moved) return;

  // restore inline styles we changed
  panel.style.position = _panelRestore.styles.position;
  panel.style.top = _panelRestore.styles.top;
  panel.style.left = _panelRestore.styles.left;
  panel.style.width = _panelRestore.styles.width;
  panel.style.height = _panelRestore.styles.height;
  panel.style.transform = _panelRestore.styles.transform;
  panel.style.zIndex = _panelRestore.styles.zIndex;

  const panelImg = panel.querySelector('.panel__img');
  if (panelImg) {
    panelImg.style.position = '';
    panelImg.style.zIndex = '';
    panelImg.style.willChange = '';
  }

  // put back into original DOM spot
  if (_panelRestore.parent) {
    _panelRestore.parent.insertBefore(panel, _panelRestore.nextSibling);
  }

  _panelRestore.parent = null;
  _panelRestore.nextSibling = null;
  _panelRestore.styles = {};
  _panelRestore.moved = false;
};

const groupItemsByColumn = () => {
  const gridStyles = window.getComputedStyle(grid);
  const columnsRaw = gridStyles.getPropertyValue('grid-template-columns');
  const numColumns = columnsRaw.split(' ').filter(Boolean).length;

  const columns = Array.from({ length: numColumns }, () => []); // Initialize column arrays

  // Distribute grid items into column buckets
  grid.querySelectorAll('.grid__item').forEach((item, index) => {
    columns[index % numColumns].push(item);
  });

  return { columns, numColumns };
};
const forceRecenter = () => {
  if (smoother) {
    smoother.scrollTo(smoother.scrollTop(), false);
    smoother.refresh();
  }
  ScrollTrigger.refresh(true);
};

let preventScroll = (e) => e.preventDefault();

const disableScroll = () => {
  if (smoother) smoother.paused(true);

  // Keep scrollbar visible AND prevent movement
  document.documentElement.style.overflowY = 'scroll';

  // Block scroll input (wheel + touch)
  window.addEventListener('wheel', preventScroll, { passive: false });
  window.addEventListener('touchmove', preventScroll, { passive: false });
};

const enableScroll = () => {
  if (smoother) smoother.paused(false);

  document.documentElement.style.overflowY = '';

  window.removeEventListener('wheel', preventScroll);
  window.removeEventListener('touchmove', preventScroll);
};

const snapPanelToScrollCenter = () => {
  if (!smoother) return;

  const content = smoother.content(); // the transformed container
  const contentRect = content.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  // visible center of viewport
  const viewportCenterY = window.innerHeight / 2;

  // calculate position inside transformed container
  const targetTop =
    viewportCenterY - panelRect.height / 2 - contentRect.top;

  gsap.set(panel, {
    position: 'absolute',
    top: targetTop,
    left: '50%',
    x: '-50%'
  });
};
/**
 * Reset the grid
 */
const clearGrid = () => {
  // Remove column wrappers
  grid.querySelectorAll('.grid__column').forEach((col) => col.remove());

  // Restore original .grid__item order
  originalItems.forEach((item) => grid.appendChild(item));
};

// Configuration object for animation settings
const config = {
  clipPathDirection: 'top-bottom', // Direction of clip-path animation ('top-bottom', 'bottom-top', 'left-right', 'right-left')
  autoAdjustHorizontalClipPath: true, // Automatically flip horizontal clip-path direction based on panel side
  steps: 6, // Number of mover elements generated between grid item and panel
  stepDuration: 0.35, // Duration (in seconds) for each animation step
  stepInterval: 0.05, // Delay between each mover's animation start
  moverPauseBeforeExit: 0.14, // Pause before mover elements exit after entering
  rotationRange: 0, // Maximum random rotation applied to each mover's Z-axis (tilt left/right)
  wobbleStrength: 0, // Maximum random positional wobble (in pixels) applied horizontally/vertically to each mover path
  panelRevealEase: 'sine.inOut', // Easing function for panel reveal animation
  gridItemEase: 'sine', // Easing function for grid item exit animation
  moverEnterEase: 'sine.in', // Easing function for mover entering animation
  moverExitEase: 'sine', // Easing function for mover exit animation
  panelRevealDurationFactor: 2, // Multiplier to adjust panel reveal animation duration
  clickedItemDurationFactor: 2, // Multiplier to adjust clicked grid item animation duration
  gridItemStaggerFactor: 0.3, // Max delay factor when staggering grid item animations
  moverBlendMode: false, // Optional CSS blend mode for mover elements (false = no blend mode)
  pathMotion: 'linear', // Type of path movement ('linear' or 'sine')
  sineAmplitude: 50, // Amplitude of sine wave for pathMotion 'sine'
  sineFrequency: Math.PI, // Frequency of sine wave for pathMotion 'sine'
};

// Create a deep copy of the initial global config.
// Used to temporarily modify config per item and then reset back after animations.
const originalConfig = { ...config };

// Linear interpolation helper
const lerp = (a, b, t) => a + (b - a) * t;

// Cached DOM elements
const grid = document.querySelector('.grid'); // Main grid container
const frame = document.querySelectorAll('.frame, .heading'); // Frame overlays
const panel = document.querySelector('.panel'); // Panel container
const panelContent = panel.querySelector('.panel__content'); // Panel content
const originalItems = Array.from(grid.querySelectorAll('.grid__item'));

const baseLag = 0.1; // Initial lag for the first column
const lagScale = 0.2; // Additional lag per column (applied incrementally)

let isAnimating = false; // Prevents overlapping animations
let isPanelOpen = false; // Tracks if the panel is currently open
let currentItem = null; // Reference to the clicked item

const buildGrid = (columns) => {
  const fragment = document.createDocumentFragment(); // Efficient batch insertion
  const columnContainers = [];

  // Loop through each column
  columns.forEach((column, i) => {
    const lag = baseLag + (i + 1) * lagScale; // Lag increases linearly per column index

    const columnContainer = document.createElement('div');
    columnContainer.className = 'grid__column';

    // Append items to this column
    column.forEach((item) => columnContainer.appendChild(item));

    fragment.appendChild(columnContainer);
    columnContainers.push({ element: columnContainer, lag });
  });

  grid.appendChild(fragment); // Add all columns at once
  return columnContainers;
};

const applyLagEffects = (columnContainers) => {
  columnContainers.forEach(({ element, lag }) => {
    smoother.effects(element, { speed: 1, lag }); // Apply lag per column
  });
};

// Initialize event listeners
const init = () => {
  document.querySelectorAll('.grid__item').forEach((item) => {
    item.addEventListener('click', () => onGridItemClick(item));
  });

  clearGrid();
  const { columns, numColumns } = groupItemsByColumn();
  currentColumnCount = numColumns;
  const columnContainers = buildGrid(columns);
  applyLagEffects(columnContainers);
  window.addEventListener('resize', () => {
    const newColumnCount = getColumnCount();
    if (newColumnCount !== currentColumnCount) {
      init();
    }
  });

  panelContent
    .querySelector('.panel__close')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      resetView();
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPanelOpen && !isAnimating) {
      resetView();
    }
  });
};


const getColumnCount = () => {
  const styles = getComputedStyle(grid);
  return styles.getPropertyValue('grid-template-columns').split(' ').filter(Boolean).length;
};

let currentColumnCount = null;
// Extracts per-item configuration overrides from HTML data attributes.
// Reads available data-* attributes from a clicked grid item and returns an object
// with values to temporarily override the global config for the animation.
const extractItemConfigOverrides = (item) => {
  const overrides = {};

  if (item.dataset.clipPathDirection)
    overrides.clipPathDirection = item.dataset.clipPathDirection;
  if (item.dataset.steps) overrides.steps = parseInt(item.dataset.steps);
  if (item.dataset.stepDuration)
    overrides.stepDuration = parseFloat(item.dataset.stepDuration);
  if (item.dataset.stepInterval)
    overrides.stepInterval = parseFloat(item.dataset.stepInterval);
  if (item.dataset.rotationRange)
    overrides.rotationRange = parseFloat(item.dataset.rotationRange);
  if (item.dataset.wobbleStrength)
    overrides.wobbleStrength = parseFloat(item.dataset.wobbleStrength);
  if (item.dataset.moverPauseBeforeExit)
    overrides.moverPauseBeforeExit = parseFloat(
      item.dataset.moverPauseBeforeExit
    );
  if (item.dataset.panelRevealEase)
    overrides.panelRevealEase = item.dataset.panelRevealEase;
  if (item.dataset.gridItemEase)
    overrides.gridItemEase = item.dataset.gridItemEase;
  if (item.dataset.moverEnterEase)
    overrides.moverEnterEase = item.dataset.moverEnterEase;
  if (item.dataset.moverExitEase)
    overrides.moverExitEase = item.dataset.moverExitEase;
  if (item.dataset.panelRevealDurationFactor)
    overrides.panelRevealDurationFactor = parseFloat(
      item.dataset.panelRevealDurationFactor
    );
  if (item.dataset.clickedItemDurationFactor)
    overrides.clickedItemDurationFactor = parseFloat(
      item.dataset.clickedItemDurationFactor
    );
  if (item.dataset.gridItemStaggerFactor)
    overrides.gridItemStaggerFactor = parseFloat(
      item.dataset.gridItemStaggerFactor
    );
  if (item.dataset.moverBlendMode)
    overrides.moverBlendMode = item.dataset.moverBlendMode;
  if (item.dataset.pathMotion) overrides.pathMotion = item.dataset.pathMotion;
  if (item.dataset.sineAmplitude)
    overrides.sineAmplitude = parseFloat(item.dataset.sineAmplitude);
  if (item.dataset.sineFrequency)
    overrides.sineFrequency = parseFloat(item.dataset.sineFrequency);

  return overrides;
};

// Animate hiding the frame overlay
const hideFrame = () => {
  gsap.to(frame, {
    opacity: 0,
    duration: 0.5,
    ease: 'sine.inOut',
    pointerEvents: 'none',
  });
};

// Animate showing the frame overlay
const showFrame = () => {
  gsap.to(frame, {
    opacity: 1,
    duration: 0.5,
    ease: 'sine.inOut',
    pointerEvents: 'auto',
  });
};

// Position the panel based on which side the item was clicked
const positionPanelBasedOnClick = (clickedItem) => {
  const centerX = getElementCenter(clickedItem).x;
  const windowHalf = window.innerWidth / 2;

  const isLeftSide = centerX < windowHalf;

  if (isLeftSide) {
    panel.classList.add('panel--right');
  } else {
    panel.classList.remove('panel--right');
  }

  // ✨ New logic to flip clipPathDirection if enabled
  if (config.autoAdjustHorizontalClipPath) {
    if (
      config.clipPathDirection === 'left-right' ||
      config.clipPathDirection === 'right-left'
    ) {
      config.clipPathDirection = isLeftSide ? 'left-right' : 'right-left';
    }
  }
};

// Get appropriate clip-paths depending on animation direction
const getClipPathsForDirection = (direction) => {
  switch (direction) {
    case 'bottom-top':
      return {
        from: 'inset(0% 0% 100% 0%)',
        reveal: 'inset(0% 0% 0% 0%)',
        hide: 'inset(100% 0% 0% 0%)',
      };
    case 'left-right':
      return {
        from: 'inset(0% 100% 0% 0%)',
        reveal: 'inset(0% 0% 0% 0%)',
        hide: 'inset(0% 0% 0% 100%)',
      };
    case 'right-left':
      return {
        from: 'inset(0% 0% 0% 100%)',
        reveal: 'inset(0% 0% 0% 0%)',
        hide: 'inset(0% 100% 0% 0%)',
      };
    case 'top-bottom':
    default:
      return {
        from: 'inset(100% 0% 0% 0%)',
        reveal: 'inset(0% 0% 0% 0%)',
        hide: 'inset(0% 0% 100% 0%)',
      };
  }
};

// Handle click on a grid item and trigger the full transition
const onGridItemClick = (item) => {
  snapPanelToScrollCenter();
  if (isAnimating) return;
  isAnimating = true;
  currentItem = item;

  // ✨ Merge overrides into global config temporarily
  const overrides = extractItemConfigOverrides(item);
  Object.assign(config, overrides);

  // Position the panel, with updated config
  positionPanelBasedOnClick(item);

  const { imgURL, title, desc } = extractItemData(item);
  setPanelContent({ imgURL, title, desc });
  // ✅ APPLY ASPECT FROM GRID ITEM TO PANEL
  const panelImg = panel.querySelector('.panel__img');
  const aspect = item.dataset.aspect; // "portrait" or "landscape"

  panelImg.classList.remove('portrait', 'landscape');

  if (aspect) {
    panelImg.classList.add(aspect);
  }
  snapPanelToScrollCenter();

  const allItems = document.querySelectorAll('.grid__item');
  const delays = computeStaggerDelays(item, allItems);
  animateGridItems(allItems, item, delays);
  animateTransition(
    item.querySelector('.grid__item-image'),
    panel.querySelector('.panel__img'),
    imgURL
  );
};

// Extract image URL and caption text from a grid item
const extractItemData = (item) => {
  const imgDiv = item.querySelector('.grid__item-image');
  const caption = item.querySelector('figcaption');
  return {
    imgURL: imgDiv.style.backgroundImage,
    title: caption.querySelector('h3').textContent,
    desc: caption.querySelector('p').textContent,
  };
};

// Set the panel's background and text based on clicked item
const setPanelContent = ({ imgURL, title, desc }) => {
  panel.querySelector('.panel__img').style.backgroundImage = imgURL;
  panel.querySelector('h3').textContent = title;
  panel.querySelector('p').textContent = desc;
};

// Calculate the center position of an element
const getElementCenter = (el) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

// Compute stagger delays for grid item exit animations
const computeStaggerDelays = (clickedItem, items) => {
  const baseCenter = getElementCenter(clickedItem);
  const distances = Array.from(items).map((el) => {
    const center = getElementCenter(el);
    return Math.hypot(center.x - baseCenter.x, center.y - baseCenter.y);
  });
  const max = Math.max(...distances);
  return distances.map((d) => (d / max) * config.gridItemStaggerFactor);
};

// Animate all grid items fading/scaling out, except clicked one
const animateGridItems = (items, clickedItem, delays) => {
  const clipPaths = getClipPathsForDirection(config.clipPathDirection);

  gsap.to(items, {
    opacity: 0,
    scale: (i, el) => (el === clickedItem ? 1 : 0.8),
    duration: (i, el) =>
      el === clickedItem
        ? config.stepDuration * config.clickedItemDurationFactor
        : 0.3,
    ease: config.gridItemEase,
    clipPath: (i, el) => (el === clickedItem ? clipPaths.from : 'none'),
    delay: (i) => delays[i],
  });
};



// Animate the full transition (movers + panel reveal)
const animateTransition = (startEl, endEl, imgURL) => {
  hideFrame();

  // Ensure smoother/transforms applied
  forceRecenter();

  // Snap panel inside smoothed content coordinates first
  snapPanelToScrollCenter();

  // Move the panel into document.body and pin it there so it shares stacking context with movers
  movePanelToBodyPinned();

  // Wait a frame to ensure the pinned panel is applied visually
  requestAnimationFrame(() => {
    // Measure in viewport coordinates AFTER panel is pinned
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // Generate path between start and end (both in viewport coords)
    const path = generateMotionPath(startRect, endRect, config.steps);
    const fragment = document.createDocumentFragment();
    const clipPaths = getClipPathsForDirection(config.clipPathDirection);

    // Create and animate movers (use fixed positioning)
    path.forEach((step, index) => {
      const mover = document.createElement('div');
      mover.className = 'mover';
      gsap.set(mover, createMoverStyle(step, index, imgURL));
      fragment.appendChild(mover);

      const delay = index * config.stepInterval;
      gsap
        .timeline({ delay })
        .fromTo(
          mover,
          { opacity: 0.4, clipPath: clipPaths.hide },
          {
            opacity: 1,
            clipPath: clipPaths.reveal,
            duration: config.stepDuration,
            ease: config.moverEnterEase,
          }
        )
        .to(
          mover,
          {
            clipPath: clipPaths.from,
            duration: config.stepDuration,
            ease: config.moverExitEase,
          },
          `+=${config.moverPauseBeforeExit}`
        );
    });

    // Append movers to body so fixed coordinates line up with getBoundingClientRect()
    document.body.appendChild(fragment);

    // Schedule mover cleanup and then reveal the panel (panel is already in body)
    scheduleCleanup(document.querySelectorAll('.mover'));
    revealPanel(endEl);
  });
};

// Create style for each mover element
const createMoverStyle = (step, index, imgURL) => {
  // ensure explicit 'px' values so no rounding/conversion issues
  const style = {
    backgroundImage: imgURL,
    position: 'fixed',
    left: `${Math.round(step.left)}px`,
    top: `${Math.round(step.top)}px`,
    width: `${Math.round(step.width)}px`,
    height: `${Math.round(step.height)}px`,
    clipPath: getClipPathsForDirection(config.clipPathDirection).from,
    zIndex: 1000 + index, // intentionally low compared with panel
    backgroundPosition: '50% 50%',
    transformOrigin: 'center center',
    willChange: 'transform, opacity, clip-path',
  };

  const rz = gsap.utils.random(-config.rotationRange, config.rotationRange);
  if (rz !== 0) style.transform = `rotateZ(${rz}deg)`;

  if (config.moverBlendMode) style.mixBlendMode = config.moverBlendMode;
  return style;
};

// Remove movers after their animation ends
const scheduleCleanup = (movers) => {
  const cleanupDelay =
    config.steps * config.stepInterval +
    config.stepDuration * 2 +
    config.moverPauseBeforeExit;
  gsap.delayedCall(cleanupDelay, () => movers.forEach((m) => m.remove()));
};

// Reveal the final panel with animated clip-path
const revealPanel = (endImg) => {
  const clipPaths = getClipPathsForDirection(config.clipPathDirection);

  // Ensure panel has top z-index while pinned in body
  panel.style.zIndex = '2147483646';
  const pImg = panel.querySelector('.panel__img');
  if (pImg) pImg.style.zIndex = '2147483647';

  gsap.set(panelContent, { opacity: 0 });
  gsap.set(panel, { opacity: 1, pointerEvents: 'auto' });

  gsap
    .timeline({
      defaults: {
        duration: config.stepDuration * config.panelRevealDurationFactor,
        ease: config.panelRevealEase,
      },
      onStart: () => {
        forceRecenter();
        disableScroll();
      },
    })
    .fromTo(
      endImg,
      { clipPath: clipPaths.hide },
      {
        clipPath: clipPaths.reveal,
        pointerEvents: 'auto',
        delay: config.steps * config.stepInterval,
      }
    )
    .fromTo(
      panelContent,
      { y: 25 },
      {
        duration: 1,
        ease: 'expo',
        opacity: 1,
        y: 0,
        delay: config.steps * config.stepInterval,
        onComplete: () => {
          isAnimating = false;
          isPanelOpen = true;
        },
      },
      '<-=.2'
    );
};

// Generate motion path between start and end elements
const generateMotionPath = (startRect, endRect, steps) => {
  const path = [];
  const fullSteps = steps + 2;
  const startCenter = {
    x: startRect.left + startRect.width / 2,
    y: startRect.top + startRect.height / 2,
  };
  const endCenter = {
    x: endRect.left + endRect.width / 2,
    y: endRect.top + endRect.height / 2,
  };

  for (let i = 0; i < fullSteps; i++) {
    const t = i / (fullSteps - 1);
    const width = lerp(startRect.width, endRect.width, t);
    const height = lerp(startRect.height, endRect.height, t);
    const centerX = lerp(startCenter.x, endCenter.x, t);
    const centerY = lerp(startCenter.y, endCenter.y, t);

    // Apply top offset (for sine motion)
    const sineOffset =
      config.pathMotion === 'sine'
        ? Math.sin(t * config.sineFrequency) * config.sineAmplitude
        : 0;

    // ✨ Add random wobble
    const wobbleX = (Math.random() - 0.5) * config.wobbleStrength;
    const wobbleY = (Math.random() - 0.5) * config.wobbleStrength;

    path.push({
      left: centerX - width / 2 + wobbleX,
      top: centerY - height / 2 + sineOffset + wobbleY,
      width,
      height,
    });
  }

  return path.slice(1, -1);
};

// Reset everything and return to the initial grid view
const resetView = () => {
  if (isAnimating) return;
  isAnimating = true;

  const allItems = document.querySelectorAll('.grid__item');
  const delays = computeStaggerDelays(currentItem, allItems);

  gsap
    .timeline({
      defaults: { duration: config.stepDuration, ease: 'expo' },
      onComplete: () => {
  panel.classList.remove('panel--right');
  isAnimating = false;
  isPanelOpen = false;
  enableScroll();
  restorePanel(); // <--- restore original DOM & styles
},
    })
    .to(panel, { opacity: 0 })
    .add(showFrame, 0)
    .set(panel, { opacity: 0, pointerEvents: 'none' })
    .set(panel.querySelector('.panel__img'), {
      clipPath: 'inset(0% 0% 100% 0%)',
    })
    .set(allItems, { clipPath: 'none', opacity: 0, scale: 0.8 }, 0)
    .to(
      allItems,
      {
        opacity: 1,
        scale: 1,
        delay: (i) => delays[i],
      },
      '>'
    );

  Object.assign(config, originalConfig);
};

// Preload images then initialize everything
preloadImages('.grid__item-image, .panel__img')
  .then(() => {
    document.body.classList.remove('loading');
    init();
  })
  .catch(err => {
    console.error('Preload failed:', err);
    document.body.classList.remove('loading');
    init();
  });

