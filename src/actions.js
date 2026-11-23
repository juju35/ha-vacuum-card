// Rooms as { id, name }, with a string id (the one of data-room) and a name ("#id" when it has none).
export const roomItems = (rooms) =>
  (Array.isArray(rooms) ? rooms : [])
    .filter((r) => r && r.id !== undefined && r.id !== null && r.id !== "")
    .map((r) => ({ id: String(r.id), name: r.name ? String(r.name) : `#${r.id}` }));
export const sortRooms = (rooms) => roomItems(rooms).sort((a, b) => a.name.localeCompare(b.name));

// Room (segment) cleaning per integration: `clean` gives the service call [domain, service, data] for the selected
// room ids; the rooms are listed by a service (`service`, Roborock), read from the vacuum (`attribute`) or, for an
// integration that cannot list them (Xiaomi Miio), given by the `rooms` option.
export const ROOM_ADAPTERS = {
  roborock: {
    service: "get_maps",
    clean: (entity_id, segments) => ["vacuum", "send_command", { entity_id, command: "app_segment_clean", params: [{ segments }] }],
  },
  xiaomi_miio: { clean: (entity_id, segments) => ["xiaomi_miio", "vacuum_clean_segment", { entity_id, segments }] },
  // Dreame Vacuum: `rooms` is { map name: [{ id, name, … }] }, the current map being `selected_map`.
  dreame_vacuum: {
    attribute: (vac) => {
      const rooms = vac?.attributes?.rooms;
      if (Array.isArray(rooms)) return rooms;
      if (!rooms || typeof rooms !== "object") return [];
      const map = rooms[vac.attributes.selected_map] ?? Object.values(rooms)[0];
      return Array.isArray(map) ? map : [];
    },
    clean: (entity_id, segments) => ["dreame_vacuum", "vacuum_clean_segment", { entity_id, segments }],
  },
};

// Key of the enlarged map's next frame in _mapNext (map ids are entity ids, which never look like this).
export const ZOOM_KEY = "#zoom";

// VacuumEntityFeature bits of the vacuum's supported_features attribute.
export const VACUUM_FEATURES = { pause: 4, stop: 8, return_home: 16, locate: 512 };

// Clicks that send a command to the vacuum (or open the room list to send one).
export const VACUUM_ACTIONS = new Set(["start", "open_rooms", "pause", "stop", "return_to_base", "locate", "clean_rooms", "clean_all"]);

// Elements a click acts on, and how one is told from the others across renders (see _focusedSpot).
export const FOCUS_SELECTOR = "[data-action], [data-entity]";
export const focusKey = (el) => {
  const data = Object.entries({ ...el.dataset });
  return data.length ? `${el.tagName}|${JSON.stringify(data)}` : "";
};
