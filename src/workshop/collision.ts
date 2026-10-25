// Collision boundaries and proximity detection for the miniature workshop

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name?: string;
}

export interface StationTrigger {
  id: 'projects' | 'learning' | 'plans' | 'connect';
  index: string;
  title: string;
  center: [number, number]; // [x, z]
  radius: number;
}

// Solid obstacles the car cannot penetrate
export const OBSTACLES: AABB[] = [
  // Outer perimeter safety walls (car cannot drive off the platform into the void)
  { minX: -7.6, maxX: 8.2, minZ: -8.0, maxZ: -7.2, name: 'North Wall' },
  { minX: -7.6, maxX: 8.2, minZ: 6.8, maxZ: 8.0, name: 'South Edge' },
  { minX: -8.0, maxX: -7.2, minZ: -8.0, maxZ: 7.5, name: 'West Edge' },
  { minX: 7.6, maxX: 8.4, minZ: -8.0, maxZ: 7.5, name: 'East Wall' },

  // Station 01: TEXFLOW factory display machinery & conveyor
  { minX: -5.8, maxX: -1.8, minZ: -4.8, maxZ: -1.8, name: 'TEXFLOW Machinery' },

  // Station 02: Learning desk, chair & computer
  { minX: -1.4, maxX: 1.8, minZ: -6.2, maxZ: -3.8, name: 'Learning Desk' },

  // Station 03: Future plans planning board & wall
  { minX: 3.5, maxX: 7.2, minZ: -6.2, maxZ: -3.6, name: 'Planning Wall' },

  // Station 04: Connect lounge chairs & coffee table
  { minX: 2.8, maxX: 6.5, minZ: 0.6, maxZ: 3.6, name: 'Connect Lounge' },

  // Planter boxes & stone landscaping
  { minX: -7.2, maxX: -4.8, minZ: 1.0, maxZ: 3.0, name: 'West Planter' },
  { minX: 3.5, maxX: 6.2, minZ: 4.8, maxZ: 6.8, name: 'East Garden Planter' },
];

export const STATIONS: StationTrigger[] = [
  { id: 'projects', index: '01', title: 'Projects', center: [-3.8, -3.2], radius: 3.4 },
  { id: 'learning', index: '02', title: 'Learning', center: [0.2, -4.8], radius: 3.0 },
  { id: 'plans', index: '03', title: 'Future plans', center: [5.2, -4.6], radius: 3.0 },
  { id: 'connect', index: '04', title: 'Connect', center: [4.6, 2.0], radius: 3.4 },
];

export function resolveCollision(
  newX: number,
  newZ: number,
  carRadius: number = 0.55
): { x: number; z: number; hit: boolean } {
  let resolvedX = newX;
  let resolvedZ = newZ;
  let hit = false;

  for (const obs of OBSTACLES) {
    // Check circle-AABB overlap
    const closestX = Math.max(obs.minX, Math.min(resolvedX, obs.maxX));
    const closestZ = Math.max(obs.minZ, Math.min(resolvedZ, obs.maxZ));

    const dx = resolvedX - closestX;
    const dz = resolvedZ - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < carRadius * carRadius) {
      hit = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = carRadius - dist;
        resolvedX += (dx / dist) * overlap;
        resolvedZ += (dz / dist) * overlap;
      } else {
        // Center inside box: push out along shortest axis
        const left = Math.abs(resolvedX - obs.minX);
        const right = Math.abs(obs.maxX - resolvedX);
        const top = Math.abs(resolvedZ - obs.minZ);
        const bottom = Math.abs(obs.maxZ - resolvedZ);
        const min = Math.min(left, right, top, bottom);

        if (min === left) resolvedX = obs.minX - carRadius;
        else if (min === right) resolvedX = obs.maxX + carRadius;
        else if (min === top) resolvedZ = obs.minZ - carRadius;
        else resolvedZ = obs.maxZ + carRadius;
      }
    }
  }

  // Hard clamp to total platform bounds
  resolvedX = Math.max(-7.2, Math.min(7.2, resolvedX));
  resolvedZ = Math.max(-6.8, Math.min(6.5, resolvedZ));

  return { x: resolvedX, z: resolvedZ, hit };
}

export function checkStationProximity(
  x: number,
  z: number
): StationTrigger | null {
  for (const station of STATIONS) {
    const dx = x - station.center[0];
    const dz = z - station.center[1];
    if (dx * dx + dz * dz <= station.radius * station.radius) {
      return station;
    }
  }
  return null;
}
