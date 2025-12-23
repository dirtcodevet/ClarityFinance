/**
 * Event System for Clarity Finance
 * 
 * Simple pub/sub event system for communication between modules.
 * Events are the primary way modules communicate without direct imports.
 * 
 * See docs/EVENT_CATALOG.md for documented events.
 * See docs/CORE_API.md for usage documentation.
 */

// Event listeners storage
const listeners = new Map();

// Known events from catalog (for warning on unknown events)
const catalogedEvents = new Set([
  // Core events
  'database:initialized',
  
  // Account events
  'account:created',
  'account:updated',
  'account:deleted',
  
  // Transaction events
  'transaction:created',
  'transaction:updated',
  'transaction:deleted',
  
  // Income source events
  'income-source:created',
  'income-source:updated',
  'income-source:deleted',
  
  // Category events
  'category:created',
  'category:updated',
  'category:deleted',
  
  // Bucket events
  'bucket:updated',
  
  // Planned expense events
  'planned-expense:created',
  'planned-expense:updated',
  'planned-expense:deleted',
  
  // Goal events
  'goal:created',
  'goal:updated',
  'goal:deleted',
  'goal:funded',
  
  // Config events
  'config:changed',
  
  // UI events
  'page:changed',
  'modal:opened',
  'modal:closed',
  
  // Planning module events
  'planning:scenario-loaded',
  'planning:scenario-saved',
  'planning:reset',
  
  // Error events
  'error:validation',
  'error:database'
]);

// Debug mode - log all events to console
let debugMode = false;

/**
 * Enables or disables debug logging for events.
 * 
 * @param {boolean} enabled - Whether to enable debug mode
 */
function setDebugMode(enabled) {
  debugMode = enabled;
}

/**
 * Emits an event to all listeners.
 * 
 * @param {string} eventName - Name of the event
 * @param {object} data - Event payload
 */
function emit(eventName, data = {}) {
  // Warn if event is not in catalog (but still emit)
  if (!catalogedEvents.has(eventName)) {
    console.warn(
      `[Events] Warning: Emitting uncataloged event "${eventName}". ` +
      `Add it to EVENT_CATALOG.md and events.js catalogedEvents.`
    );
  }
  
  // Debug logging
  if (debugMode) {
    console.log(`[Events] Emit: ${eventName}`, data);
  }
  
  // Get listeners for this event
  const eventListeners = listeners.get(eventName);
  if (!eventListeners || eventListeners.size === 0) {
    return;
  }
  
  // Call each listener
  for (const callback of eventListeners) {
    try {
      callback(data);
    } catch (error) {
      console.error(`[Events] Error in listener for "${eventName}":`, error);
    }
  }
}

/**
 * Subscribes to an event.
 * 
 * @param {string} eventName - Name of the event to listen for
 * @param {function} callback - Function to call when event is emitted
 */
function on(eventName, callback) {
  if (typeof callback !== 'function') {
    console.error(`[Events] on() requires a function callback`);
    return;
  }
  
  // Create listener set if it doesn't exist
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  
  listeners.get(eventName).add(callback);
  
  if (debugMode) {
    console.log(`[Events] Subscribed to: ${eventName}`);
  }
}

/**
 * Unsubscribes from an event.
 * 
 * @param {string} eventName - Name of the event
 * @param {function} callback - The exact function that was passed to on()
 */
function off(eventName, callback) {
  const eventListeners = listeners.get(eventName);
  if (!eventListeners) {
    return;
  }
  
  eventListeners.delete(callback);
  
  // Clean up empty sets
  if (eventListeners.size === 0) {
    listeners.delete(eventName);
  }
  
  if (debugMode) {
    console.log(`[Events] Unsubscribed from: ${eventName}`);
  }
}

/**
 * Removes all listeners for an event, or all listeners if no event specified.
 * Primarily for testing.
 * 
 * @param {string} eventName - Optional event name
 */
function clear(eventName) {
  if (eventName) {
    listeners.delete(eventName);
  } else {
    listeners.clear();
  }
}

/**
 * Returns the number of listeners for an event.
 * Primarily for testing.
 * 
 * @param {string} eventName - Event name
 * @returns {number} Number of listeners
 */
function listenerCount(eventName) {
  const eventListeners = listeners.get(eventName);
  return eventListeners ? eventListeners.size : 0;
}

/**
 * Adds an event to the catalog (for module-specific events).
 * 
 * @param {string} eventName - Event name to add
 */
function registerEvent(eventName) {
  catalogedEvents.add(eventName);
}

/**
 * Checks if an event is in the catalog.
 * 
 * @param {string} eventName - Event name
 * @returns {boolean} Whether event is cataloged
 */
function isRegistered(eventName) {
  return catalogedEvents.has(eventName);
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  emit,
  on,
  off,
  clear,
  listenerCount,
  registerEvent,
  isRegistered,
  setDebugMode
};
